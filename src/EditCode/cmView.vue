<template>
  <div class="cmviewRef">
    <div class="cm-img-button">
      <div v-if="openPanel">
        <div class="language-select-wrap">
          <!-- <span class="language-select-display" aria-hidden="true">
            {{ selectedLanguageDisplayLabel }}
          </span> // @xream -->
          <select v-model="selectedLanguage" class="language-select" :title="selectedLanguageTitle" aria-label="Editor language" @change="onLanguageChange">
            <option v-for="option in languageOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </div>
        <button @click="undoCode"><img :src="undoimg" /></button>
        <button @click="redoCode"><img :src="redoimg" /></button>
        <button @click="formatCode"><img :src="format" /></button>
        <button @click="searchs"><img :src="searchimg" /></button>
        <button @click="copyText"><img :src="copyimg" /></button>
        <button @click="delAllCode"><img :src="del" /></button>
        <button @click="pasteNav"><img :src="paste" /></button>
      </div>
      <!-- <span v-else style="opacity: 0.4; font-size: 12px; padding-left: 10px">{{ Length }} &nbsp;</span> -->
      <button @click="setPanel"><img :src="more" /></button>
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
import { highlightSelectionMatches, searchKeymap, openSearchPanel, gotoLine, closeSearchPanel } from "@/EditCode/search";
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
import more from "@/img/svg/more.svg";
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

let languageRequestId = 0;
const editorLanguage_json = {
  auto: "自动",
  javascript: "JavaScript",
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
const normalizedToolbarActions = computed(() => new Set(Array.isArray(props.toolbarActions) ? props.toolbarActions : DEFAULT_TOOLBAR_ACTIONS));
const isToolbarActionEnabled = (action) => normalizedToolbarActions.value.has(action);
const canToggleToolbarPanel = computed(() => isToolbarActionEnabled("panel"));

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
  EDITOR_LANGUAGE_OPTIONS.map((option) =>
    option.value === "auto"
      ? {
          ...option,
          label: autoDetectedLanguage.value ? `${getLanguageLabel("auto")} · ${getLanguageLabel(autoDetectedLanguage.value)}` : getLanguageLabel(option.value),
        }
      : {
          ...option,
          label: getLanguageLabel(option.value),
        },
  ),
);
const selectedLanguageTitle = computed(() => {
  if (normalizeEditorLanguage(selectedLanguage.value, "auto") !== "auto") {
    return selectedLanguageDisplayLabel.value;
  }

  return autoDetectedLanguage.value ? `${getLanguageLabel("auto")} · ${getLanguageLabel(autoDetectedLanguage.value)}` : getLanguageLabel("auto");
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

const openPanel = ref(canToggleToolbarPanel.value ? localStorage.getItem("openCodePanel") != 1 : true);
const setPanel = () => {
  if (!canToggleToolbarPanel.value) return;

  if (openPanel.value) {
    openPanel.value = false;
    localStorage.setItem("openCodePanel", 1);
  } else {
    openPanel.value = true;
    localStorage.setItem("openCodePanel", 0);
  }
};

let sopen = true;
const searchs = () => {
  if (sopen) {
    openSearchPanel(view);
    sopen = false;
  } else {
    closeSearchPanel(view);
    sopen = true;
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
</script>

<style lang="scss" scoped>
.language-select-wrap {
  position: relative;
  display: flex;
  align-items: center;
  height: 24px;
  // width: 110px;
  padding: 3px 5px 0 0;
  margin-right: 6px;
  color: var(--second-text-color);
  flex: 0 1 auto;
  border: 0px solid #8b8b8b66;
  border-radius: 6px;
}

.language-select-display {
  position: absolute;
  inset: 0 20px 0 8px;
  z-index: 1;
  display: flex;
  align-items: center;
  overflow: hidden;
  color: currentColor;
  font-size: 12px;
  line-height: 22px;
  pointer-events: none;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.language-selects {
  text-align: right;
  -webkit-appearance: none;
  appearance: none;
  display: block;
  position: relative;
  z-index: 2;
  box-sizing: border-box;
  height: 24px;
  width: 120px;
  max-width: 34vw;
  padding: 0 20px 0 8px;
  border: 1px solid #8b8b8b66;
  border-radius: 6px;
  background-color: transparent;
  background-image: none;
  box-shadow: none;
  color: transparent;
  font-size: 12px;
  line-height: 22px;
  outline: none;
  opacity: 1;
  text-overflow: ellipsis;
  -webkit-text-fill-color: transparent;
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
  text-align: right;
  border-radius: 6px;
  color: var(--text);
  // color: inherit;

  outline: none;

  appearance: none;

  -webkit-appearance: none;

  padding: 0 0px 1px 0px;

  height: 28px;
}

@media (max-width: 480px) {
  .cm-img-button button {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 28px;
  }

  .cm-img-button .language-detect-button {
    flex-basis: 22px;
    width: 22px;
    height: 22px;
    margin-right: 3px;
  }

  .language-select-wrap {
    margin-right: 3px;
  }

  .language-select {
    width: 104px;
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

.cm-img-button > div:first-child {
  // text-align: right;
  display: flex;
  align-items: center;
  gap: 6px;
}
</style>