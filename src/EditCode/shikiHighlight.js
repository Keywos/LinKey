import { RangeSetBuilder, StateEffect } from "@codemirror/state";
import { Decoration, ViewPlugin } from "@codemirror/view";
// by @xream
// ★ Shiki 的 tokenize（codeToTokens）是纯 CPU 计算，已经搬进 shikiWorker.js
//   在独立线程里跑，这里只负责：发请求 -> 拿到 token 数组 -> 在主线程
//   构建轻量的 Decoration（这一步必须留在主线程，因为要用到 CodeMirror 的
//   RangeSetBuilder/Decoration API 和当前的 view.state.doc）。

// 现在只有 ini 走 shiki 高亮：javascript/json/json5/yaml 都改用了
// CodeMirror 自带的语言扩展（见 cmView.vue 的 applyLanguage），不会再
// 调用到这里。真正的语言 grammar 动态 import 只存在于 shikiWorker.js 里，
// 主线程不会因为这个判断而把 shiki 相关代码打进主包。
export const SHIKI_SUPPORTED_LANGUAGES = new Set(["ini"]);

const shikiRefreshEffect = StateEffect.define();

// ===== 与 Worker 的通信层 =====
let worker = null;
let workerInitFailed = false;
let workerRequestId = 0;
const pendingRequests = new Map();

const rejectAllPending = (error) => {
  for (const { reject } of pendingRequests.values()) {
    reject(error);
  }
  pendingRequests.clear();
};

const getWorker = () => {
  if (worker || workerInitFailed) return worker;

  try {
    worker = new Worker(new URL("./shikiWorker.js", import.meta.url), {
      type: "module",
    });

    worker.onmessage = (event) => {
      const { id, ok, tokens, error } = event.data || {};
      const pending = pendingRequests.get(id);
      if (!pending) return;

      pendingRequests.delete(id);

      if (ok) {
        pending.resolve(tokens);
      } else {
        pending.reject(new Error(error || "Shiki worker error"));
      }
    };

    // worker 内部出现未捕获异常（比如某次 import 失败）时，
    // 不能让所有等待中的请求永远 pending，统一 reject 掉。
    worker.onerror = (event) => {
      console.error("Shiki worker crashed", event);
      rejectAllPending(new Error((event && event.message) || "Shiki worker crashed"));
    };
  } catch (error) {
    // 极少数环境（比如被 webview 禁用了 Worker）下创建失败，
    // 降级为不高亮，而不是让整个编辑器崩掉。
    console.error("Failed to create Shiki worker", error);
    workerInitFailed = true;
    worker = null;
  }

  return worker;
};

const requestHighlightFromWorker = (code, language, dark) => {
  const activeWorker = getWorker();

  if (!activeWorker) {
    return Promise.resolve([]);
  }

  const id = ++workerRequestId;

  return new Promise((resolve, reject) => {
    pendingRequests.set(id, { resolve, reject });
    activeWorker.postMessage({ id, code, language, dark });
  });
};

// ===== Decoration 构建（必须留在主线程，依赖 view.state.doc） =====
const tokenStyle = (token) => {
  const styles = [];
  const textDecorations = [];
  const fontStyle = token.fontStyle;

  if (token.color) {
    styles.push(`color: ${token.color} !important`);
  }

  if (typeof fontStyle === "number" && fontStyle > 0) {
    if (fontStyle & 1) styles.push("font-style: italic !important");
    if (fontStyle & 2) styles.push("font-weight: 700 !important");
    if (fontStyle & 4) textDecorations.push("underline");
    if (fontStyle & 8) textDecorations.push("line-through");
  }

  if (textDecorations.length) {
    styles.push(`text-decoration: ${textDecorations.join(" ")} !important`);
  }

  return styles.join("; ");
};

const buildDecorations = (doc, tokenLines) => {
  const builder = new RangeSetBuilder();
  let fallbackOffset = 0;

  for (const line of tokenLines) {
    for (const token of line) {
      const content = token.content || "";
      const from = typeof token.offset === "number" ? token.offset : fallbackOffset;
      const to = from + content.length;
      fallbackOffset = to;

      if (!content || !/\S/.test(content) || from >= to || to > doc.length) {
        continue;
      }

      const style = tokenStyle(token);
      if (!style) continue;

      builder.add(
        from,
        to,
        Decoration.mark({
          class: "cm-shiki-token",
          attributes: { style },
        }),
      );
    }

    fallbackOffset += 1;
  }

  return builder.finish();
};

export const shikiHighlight = ({ language, dark }) => {
  // if (!LANGUAGE_LOADERS[language]) {
  //   return [];
  // }

  return ViewPlugin.fromClass(
    class {
      constructor(view) {
        this.options = {
          language,
          dark,
        };

        this.decorations = Decoration.none;

        this.destroyed = false;

        this.requestId = 0;

        this.timer = undefined;

        this.schedule(view, 0);
      }

      update(update) {
        if (update.docChanged) {
          this.decorations = this.decorations.map(update.changes);

          this.schedule(update.view, 80);
        }
      }

      destroy() {
        this.destroyed = true;

        this.requestId += 1;

        if (this.timer !== undefined) {
          clearTimeout(this.timer);
        }
      }

      schedule(view, delay) {
        const requestId = ++this.requestId;

        if (this.timer !== undefined) {
          clearTimeout(this.timer);
        }

        this.timer = setTimeout(() => {
          this.timer = undefined;

          this.highlight(view, requestId);
        }, delay);
      }

      async highlight(view, requestId) {
        const code = view.state.doc.toString();

        // ★ 超过 2MB 不做 shiki 高亮
        if (!code || code.length > 1048576) {
          this.setDecorations(view, requestId, Decoration.none);
          return;
        }

        try {
          // ★ 真正的 tokenize 已经丢给 worker 线程，这里只是 await 结果，
          //   不会阻塞主线程/输入响应。
          const tokens = await requestHighlightFromWorker(code, language, dark);

          // 文档在等待 worker 返回期间可能已经又变了，
          // 过期的结果直接丢弃，不要浪费时间去构建 Decoration。
          if (this.destroyed || requestId !== this.requestId) {
            return;
          }

          this.setDecorations(view, requestId, buildDecorations(view.state.doc, tokens));
        } catch (e) {
          console.error(e);
        }
      }

      setDecorations(view, requestId, decorations) {
        if (this.destroyed || requestId !== this.requestId) {
          return;
        }

        this.decorations = decorations;

        view.dispatch({
          effects: shikiRefreshEffect.of(null),
        });
      }
    },

    {
      decorations: (plugin) => plugin.decorations,
    },
  );
};
