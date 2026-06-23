// by @xream
// 运行在独立线程里：只做 "字符串 -> token 数组" 的纯计算，
// 不引用任何 DOM / CodeMirror API，所以可以安全地放进 Web Worker。
import { SHIKI_THEME_REGISTRATIONS, SHIKI_THEMES } from "./shikiThemes.js";

// 现在只有 ini 走 shiki 高亮，javascript/json/json5/yaml 全部改用
// CodeMirror 自带的语言扩展（见 cmView.vue 的 applyLanguage）。
const LANGUAGE_LOADERS = {
  ini: () => import("shiki/langs/ini.mjs").then((module) => module.default),
};

const loadedLanguages = new Set();
const languageLoadPromises = new Map();

let highlighterPromise = null;

const getHighlighter = () => {
  if (!highlighterPromise) {
    highlighterPromise = Promise.all([import("shiki/core"), import("shiki/engine/javascript")]).then(([{ createHighlighterCore }, { createJavaScriptRegexEngine }]) =>
      createHighlighterCore({
        themes: SHIKI_THEME_REGISTRATIONS,
        langs: [],
        engine: createJavaScriptRegexEngine(),
      }),
    );
  }

  return highlighterPromise;
};

const ensureLanguageLoaded = async (language) => {
  const loadLanguage = LANGUAGE_LOADERS[language];
  if (!loadLanguage) return null;

  const highlighter = await getHighlighter();
  if (loadedLanguages.has(language)) return highlighter;

  if (!languageLoadPromises.has(language)) {
    languageLoadPromises.set(
      language,
      loadLanguage()
        .then((grammar) => highlighter.loadLanguage(grammar))
        .then(() => {
          loadedLanguages.add(language);
        })
        .catch((error) => {
          languageLoadPromises.delete(language);
          throw error;
        }),
    );
  }

  await languageLoadPromises.get(language);
  return highlighter;
};

self.onmessage = async (event) => {
  const data = event.data || {};
  const { id, code, language, dark } = data;

  if (typeof id !== "number") return;

  try {
    const highlighter = await ensureLanguageLoaded(language);

    // 不支持的语言：返回空 token，主线程会画成无高亮
    if (!highlighter) {
      self.postMessage({ id, ok: true, tokens: [] });
      return;
    }

    const theme = dark ? SHIKI_THEMES.dark : SHIKI_THEMES.light;
    const result = highlighter.codeToTokens(code, {
      lang: language,
      theme,
    });

    self.postMessage({ id, ok: true, tokens: result.tokens });
  } catch (error) {
    self.postMessage({
      id,
      ok: false,
      error: (error && error.message) || String(error),
    });
  }
};
