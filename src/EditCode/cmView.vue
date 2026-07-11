<template>
  <div class="cmviewRef">
    <div class="cm-toolbar-row">
      <!-- 展开态：完整工具栏 -->
      <div v-if="!collapsed" class="cm-toolbar-wrapper">
        <div class="cm-img-button">
          <div>
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
            <button @click="copyText"><img :src="copyimg" /></button>
            <button @click="delAllCode"><img :src="del" /></button>
            <button @click="pasteNav"><img :src="paste" /></button>
          </div>
        </div>
      </div>
      <button
        class="cm-collapse-btn"
        :class="{ 'is-collapsed': collapsed }"
        type="button"
        :title="collapsed ? '展开工具栏' : '折叠工具栏'"
        :aria-label="collapsed ? '展开工具栏' : '折叠工具栏'"
        @click="toggleCollapsed"
      >
        <span class="cm-toolbar-more" aria-hidden="true">
          <svg class="icon" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M203.1 599.3c-48.9 0-88.6-39.6-88.6-88.5s39.6-88.5 88.6-88.5c48.9 0 88.6 39.6 88.6 88.5-0.1 48.9-39.7 88.5-88.6 88.5z m309.9 0c-48.9 0-88.6-39.6-88.6-88.5s39.6-88.5 88.6-88.5c48.9 0 88.6 39.6 88.6 88.5s-39.7 88.5-88.6 88.5z m309.9 0c-48.9 0-88.6-39.6-88.6-88.5s39.6-88.5 88.6-88.5c48.9 0 88.6 39.6 88.6 88.5s-39.6 88.5-88.6 88.5z"
            />
          </svg>
        </span>
      </button>
    </div>

    <Teleport to="body">
      <button
        v-if="!searchOpen"
        class="cm-search-fab"
        :class="{ dragging: searchFabDragging, 'is-dark': isDarkModeEnabled }"
        :style="[searchFabStyle, editorOverlayStyle]"
        type="button"
        aria-label="打开查找与替换"
        title="查找与替换（可拖动）"
        @pointerdown="startSearchFabDrag"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <circle cx="10.8" cy="10.8" r="6.6" />
          <path d="m16 16 5 5" />
        </svg>
      </button>
    </Teleport>

    <Teleport to="body">
      <section
        v-if="searchOpen"
        class="cm-search-sheet"
        :class="{ 'is-dark': isDarkModeEnabled }"
        role="dialog"
        aria-label="查找与替换"
        :style="[searchSheetStyle, editorOverlayStyle]"
        @keydown.escape.prevent="closeSearch"
      >
        <header class="cm-search-header" @pointerdown="startSearchSheetDrag">
          <div class="cm-search-options" aria-label="搜索选项">
            <button type="button" :class="{ active: searchCaseSensitive }" :aria-pressed="searchCaseSensitive" title="区分大小写" @click="toggleCaseSensitive">Aa</button>
            <button type="button" :class="{ active: searchWholeWord }" :aria-pressed="searchWholeWord" title="全词匹配" @click="toggleWholeWord">ab</button>
            <button type="button" :class="{ active: searchRegexp }" :aria-pressed="searchRegexp" title="正则表达式" @click="toggleRegexp">.*</button>
          </div>
          <span v-if="!searchIsValid" class="cm-search-error">正则无效</span>
          <button class="cm-replace-toggle" type="button" :class="{ active: replaceOpen }" :aria-expanded="replaceOpen" @click="replaceOpen = !replaceOpen">
            {{ replaceOpen ? "收起" : "替换" }}
          </button>
          <button class="cm-search-close" type="button" aria-label="关闭搜索" @click="closeSearch">×</button>
        </header>

        <div class="cm-search-field-row">
          <input
            ref="searchInputRef"
            v-model="searchQuery"
            type="search"
            enterkeyhint="search"
            class="cm-search-input"
            :class="{ invalid: !searchIsValid }"
            placeholder="查找内容"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
            @input="onSearchInput"
            @keydown.enter.prevent="onSearchEnter"
          />
          <button class="cm-search-nav" type="button" aria-label="上一个匹配" title="上一个" @click="findPrev">↑</button>
          <button class="cm-search-nav" type="button" aria-label="下一个匹配" title="下一个" @click="findNext">↓</button>
        </div>

        <div v-if="replaceOpen" class="cm-replace-area">
          <div class="cm-replace-row">
            <input
              v-model="replaceQuery"
              type="text"
              class="cm-search-input"
              placeholder="替换为（可留空）"
              autocomplete="off"
              autocapitalize="off"
              spellcheck="false"
              @input="disarmReplaceAll"
              @keydown.enter.prevent="findNext"
            />
            <div class="cm-replace-actions">
              <button type="button" :disabled="!canSearch" @click="replaceNext">替换</button>
              <button type="button" class="cm-replace-all" :class="{ armed: replaceAllArmed }" :disabled="!canSearch" @click="confirmReplaceAll">
                {{ replaceAllArmed ? "再次点击确认" : "全替" }}
              </button>
            </div>
          </div>
        </div>
      </section>
    </Teleport>
    <div ref="viewRef" style="width: 100%; font-size: 11px" />
    <div style="height: 10px" />

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
import { shikiHighlight, SHIKI_SUPPORTED_LANGUAGES } from "@/EditCode/shikiHighlight";
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
import { Compartment, EditorState, Transaction } from "@codemirror/state";
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

const LARGE_FILE_PLAINTEXT_THRESHOLD_1 = 1.4 * 1024 * 1024;
const LARGE_FILE_PLAINTEXT_THRESHOLD = 10 * 1024 * 1024; // 超过 5MB 强制纯文本，不做语言检测和高亮
const SYNC_DEBOUNCE_MS = 50;

// ★ iOS 检测 — iOS Safari 内存限制更严格，大文件需要分块加载防闪退
const IS_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const CHUNKED_LOAD_THRESHOLD = IS_IOS ? 300 * 1024 : 3 * 1024 * 1024; // iOS 300KB / 其他 3MB
const CHUNK_SIZE = IS_IOS ? 200 * 1024 : 512 * 1024;

const { toClipboard } = useV3Clipboard();
const cmStore = useCmStore();
const { isDarkModeEnabled } = useTheme();

const EDITOR_DARK_BACKGROUNDS = new Set(["#282c34", "#141414", "#000000"]);
const editorThemeVersion = ref(0);
const getEditorDarkBackground = () => {
  editorThemeVersion.value;
  const background = localStorage.getItem("EditorDarkBackground");
  return EDITOR_DARK_BACKGROUNDS.has(background) ? background : "#282c34";
};
const getEditorTheme = () => {
  if (!isDarkModeEnabled.value) return lightCode;
  getEditorDarkBackground();
  return darkCode;
};
const editorOverlayStyle = computed(() => (isDarkModeEnabled.value ? { "--editor-overlay-background": getEditorDarkBackground() } : {}));

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

const heavyDecorations = new Compartment();
const FOLD_GUTTER_THRESHOLD = 1 * 1024 * 1024; // ★ 1MB+ 关闭折叠槽
const INDENT_MARKER_THRESHOLD = 500 * 1024; // ★ 500KB+ 关闭缩进标记
const createHeavyDecorations = (docLen = 0) => {
  const deco = [];
  if (docLen < FOLD_GUTTER_THRESHOLD) deco.push(foldGutter({ closedText: "▸", openText: "▾" }));
  if (docLen < INDENT_MARKER_THRESHOLD) deco.push(indentationMarkers());
  return deco;
};

// ★ 大文件时可关闭的编辑辅助扩展（自动补全、括号匹配、选区高亮、自动闭合）
const editAssist = new Compartment();
const createEditAssist = (enabled) => (enabled ? [autocompletion(), bracketMatching(), highlightSelectionMatches(), closeBrackets()] : []);

// ★ 历史记录深度限制 — 大文件减少撤销步数以节省内存
const historyCompartment = new Compartment();
const createHistoryExt = (isLarge) => history({ minDepth: isLarge ? 50 : 200 });

// ★ 超链接装饰 — 大文件时禁用避免每次按键全文正则扫描
const hyperLinkCompartment = new Compartment();
const selectedLanguage = ref(normalizeEditorLanguage(props.editorLanguage, "auto"));
const activeLanguage = ref("plaintext");

const autoDetectedLanguage = ref(null);
const isFormatting = ref(false);
const isCopying = ref(false);

let languageRequestId = 0;
const editorLanguage_json = {
  auto: "自动",
  javascript: "JS",
  json: "JSON",
  json5: "JSON5",
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

  // ★ 手动选择非 auto 时保存到 store，选 auto 时清除
  cmStore.setManualLanguage(next !== "auto" ? next : "");

  syncLanguageForDocument(view?.state.doc.toString() || "");
};

const languageOptions = computed(() =>
  EDITOR_LANGUAGE_OPTIONS.map((option) => {
    const label = option.value === "auto" && autoDetectedLanguage.value ? getLanguageLabel(autoDetectedLanguage.value) : getLanguageLabel(option.value);
    return { ...option, label };
  }),
);
const selectedLanguageTitle = computed(() => {
  if (normalizeEditorLanguage(selectedLanguage.value, "auto") !== "auto") {
    return selectedLanguageDisplayLabel.value;
  }
  return autoDetectedLanguage.value ? getLanguageLabel(autoDetectedLanguage.value) : getLanguageLabel("auto");
});

const createShikiHighlight = (language = activeLanguage.value) =>
  shikiHighlight({
    language,
    dark: isDarkModeEnabled.value,
  });

const applyLanguage = async (language, requestId = ++languageRequestId) => {
  const nextLanguage = normalizeEditorLanguage(language, "plaintext");
  if (!view || requestId !== languageRequestId) return;

  // ★ 只有文件名无扩展名时才自动改写后缀（例如 example → example.js）
  //   有扩展名的文件保留原始后缀，避免 .json 被改写成 .js 或 .sg 被改写成 .txt
  if (!_skipNextFileRename) {
    const name = cmStore.currentFileName || "";
    const hasExt = name.includes(".") && !name.endsWith(".");
    if (!hasExt) {
      const renamedFile = renameFileExtension(name, nextLanguage);
      if (renamedFile !== name) {
        cmStore.setCurrentFileName(renamedFile);
      }
    }
  }
  _skipNextFileRename = false; // 用完即重置

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

  const effects = [langs.reconfigure(extension)];
  if (SHIKI_SUPPORTED_LANGUAGES.has(nextLanguage)) {
    console.log(`启用 ${getLanguageLabel(nextLanguage)} 语法高亮 - 使用 shiki`);
    effects.push(shikiSyntax.reconfigure(createShikiHighlight(nextLanguage)));
  } else {
    console.log(`启用 ${getLanguageLabel(nextLanguage)} 语法高亮 - 使用 codemirror`);
    effects.push(shikiSyntax.reconfigure([]));
  }
  view.dispatch({ effects });
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
      const detectedLanguage = await detectEditorLanguage(docSnapshot, cmStore.currentFileName);
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

/** 根据文件名扩展名映射语言，无匹配返回 null */
const EXT_TO_LANG = {
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  ts: "javascript",
  tsx: "javascript",
  json: "json",
  json5: "json5",
  yaml: "yaml",
  yml: "yaml",
  ini: "ini",
};
function detectLanguageFromFilename(filename) {
  if (!filename) return null;
  const ext = filename.split(".").pop()?.toLowerCase();
  return EXT_TO_LANG[ext] || null;
}

/**
 * 根据文件名扩展名判断是否需要锁定语言模式。
 * 有扩展名（即使不在 EXT_TO_LANG 映射中）就锁定，避免后续编辑触发自动检测覆盖语言。
 * 无扩展名返回 null 保持 auto 模式。
 */
function shouldLockLanguageFromFilename(filename) {
  if (!filename) return null;
  const parts = filename.split(".");
  if (parts.length < 2 || !parts.at(-1)) return null; // 无扩展名
  const ext = parts.at(-1).toLowerCase();
  return EXT_TO_LANG[ext] || "plaintext";
}

const createEditorPlaceholder = () => (props.placeholder ? cmPlaceholder(props.placeholder) : []);

let syncTimer = null;
let syncIdleId = null; // requestIdleCallback ID

const debouncedSyncLanguage = (docContent) => {
  clearTimeout(syncTimer);
  if (syncIdleId != null && typeof cancelIdleCallback !== "undefined") {
    cancelIdleCallback(syncIdleId);
    syncIdleId = null;
  }

  const isLarge = docContent.length > LARGE_FILE_PLAINTEXT_THRESHOLD_1;

  if (isLarge && typeof requestIdleCallback !== "undefined") {
    // ★ 大文件使用 requestIdleCallback，让浏览器在空闲时再做语言检测
    syncIdleId = requestIdleCallback(
      () => {
        syncIdleId = null;
        syncLanguageForDocument(docContent);
      },
      { timeout: 2000 },
    );
  } else {
    syncTimer = setTimeout(() => {
      syncLanguageForDocument(docContent);
    }, SYNC_DEBOUNCE_MS);
  }
};

// ★ 修复：外部（cmHub）调用此方法可让下一次 setCmCode 跳过语言同步，
//   等 CodeMirror 渲染稳定后再延迟触发，避免大文件加载时卡死
let _skipNextLangSync = false;

// ★ 外部加载新内容时标记跳过历史记录（新建/URL/导入/切换文件），
//   让 applyContentToEditor 使用 addToHistory.of(false)
let _skipNextHistory = false;

// ★ 外部加载新文件时跳过 applyLanguage 中的文件名后缀改写，
//   保留 URL/导入文件的原始扩展名
let _skipNextFileRename = false;

defineExpose({
  skipNextLanguageSync() {
    _skipNextLangSync = true;
  },
  skipNextHistory() {
    _skipNextHistory = true;
  },
  skipNextFileRename() {
    _skipNextFileRename = true;
  },
  // ★ 大文件编辑后手动刷新 store，确保自动保存拿到最新内容
  flushStoreSync() {
    flushStoreSync();
  },
});

let docUpdate = false;
let _chunkedLoading = false; // ★ 分块加载中，跳过 updateListener 的 store 同步

// ★ 大文件编辑时防抖同步到 store — 避免每次按键都复制整个文档字符串
let _storeSyncTimer = null;
const STORE_SYNC_DELAY = 300; // 大文件编辑时 300ms 防抖
let _pendingStoreContent = null;

const flushStoreSync = () => {
  if (_storeSyncTimer) {
    clearTimeout(_storeSyncTimer);
    _storeSyncTimer = null;
  }
  if (_pendingStoreContent != null) {
    docUpdate = true;
    cmStore.setCmCode(_pendingStoreContent);
    docUpdate = false;
    _pendingStoreContent = null;
  }
};

const debouncedStoreSync = (content) => {
  _pendingStoreContent = content;
  clearTimeout(_storeSyncTimer);
  _storeSyncTimer = setTimeout(flushStoreSync, STORE_SYNC_DELAY);
};

let view;
// const isFirstLoad = ref(true);
const CreateView = () => {
  view = new EditorView({
    state: EditorState.create({
      extensions: [
        historyCompartment.of(history()),
        keymap.of([{ key: "Mod-f", run: () => (openSearch(), true) }, indentWithTab, ...searchKeymap, ...defaultKeymap, ...historyKeymap]),
        langs.of([]),
        shikiSyntax.of([]), // ★ 初始不加载，由 applyLanguage 按需开启
        editorPlaceholder.of(createEditorPlaceholder()),
        editorTheme.of(getEditorTheme()),
        EditorState.readOnly.of(props.isReadOnly ? true : false),
        EditorView.lineWrapping, // 换行
        lineNumbers(),
        highlightActiveLine(),
        editAssist.of(createEditAssist(true)), // ★ 初始启用，大文件时动态关闭
        EditorView.updateListener.of((update) => {
          if (!update.docChanged || _chunkedLoading) return; // ★ 分块加载时跳过
          const docContent = update.state.doc.toString();
          const docLen = docContent.length;

          // ★ 统一防抖同步到 store — 避免每次按键都 toString + 同步
          debouncedStoreSync(docContent);

          if (selectedLanguage.value === "auto" && !(docLen > LARGE_FILE_PLAINTEXT_THRESHOLD) && !_skipNextLangSync) {
            debouncedSyncLanguage(docContent);
          }
        }),
        hyperLinkCompartment.of(hyperLink),
        heavyDecorations.of(createHeavyDecorations()),
      ],
      doc: "", // ★ 初始空文档，首次内容由 isFirstLoad 延迟注入
    }),
    parent: viewRef.value,
  });

  const applyContentToEditor = async (nextValue) => {
    console.log("Code更新到文档");
    const isLargeFile = nextValue.length > LARGE_FILE_PLAINTEXT_THRESHOLD_1;
    const needChunked = nextValue.length > CHUNKED_LOAD_THRESHOLD;

    // ★ 用户手动选过语言 → 始终用它覆盖
    const manualLang = cmStore.manualLanguage;
    if (manualLang) {
      selectedLanguage.value = manualLang;
      autoDetectedLanguage.value = manualLang;
      await applyLanguage(manualLang);
    } else {
      // ★ 没有手动语言 → 重置 selectedLanguage 为 auto，
      //    避免上一个文件的语言残留导致扩展名检测/自动检测被跳过
      selectedLanguage.value = "auto";
      autoDetectedLanguage.value = null;

      // ★ 根据文件名扩展名锁定语言
      const extLang = shouldLockLanguageFromFilename(cmStore.currentFileName);
      if (extLang) {
        selectedLanguage.value = extLang;
        autoDetectedLanguage.value = extLang;
        await applyLanguage(extLang);
      }
    }

    const skipHist = _skipNextHistory;
    _skipNextHistory = false; // 用完即重置

    // ★ 根据文件大小动态调整编辑辅助和历史深度
    const editAssistEnabled = !isLargeFile;
    const historyLimited = isLargeFile;

    if (!needChunked) {
      // ★ 小文件：单次 dispatch 直接替换
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: nextValue },
        effects: [
          heavyDecorations.reconfigure(createHeavyDecorations(nextValue.length)),
          editAssist.reconfigure(createEditAssist(editAssistEnabled)),
          historyCompartment.reconfigure(createHistoryExt(historyLimited)),
          hyperLinkCompartment.reconfigure(isLargeFile ? [] : hyperLink),
        ],
        annotations: Transaction.addToHistory.of(!skipHist),
      });
    } else {
      // ★ 大文件分块加载 — 防止 iOS 闪退
      _chunkedLoading = true; // 暂停 updateListener 的 store 同步
      try {
        // Phase 1: 先清空文档、关闭重型装饰，释放旧文档内存
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: "" },
          effects: [heavyDecorations.reconfigure([]), editAssist.reconfigure(createEditAssist(false)), historyCompartment.reconfigure(createHistoryExt(true)), hyperLinkCompartment.reconfigure([])],
          annotations: Transaction.addToHistory.of(false),
        });
        // 让出主线程，等待 GC 回收旧文档 + 浏览器绘制
        await new Promise((r) => setTimeout(r, 0));

        // Phase 2: 分块插入内容
        for (let offset = 0; offset < nextValue.length; offset += CHUNK_SIZE) {
          const chunk = nextValue.slice(offset, Math.min(offset + CHUNK_SIZE, nextValue.length));
          const pos = view.state.doc.length;
          const isFirstChunk = offset === 0;
          view.dispatch({
            changes: { from: pos, insert: chunk },
            // 仅第一块记录历史（整个内容算一步撤销）
            annotations: isFirstChunk ? Transaction.addToHistory.of(!skipHist) : Transaction.addToHistory.of(false),
          });
          // 每块之间让出主线程，防止 iOS watchdog 超时
          if (offset + CHUNK_SIZE < nextValue.length) {
            await new Promise((r) => setTimeout(r, 0));
          }
        }
      } finally {
        _chunkedLoading = false;
      }

      // 分块完成，同步最终内容到 store
      docUpdate = true;
      cmStore.setCmCode(nextValue);
      docUpdate = false;

      console.log(`分块加载完成: ${(nextValue.length / 1024).toFixed(0)}KB, ${Math.ceil(nextValue.length / CHUNK_SIZE)} 块`);
    }

    await nextTick();

    // 外部加载新文件时重置格式化状态
    isFormatted.value = false;

    // ★ 如果语言已由 manualLang / extLang 锁定，无需再走 syncLanguageForDocument
    if (normalizeEditorLanguage(selectedLanguage.value, "auto") !== "auto") {
      // 语言已在上方 applyLanguage，跳过后续同步
    } else if (nextValue.length > LARGE_FILE_PLAINTEXT_THRESHOLD) {
      syncLanguageForDocument(nextValue);
      return;
    } else if (_skipNextLangSync) {
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
      if (docUpdate) return; // 来自编辑器自身的更新，跳过

      // ★ 大文件优化：先比较长度（O(1)），长度不同直接替换，避免 toString() 复制整个文档
      const docLen = view.state.doc.length;
      if (nextValue.length !== docLen) {
        applyContentToEditor(nextValue);
        return;
      }

      // 长度相同时才做完整比较
      if (nextValue.length === 0 && docLen === 0) return; // 都为空，跳过
      if (nextValue !== view.state.doc.toString()) {
        applyContentToEditor(nextValue);
      }
    },
  );

  watch(isDarkModeEnabled, (isDark) => {
    console.log(isDarkModeEnabled);
    const effects = [editorTheme.reconfigure(getEditorTheme())];
    // 只有当前语言用了 shiki 才更新 shiki 主题
    if (SHIKI_SUPPORTED_LANGUAGES.has(activeLanguage.value)) {
      effects.push(shikiSyntax.reconfigure(createShikiHighlight()));
    }
    view.dispatch({ effects });
  });

  // ★ 导航回来时 Pinia 已有缓存内容但 watch 不会重复触发，
  //    手动将已有内容推送到编辑器，确保编辑器不会空白
  if (!view) return;
  const existing = cmStore.CmCode;
  if (existing && existing !== view.state.doc.toString()) {
    applyContentToEditor(existing);
  }
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
  keepSearchFabInViewport();
  window.addEventListener("resize", keepSearchFabInViewport);
  window.addEventListener("editor-theme-change", refreshEditorTheme);
});

const refreshEditorTheme = () => {
  editorThemeVersion.value++;
  if (!view) return;
  view.dispatch({ effects: editorTheme.reconfigure(getEditorTheme()) });
};

onBeforeUnmount(() => {
  clearLanguageDetectionTimer();
  clearTimeout(syncTimer);
  clearTimeout(replaceAllArmTimer);
  window.removeEventListener("resize", keepSearchFabInViewport);
  window.removeEventListener("editor-theme-change", refreshEditorTheme);
  document.removeEventListener("pointermove", onSearchFabDrag);
  document.removeEventListener("pointerup", endSearchFabDrag);
  document.removeEventListener("pointercancel", endSearchFabDrag);
  // ★ 清理搜索面板拖拽事件
  document.removeEventListener("pointermove", onSearchSheetDrag);
  document.removeEventListener("pointerup", endSearchSheetDrag);
  document.removeEventListener("pointercancel", endSearchSheetDrag);
  if (syncIdleId != null && typeof cancelIdleCallback !== "undefined") {
    cancelIdleCallback(syncIdleId);
    syncIdleId = null;
  }
  // ★ 销毁 EditorView 释放内存（文档、装饰、扩展状态等）
  if (view) {
    view.destroy();
    view = null;
  }
  // ★ 清理格式化 Worker
  if (formatWorker) {
    formatWorker.terminate();
    formatWorker = null;
  }
});

const collapsed = ref(localStorage.getItem("cm_collapsed") === "true");
watch(collapsed, (v) => localStorage.setItem("cm_collapsed", v));
const searchOpen = ref(false);
const replaceOpen = ref(false);
const searchQuery = ref("");
const replaceQuery = ref("");
const searchCaseSensitive = ref(false);
const searchWholeWord = ref(false);
const searchRegexp = ref(false);
const searchInputRef = ref(null);
const replaceAllArmed = ref(false);
let replaceAllArmTimer = null;

const SEARCH_FAB_SIZE = 48;
const SEARCH_FAB_MARGIN = 10;
const savedSearchFabPos = localStorage.getItem("cm_search_fab_pos");
let initialSearchFabPos = null;
try {
  initialSearchFabPos = savedSearchFabPos ? JSON.parse(savedSearchFabPos) : null;
} catch {}
const searchFabPos = ref(
  initialSearchFabPos && Number.isFinite(initialSearchFabPos.x) && Number.isFinite(initialSearchFabPos.y)
    ? initialSearchFabPos
    : { x: window.innerWidth - SEARCH_FAB_SIZE - 16, y: Math.round(window.innerHeight * 0.66 - SEARCH_FAB_SIZE / 2) },
);
const searchFabDragging = ref(false);
const searchFabStyle = computed(() => ({ left: `${searchFabPos.value.x}px`, top: `${searchFabPos.value.y}px` }));
let searchFabDragState = null;

// ★ 搜索面板拖拽
const savedSheetPos = localStorage.getItem("cm_search_sheet_pos");
const searchSheetPos = ref(
  savedSheetPos
    ? (() => {
        try {
          return JSON.parse(savedSheetPos);
        } catch {}
      })()
    : null,
);
const searchSheetStyle = computed(() => {
  if (!searchSheetPos.value) return {};
  return { left: `${searchSheetPos.value.x}px`, top: `${searchSheetPos.value.y}px`, transform: "none" };
});
let searchSheetDragState = null;

const clampSearchSheetPosition = (x, y) => {
  const minX = 10;
  const minY = 10;
  // 用面板实际宽度计算右侧边界，避免拖到屏幕右边以外
  const panelWidth = document.querySelector(".cm-search-sheet")?.offsetWidth ?? Math.min(560, window.innerWidth - 20) + 24;
  const maxX = window.innerWidth - panelWidth - 10;
  const maxY = window.innerHeight - 150;
  return {
    x: Math.max(minX, Math.min(maxX, x)),
    y: Math.max(minY, Math.min(maxY, y)),
  };
};

const initSearchSheetPos = () => {
  if (!searchSheetPos.value) {
    searchSheetPos.value = {
      x: Math.max(10, Math.round((window.innerWidth - 560) / 2)),
      y: Math.max(10, Math.round(window.innerHeight * 0.08)),
    };
  }
};

const onSearchSheetDrag = (e) => {
  if (!searchSheetDragState) return;
  const dx = e.clientX - searchSheetDragState.startX;
  const dy = e.clientY - searchSheetDragState.startY;
  searchSheetPos.value = clampSearchSheetPosition(searchSheetDragState.originX + dx, searchSheetDragState.originY + dy);
};

const endSearchSheetDrag = () => {
  document.removeEventListener("pointermove", onSearchSheetDrag);
  document.removeEventListener("pointerup", endSearchSheetDrag);
  document.removeEventListener("pointercancel", endSearchSheetDrag);
  if (searchSheetDragState) {
    localStorage.setItem("cm_search_sheet_pos", JSON.stringify(searchSheetPos.value));
  }
  searchSheetDragState = null;
};

const startSearchSheetDrag = (e) => {
  if (e.button !== undefined && e.button !== 0) return;
  e.preventDefault();
  initSearchSheetPos();
  searchSheetDragState = {
    startX: e.clientX,
    startY: e.clientY,
    originX: searchSheetPos.value.x,
    originY: searchSheetPos.value.y,
  };
  document.addEventListener("pointermove", onSearchSheetDrag, { passive: false });
  document.addEventListener("pointerup", endSearchSheetDrag);
  document.addEventListener("pointercancel", endSearchSheetDrag);
};

const clampSearchFabPosition = (x, y) => ({
  x: Math.max(SEARCH_FAB_MARGIN, Math.min(window.innerWidth - SEARCH_FAB_SIZE - SEARCH_FAB_MARGIN, x)),
  y: Math.max(SEARCH_FAB_MARGIN, Math.min(window.innerHeight - SEARCH_FAB_SIZE - SEARCH_FAB_MARGIN, y)),
});

// 与折叠圆点一样始终固定在可视区域内；避免其它页面或旋转屏幕后恢复了屏幕外的旧坐标。
const keepSearchFabInViewport = () => {
  searchFabPos.value = clampSearchFabPosition(searchFabPos.value.x, searchFabPos.value.y);
};

const onSearchFabDrag = (e) => {
  if (!searchFabDragState) return;
  const dx = e.clientX - searchFabDragState.startX;
  const dy = e.clientY - searchFabDragState.startY;
  if (!searchFabDragging.value && Math.hypot(dx, dy) < 6) return;
  searchFabDragging.value = true;
  searchFabPos.value = clampSearchFabPosition(searchFabDragState.originX + dx, searchFabDragState.originY + dy);
};

const endSearchFabDrag = () => {
  document.removeEventListener("pointermove", onSearchFabDrag);
  document.removeEventListener("pointerup", endSearchFabDrag);
  document.removeEventListener("pointercancel", endSearchFabDrag);
  if (searchFabDragging.value) {
    localStorage.setItem("cm_search_fab_pos", JSON.stringify(searchFabPos.value));
  } else {
    openSearch();
  }
  searchFabDragState = null;
  requestAnimationFrame(() => (searchFabDragging.value = false));
};

const startSearchFabDrag = (e) => {
  if (e.button !== undefined && e.button !== 0) return;
  e.preventDefault();
  searchFabDragState = {
    startX: e.clientX,
    startY: e.clientY,
    originX: searchFabPos.value.x,
    originY: searchFabPos.value.y,
  };
  searchFabDragging.value = false;
  document.addEventListener("pointermove", onSearchFabDrag);
  document.addEventListener("pointerup", endSearchFabDrag);
  document.addEventListener("pointercancel", endSearchFabDrag);
};

const buildSearchQuery = () =>
  new SearchQuery({
    search: searchQuery.value,
    replace: replaceQuery.value,
    caseSensitive: searchCaseSensitive.value,
    wholeWord: searchWholeWord.value,
    regexp: searchRegexp.value,
  });

const searchIsValid = computed(() => !searchQuery.value || buildSearchQuery().valid);
const canSearch = computed(() => Boolean(searchQuery.value && searchIsValid.value));

const disarmReplaceAll = () => {
  replaceAllArmed.value = false;
  clearTimeout(replaceAllArmTimer);
  replaceAllArmTimer = null;
};

const dispatchSearch = () => {
  if (!view) return;
  view.dispatch({ effects: setSearchQuery.of(buildSearchQuery()) });
};

const toggleCaseSensitive = () => {
  searchCaseSensitive.value = !searchCaseSensitive.value;
  disarmReplaceAll();
  dispatchSearch();
};
const toggleWholeWord = () => {
  searchWholeWord.value = !searchWholeWord.value;
  disarmReplaceAll();
  dispatchSearch();
};
const toggleRegexp = () => {
  searchRegexp.value = !searchRegexp.value;
  disarmReplaceAll();
  dispatchSearch();
};

const openSearch = () => {
  if (!view) return;
  searchOpen.value = true;

  const selection = view.state.selection.main;
  if (selection.from !== selection.to) {
    const selectedText = view.state.sliceDoc(selection.from, selection.to);
    if (selectedText.length <= 200 && !selectedText.includes("\n")) {
      searchQuery.value = selectedText;
    }
  }

  dispatchSearch();
  nextTick(() => {
    searchInputRef.value?.focus({ preventScroll: true });
    searchInputRef.value?.select();
  });
};

const closeSearch = () => {
  searchOpen.value = false;
  disarmReplaceAll();
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
  if (view) {
    view.dispatch({ effects: setSearchQuery.of(new SearchQuery({ search: "" })) });
  }
  // ★ 关闭时清除拖拽状态
  searchSheetDragState = null;
};

const onSearchInput = () => {
  disarmReplaceAll();
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
  if (canSearch.value && view) {
    dispatchSearch();
    cmFindNext(view);
  }
};

const findPrev = () => {
  if (canSearch.value && view) {
    dispatchSearch();
    cmFindPrev(view);
  }
};

const replaceNext = () => {
  if (canSearch.value && view) {
    disarmReplaceAll();
    dispatchSearch();
    cmReplaceNext(view);
  }
};

const replaceAll = () => {
  if (canSearch.value && view) {
    dispatchSearch();
    cmReplaceAll(view);
    disarmReplaceAll();
  }
};

const confirmReplaceAll = () => {
  if (!canSearch.value) return;
  if (replaceAllArmed.value) {
    replaceAll();
    return;
  }
  replaceAllArmed.value = true;
  clearTimeout(replaceAllArmTimer);
  replaceAllArmTimer = setTimeout(disarmReplaceAll, 2500);
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
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: result.code },
    });
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
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: formatted },
    });
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

const onCollapseClick = () => {
  collapsed.value = true;
};
const toggleCollapsed = () => {
  collapsed.value = !collapsed.value;
};
</script>

<style lang="scss" scoped>
.language-select-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
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
  min-width: 34px;
  max-width: 38px;
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
  position: relative;
  z-index: 2;
  display: flex;
  flex: 1;
  height: 40px;
  min-width: 0;
  margin: 0;
  box-sizing: border-box;
  color: #222;
}

.cm-collapse-btn {
  position: relative;
  z-index: 2;
  display: grid;
  place-items: center;
  align-self: stretch;
  margin-right: 10px;
  margin-left: auto;
  width: 31px;
  height: 34px;
  padding: 0;
  border: none;
  background: transparent;
  color: #222;
  cursor: pointer;
  border-radius: 50%;
  transition:
    background 0.15s,
    transform 0.15s;
}

.cm-collapse-btn:active {
  transform: scale(0.94);
}

.cm-toolbar-row {
  display: flex;
  align-items: center;
  width: 100%;
  height: 40px;
  margin: 0 0 8px;
}

.cm-toolbar-more {
  display: block;
  color: currentColor;
  line-height: 1;
  pointer-events: none;
}

.cm-toolbar-more svg {
  display: block;
  width: 18px;
  height: 18px;
  fill: currentColor;
}

.cm-img-button {
  width: 100%;
  height: 40px;
  min-width: 0;
  overflow-x: auto;
  display: flex;
  align-items: center;
  padding: 5px 7px;
  box-sizing: border-box;
  scrollbar-width: none;
}

.cm-img-button::-webkit-scrollbar {
  display: none;
}

.cm-img-button > div:first-child {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 3px;
  min-width: 100%;
}

.cm-img-button button {
  border-radius: 10px;
}

.cm-img-button button:hover {
  background: rgba(128, 128, 128, 0.1);
}

@media (max-width: 480px) {
  .cm-toolbar-wrapper {
    margin-bottom: 6px;
    border-radius: 12px;
  }

  .cm-img-button {
    padding: 4px 5px;
  }
}

.cm-search-fab {
  position: fixed;
  z-index: 1090;
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  padding: 0;
  border: 0px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.96);
  color: #313842;
  box-shadow: 0 5px 18px rgba(29, 38, 52, 0.16);
  touch-action: none;
  // border: 1px solid rgba(128, 128, 128, 0.1);
  -webkit-tap-highlight-color: transparent;
  cursor: grab;
  opacity: 0.6;
}

.cm-search-fab svg {
  width: 22px;
  height: 22px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
}

.cm-search-fab:active:not(.dragging) {
  transform: scale(0.94);
}

.cm-search-fab.dragging {
  cursor: grabbing;
  box-shadow: 0 6px 8px rgba(29, 38, 52, 0.24);
}

.cm-search-sheet {
  position: fixed;
  top: calc(10px + env(safe-area-inset-top, 0px));
  left: 50%;
  z-index: 99990;
  width: min(560px, calc(100vw - 20px));
  padding: 12px;
  box-sizing: border-box;
  // border: 1px solid rgba(128, 128, 128, 0.12);
  border-radius: 20px;
  background: rgba(250, 250, 252, 0.96);
  color: #25262a;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
  transform: translateX(-50%);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  user-select: none;
  -webkit-user-select: none;
}

.cm-search-sheet[dragging="true"],
.cm-search-header {
  cursor: grab;
  touch-action: none;
}
.cm-search-header:active {
  cursor: grabbing;
}
.cm-search-grip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  font-size: 14px;
  opacity: 0.4;
  cursor: grab;
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;
  flex-shrink: 0;
}
.cm-search-grip:active {
  cursor: grabbing;
}

.cm-search-header,
.cm-search-field-row,
.cm-replace-row,
.cm-replace-actions {
  display: flex;
  align-items: center;
}

.cm-search-header {
  // min-height: 12px;
  gap: 5px;
  padding: 0 0 7px;
}

.cm-search-error {
  margin-left: auto;
  color: #d84c4c;
  font-size: 11px;
  white-space: nowrap;
}

.cm-search-close,
.cm-search-nav {
  display: grid;
  place-items: center;
  // flex: 0 0 42px;
  width: 50px;
  height: 33px;
  padding: 0;
  border: 0;
  border-radius: 12px;
  background: rgba(128, 128, 128, 0.09);
  color: inherit;
  font-size: 14px;
  font-weight: 900;
  opacity: 0.7;
  line-height: 1;
  touch-action: manipulation;
}

.cm-search-close {
  // flex-basis: 36px;
  width: 50px;
  height: 33px;
  padding-bottom: 3px;
  font-size: 24px;
  font-weight: 400;
}

.cm-search-field-row {
  gap: 7px;
}

.cm-search-input {
  flex: 1;
  min-width: 0;
  width: 100%;
  height: 33px;
  padding: 0 13px;
  box-sizing: border-box;
  border: 0px;
  border-radius: 12px;
  background: rgba(128, 128, 128, 0.07);
  color: inherit;
  font-size: 13px;
  outline: none;
  user-select: text;
  -webkit-user-select: text;
}

.cm-search-input:focus {
  border-color: #6d9edc;
  box-shadow: 0 0 0 3px rgba(109, 158, 220, 0.14);
}

.cm-search-input.invalid {
  border-color: #d84c4c;
}

.cm-search-options {
  display: flex;
  gap: 2px;
  padding: 2px;
  border-radius: 10px;
  background: rgba(128, 128, 128, 0.09);
}

.cm-search-options button {
  min-width: 34px;
  height: 30px;
  padding: 0 6px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: inherit;
  font-size: 13px;
  font-weight: 650;
  opacity: 0.58;
  touch-action: manipulation;
}

.cm-search-options button.active {
  background: #fff;
  color: #377fd1;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.11);
  opacity: 1;
}

.cm-replace-toggle {
  width: 52px;
  height: 33px;
  margin-left: auto;
  padding: 0 8px;
  opacity: 0.7;
  border: 0;
  border-radius: 12px;
  background: rgba(128, 128, 128, 0.09);
  color: inherit;
  font-size: 13px;
  touch-action: manipulation;
}

.cm-replace-toggle.active {
  color: #377fd1;
  background: rgba(55, 127, 209, 0.12);
}

.cm-replace-area {
  margin-top: 9px;
  padding-top: 9px;
  border-top: 1px solid rgba(128, 128, 128, 0.15);
}

.cm-replace-row {
  gap: 7px;
}

.cm-replace-actions {
  justify-content: flex-end;
  gap: 8px;
  flex: 0 0 auto;
}

.cm-replace-actions button {
  min-width: 50px;
  height: 33px;
  padding: 0 9px;
  border: 0;
  border-radius: 13px;
  background: rgba(128, 128, 128, 0.1);
  color: inherit;
  font-size: 13px; 
  touch-action: manipulation;
}

.cm-replace-actions button:disabled {
  opacity: 0.6;
}

.cm-replace-actions .cm-replace-all {
  color: #c44343;
}

.cm-replace-actions .cm-replace-all.armed {
  background: #d84c4c;
  color: #fff;
  font-weight: 600;
}

@media (max-width: 390px) {
  .cm-search-sheet {
    width: calc(100vw - 12px);
    padding: 10px;
    border-radius: 17px;
  }

  .cm-search-error {
    display: none;
  }

  .cm-replace-row {
    gap: 5px;
  }

  .cm-replace-actions {
    gap: 5px;
  }

  .cm-replace-actions button {
    min-width: 68px;
    padding: 0 6px;
    font-size: 12px;
  }
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
 

.cm-search-sheet.is-dark {
  background: color-mix(in srgb, var(--editor-overlay-background, #282c34) 96%, transparent);
  border-color: rgba(255, 255, 255, 0.14);
  color: #eceff4;
}

@media (prefers-color-scheme: dark) {
  .cm-collapse-btn,
  .cm-toolbar-more {
    color: var(--text, inherit);
  }
  .cm-search-fab {
    background: var(--editor-overlay-background, #282c34);
    // border-color: rgba(255, 255, 255, 0.15);
    color: var(--text, inherit);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.463);
  }

  .cm-search-sheet .cm-search-input {
    background: rgba(255, 255, 255, 0.03);
  }
  .cm-search-sheet .cm-search-input:focus {
    background: rgba(143, 180, 232, 0.08);
  }
  .cm-search-options button.active {
    background: rgba(106, 158, 216, 0.22);
    color: #88bcf5;
    box-shadow: none;
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

  .cm-search-sheet {
    box-shadow: 0 6px 26px rgba(0, 0, 0, 0.7);
  }
}
</style>
