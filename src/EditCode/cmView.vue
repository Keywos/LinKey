<template>
  <div class="cmviewRef">
    <!-- 折叠态：小圆点 -->
    <div v-if="collapsed" class="cm-collapsed-dot" :style="toolbarStyle" @mousedown="startDrag" @touchstart="startDragTouch" @click="toggleCollapsed">
      <span class="cm-collapsed-icon">
        <svg
          class="icon"
          style="width: 1.2em; height: 1.2em; vertical-align: middle; fill: currentColor; overflow: hidden"
          viewBox="0 0 1024 1024"
          version="1.1"
          xmlns="http://www.w3.org/2000/svg"
          p-id="8591"
        >
          <path
            d="M546.112 33.152L512.32 0 512 0.32 511.68 0l-33.792 33.152L192 308.352 269.056 384 512 150.08 754.944 384 832 308.416 546.112 33.152zM546.112 990.848L512.32 1024 512 1023.68 511.68 1024l-33.792-33.152L192 715.648 269.056 640 512 873.92 754.944 640 832 715.584l-285.888 275.264z"
            fill="currentColor"
            p-id="8592"
          ></path>
        </svg>
      </span>
    </div>
    <!-- 展开态：完整工具栏 -->
    <div v-else class="cm-toolbar-wrapper" :style="toolbarStyle" @mousedown="startDrag" @touchstart="startDragTouch">
      <div class="cm-img-button">
        <div>
          <button class="cm-collapse-btn" :style="collapseBtnOrder" @click="onCollapseClick" title="折叠">
            <svg
              class="icon"
              style="width: 1.2em; height: 1.2em; vertical-align: middle; fill: currentColor; overflow: hidden; transform: rotate(90deg)"
              viewBox="0 0 1024 1024"
              version="1.1"
              xmlns="http://www.w3.org/2000/svg"
              p-id="8591"
            >
              <path
                d="M546.112 33.152L512.32 0 512 0.32 511.68 0l-33.792 33.152L192 308.352 269.056 384 512 150.08 754.944 384 832 308.416 546.112 33.152zM546.112 990.848L512.32 1024 512 1023.68 511.68 1024l-33.792-33.152L192 715.648 269.056 640 512 873.92 754.944 640 832 715.584l-285.888 275.264z"
                fill="currentColor"
                p-id="8592"
              ></path>
            </svg>
          </button>
          <div class="language-select-wrap">
            <select v-model="selectedLanguage" class="language-select" :title="selectedLanguageTitle" aria-label="Editor language" @change="onLanguageChange">
              <option v-for="option in languageOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>
          <button @click="undoCode"><img :src="undoimg" /></button>
          <button @click="redoCode"><img :src="redoimg" /></button>
          <button @click="formatCode"><img :src="format" /></button>
          <button @click="toggleSearch"><img :src="searchimg" /></button>
          <button @click="copyText"><img :src="copyimg" /></button>
          <button @click="delAllCode"><img :src="del" /></button>
          <button @click="pasteNav"><img :src="paste" /></button>
        </div>
      </div>
      <div v-show="searchOpen" class="cm-search-box">
        <input
          ref="searchInputRef"
          v-model="searchQuery"
          type="text"
          class="cm-search-input"
          placeholder="查找…"
          @input="onSearchInput"
          @keydown.enter.prevent="onSearchEnter"
          @keydown.escape.prevent="toggleSearch"
        />
        <button class="cm-search-btn" @click="findPrev" title="上一个 (Shift+Enter)">&#x25B2;</button>
        <button class="cm-search-opt" :class="{ active: searchCaseSensitive }" @click="toggleCaseSensitive" title="区分大小写">Aa</button>
        <button class="cm-search-opt" :class="{ active: searchWholeWord }" @click="toggleWholeWord" title="全词匹配">ab</button>
        <button class="cm-search-opt" :class="{ active: searchRegexp }" @click="toggleRegexp" title="正则表达式">.*</button>

        <input v-model="replaceQuery" type="text" class="cm-search-input" placeholder="替换…" @keydown.enter.prevent="replaceNext" />
        <button class="cm-search-btn" @click="findNext" title="下一个 (Enter)">&#x25BC;</button>
        <button class="cm-replace-btn" @click="replaceNext">替换</button>
        <button class="cm-replace-btn" style="grid-column: span 2" @click="replaceAll">全替换</button>
      </div>
    </div>
    <div ref="viewRef" style="width: 100%; font-size: 11px" />
    <div style="height: 10px" />
  </div>
</template>
<script setup>
import { darkCode } from "./dark.js";
import { lightCode } from "./light.js";
import { javascript } from "@/EditCode/lang-js";
import { json } from "@codemirror/lang-json";

import { canFormatEditorLanguage, detectEditorLanguage, EDITOR_LANGUAGE_OPTIONS, formatEditorCode, loadEditorLanguageExtension, normalizeEditorLanguage } from "@/EditCode/editorLanguages";
import { renameFileExtension } from "@/EditCode/fileLanguageUtils";
import { shikiHighlight } from "@/EditCode/shikiHighlight";
import { computed, nextTick, ref, onBeforeUnmount, onMounted, watch, watchEffect } from "vue";
import {
  highlightSelectionMatches,
  searchKeymap,
  gotoLine,
  setSearchQuery,
  SearchQuery,
  getSearchQuery,
  findNext as cmFindNext,
  findPrevious as cmFindPrev,
  replaceNext as cmReplaceNext,
  replaceAll as cmReplaceAll,
} from "@/EditCode/search";
import { lineNumbers, EditorView, highlightActiveLine, keymap, placeholder as cmPlaceholder } from "@codemirror/view";
import { foldGutter, bracketMatching } from "@codemirror/language";
import { undo, redo, history, defaultKeymap, historyKeymap, indentWithTab } from "@codemirror/commands";
import { closeBrackets, autocompletion } from "@codemirror/autocomplete";
import { Compartment, EditorState } from "@codemirror/state";
import { hyperLink } from "@/EditCode/link";
import { indentationMarkers } from "@replit/codemirror-indentation-markers";
import { showToast } from "vant";
import useV3Clipboard from "vue-clipboard3";
import copyimg from "@/img/svg/copy.svg";
import del from "@/img/svg/del.svg";
import paste from "@/img/svg/zt.svg";
import searchimg from "@/img/svg/search.svg";
import format from "@/img/svg/format.svg";
import redoimg from "@/img/svg/redo.svg";
import undoimg from "@/img/svg/undo.svg";
import { useTheme } from "@/hooks/theme";
import { useCmStore } from "@/store/cmCodeStore.js";

///
const { toClipboard } = useV3Clipboard();
const cmStore = useCmStore();
// const Length = ref("");
const { isDarkModeEnabled } = useTheme();
// const props = defineProps(["isReadOnly", "editorLanguage", "placeholder","toolbarActions"]);
const props = defineProps({
  isReadOnly: {
    type: Boolean,
    default: false,
  },
  id: {
    type: String,
    required: true,
  },
  editorLanguage: {
    default: undefined,
  },
  placeholder: {
    type: String,
    default: "",
  },
  enableFullscreen: {
    type: Boolean,
    default: true,
  },
  enableImport: {
    type: Boolean,
    default: true,
  },
  toolbarActions: {
    type: Array,
    default: () => ["fullscreen", "import", "language-detect", "language", "undo", "redo", "format", "search", "copy", "delete", "paste", "panel"],
  },
  toolbarVariant: {
    type: String,
    default: "default",
  },
});

const viewRef = ref(null);
const langs = new Compartment();
const editorTheme = new Compartment();
const shikiSyntax = new Compartment();
const editorPlaceholder = new Compartment();
const selectedLanguage = ref(normalizeEditorLanguage(props.editorLanguage, "auto"));
const activeLanguage = ref("plaintext");

const autoDetectedLanguage = ref(null);

const isFormatting = ref(false);

const editorLanguage_short = {
  javascript: "JS",
  json: "JSON",
  json5: "J..5",
  yaml: "YAML",
  ini: "INI",
  plaintext: "TXT",
};

let languageRequestId = 0;
const editorLanguage_json = {
  auto: "自动",
  javascript: "JavaScript",
  json: "JSON",
  json5: "J..5",
  yaml: "YAML",
  ini: "INI",
  plaintext: "纯文本",
  detect: {
    auto: "自动检测语言",
    cancel: "取消自动检测",
    retry: "重试自动检测",
  },
};
const languageDetectionStatus = ref("idle");
const getLanguageLabel = (language) => {
  const normalizedLanguage = normalizeEditorLanguage(language, "plaintext");
  return editorLanguage_json[normalizedLanguage] || editorLanguage_json.plaintext;
};
const getShortLanguageLabel = (language) => {
  const normalizedLanguage = normalizeEditorLanguage(language, "plaintext");
  return editorLanguage_short[normalizedLanguage] || getLanguageLabel(normalizedLanguage);
};

const selectedLanguageDisplayLabel = computed(() => getLanguageLabel(selectedLanguage.value));

const LANGUAGE_DETECTION_BUSY_DELAY = 300;
let languageDetectionTimer;
const clearLanguageDetectionTimer = () => {
  if (languageDetectionTimer !== undefined) {
    clearTimeout(languageDetectionTimer);
    languageDetectionTimer = undefined;
  }
};
const scheduleLanguageDetectionBusy = (requestId) => {
  clearLanguageDetectionTimer();
  languageDetectionTimer = setTimeout(() => {
    languageDetectionTimer = undefined;
    if (requestId === languageRequestId && normalizeEditorLanguage(selectedLanguage.value, "auto") === "auto") {
      languageDetectionStatus.value = "detecting";
    }
  }, LANGUAGE_DETECTION_BUSY_DELAY);
};
const finishLanguageDetection = (requestId, status = "idle") => {
  if (requestId !== languageRequestId) return;

  clearLanguageDetectionTimer();
  languageDetectionStatus.value = status;
};

const emit = defineEmits(["update:editorLanguage"]);
const onLanguageChange = () => {
  selectedLanguage.value = normalizeEditorLanguage(selectedLanguage.value, "auto");
  emit("update:editorLanguage", selectedLanguage.value === "auto" ? undefined : selectedLanguage.value);
  syncLanguageForDocument(view?.state.doc.toString() || "");
};

const languageOptions = computed(() =>
  EDITOR_LANGUAGE_OPTIONS.map((option) => {
    let label;
    if (option.value === "auto") {
      label = autoDetectedLanguage.value ? `${getShortLanguageLabel(autoDetectedLanguage.value)}` : getLanguageLabel(option.value);
    } else if (option.value === "javascript" || option.value === "plaintext") {
      label = getShortLanguageLabel(option.value);
    } else {
      label = getLanguageLabel(option.value);
    }
    return { ...option, label };
  }),
);
const selectedLanguageTitle = computed(() => {
  if (normalizeEditorLanguage(selectedLanguage.value, "auto") !== "auto") {
    return selectedLanguageDisplayLabel.value;
  }

  return autoDetectedLanguage.value ? `${getShortLanguageLabel(autoDetectedLanguage.value)}` : getLanguageLabel("auto");
});

const createShikiHighlight = (language = activeLanguage.value) =>
  shikiHighlight({
    language,
    dark: isDarkModeEnabled.value,
  });

const applyLanguage = async (language, requestId = ++languageRequestId) => {
  const nextLanguage = normalizeEditorLanguage(language, "plaintext");
  if (!view || requestId !== languageRequestId) return;

  // 文件名改写是独立于"语法高亮是否需要重新配置"的副作用：
  // 即使 nextLanguage 和当前 activeLanguage 相同（例如组件刚挂载、
  // activeLanguage 的初始值本来就是 plaintext，检测结果也恰好是 plaintext），
  // 文件名后缀也可能还没和这个语言同步过，所以每次调用都单独检查，不要被下面的
  // "语言未变化则跳过"提前 return 一并挡住。
  const renamedFile = renameFileExtension(cmStore.currentFileName, nextLanguage);
  if (renamedFile !== cmStore.currentFileName) {
    cmStore.setCurrentFileName(renamedFile);
  }

  if (nextLanguage === activeLanguage.value) return;

  activeLanguage.value = nextLanguage;
  cmStore.setActiveLanguage(nextLanguage);

  view.dispatch({
    effects: [langs.reconfigure([]), shikiSyntax.reconfigure([])],
  });

  if (nextLanguage === "plaintext") {
    return;
  }

  if (nextLanguage === "javascript") {
    console.log("启用 JavaScript 语法高亮 2  - 使用 codemirror");
    view.dispatch({
      effects: langs.reconfigure(javascript()),
    });
    return;
  }

  if (nextLanguage === "json" || nextLanguage === "json5") {
    console.log(`启用 ${nextLanguage} 语法高亮 3 - 使用 codemirror`);
    view.dispatch({
      effects: langs.reconfigure(json()),
    });
    return;
  }

  const extension = await loadEditorLanguageExtension(nextLanguage);
  if (requestId !== languageRequestId) return;
  console.log(`启用 ${getLanguageLabel(nextLanguage)} 语法高亮 4 - 使用 shiki`);
  view.dispatch({
    effects: [langs.reconfigure(extension), shikiSyntax.reconfigure(createShikiHighlight(nextLanguage))],
  });
};

// 自动识别：按文档内容检测语言（语言变化后会反向改写文件名后缀，见 applyLanguage）
const syncLanguageForDocument = async (docContent) => {
  const requestId = ++languageRequestId;
  const docSnapshot = docContent || "";
  const manualLanguage = normalizeEditorLanguage(selectedLanguage.value, "auto");

  if (manualLanguage === "auto") {
    languageDetectionStatus.value = "idle";
    scheduleLanguageDetectionBusy(requestId);
    try {
      const detectedLanguage = await detectEditorLanguage(docSnapshot);
      if (requestId !== languageRequestId || normalizeEditorLanguage(selectedLanguage.value, "auto") !== "auto" || (view && view.state.doc.toString() !== docSnapshot)) {
        return;
      }

      autoDetectedLanguage.value = detectedLanguage;
      await applyLanguage(detectedLanguage, requestId);
      finishLanguageDetection(requestId);
    } catch (error) {
      console.log("Editor language detection failed", error);
      finishLanguageDetection(requestId, "error");
    }
    return;
  }

  clearLanguageDetectionTimer();
  languageDetectionStatus.value = "idle";
  if (requestId !== languageRequestId || normalizeEditorLanguage(selectedLanguage.value, "auto") !== manualLanguage) {
    return;
  }

  await applyLanguage(manualLanguage, requestId);
};
const createEditorPlaceholder = () => (props.placeholder ? cmPlaceholder(props.placeholder) : []);

const SYNC_DEBOUNCE_MS = 1000;
let syncTimer = null;

const debouncedSyncLanguage = (docContent) => {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncLanguageForDocument(docContent);
  }, SYNC_DEBOUNCE_MS);
};

let docUpdate = false;
let view;
const CreateView = () => {
  view = new EditorView({
    state: EditorState.create({
      extensions: [
        history(), //历史
        keymap.of([
          indentWithTab,
          ...searchKeymap,
          ...defaultKeymap, // 注释 缩进 等等
          ...historyKeymap,
        ]),
        langs.of([]),
        shikiSyntax.of(createShikiHighlight()),
        editorPlaceholder.of(createEditorPlaceholder()),
        editorTheme.of(isDarkModeEnabled.value ? darkCode : lightCode), // 设置初始主题
        EditorState.readOnly.of(props.isReadOnly ? true : false),
        EditorView.lineWrapping, // 换行
        lineNumbers(),
        highlightActiveLine(),
        bracketMatching(),
        highlightSelectionMatches(),
        indentationMarkers(),
        closeBrackets(), // 括号闭合
        autocompletion(), // 代码补全
        EditorView.updateListener.of((update) => {
          if (!update.docChanged) return;
          const docContent = update.state.doc.toString();
          docUpdate = true;
          console.log("0 更新文档 - CodeValue");
          cmStore.setCmCode(docContent);
          docUpdate = false;
          //++
          if (selectedLanguage.value === "auto") {
            debouncedSyncLanguage(docContent); // 防抖后再检测
          }
        }),
        hyperLink,
        foldGutter({
          closedText: "▸",
          openText: "▾",
        }),
      ],
      doc: cmStore.CmCode,
    }),
    parent: viewRef.value,
  });

  watch(
    () => cmStore.CmCode,
    (newValue) => {
      const nextValue = newValue || "";

      if (!docUpdate && nextValue !== view.state.doc.toString()) {
        console.log("Code更新到文档");
        view.dispatch({
          changes: {
            from: 0,
            to: view.state.doc.length,
            insert: nextValue,
          },
        });
        syncLanguageForDocument(nextValue);
      }
    },
  );

  watch(isDarkModeEnabled, (isDark) => {
    console.log(isDarkModeEnabled);
    view.dispatch({
      effects: [editorTheme.reconfigure(isDark ? darkCode : lightCode), shikiSyntax.reconfigure(createShikiHighlight())],
    });
  });
};

watch(
  () => props.editorLanguage,
  (language) => {
    const nextLanguage = normalizeEditorLanguage(language, "auto");
    if (selectedLanguage.value === nextLanguage) return;

    selectedLanguage.value = nextLanguage;
    syncLanguageForDocument(view?.state.doc.toString() || "");
  },
);

watch(
  () => props.placeholder,
  () => {
    if (!view) return;
    view.dispatch({
      effects: editorPlaceholder.reconfigure(createEditorPlaceholder()),
    });
  },
);

// function formatLength(length) {
//   if (length < 1024) {
//     return length === 0 ? "" : length + " bytes";
//   } else if (length < 1024 * 1024) {
//     return (length / 1024).toFixed(2) + " KB";
//   } else {
//     return (length / (1024 * 1024)).toFixed(2) + " MB";
//   }
// }

onMounted(() => {
  CreateView();
  const initialCode = cmStore.CmCode || "";
  syncLanguageForDocument(initialCode);
});

onBeforeUnmount(() => {
  clearLanguageDetectionTimer();
  clearTimeout(syncTimer);
  // 卸载前用当前最新内容强制保存一次，避免丢失防抖期间的最后改动
});

const collapsed = ref(localStorage.getItem("cm_collapsed") === "true");
watch(collapsed, (v) => localStorage.setItem("cm_collapsed", v));
const searchOpen = ref(false);
const collapseBtnOrder = computed(() => ({ order: 999 }));
const toolbarStyle = computed(() => ({ right: "2%", top: toolbarTopPx.value + "px" }));
const searchQuery = ref("");
const replaceQuery = ref("");
const searchCaseSensitive = ref(false);
const searchWholeWord = ref(false);
const searchRegexp = ref(false);
const searchInputRef = ref(null);

const buildSearchQuery = () =>
  new SearchQuery({
    search: searchQuery.value,
    replace: replaceQuery.value,
    caseSensitive: searchCaseSensitive.value,
    wholeWord: searchWholeWord.value,
    regexp: searchRegexp.value,
  });

const dispatchSearch = () => {
  if (!view) return;
  view.dispatch({ effects: setSearchQuery.of(buildSearchQuery()) });
};

const toggleCaseSensitive = () => {
  searchCaseSensitive.value = !searchCaseSensitive.value;
  dispatchSearch();
};
const toggleWholeWord = () => {
  searchWholeWord.value = !searchWholeWord.value;
  dispatchSearch();
};
const toggleRegexp = () => {
  searchRegexp.value = !searchRegexp.value;
  dispatchSearch();
};

const toggleSearch = () => {
  searchOpen.value = !searchOpen.value;
  if (searchOpen.value) {
    nextTick(() => {
      searchInputRef.value?.focus();
      searchInputRef.value?.select();
    });
  } else {
    searchQuery.value = "";
    replaceQuery.value = "";
    searchCaseSensitive.value = false;
    searchWholeWord.value = false;
    searchRegexp.value = false;
    dispatchSearch();
  }
};

const onSearchInput = () => {
  dispatchSearch();
};

const onSearchEnter = (e) => {
  dispatchSearch();
  if (e.shiftKey) {
    cmFindPrev(view);
  } else {
    cmFindNext(view);
  }
};

const findNext = () => {
  if (searchQuery.value && view) {
    dispatchSearch();
    cmFindNext(view);
  }
};

const findPrev = () => {
  if (searchQuery.value && view) {
    dispatchSearch();
    cmFindPrev(view);
  }
};

const replaceNext = () => {
  if (searchQuery.value && view) {
    dispatchSearch();
    cmReplaceNext(view);
  }
};

const replaceAll = () => {
  if (searchQuery.value && view) {
    dispatchSearch();
    cmReplaceAll(view);
  }
};

const undoCode = () => undo(view);
const redoCode = () => redo(view);

const refreshEditorLayout = () => {
  nextTick(() => {
    view?.requestMeasure?.();
  });
};

async function formatCode() {
  if (!canFormatEditorLanguage(activeLanguage.value)) return;

  isFormatting.value = true;
  const result = await formatEditorCode(activeLanguage.value, cmStore.CmCode || "");
  isFormatting.value = false;

  if (result.ok) {
    cmStore.setCmCode(result.code);
    return;
  }

  console.error(result.error);
  showToast("当前语言暂不支持格式化 : 格式化失败, 内容未修改");
}

const copyText = async () => {
  const x = await toClipboard(cmStore.CmCode);
  if (x) showToast("已复制字符串数: " + x?.text?.length);
};

const delAllCode = () => {
  showToast("已清空");
  cmStore.setCmCode("");
};

const pasteNav = async () => {
  try {
    const clipboardText = await navigator.clipboard.readText();
    if (clipboardText?.length > 0) {
      cmStore.setCmCode(clipboardText);
      showToast("已粘贴字数: " + clipboardText.length);
    }
  } catch (e) {
    showToast("获取剪贴板失败: 非Https");
  }
};

// ===== 工具栏垂直拖拽（像素级，顺滑） =====
let dragStartY = 0;
let dragStartTop = 0;
const DRAG_THRESHOLD = 6;
let isDragging = false;

const toolbarTopPx = ref(parseFloat(localStorage.getItem("cm_toolbar_top_px")) || Math.round(window.innerHeight * 0.66));

const onCollapseClick = () => {
  collapsed.value = true;
};
const toggleCollapsed = () => {
  collapsed.value = !collapsed.value;
};

/* 拖拽移动≥6px 后，在捕获阶段拦截下一次工具栏内的 click 事件 */
function blockClickAfterDrag(e) {
  if (e.target.closest(".cm-toolbar-wrapper, .cm-collapsed-dot")) {
    e.stopPropagation();
  }
}

function startDrag(e) {
  if (e.target.closest("input, select, textarea, option")) return;
  dragStartY = e.clientY;
  dragStartTop = toolbarTopPx.value;
  isDragging = false;
  document.addEventListener("mousemove", onDrag);
  document.addEventListener("mouseup", endDrag);
}

function startDragTouch(e) {
  if (e.target.closest("input, select, textarea, option")) return;
  const t = e.touches[0];
  dragStartY = t.clientY;
  dragStartTop = toolbarTopPx.value;
  isDragging = false;
  document.addEventListener("touchmove", onDragTouch, { passive: false });
  document.addEventListener("touchend", endDragTouch);
}

function onDrag(ev) {
  const dy = ev.clientY - dragStartY;
  if (!isDragging && Math.abs(dy) < DRAG_THRESHOLD) return;
  isDragging = true;
  toolbarTopPx.value = Math.max(0, Math.min(window.innerHeight - 60, dragStartTop + dy));
  /* 一旦确认拖拽，拦截紧接着的 click */
  document.addEventListener("click", blockClickAfterDrag, { capture: true, once: true });
}

function onDragTouch(ev) {
  const t = ev.touches[0];
  const dy = t.clientY - dragStartY;
  if (!isDragging && Math.abs(dy) < DRAG_THRESHOLD) return;
  ev.preventDefault();
  isDragging = true;
  toolbarTopPx.value = Math.max(0, Math.min(window.innerHeight - 60, dragStartTop + dy));
  /* 一旦确认拖拽，拦截紧接着的 click */
  document.addEventListener("click", blockClickAfterDrag, { capture: true, once: true });
}

function endDrag() {
  document.removeEventListener("mousemove", onDrag);
  document.removeEventListener("mouseup", endDrag);
  if (isDragging) {
    localStorage.setItem("cm_toolbar_top_px", toolbarTopPx.value.toString());
  }
}

function endDragTouch() {
  document.removeEventListener("touchmove", onDragTouch);
  document.removeEventListener("touchend", endDragTouch);
  if (isDragging) {
    localStorage.setItem("cm_toolbar_top_px", toolbarTopPx.value.toString());
  }
}
// ===== 工具栏垂直拖拽 end =====
</script>

<style lang="scss" scoped>
// .cmviewRef {
// 工具栏通过 fixed 定位悬浮，无需额外 padding
// }

.language-select-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  padding: 0;
  margin-right: 0px;
  margin-left: 12px;
  color: var(--second-text-color);
  flex-shrink: 0;
  border: 0px solid #8b8b8b66;
  border-radius: 16px;
}

.language-select-display {
  position: absolute;
  inset: 0 20px 0 8px;
  z-index: 1001;
  display: flex;
  align-items: center;
  overflow: hidden;
  color: currentColor;
  font-size: 11px;
  line-height: 14px;
  pointer-events: none;
  word-break: break-word;
}

// .language-select {
//   // text-align: right;
//   -webkit-appearance: none;
//   appearance: none;
//   display: block;
//   position: relative;
//   z-index: 2;
//   box-sizing: border-box;
//   height: 34px;
//   // width: auto;
//   min-width: 34px;
//   max-width: 34px;
//   max-width: 34vw;
//   // padding: 0 20px 0 8px;
//   // border: 1px solid #8b8b8b66;
//   // border-radius: 16px;
//   background-color: transparent;
//   background-image: none;
//   box-shadow: none;
//   color: transparent;
//   // font-size: 9px;
//   // line-height: 14px;
//   outline: none;
//   // opacity: 1;/
//   // text-overflow: ellipsis;
//   // -webkit-text-fill-color: transparent;
// }

.language-select:focus {
  border-color: #8fb4e8;
}

.language-select option {
  color: #222;
  background-color: #fff;
  -webkit-text-fill-color: #222;
}

.language-select {
  background: transparent;
  border: 0px solid rgba(128, 128, 128, 0.5);
  text-align: center;
  text-align-last: center;
  color: var(--text);
  font-size: 11px;
  line-height: 34px;
  width: 34px;
  min-width: 34px;
  max-width: 34px;
  height: 34px;
  min-height: 34px;
  max-height: 34px;
  outline: none;
  appearance: none;
  -webkit-appearance: none;
  padding: 0;
  margin: 0;
  box-sizing: border-box;
  overflow: hidden;
}
.cm-img-button button {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 31px;
    height: 30px;

    // background: #000;
    justify-content: center;
    align-items: center;
    // background: var(--cm-bg, rgba(0, 0, 0, 0.062));
    // color: #222;
    // opacity: .1;
    // border-radius: 20px;
    // border: 1px solid rgba(128, 128, 128, 0.3);
  }
@media (max-width: 480px) {
  // .cm-img-button button {
  //   display: flex;
  //   align-items: center;
  //   gap: 6px;
  //   width: 31px;
  //   height: 30px;

  //   // background: #000;
  //   justify-content: center;
  //   align-items: center;
  //   // background: var(--cm-bg, rgba(0, 0, 0, 0.062));
  //   // color: #222;
  //   // opacity: .1;
  //   // border-radius: 20px;
  //   // border: 1px solid rgba(128, 128, 128, 0.3);
  // }

  .cm-img-button .language-detect-button {
    flex-basis: 22px;
    width: 22px;
    height: 22px;
    margin-right: 3px;
  }

  .language-select-wrap {
    // margin-right: 3px;
  }

  .language-select {
    // width: 34px;
    // padding-right: 18px;
    // padding-left: 7px;
  }

  .language-select-display {
    inset: 0 18px 0 7px;
  }

  .language-select-wrap::after {
    right: 7px;
  }
}

.cm-toolbar-wrapper {
  position: fixed;
  right: 4%;
  top: 0;
  z-index: 1001;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0;
  width: fit-content;
  max-width: 96vw;
  background: #eee;
  color: #222;
  opacity: 1;
  border-radius: 23px;
  border: 1px solid rgba(128, 128, 128, 0.3);

  box-shadow: 0 0 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  cursor: grab;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  will-change: top;
}

.cm-toolbar-wrapper:active {
  cursor: grabbing;
}

/* 折叠态小圆点 */
.cm-collapsed-dot {
  position: fixed;
  right: 3%;
  top: 0;
  z-index: 1001;
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--cm-bg, rgba(255, 255, 255, 0.96));
  border-radius: 23px;
  border: 1px solid rgba(128, 128, 128, 0.3);

  box-shadow: 0 0 8px rgba(0, 0, 0, 0.08);
  cursor: grab;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  will-change: top;
  opacity: 1;
  transition:
    width 0.2s,
    height 0.2s,
    border-radius 0.2s;
}

.cm-collapsed-dot:active {
  cursor: grabbing;
}

.cm-collapsed-icon {
  font-size: 16px;
  font-weight: 700;
  color: #222;
  pointer-events: none;
}

/* 折叠按钮（左侧圆点） */
.cm-collapse-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: none;
  background: transparent;
  color: #222;
  font-size: 20px;
  cursor: pointer;
  border-radius: 50%;
  opacity: 1;
  filter: none;
  transition:
    opacity 0.15s,
    background 0.15s;
}

.cm-collapse-btn:hover {
  opacity: 1;
}

.cm-img-button {
  flex-shrink: 1;
  min-width: 0;
  overflow-x: auto;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 6px;
  padding: 6px 14px 6px 0;
  width: auto;
}

.cm-img-button > div:first-child {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* 非桌面端（移动端）底部留出安全区 */
@media (hover: none) and (pointer: coarse) {
  .cm-toolbar-wrapper {
    top: calc(env(safe-area-inset-top, 0px) + 50px);
  }
}

@media (prefers-color-scheme: dark) {
  .cm-toolbar-wrapper,
  .cm-collapsed-dot {
    background: #282c34;
    border-color: rgba(255, 255, 255, 0.15);
    color: var(--text, inherit);
  }
  .cm-collapse-btn,
  .cm-collapsed-icon {
    color: var(--text, inherit);
  }
  .cm-search-input {
    background: rgba(255, 255, 255, 0.06);
  }
  .cm-search-input:focus {
    background: rgba(143, 180, 232, 0.08);
  }
  .cm-search-opt.active {
    border-color: #6a9ed8;
    background: rgba(106, 158, 216, 0.2);
    color: #7ab0f0;
  }
}

/* ===== 自定义搜索框 ===== */
.cm-search-box {
  display: grid;
  grid-template-columns: 1fr repeat(4, auto);
  gap: 5px;
  row-gap: 5px;
  width: 100%;
  padding: 8px 10px 8px;
  background: transparent;
  border-bottom: 1px solid rgba(128, 128, 128, 0.15);
  overflow: hidden;
  box-sizing: border-box;
}

.cm-search-input {
  flex: 1;
  min-width: 0;
  height: 26px;
  padding: 0 8px;
  border: 1px solid rgba(128, 128, 128, 0.25);
  border-radius: 16px;
  background: rgba(128, 128, 128, 0.06);
  color: inherit;
  font-size: 12px;
  outline: none;
  transition: border-color 0.15s;
}

.cm-search-input:focus {
  border-color: #8fb4e8;
  background: rgba(143, 180, 232, 0.06);
}

.cm-search-btn,
.cm-replace-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 26px;
  min-width: 52px;
  padding: 0 7px;
  margin: 0 2px 0 4px;
  border: 1px solid rgba(128, 128, 128, 0.25);
  border-radius: 16px;
  background: transparent;
  color: inherit;
  font-size: 11px;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s;
}

.cm-search-btn:hover,
.cm-replace-btn:hover {
  background: rgba(128, 128, 128, 0.1);
}

/* 搜索选项切换按钮: Aa / .* / ab */
.cm-search-opt {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 26px;
  min-width: 26px;
  padding: 0 4px;
  border: 1px solid transparent;
  border-radius: 16px;
  background: transparent;
  color: inherit;
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
  opacity: 0.45;
  transition:
    opacity 0.15s,
    background 0.15s,
    border-color 0.15s;
  letter-spacing: 0;
  font-family: inherit;
}

.cm-search-opt:hover {
  opacity: 0.7;
  background: rgba(128, 128, 128, 0.08);
}

.cm-search-opt.active {
  opacity: 1;
  border-color: #8fb4e8;
  background: rgba(143, 180, 232, 0.15);
  color: #4a8ad6;
}

.cm-replace-btn:active,
.cm-search-btn:active {
  background: rgba(128, 128, 128, 0.18);
}

/* 隐藏 CodeMirror 内置搜索面板 */
:deep(.cm-editor .cm-search) {
  display: none !important;
}
</style>
