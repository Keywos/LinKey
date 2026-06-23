<template>
  <div class="cmviewRef">
    <!-- 折叠态：小圆点 -->
    <div v-if="collapsed" class="cm-collapsed-dot" :style="toolbarStyle" @pointerdown="startDragPointer">
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
    <div v-else class="cm-toolbar-wrapper" :style="toolbarStyle" @pointerdown="startDragPointer">
      <div class="cm-img-button">
        <div>
          <button class="cm-collapse-btn" :style="collapseBtnOrder" title="折叠">
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
          <button @click="formatCode" title="JS 选项"><img :src="format" /></button>
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

    <!-- ★ 压缩选项弹窗 (terser) -->
    <Teleport to="body">
      <div v-if="compressOpts.visible" class="compress-overlay" @click.self="closeCompressDialog">
        <div class="compress-dialog">
          <div class="compress-title">压缩选项</div>
          <div class="compress-body">
            <div class="compress-group">
              <div class="compress-label">压缩模式</div>
              <label class="compress-radio">
                <input type="radio" v-model="compressOpts.keepNames" :value="false" />
                <span>标准压缩（混淆函数名）</span>
              </label>
              <label class="compress-radio">
                <input type="radio" v-model="compressOpts.keepNames" :value="true" />
                <span>不压缩函数名</span>
              </label>
            </div>
            <div class="compress-group">
              <div class="compress-label">Console</div>
              <label class="compress-radio">
                <input type="checkbox" v-model="compressOpts.keepConsole" />
                <span>保留 console</span>
              </label>
            </div>
            <div class="compress-group">
              <div class="compress-label">中文编码</div>
              <label class="compress-radio">
                <input type="radio" v-model="compressOpts.charset" value="utf8" />
                <span>UTF-8（保留中文）</span>
              </label>
              <label class="compress-radio">
                <input type="radio" v-model="compressOpts.charset" value="ascii" />
                <span>ASCII（\uXXXX）</span>
              </label>
            </div>
          </div>
          <div class="compress-buttons">
            <button class="compress-btn cancel" @click="closeCompressDialog">取消</button>
            <button class="compress-btn" @click="doFormat">格式化</button>
            <button class="compress-btn primary" @click="doCompress">压缩</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { darkCode } from "./dark.js";
import { lightCode } from "./light.js";
import { javascript } from "@/EditCode/lang-js";
import { json } from "@codemirror/lang-json";
import { yaml } from "@codemirror/lang-yaml";

import { detectEditorLanguage, EDITOR_LANGUAGE_OPTIONS, loadEditorLanguageExtension, normalizeEditorLanguage } from "@/EditCode/editorLanguages";
import { renameFileExtension } from "@/EditCode/fileLanguageUtils";
import { shikiHighlight } from "@/EditCode/shikiHighlight";
import { computed, nextTick, ref, reactive, onBeforeUnmount, onMounted, watch, watchEffect } from "vue";
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

const LARGE_FILE_PLAINTEXT_THRESHOLD = 5 * 1024 * 1024; // 超过 5MB 强制纯文本，不做语言检测和高亮
const SYNC_DEBOUNCE_MS = 50;
// 按文件大小分级延迟语言检测，避免大文件加载时主线程卡死
const getSyncDelay = (length) => {
  // if (length > 1048576) return 2400; // >5MB
  // if (length > 800000) return 1600;
  // if (length > 500000) return 1000;
  // if (length > 102400) return 500;
  return SYNC_DEBOUNCE_MS;
};

const { toClipboard } = useV3Clipboard();
const cmStore = useCmStore();
const { isDarkModeEnabled } = useTheme();

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
const isCopying = ref(false);

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
  const next = normalizeEditorLanguage(selectedLanguage.value, "auto");

  // ★ 超过 5MB 不允许切换语言，强制纯文本
  const docLen = view?.state.doc.length || 0;
  if (docLen > LARGE_FILE_PLAINTEXT_THRESHOLD && next !== "plaintext") {
    selectedLanguage.value = "auto";
    showToast("文件超过 5MB，仅支持纯文本");
    return;
  }

  selectedLanguage.value = next;
  emit("update:editorLanguage", next === "auto" ? undefined : next);
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

  if (nextLanguage === "yaml") {
    console.log(`启用 ${nextLanguage} 语法高亮 3 - 使用 codemirror`);
    view.dispatch({
      effects: langs.reconfigure(yaml()),
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

const syncLanguageForDocument = async (docContent) => {
  const requestId = ++languageRequestId;
  const docSnapshot = docContent || "";

  // ★ 超过 5MB 强制纯文本，不做语言检测、不高亮
  if (docSnapshot.length > LARGE_FILE_PLAINTEXT_THRESHOLD) {
    clearLanguageDetectionTimer();
    languageDetectionStatus.value = "idle";
    autoDetectedLanguage.value = null;
    await applyLanguage("plaintext", requestId);
    return;
  }

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

let syncTimer = null;

const debouncedSyncLanguage = (docContent) => {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncLanguageForDocument(docContent);
  }, getSyncDelay(docContent.length));
};

// ★ 修复：外部（cmHub）调用此方法可让下一次 setCmCode 跳过语言同步，
//   等 CodeMirror 渲染稳定后再延迟触发，避免大文件加载时卡死
let _skipNextLangSync = false;

defineExpose({
  skipNextLanguageSync() {
    _skipNextLangSync = true;
  },
});

let docUpdate = false;
let view;
const isFirstLoad = ref(true);
const CreateView = () => {
  view = new EditorView({
    state: EditorState.create({
      extensions: [
        history(),
        keymap.of([indentWithTab, ...searchKeymap, ...defaultKeymap, ...historyKeymap]),
        langs.of([]),
        shikiSyntax.of(createShikiHighlight()),
        editorPlaceholder.of(createEditorPlaceholder()),
        editorTheme.of(isDarkModeEnabled.value ? darkCode : lightCode),
        EditorState.readOnly.of(props.isReadOnly ? true : false),
        EditorView.lineWrapping,
        lineNumbers(),
        highlightActiveLine(),
        bracketMatching(),
        highlightSelectionMatches(),
        indentationMarkers(),
        closeBrackets(),
        autocompletion(),
        EditorView.updateListener.of((update) => {
          if (!update.docChanged) return;
          const docContent = update.state.doc.toString();
          docUpdate = true;
          console.log("0 更新文档 - CodeValue");
          cmStore.setCmCode(docContent);
          docUpdate = false;
          if (selectedLanguage.value === "auto" && !(docContent.length > LARGE_FILE_PLAINTEXT_THRESHOLD)) {
            debouncedSyncLanguage(docContent);
          }
        }),
        hyperLink,
        foldGutter({
          closedText: "▸",
          openText: "▾",
        }),
      ],
      doc: "", // ★ 初始空文档，首次内容由 isFirstLoad 延迟注入
    }),
    parent: viewRef.value,
  });

  const applyContentToEditor = (nextValue) => {
    console.log("Code更新到文档");
    view.dispatch({
      changes: {
        from: 0,
        to: view.state.doc.length,
        insert: nextValue,
      },
    });

    // 外部加载新文件时重置格式化状态
    isFormatted.value = false;

    // ★ 超过 5MB 强制纯文本，清理前一个文件残留的高亮扩展
    if (nextValue.length > LARGE_FILE_PLAINTEXT_THRESHOLD) {
      syncLanguageForDocument(nextValue);
      return;
    }

    // ★ 修复：如果外部标记了 skip，则等 CodeMirror 渲染完成后
    //   再延迟触发语言同步，而不是立即排队
    if (_skipNextLangSync) {
      _skipNextLangSync = false;
      nextTick(() => {
        debouncedSyncLanguage(nextValue);
      });
    } else {
      syncLanguageForDocument(nextValue);
    }
  };

  watch(
    () => cmStore.CmCode,
    (newValue) => {
      const nextValue = newValue || "";
      if (!docUpdate && nextValue !== view.state.doc.toString()) {
        // ★ 首次加载延迟 300ms，让编辑器先渲染空白壳
        if (isFirstLoad.value) {
          isFirstLoad.value = false;
          console.log("首次加载延迟 345ms");
          setTimeout(() => applyContentToEditor(nextValue), 345);
        } else {
          applyContentToEditor(nextValue);
        }
      }
    },
    { immediate: true },
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

onMounted(() => {
  CreateView();
});

onBeforeUnmount(() => {
  clearLanguageDetectionTimer();
  clearTimeout(syncTimer);
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

// ===== 格式化 / 压缩 JS 切换 =====
const isFormatted = ref(false);

const COMPRESS_OPTS_KEY = "compress_opts";
function loadCompressOpts() {
  try {
    const saved = localStorage.getItem(COMPRESS_OPTS_KEY);
    if (saved) return JSON.parse(saved);
  } catch {
    /* ignore */
  }
  return {};
}

// ★ esbuild 压缩选项状态（记忆到本地）
const compressOpts = reactive({
  visible: false,
  keepNames: false,
  keepConsole: false,
  charset: "utf8",
  ...loadCompressOpts(),
});

// 选项变化时自动保存到 localStorage
watch(
  () => [compressOpts.keepNames, compressOpts.keepConsole, compressOpts.charset],
  () => {
    localStorage.setItem(
      COMPRESS_OPTS_KEY,
      JSON.stringify({
        keepNames: compressOpts.keepNames,
        keepConsole: compressOpts.keepConsole,
        charset: compressOpts.charset,
      }),
    );
  },
  { deep: true },
);

function closeCompressDialog() {
  compressOpts.visible = false;
}

// ── Web Worker：js-beautify（格式化）& terser（压缩） ──
let formatWorker = null;
let formatWorkerRequestId = 0;
const formatWorkerPending = new Map();

function getFormatWorker() {
  if (!formatWorker) {
    formatWorker = new Worker(new URL("./formatWorker.js", import.meta.url), { type: "module" });
    formatWorker.addEventListener("message", (e) => {
      const { type, id, result, error } = e.data;
      const resolve = formatWorkerPending.get(id);
      if (!resolve) return;
      formatWorkerPending.delete(id);
      if (type === "error") {
        resolve.reject(new Error(error));
      } else {
        resolve.resolve(result);
      }
    });
  }
  return formatWorker;
}

function callFormatWorker(type, payload) {
  return new Promise((resolve, reject) => {
    const id = ++formatWorkerRequestId;
    formatWorkerPending.set(id, { resolve, reject });
    getFormatWorker().postMessage({ type, payload: { ...payload, id } });
  });
}

async function doCompress() {
  if (isFormatting.value) return;
  const code = cmStore.CmCode || "";
  if (!code) return;
  isFormatting.value = true;
  closeCompressDialog();
  showToast("正在压缩 JS…");
  const start = performance.now();
  try {
    const result = await callFormatWorker("compress", {
      code,
      options: {
        compress: {
          drop_console: !compressOpts.keepConsole,
        },
        mangle: !compressOpts.keepNames,
        format: {
          ascii_only: compressOpts.charset === "ascii",
          comments: false,
        },
      },
    });
    cmStore.setCmCode(result.code);
    isFormatted.value = false;
    const ms = (performance.now() - start).toFixed(1);
    showToast("已压缩 JS (" + ms + "ms)");
  } catch (e) {
    console.error(e);
    showToast("压缩失败: " + e.message);
  } finally {
    isFormatting.value = false;
  }
}

// ★ 格式化 — 使用 Web Worker 中的 js-beautify
async function doFormat() {
  if (isFormatting.value) return;
  const code = cmStore.CmCode || "";
  if (!code) return;
  isFormatting.value = true;
  closeCompressDialog();
  showToast("正在格式化…");

  const lang = activeLanguage.value;
  const start = performance.now();
  try {
    const formatted = await callFormatWorker("beautify", {
      code,
      lang,
      options: { indent_size: 2 },
    });
    cmStore.setCmCode(formatted);
    isFormatted.value = true;
    const ms = (performance.now() - start).toFixed(1);
    showToast("已格式化 (" + ms + "ms)");
  } catch (e) {
    console.error(e);
    showToast("格式化失败: " + (e.message || "未知错误"));
  } finally {
    isFormatting.value = false;
  }
}

const refreshEditorLayout = () => {
  nextTick(() => {
    view?.requestMeasure?.();
  });
};

async function formatCode() {
  // ★ 始终打开压缩选项弹窗
  compressOpts.visible = true;
}

const copyText = async () => {
  if (isCopying.value) return;
  isCopying.value = true;
  const code = cmStore.CmCode || "";
  const code_length = code.length;
  const isLarge = code_length > 819200; // > 800KB
  if (isLarge) showToast("正在复制…");
  try {
    const x = await toClipboard(code);
    if (isLarge) showToast("已复制 (" + code_length + " 字符)");
    else if (x) showToast("已复制 (" + (x?.text?.length || code_length) + " 字符)");
  } catch (e) {
    showToast("复制失败: " + (e.message || "未知错误"));
  } finally {
    isCopying.value = false;
  }
};

const delAllCode = () => {
  showToast("已清空");
  isFormatted.value = false;
  cmStore.setCmCode("");
};

const pasteNav = async () => {
  try {
    const clipboardText = await navigator.clipboard.readText();
    if (clipboardText?.length > 0) {
      isFormatted.value = false;
      cmStore.setCmCode(clipboardText);
      showToast("已粘贴字数: " + clipboardText.length);
    }
  } catch (e) {
    showToast("获取剪贴板失败: 非Https");
  }
};

// ===== 工具栏垂直拖拽 =====
let dragStartY = 0;
let dragStartTop = 0;
const DRAG_THRESHOLD = 6;
let isDragging = false;

const savedTopPx = localStorage.getItem("cm_toolbar_top_px");
const toolbarTopPx = ref(savedTopPx !== null ? parseFloat(savedTopPx) : Math.round(window.innerHeight * 0.66));

const onCollapseClick = () => {
  collapsed.value = true;
};
const toggleCollapsed = () => {
  collapsed.value = !collapsed.value;
};

function blockClickAfterDrag(e) {
  if (e.target.closest(".cm-toolbar-wrapper, .cm-collapsed-dot")) {
    e.stopPropagation();
  }
}

function startDragPointer(e) {
  // ★ 跳过功能性按钮/输入框，但允许拖拽手柄（折叠按钮）正常拖拽
  if (e.target.closest("input, select, textarea, option, button:not(.cm-collapse-btn)")) return;
  // ★ pageY 是文档坐标，不受 iOS 键盘弹出/收起导致的视觉视口变化影响
  dragStartY = e.pageY;
  dragStartTop = toolbarTopPx.value;
  isDragging = false;
  e.preventDefault();
  try {
    e.currentTarget.setPointerCapture(e.pointerId);
  } catch (_) {}
  document.addEventListener("pointermove", onDragPointer);
  document.addEventListener("pointerup", endDragPointer);
}

function onDragPointer(ev) {
  // ★ pageY 是文档坐标，不受 iOS 键盘弹出/收起导致的视觉视口变化影响
  const dy = ev.pageY - dragStartY;
  if (!isDragging && Math.abs(dy) < DRAG_THRESHOLD) return;
  isDragging = true;
  // ★ document.documentElement.clientHeight 是布局视口高度，iOS 键盘不影响它
  const layoutHeight = document.documentElement.clientHeight;
  toolbarTopPx.value = Math.max(0, Math.min(layoutHeight - 48, dragStartTop + dy));
  document.addEventListener("click", blockClickAfterDrag, { capture: true, once: true });
}

function endDragPointer(ev) {
  document.removeEventListener("pointermove", onDragPointer);
  document.removeEventListener("pointerup", endDragPointer);
  // ★ 无论拖拽还是点击，都阻止后续自然 click 事件，避免双击/误触
  if (isDragging) {
    localStorage.setItem("cm_toolbar_top_px", toolbarTopPx.value.toString());
  }
  document.addEventListener("click", swallowToolbarClick, { capture: true, once: true });
  if (!isDragging && ev) {
    const el = document.elementFromPoint(ev.clientX, ev.clientY);
    if (!el) return;
    const dot = el.closest(".cm-collapsed-dot");
    if (dot) {
      toggleCollapsed();
      return;
    }
    const collapseBtn = el.closest(".cm-collapse-btn");
    if (collapseBtn) {
      onCollapseClick();
      return;
    }
    const btn = el.closest("button");
    if (btn) {
      btn.click();
      return;
    }
    const wrap = el.closest(".language-select-wrap");
    if (wrap) {
      const sel = wrap.querySelector("select");
      if (sel) sel.focus();
    }
  }
}

/** 在 capture 阶段吞掉拖拽结束后工具栏区域的 click 事件（但放过 select 下拉框） */
function swallowToolbarClick(e) {
  if (e.target.closest("select, .language-select-wrap")) return;
  if (e.target.closest(".cm-toolbar-wrapper, .cm-collapsed-dot")) {
    e.stopPropagation();
  }
}
// ===== 工具栏垂直拖拽 end =====
</script>

<style lang="scss" scoped>
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
  justify-content: center;
  align-items: center;
}

@media (max-width: 480px) {
  .cm-img-button .language-detect-button {
    flex-basis: 22px;
    width: 22px;
    height: 22px;
    margin-right: 3px;
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
  touch-action: none;
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
  touch-action: none;
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

@media (hover: none) and (pointer: coarse) {
  .cm-toolbar-wrapper {
    top: calc(env(safe-area-inset-top, 0px) + 50px);
  }
}

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

:deep(.cm-editor .cm-search) {
  display: none !important;
}

/* ★ 压缩选项弹窗 */
.compress-overlay {
  position: fixed;
  inset: 0;
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.45);
}

.compress-dialog {
  width: 85%;
  max-width: 340px;
  background: #ffffffec;
  border-radius: 16px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.compress-title {
  padding: 18px 20px 10px;
  font-size: 17px;
  font-weight: 600;
  color: #222;
}

.compress-body {
  padding: 4px 20px 14px;
}

.compress-group {
  margin-bottom: 12px;
}

.compress-label {
  font-size: 12px;
  font-weight: 500;
  color: #66666680;
  margin-bottom: 6px;
}

.compress-radio {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 0;
  font-size: 14px;
  color: #3333337a;
  cursor: pointer;
}

.compress-radio input[type="radio"],
.compress-radio input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: #4a90d9;
  cursor: pointer;
}

.compress-radio span {
  user-select: none;
}

.compress-buttons {
  display: flex;
  border-top: 1px solid #eee;
}

.compress-btn {
  flex: 1;
  height: 44px;
  border: none;
  background: transparent;
  font-size: 15px;
  color: #33333362;
  cursor: pointer;
  transition: background 0.12s;
}

.compress-btn:hover {
  background: #f5f5f5;
}

.compress-btn:active {
  background: #eee;
}

.compress-btn.cancel {
  color: #999;
}

.compress-btn.primary {
  color: #4a90d9;
  font-weight: 600;
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

  .compress-overlay {
    background: rgba(0, 0, 0, 0.6);
  }
  .compress-dialog {
    background: #282c34ec;
  }
  .compress-title {
    color: #e0e0e0;
  }
  .compress-label {
    color: #999;
  }
  .compress-radio {
    color: #ccc;
  }
  .compress-buttons {
    border-top-color: #3a3a3a;
  }
  .compress-btn {
    color: #ccc;
  }
  .compress-btn:hover {
    background: #3a3a3a5f;
  }
  .compress-btn:active {
    background: #444;
  }
  .compress-btn.cancel {
    color: #888888d7;
  }
  .compress-btn.primary {
    color: #6a9ed8;
  }
  .compress-radio input[type="radio"],
  .compress-radio input[type="checkbox"] {
    accent-color: #6a9ed8;
  }
}
</style>
