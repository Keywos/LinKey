<template>
  <div class="cmviewRef">
    <div class="cm-toolbar-row cm-toolbar-row--locked-y">
      <!-- 展开态：完整工具栏 -->
      <div v-if="!collapsed" class="cm-toolbar-wrapper">
        <div class="cm-img-button">
          <div>
            <div class="editor-background-select-wrap">
              <select
                v-model="selectedLanguage"
                class="editor-background-select"
                :title="selectedLanguageTitle"
                aria-label="Editor language"
                @pointerdown.stop
                @click.stop
                @change="onLanguageChange"
              >
                <option
                  v-for="option in languageOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select>
            </div>
            <div class="editor-background-select-wrap">
              <select
                v-model="editorDarkBackground"
                class="editor-background-select"
                title="编辑器背景颜色"
                aria-label="编辑器背景颜色"
                @pointerdown.stop
                @click.stop
                @change="setEditorDarkBackground"
              >
                <option
                  v-for="option in editorDarkBackgroundOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select>
            </div>
            <button @click="undoCode"><img :src="undoimg" /></button>
            <button @click="redoCode"><img :src="redoimg" /></button>
            <button @click="formatCode" title="JS 选项">
              <img :src="format" />
            </button>
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
          <svg
            class="icon"
            viewBox="0 0 1024 1024"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M203.1 599.3c-48.9 0-88.6-39.6-88.6-88.5s39.6-88.5 88.6-88.5c48.9 0 88.6 39.6 88.6 88.5-0.1 48.9-39.7 88.5-88.6 88.5z m309.9 0c-48.9 0-88.6-39.6-88.6-88.5s39.6-88.5 88.6-88.5c48.9 0 88.6 39.6 88.6 88.5s-39.7 88.5-88.6 88.5z m309.9 0c-48.9 0-88.6-39.6-88.6-88.5s39.6-88.5 88.6-88.5c48.9 0 88.6 39.6 88.6 88.5s-39.6 88.5-88.6 88.5z"
            />
          </svg>
        </span>
      </button>
    </div>

    <Teleport to="body">
      <button
        class="cm-search-fab"
        :class="{ dragging: searchFabDragging, 'is-dark': isDarkModeEnabled }"
        :style="[searchFabStyle, editorOverlayStyle]"
        type="button"
        :aria-label="searchOpen ? '关闭查找与替换' : '打开查找与替换'"
        :title="
          searchOpen ? '关闭查找与替换（可拖动）' : '查找与替换（可拖动）'
        "
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
        @pointerdown="startSearchSheetDrag"
        @keydown.escape.prevent="closeSearch"
      >
        <div class="cm-search-field-row">
          <div class="cm-search-input-wrap">
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
            <div class="cm-search-options" aria-label="搜索选项">
              <button
                class="cm-replace-toggle"
                type="button"
                :class="{ active: replaceOpen }"
                :aria-expanded="replaceOpen"
                :aria-label="replaceOpen ? '收起替换' : '展开替换'"
                :title="replaceOpen ? '收起替换' : '展开替换'"
                @pointerdown.stop
                @click.stop="toggleReplace"
              >
                {{ replaceOpen ? "▴" : "▾" }}
              </button>
              <button
                type="button"
                :class="{ active: searchCaseSensitive }"
                :aria-pressed="searchCaseSensitive"
                title="区分大小写"
                @click="toggleCaseSensitive"
              >
                Aa
              </button>
              <button
                type="button"
                :class="{ active: searchWholeWord }"
                :aria-pressed="searchWholeWord"
                title="全词匹配"
                @click="toggleWholeWord"
              >
                ab
              </button>
              <button
                type="button"
                :class="{ active: searchRegexp }"
                :aria-pressed="searchRegexp"
                title="正则表达式"
                @click="toggleRegexp"
              >
                .*
              </button>
            </div>
          </div>
          <button
            class="cm-search-nav"
            type="button"
            aria-label="上一个匹配"
            title="上一个"
            @click="findPrev"
          >
            ↑
          </button>
          <button
            class="cm-search-nav"
            type="button"
            aria-label="下一个匹配"
            title="下一个"
            @click="findNext"
          >
            ↓
          </button>
        </div>

        <div v-if="replaceOpen" class="cm-replace-area">
          <div class="cm-replace-row">
            <input
              style="padding-left: 13px"
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
              <button
                type="button"
                :disabled="!canSearch"
                @pointerdown.stop
                @click.stop="replaceNext"
              >
                替换
              </button>
              <button
                type="button"
                class="cm-replace-all"
                :class="{ armed: replaceAllArmed }"
                :disabled="!canSearch"
                @pointerdown.stop
                @click.stop="confirmReplaceAll"
              >
                {{ replaceAllArmed ? "再次点击确认" : "全替" }}
              </button>
            </div>
          </div>
        </div>
      </section>
    </Teleport>
    <div
      ref="viewRef"
      class="cmview-editor-host"
      style="width: 100%; min-width: 0; font-size: 11px; overflow: hidden"
    />
    <div
      v-if="editorLoading"
      class="cm-content-loading"
      role="status"
      aria-live="polite"
    >
      <span class="cm-content-loading-spinner"></span>
      <span>正在载入编辑器…</span>
    </div>
    <div style="height: 10px" />

    <Teleport to="body">
      <div
        v-if="compressOpts.visible"
        class="compress-overlay"
        @click.self="closeCompressDialog"
      >
        <div class="compress-dialog" :style="editorOverlayStyle">
          <div class="compress-title">压缩选项</div>
          <div class="compress-body">
            <div class="compress-group">
              <div class="compress-label">压缩模式</div>
              <label class="compress-radio">
                <input
                  type="radio"
                  v-model="compressOpts.keepNames"
                  :value="false"
                />
                <span>标准压缩（混淆函数名）</span>
              </label>
              <label class="compress-radio">
                <input
                  type="radio"
                  v-model="compressOpts.keepNames"
                  :value="true"
                />
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
                <input
                  type="radio"
                  v-model="compressOpts.charset"
                  value="utf8"
                />
                <span>UTF-8（保留中文）</span>
              </label>
              <label class="compress-radio">
                <input
                  type="radio"
                  v-model="compressOpts.charset"
                  value="ascii"
                />
                <span>ASCII（\uXXXX）</span>
              </label>
            </div>
          </div>
          <div class="compress-buttons">
            <button class="compress-btn cancel" @click="closeCompressDialog">
              取消
            </button>
            <button class="compress-btn" @click="doFormat">格式化</button>
            <button class="compress-btn primary" @click="doCompress">
              压缩
            </button>
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

import {
  detectEditorLanguage,
  EDITOR_LANGUAGE_OPTIONS,
  loadEditorLanguageExtension,
  normalizeEditorLanguage,
} from "@/EditCode/editorLanguages";
import {
  shikiHighlight,
  SHIKI_SUPPORTED_LANGUAGES,
} from "@/EditCode/shikiHighlight";
import {
  computed,
  nextTick,
  ref,
  reactive,
  onBeforeUnmount,
  onMounted,
  watch,
  watchEffect,
} from "vue";
import {
  highlightSelectionMatches,
  search as cmSearch,
  setSearchQuery,
  SearchQuery,
  findNext as cmFindNext,
  findPrevious as cmFindPrev,
  replaceNext as cmReplaceNext,
  replaceAll as cmReplaceAll,
} from "@/EditCode/search";
import {
  lineNumbers,
  EditorView,
  highlightActiveLine,
  keymap,
  placeholder as cmPlaceholder,
} from "@codemirror/view";
import {
  foldGutter,
  bracketMatching,
  forceParsing,
  syntaxTree,
} from "@codemirror/language";

import {
  undo,
  redo,
  history,
  defaultKeymap,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import { closeBrackets, autocompletion } from "@codemirror/autocomplete";
import { Compartment, EditorState, Transaction } from "@codemirror/state";
import { hyperLink } from "@/EditCode/link/index.ts";
import { indentationMarkers } from "@replit/codemirror-indentation-markers";
import { showToast } from "vant";
import copyimg from "@/img/svg/copy.svg";
import del from "@/img/svg/del.svg";
import paste from "@/img/svg/zt.svg";
// import searchimg from "@/img/svg/search.svg";
import format from "@/img/svg/format.svg";
import redoimg from "@/img/svg/redo.svg";
import undoimg from "@/img/svg/undo.svg";
import { useTheme } from "@/hooks/theme";
import { useCmStore } from "@/store/cmCodeStore.js";
import { getCmSettings, CM_SETTINGS_EVENT } from "@/EditCode/editorSettings.js";

// ★ iOS 上滚动事件在惯性滚动期间会被浏览器降级/延迟调度，
//   直接在 updateListener 里做 forceParsing 可能追不上；
//   改用 requestAnimationFrame 持续轮询，不依赖 scroll 事件本身
let parseRafId = null;

const activeLanguage = ref("plaintext");

// ★ 从设置中动态获取配置
let cmConfig = getCmSettings();
let highlightThresholdBytes = cmConfig.highlightThreshold * 1024 * 1024;
let linewrapThresholdBytes = cmConfig.linewrapThreshold * 1024 * 1024;
let foldIndentThresholdBytes = cmConfig.foldIndentThreshold * 1024 * 1024;

const updateConfigThresholds = () => {
  highlightThresholdBytes = cmConfig.highlightThreshold * 1024 * 1024;
  linewrapThresholdBytes = cmConfig.linewrapThreshold * 1024 * 1024;
  foldIndentThresholdBytes = cmConfig.foldIndentThreshold * 1024 * 1024;
};

const getHighlightThresholdBytes = () => highlightThresholdBytes;
const getLinewrapThresholdBytes = () => linewrapThresholdBytes;
const getFoldIndentThresholdBytes = () => foldIndentThresholdBytes;

const SYNC_DEBOUNCE_MS = 900; // 防抖延长到 900ms，避免每次按键频繁重算语言

// ★ iOS 检测 — iOS Safari 内存限制更严格，大文件需要分块加载防闪退
const IS_IOS =
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const CHUNKED_LOAD_THRESHOLD = IS_IOS ? 300 * 1024 : 3 * 1024 * 1024; // iOS 300KB / 其他 3MB
const CHUNK_SIZE = IS_IOS ? 200 * 1024 : 512 * 1024;

// 文件大小完全由 editorSettings.js 中的自定义阈值控制。
// 保留 iOS 滚动稳定性修复，但不再覆盖用户配置的高亮/换行/折叠阈值。
const isRuntimeLargeFile = (docLen = 0) =>
  docLen > getHighlightThresholdBytes();
const isRuntimeLineWrapDisabled = (docLen = 0) =>
  docLen >= getLinewrapThresholdBytes();

function stopParseLoop() {
  if (parseRafId != null) cancelAnimationFrame(parseRafId);
  parseRafId = null;
}

// 最大强制解析字符深度（大文件严禁强制全量解析，交给 CM6 原生后台机制）
// const MAX_FORCE_PARSE_LEN = getHighlightThresholdBytes();
const MAX_PARSE_FRAMES = 40; // 单次循环最大帧数限制（约 0.3~0.6s），防止死循环跑死主线程

/**
 * 优化版语法解析追踪循环
 */
function ensureParseLoop(targetView) {
  if (parseRafId != null) return; // 循环已在运行

  // 1. 基础有效性拦截
  if (!targetView || !targetView.dom?.isConnected) return;
  if (activeLanguage.value === "plaintext") return;

  const docLen = targetView.state.doc.length;
  // 超大文件直接放弃强制追赶，防爆内存（CM6 本身有按需惰性解析机制）
  if (isRuntimeLargeFile(docLen)) return;

  let lastParsedLen = -1;
  let stagnantCount = 0; // 记录连续无进展的次数
  let frameCount = 0; // 记录执行的帧数

  const step = () => {
    parseRafId = null;

    // 2. 生命周期与环境安全校验（DOM 已脱离文档或已销毁，立即熔断释放引用）
    if (!targetView || !targetView.dom?.isConnected || !view) return;
    if (activeLanguage.value === "plaintext") return;

    // 3. 熔断保护：超过最大连续帧数，主动交出主线程，让 GC 喘息
    frameCount++;
    if (frameCount > MAX_PARSE_FRAMES) return;

    const target = Math.min(
      targetView.viewport.to,
      getHighlightThresholdBytes(),
    );
    const parsedLen = syntaxTree(targetView.state).length;

    // 4. 停滞保护：如果解析进度卡住（连续 3 帧没有向前推进），说明遇到瓶颈，立即退出
    if (parsedLen === lastParsedLen) {
      stagnantCount++;
      if (stagnantCount >= 3) return;
    } else {
      stagnantCount = 0;
      lastParsedLen = parsedLen;
    }

    if (parsedLen < target) {
      const timeBudget = IS_IOS ? 16 : 32;
      const done = forceParsing(targetView, target, timeBudget);

      if (!done) {
        parseRafId = requestAnimationFrame(step);
      }
    }
  };

  parseRafId = requestAnimationFrame(step);
}

const cmStore = useCmStore();
const { isDarkModeEnabled } = useTheme();

const EDITOR_DARK_BACKGROUNDS = new Set(["#282c34", "#141414", "#000000"]);
const editorThemeVersion = ref(0);
const getEditorDarkBackground = () => {
  editorThemeVersion.value;
  const background = localStorage.getItem("EditorDarkBackground");
  return EDITOR_DARK_BACKGROUNDS.has(background) ? background : "#282c34";
};
const editorDarkBackgroundOptions = [
  { label: "BLUE", value: "#282c34" },
  { label: "GREY", value: "#141414" },
  { label: "DARK", value: "#000000" },
];
const editorDarkBackground = ref(getEditorDarkBackground());
const setEditorDarkBackground = () => {
  localStorage.setItem("EditorDarkBackground", editorDarkBackground.value);
  window.dispatchEvent(new Event("editor-theme-change"));
};
const getEditorTheme = () => {
  if (!isDarkModeEnabled.value) return lightCode;
  getEditorDarkBackground();
  return darkCode;
};
const editorOverlayStyle = computed(() => {
  if (!isDarkModeEnabled.value) return {};
  const background = getEditorDarkBackground();
  return {
    "--editor-overlay-background": background,
    "--editor-overlay-sheet-background":
      background === "#000000" ? "#14141469" : `${background}23`,
  };
});

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
    default: () => [
      "fullscreen",
      "import",
      "language-detect",
      "language",
      "undo",
      "redo",
      "format",
      "search",
      "copy",
      "delete",
      "paste",
      "panel",
    ],
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

const lineWrappingCompartment = new Compartment();
const createLineWrappingExt = (docLen = 0) => {
  return isRuntimeLineWrapDisabled(docLen) ? [] : [EditorView.lineWrapping];
};

const createHeavyDecorations = (docLen = 0) => {
  const deco = [];
  const threshold = getFoldIndentThresholdBytes();
  if (docLen < threshold)
    deco.push(foldGutter({ closedText: "▸", openText: "▾" }));
  // 折叠和缩进标记由 foldIndentThreshold 自定义阈值控制。
  if (docLen < Math.min(threshold, 500 * 1024)) {
    deco.push(indentationMarkers());
  }
  return deco;
};

// ★ 编辑辅助扩展（自动补全、括号匹配、选区高亮、自动闭合）根据用户设置和文件大小动态启用
const editAssist = new Compartment();
const createEditAssist = (enabled) => {
  if (!enabled) return [];
  const exts = [];
  if (cmConfig.enableAutocomplete) exts.push(autocompletion());
  if (cmConfig.enableBracketMatching) exts.push(bracketMatching());
  if (cmConfig.enableCloseBrackets) exts.push(closeBrackets());
  exts.push(highlightSelectionMatches());
  return exts;
};

// ★ 历史记录深度限制 — 大文件减少撤销步数以节省内存
const historyCompartment = new Compartment();
const createHistoryExt = (isLarge) => history({ minDepth: isLarge ? 50 : 200 });

// ★ 超链接装饰 — 大文件或用户关闭时禁用避免每次按键全文正则扫描
const hyperLinkCompartment = new Compartment();
const createHyperLinkExt = (enabled) =>
  enabled && cmConfig.enableHyperlink ? [hyperLink] : [];
const selectedLanguage = ref(
  normalizeEditorLanguage(props.editorLanguage, "auto"),
);

const autoDetectedLanguage = ref(null);
const isFormatting = ref(false);
const isCopying = ref(false);
const editorLoading = ref(false);

let languageRequestId = 0;
const editorLanguage_json = {
  auto: "自动",
  javascript: "JS",
  json: "JSON",
  json5: "JSON5",
  yaml: "YAML",
  ini: "INI",
  plaintext: "TXT",
  detect: {
    auto: "自动检测语言",
    cancel: "取消自动检测",
    retry: "重试自动检测",
  },
};

const languageDetectionStatus = ref("idle");

const getLanguageLabel = (language) => {
  const normalizedLanguage = normalizeEditorLanguage(language, "plaintext");
  return (
    editorLanguage_json[normalizedLanguage] || editorLanguage_json.plaintext
  );
};

const selectedLanguageDisplayLabel = computed(() =>
  getLanguageLabel(selectedLanguage.value),
);

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
    if (
      requestId === languageRequestId &&
      normalizeEditorLanguage(selectedLanguage.value, "auto") === "auto"
    ) {
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
  const docLen = view?.state.doc.length || 0;
  const isLarge = isRuntimeLargeFile(docLen);

  // ★ 超过高亮阈值不允许切换复杂语言，强制纯文本以防卡死
  if (isLarge && next !== "plaintext") {
    selectedLanguage.value = "plaintext";
    // 不能只改下拉框，必须立即卸载当前语言解析器。
    syncLanguageForDocument(undefined, true);
    showToast("大文件仅支持纯文本模式以保证流畅");
    return;
  }

  selectedLanguage.value = next;
  emit("update:editorLanguage", next === "auto" ? undefined : next);

  // ★ 手动选择非 auto 时保存到 store，选 auto 时清除
  cmStore.setManualLanguage(next !== "auto" ? next : "");

  syncLanguageForDocument();
};

const languageOptions = computed(() =>
  EDITOR_LANGUAGE_OPTIONS.map((option) => {
    const label =
      option.value === "auto" && autoDetectedLanguage.value
        ? getLanguageLabel(autoDetectedLanguage.value)
        : getLanguageLabel(option.value);
    return { ...option, label };
  }),
);
const selectedLanguageTitle = computed(() => {
  if (normalizeEditorLanguage(selectedLanguage.value, "auto") !== "auto") {
    return selectedLanguageDisplayLabel.value;
  }
  return autoDetectedLanguage.value
    ? getLanguageLabel(autoDetectedLanguage.value)
    : getLanguageLabel("auto");
});

const createShikiHighlight = (language = activeLanguage.value) =>
  shikiHighlight({
    language,
    dark: isDarkModeEnabled.value,
  });

const applyLanguage = async (
  language,
  requestId = ++languageRequestId,
  force = false,
  docLen = view?.state.doc.length ?? 0,
) => {
  const nextLanguage = normalizeEditorLanguage(language, "plaintext");
  if (!view || requestId !== languageRequestId) return;

  // ★ 大文件（超过高亮阈值）避免加载任何解析器或 shiki 高亮导致主线程崩溃，降级为纯文本
  if (nextLanguage !== "plaintext" && isRuntimeLargeFile(docLen)) {
    activeLanguage.value = "plaintext";
    cmStore.setActiveLanguage("plaintext");
    view.dispatch({
      effects: [langs.reconfigure([]), shikiSyntax.reconfigure([])],
    });
    return;
  }

  if (!force && nextLanguage === activeLanguage.value) return;

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
    console.log(
      `启用 ${getLanguageLabel(nextLanguage)} 语法高亮 - 使用 codemirror`,
    );
    effects.push(shikiSyntax.reconfigure([]));
  }
  view.dispatch({ effects });
};

const syncLanguageForDocument = async (docContent, force = false) => {
  const requestId = ++languageRequestId;
  const docLen =
    typeof docContent === "string"
      ? docContent.length
      : view?.state.doc.length || 0;

  // ★ 超过阈值强制纯文本，不做语言检测、不高亮
  if (isRuntimeLargeFile(docLen)) {
    clearLanguageDetectionTimer();
    languageDetectionStatus.value = "idle";
    autoDetectedLanguage.value = null;
    await applyLanguage("plaintext", requestId, force, docLen);
    return;
  }

  const manualLanguage = normalizeEditorLanguage(
    selectedLanguage.value,
    "auto",
  );

  if (manualLanguage === "auto") {
    languageDetectionStatus.value = "idle";
    scheduleLanguageDetectionBusy(requestId);
    try {
      // 头部 32KB 采样，避免对巨大文档做全量正则检测
      let sample = "";
      if (typeof docContent === "string") {
        sample = docContent.length > 32 * 1024 ? docContent.slice(0, 32 * 1024) : docContent;
      } else if (view) {
        sample = view.state.doc.sliceString(0, 32 * 1024);
      }
      const detectedLanguage = await detectEditorLanguage(
        sample,
        cmStore.currentFileName,
      );
      if (
        requestId !== languageRequestId ||
        normalizeEditorLanguage(selectedLanguage.value, "auto") !== "auto"
      ) {
        return;
      }
      autoDetectedLanguage.value = detectedLanguage;
      await applyLanguage(detectedLanguage, requestId, force, docLen);
      finishLanguageDetection(requestId);
    } catch (error) {
      console.log("Editor language detection failed", error);
      finishLanguageDetection(requestId, "error");
    }
    return;
  }

  clearLanguageDetectionTimer();
  languageDetectionStatus.value = "idle";
  if (
    requestId !== languageRequestId ||
    normalizeEditorLanguage(selectedLanguage.value, "auto") !== manualLanguage
  ) {
    return;
  }
  await applyLanguage(manualLanguage, requestId, force, docLen);
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

const createEditorPlaceholder = () =>
  props.placeholder ? cmPlaceholder(props.placeholder) : [];

let syncTimer = null;
let syncIdleId = null; // requestIdleCallback ID

const debouncedSyncLanguage = (docContent) => {
  clearTimeout(syncTimer);
  if (syncIdleId != null && typeof cancelIdleCallback !== "undefined") {
    cancelIdleCallback(syncIdleId);
    syncIdleId = null;
  }

  // 获取文档长度快速判断是否为大文件
  const docLen =
    typeof docContent === "string"
      ? docContent.length
      : view?.state?.doc?.length || 0;
  const isLarge = isRuntimeLargeFile(docLen);

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

let lastAppliedFileName = "";
let applyContentToEditor = null;

defineExpose({
  loadContent(content, options = {}) {
    const { fileName, manualLanguage, skipHistory = true } = options;
    if (fileName !== undefined) {
      cmStore.setCurrentFileName(fileName);
      lastAppliedFileName = fileName;
    }
    if (manualLanguage !== undefined) {
      cmStore.setManualLanguage(manualLanguage);
    }
    _skipNextHistory = skipHistory;
    const nextVal = content ?? "";
    applyContentToEditor?.(nextVal);
  },
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

// 给 CodeMirror 一个明确的滚动视口，并先关闭 iOS 惯性滚动。
// 这是为了避免页面滚动和编辑器滚动同时参与大面积重绘。
const iosScrollStabilityTheme = EditorView.theme({
  "&": {
    // 高度由外层 cmview-editor-host 提供，编辑器本身填满宿主。
    height: "100%",
    minHeight: 0,
    maxHeight: "100%",
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  ".cm-scroller": {
    // 关键：让滚动条属于 CmView 内部，而不是 body/页面右侧。
    flex: "1 1 0",
    minHeight: 0,
    height: "100%",
    maxHeight: "100%",
    minWidth: 0,
    overflowY: "scroll",
    overflowX: "auto",
    "scrollbar-gutter": "stable",
    "-webkit-overflow-scrolling": "auto",
    "overscroll-behavior": "contain",
  },
  ".cm-scroller::-webkit-scrollbar": {
    width: "10px",
    height: "10px",
  },
  ".cm-scroller::-webkit-scrollbar-thumb": {
    background: "rgba(128, 128, 128, 0.55)",
    borderRadius: "5px",
  },
});

const flushStoreSync = () => {
  if (_storeSyncTimer) {
    clearTimeout(_storeSyncTimer);
    _storeSyncTimer = null;
  }
  if (_pendingStoreContent != null) {
    docUpdate = true;
    const content =
      typeof _pendingStoreContent === "function"
        ? _pendingStoreContent()
        : _pendingStoreContent;
    cmStore.setCmCode(content);
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
        iosScrollStabilityTheme,
        historyCompartment.of(history()),
        cmSearch(),
        keymap.of([
          {
            key: "Mod-f",
            run: () => (openSearch(), true),
            preventDefault: true,
          },
          {
            key: "F3",
            run: () => (findNext(), true),
            shift: () => (findPrev(), true),
            preventDefault: true,
          },
          {
            key: "Mod-g",
            run: () => (findNext(), true),
            shift: () => (findPrev(), true),
            preventDefault: true,
          },
          {
            key: "Escape",
            run: () => (searchOpen.value ? (closeSearch(), true) : false),
            preventDefault: true,
          },
          indentWithTab,
          ...defaultKeymap,
          ...historyKeymap,
        ]),
        langs.of([]),
        shikiSyntax.of([]), // ★ 初始不加载，由 applyLanguage 按需开启
        editorPlaceholder.of(createEditorPlaceholder()),
        editorTheme.of(getEditorTheme()),
        EditorState.readOnly.of(props.isReadOnly ? true : false),
        lineWrappingCompartment.of(createLineWrappingExt(0)), // 换行
        lineNumbers(),
        highlightActiveLine(),
        editAssist.of(createEditAssist(true)), // 初始按用户开关配置，加载大文件后动态关闭
        EditorView.updateListener.of((update) => {
          // viewportChanged / selectionSet 也会触发 updateListener。
          // 快速滚动时绝不能复制整份文档或强制追赶语法树。
          if (activeLanguage.value !== "plaintext" && update.docChanged) {
            ensureParseLoop(update.view);
          }
          if (!update.docChanged || _chunkedLoading) return;

          // 仅文档真正改变时才复制整份文档到 store；滚动不是编辑。
          debouncedStoreSync(() => update.state.doc.toString());
          // 文档超过 4KB 且已识别出语言后，跳过无谓的重新探测。
          const docLen = update.state.doc.length;
          const needDetect =
            docLen < 4096 || autoDetectedLanguage.value === null;
          if (
            selectedLanguage.value === "auto" &&
            !isRuntimeLargeFile(docLen) &&
            !_skipNextLangSync &&
            needDetect
          ) {
            debouncedSyncLanguage();
          }
        }),
        hyperLinkCompartment.of(createHyperLinkExt(true)),
        heavyDecorations.of(createHeavyDecorations(0)),
      ],
      doc: "", // ★ 初始空文档，首次内容由 isFirstLoad 延迟注入
    }),
    parent: viewRef.value,
  });

  let applyContentId = 0;

  applyContentToEditor = async (nextValue) => {
    console.log("Code更新到文档");
    stopParseLoop(); // ★ 新内容替换旧文档时，先停掉旧的追赶循环
    if (!view) return;
    const currentId = ++applyContentId;
    editorLoading.value = true;
    try {
      const isLargeFile = isRuntimeLargeFile(nextValue.length);
      const needChunked =
        nextValue.length > CHUNKED_LOAD_THRESHOLD ||
        (IS_IOS && isLargeFile);

      // ★ 1. 只决定目标语言，不在这里 applyLanguage（此时 view 里还是旧文档）
      let lockedLang = null;
      const manualLang = cmStore.manualLanguage;
      if (manualLang) {
        lockedLang = manualLang;
      } else {
        selectedLanguage.value = "auto";
        autoDetectedLanguage.value = null;
        lockedLang = shouldLockLanguageFromFilename(cmStore.currentFileName);
      }
      if (lockedLang) {
        selectedLanguage.value = lockedLang;
        autoDetectedLanguage.value = lockedLang;
      }

      // ★ 作废进行中的语言请求，并把状态重置为纯文本；旧扩展在下面的 dispatch 里一并卸载
      languageRequestId++;
      clearLanguageDetectionTimer();
      activeLanguage.value = "plaintext";
      cmStore.setActiveLanguage("plaintext");
      const unloadLangEffects = [
        langs.reconfigure([]),
        shikiSyntax.reconfigure([]),
      ];

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
            ...unloadLangEffects,
            lineWrappingCompartment.reconfigure(
              createLineWrappingExt(nextValue.length),
            ),
            heavyDecorations.reconfigure(
              createHeavyDecorations(nextValue.length),
            ),
            editAssist.reconfigure(createEditAssist(editAssistEnabled)),
            historyCompartment.reconfigure(createHistoryExt(historyLimited)),
            hyperLinkCompartment.reconfigure(createHyperLinkExt(!isLargeFile)),
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
            effects: [
              ...unloadLangEffects,
              lineWrappingCompartment.reconfigure(
                createLineWrappingExt(nextValue.length),
              ),
              heavyDecorations.reconfigure([]),
              editAssist.reconfigure(createEditAssist(false)),
              historyCompartment.reconfigure(createHistoryExt(true)),
              hyperLinkCompartment.reconfigure([]),
            ],
            annotations: Transaction.addToHistory.of(false),
          });
          // 让出主线程，等待 GC 回收旧文档 + 浏览器绘制
          await new Promise((r) => setTimeout(r, 0));
          if (currentId !== applyContentId) return;

          // Phase 2: 分块插入内容
          for (
            let offset = 0;
            offset < nextValue.length;
            offset += CHUNK_SIZE
          ) {
            const chunk = nextValue.slice(
              offset,
              Math.min(offset + CHUNK_SIZE, nextValue.length),
            );
            const pos = view.state.doc.length;
            const isFirstChunk = offset === 0;
            view.dispatch({
              changes: { from: pos, insert: chunk },
              // 仅第一块记录历史（整个内容算一步撤销）
              annotations: isFirstChunk
                ? Transaction.addToHistory.of(!skipHist)
                : Transaction.addToHistory.of(false),
            });
            // 每块之间让出主线程，防止 iOS watchdog 超时
            if (offset + CHUNK_SIZE < nextValue.length) {
              await new Promise((r) => setTimeout(r, 0));
              if (currentId !== applyContentId) return;
            }
          }
        } finally {
          if (currentId === applyContentId) _chunkedLoading = false;
        }

        // 分块完成，同步最终内容到 store
        if (currentId !== applyContentId) return; // 如果有新的 applyContentToEditor 调用，则放弃当前更新
        docUpdate = true;
        cmStore.setCmCode(nextValue);
        docUpdate = false;

        console.log(
          `分块加载完成: ${(nextValue.length / 1024).toFixed(0)}KB, ${Math.ceil(nextValue.length / CHUNK_SIZE)} 块`,
        );
      }

      await nextTick();
      if (currentId !== applyContentId) return; // 如果有新的 applyContentToEditor 调用，则放弃当前更新
      // 文档高度、换行或装饰发生变化后，主动让 CodeMirror 重新测量滚动区域。
      view?.requestMeasure?.();

      // 外部加载新文件时重置格式化状态
      isFormatted.value = false;

      // ★ 3. 文档已经是新内容，此时 view.state.doc.length 正确，再应用语言
      if (lockedLang) {
        await applyLanguage(
          isLargeFile ? "plaintext" : lockedLang,
          ++languageRequestId,
          true,
          nextValue.length,
        );
      } else if (isLargeFile) {
        // 超过高亮阈值直接置为纯文本
        syncLanguageForDocument(nextValue);
      } else if (_skipNextLangSync) {
        _skipNextLangSync = false;
        nextTick(() => {
          debouncedSyncLanguage(nextValue);
        });
      } else {
        syncLanguageForDocument(nextValue);
      }
    } finally {
      if (currentId === applyContentId) {
        editorLoading.value = false;
      }
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
        lastAppliedFileName = cmStore.currentFileName;
        applyContentToEditor(nextValue);
        return;
      }

      // 长度相同时才做完整比较（大于50KB长度相同认为内容相同，避免toString巨大开销）
      if (nextValue.length === 0 && docLen === 0) return; // 都为空，跳过
      if (docLen < 50000 && nextValue !== view.state.doc.toString()) {
        lastAppliedFileName = cmStore.currentFileName;
        applyContentToEditor(nextValue);
      }
    },
  );

  // ★ 监听当前文件名切换，仅重新计算/同步语言，不再重新加载编辑器文档内容
  watch(
    () => cmStore.currentFileName,
    (newVal) => {
      if (!view || newVal === lastAppliedFileName) return;
      lastAppliedFileName = newVal;
      const locked =
        cmStore.manualLanguage || shouldLockLanguageFromFilename(newVal);
      selectedLanguage.value = locked || "auto";
      autoDetectedLanguage.value = locked;
      syncLanguageForDocument(undefined, true);
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
  if (
    existing &&
    (existing.length !== view.state.doc.length ||
      (existing.length < 50000 && existing !== view.state.doc.toString()))
  ) {
    lastAppliedFileName = cmStore.currentFileName;
    applyContentToEditor(existing);
  }
};

watch(
  () => props.editorLanguage,
  (language) => {
    const nextLanguage = normalizeEditorLanguage(language, "auto");
    if (selectedLanguage.value === nextLanguage) return;
    selectedLanguage.value = nextLanguage;
    syncLanguageForDocument();
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
  requestAnimationFrame(() => view?.requestMeasure?.());
  window.addEventListener("resize", keepSearchFabInViewport);
  window.addEventListener("resize", refreshEditorLayout);
  window.addEventListener("orientationchange", handleViewportChange);
  window.addEventListener("editor-theme-change", refreshEditorTheme);
});

const handleViewportChange = () => {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      keepSearchFabInViewport();
      view?.requestMeasure?.();
    });
  });
};

const refreshEditorTheme = () => {
  editorThemeVersion.value++;
  editorDarkBackground.value = getEditorDarkBackground();
  if (!view) return;
  view.dispatch({ effects: editorTheme.reconfigure(getEditorTheme()) });
};

onBeforeUnmount(() => {
  stopParseLoop();
  clearLanguageDetectionTimer();
  clearTimeout(syncTimer);
  clearTimeout(_storeSyncTimer);
  _storeSyncTimer = null;
  _pendingStoreContent = null;
  clearTimeout(replaceAllArmTimer);
  window.removeEventListener("resize", keepSearchFabInViewport);
  window.removeEventListener("resize", refreshEditorLayout);
  window.removeEventListener("orientationchange", handleViewportChange);
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
  initialSearchFabPos = savedSearchFabPos
    ? JSON.parse(savedSearchFabPos)
    : null;
} catch {}
const searchFabPos = ref(
  initialSearchFabPos &&
    Number.isFinite(initialSearchFabPos.x) &&
    Number.isFinite(initialSearchFabPos.y)
    ? initialSearchFabPos
    : {
        x: window.innerWidth - SEARCH_FAB_SIZE - 16,
        y: Math.round(window.innerHeight * 0.66 - SEARCH_FAB_SIZE / 2),
      },
);
const searchFabDragging = ref(false);
const searchFabStyle = computed(() => ({
  left: `${searchFabPos.value.x}px`,
  top: `${searchFabPos.value.y}px`,
}));
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
  return {
    left: `${searchSheetPos.value.x}px`,
    top: `${searchSheetPos.value.y}px`,
    transform: "none",
  };
});
let searchSheetDragState = null;

const clampSearchSheetPosition = (x, y) => {
  const minX = 10;
  const minY = 10;
  // 用面板实际宽度计算右侧边界，避免拖到屏幕右边以外
  const panelWidth =
    document.querySelector(".cm-search-sheet")?.offsetWidth ??
    Math.min(560, window.innerWidth - 20) + 20;
  const maxX = window.innerWidth - panelWidth - 10;
  const maxY = window.innerHeight - 60;
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
  if (!searchSheetDragState.dragging && Math.hypot(dx, dy) < 6) return;
  searchSheetDragState.dragging = true;
  e.preventDefault();
  searchSheetPos.value = clampSearchSheetPosition(
    searchSheetDragState.originX + dx,
    searchSheetDragState.originY + dy,
  );
};

const endSearchSheetDrag = () => {
  document.removeEventListener("pointermove", onSearchSheetDrag);
  document.removeEventListener("pointerup", endSearchSheetDrag);
  document.removeEventListener("pointercancel", endSearchSheetDrag);
  if (searchSheetDragState) {
    localStorage.setItem(
      "cm_search_sheet_pos",
      JSON.stringify(searchSheetPos.value),
    );
  }
  searchSheetDragState = null;
};

const startSearchSheetDrag = (e) => {
  if (e.button !== undefined && e.button !== 0) return;
  initSearchSheetPos();
  searchSheetDragState = {
    startX: e.clientX,
    startY: e.clientY,
    originX: searchSheetPos.value.x,
    originY: searchSheetPos.value.y,
    dragging: false,
  };
  document.addEventListener("pointermove", onSearchSheetDrag, {
    passive: false,
  });
  document.addEventListener("pointerup", endSearchSheetDrag);
  document.addEventListener("pointercancel", endSearchSheetDrag);
};

const clampSearchFabPosition = (x, y) => ({
  x: Math.max(
    SEARCH_FAB_MARGIN,
    Math.min(window.innerWidth - SEARCH_FAB_SIZE - SEARCH_FAB_MARGIN, x),
  ),
  y: Math.max(
    SEARCH_FAB_MARGIN,
    Math.min(window.innerHeight - SEARCH_FAB_SIZE - SEARCH_FAB_MARGIN, y),
  ),
});

// 与折叠圆点一样始终固定在可视区域内；避免其它页面或旋转屏幕后恢复了屏幕外的旧坐标。
const keepSearchFabInViewport = () => {
  searchFabPos.value = clampSearchFabPosition(
    searchFabPos.value.x,
    searchFabPos.value.y,
  );
};

const onSearchFabDrag = (e) => {
  if (!searchFabDragState) return;
  const dx = e.clientX - searchFabDragState.startX;
  const dy = e.clientY - searchFabDragState.startY;
  if (!searchFabDragging.value && Math.hypot(dx, dy) < 6) return;
  searchFabDragging.value = true;
  searchFabPos.value = clampSearchFabPosition(
    searchFabDragState.originX + dx,
    searchFabDragState.originY + dy,
  );
};

const endSearchFabDrag = () => {
  document.removeEventListener("pointermove", onSearchFabDrag);
  document.removeEventListener("pointerup", endSearchFabDrag);
  document.removeEventListener("pointercancel", endSearchFabDrag);
  if (searchFabDragging.value) {
    localStorage.setItem(
      "cm_search_fab_pos",
      JSON.stringify(searchFabPos.value),
    );
  } else {
    toggleSearch();
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

const searchIsValid = computed(
  () => !searchQuery.value || buildSearchQuery().valid,
);
const canSearch = computed(() =>
  Boolean(searchQuery.value && searchIsValid.value),
);

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

const toggleReplace = () => {
  replaceOpen.value = !replaceOpen.value;
};

const openSearch = () => {
  if (searchOpen.value) return;
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

const toggleSearch = () => {
  if (searchOpen.value) {
    closeSearch();
  } else {
    openSearch();
  }
};

const closeSearch = () => {
  searchOpen.value = false;
  disarmReplaceAll();
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
  if (view) {
    view.dispatch({
      effects: setSearchQuery.of(new SearchQuery({ search: "" })),
    });
  }
  // ★ 关闭时清除拖拽状态
  searchSheetDragState = null;
};

const onSearchInput = () => {
  disarmReplaceAll();
  dispatchSearch();
};

const onSearchEnter = (e) => {
  if (!canSearch.value || !view) return;
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
  () => [
    compressOpts.keepNames,
    compressOpts.keepConsole,
    compressOpts.charset,
  ],
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
    formatWorker = new Worker(new URL("./formatWorker.js", import.meta.url), {
      type: "module",
    });
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
          toplevel: !compressOpts.keepNames,
        },
        mangle: compressOpts.keepNames
          ? false
          : {
              toplevel: true,
            },
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
  try {
    if (!navigator.clipboard?.writeText) throw new Error("不支持原生剪贴板");
    await navigator.clipboard.writeText(code);
    showToast("已复制 (" + code.length + " 字符)");
  } catch (e) {
    showToast("复制失败，请使用 HTTPS 或授予剪贴板权限");
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

// const onCollapseClick = () => {
//   collapsed.value = true;
// };
const toggleCollapsed = () => {
  collapsed.value = !collapsed.value;
};

// ★ 监听设置变更事件，实时重配 Compartment
const handleSettingsChange = (e) => {
  if (e?.detail) {
    cmConfig = { ...cmConfig, ...e.detail };
  } else {
    cmConfig = getCmSettings();
  }
  updateConfigThresholds();
  if (!view) return;

  const docLen = view.state.doc.length;
  const isLargeFile = isRuntimeLargeFile(docLen);
  const editAssistEnabled = !isLargeFile;

  view.dispatch({
    effects: [
      lineWrappingCompartment.reconfigure(createLineWrappingExt(docLen)),
      heavyDecorations.reconfigure(createHeavyDecorations(docLen)),
      editAssist.reconfigure(createEditAssist(editAssistEnabled)),
      hyperLinkCompartment.reconfigure(createHyperLinkExt(!isLargeFile)),
    ],
  });
  requestAnimationFrame(() => view?.requestMeasure?.());

  // 如果当前是高亮状态但文档超过了新的高亮阈值，降级纯文本；反之若在阈值内且为 auto 则重新同步高亮
  if (isLargeFile) {
    if (activeLanguage.value !== "plaintext") {
      applyLanguage("plaintext", undefined, false, docLen);
    }
  } else if (activeLanguage.value === "plaintext") {
    if (selectedLanguage.value === "auto") {
      syncLanguageForDocument();
    } else {
      applyLanguage(selectedLanguage.value, undefined, false, docLen);
    }
  }
};

onMounted(() => {
  window.addEventListener(CM_SETTINGS_EVENT, handleSettingsChange);
});

onBeforeUnmount(() => {
  window.removeEventListener(CM_SETTINGS_EVENT, handleSettingsChange);
});
</script>

<style scoped>
/* 展开态工具栏不参与页面的上下拖动；按钮和 select 仍可正常点击。 */
.cmviewRef > .cm-toolbar-row--locked-y {
  position: relative;
  top: auto;
  left: auto;
  right: auto;
  z-index: 50;
  flex: 0 0 40px;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  overflow-y: hidden !important;
  overscroll-behavior-y: none;
  touch-action: pan-x;
}

.cmviewRef > .cm-toolbar-row--locked-y .cm-toolbar-wrapper {
  flex: 1 1 auto;
  width: auto;
  min-width: 0;
  max-width: calc(100% - 41px);
  height: 40px;
  min-height: 40px;
  max-height: 40px;
  overflow-y: hidden !important;
  overscroll-behavior-y: none;
}

/* CmView 自己占满视口，页面 body 不再承担编辑器滚动。 */
.cmviewRef {
  width: 100%;
  max-width: 100%;
  height: 100dvh;
  min-height: 100dvh;
  min-width: 0;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  overflow: hidden;
  position: relative;
}

.cmviewRef > .cmview-editor-host {
  flex: 1 1 0;
  width: 100% !important;
  min-width: 0 !important;
  min-height: 0 !important;
  height: auto !important;
  max-height: none !important;
  overflow: hidden !important;
}

.cmviewRef > .cm-toolbar-row--locked-y .cm-toolbar-wrapper,
.cmviewRef > .cm-toolbar-row--locked-y .cm-img-button {
  flex: 1 1 auto;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  height: 40px;
  min-height: 40px;
  max-height: 40px;
  box-sizing: border-box;
  overflow-y: hidden !important;
}

.cmviewRef :deep(.cm-editor) {
  min-height: 0 !important;
  height: 1000px !important;
  /* 100% !important; */
  max-height: 1000px !important;
}

.cmviewRef :deep(.cm-scroller) {
  min-height: 0 !important;
  height:1000px !important;
  max-height: 1000px !important;
}
.cmviewRef {
  height: 130dvh;
  min-height: 130dvh;
}

</style>