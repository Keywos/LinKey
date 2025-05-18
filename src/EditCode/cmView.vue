<template>
  <div class="cmviewRef">
    <div class="cm-img-button">
      <div v-if="openPanel">
        <button @click="hiCode"><img :src="jsimg" /></button>
        <button @click="undoCode"><img :src="undoimg" /></button>
        <button @click="redoCode"><img :src="redoimg" /></button>
        <button @click="formatCode"><img :src="format" /></button>
        <button @click="searchs"><img :src="searchimg" /></button>
        <button @click="copyText"><img :src="copyimg" /></button>
        <button @click="delAllCode"><img :src="del" /></button>
        <button @click="pasteNav"><img :src="paste" /></button>
      </div>
      <span v-else style="opacity: 0.4; font-size: 12px; padding-left: 10px">{{ Length }} &nbsp;</span>
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
import { ref, onMounted, watch } from "vue";
import { highlightSelectionMatches, searchKeymap, openSearchPanel, closeSearchPanel } from "@/EditCode/search";
import { lineNumbers, EditorView, highlightActiveLine, keymap } from "@codemirror/view";
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
import jsimg from "@/img/svg/jsimg.svg";
import { useTheme } from "@/hooks/theme";
import beautify from "js-beautify";
import { useCmStore } from "@/store/cmCodeStore.js";
import localforage from "localforage";

const { toClipboard } = useV3Clipboard();
const cmStore = useCmStore();
const Length = ref("");
const { isDarkModeEnabled } = useTheme();
const props = defineProps(["isReadOnly"]);

localforage.config({
  name: "Linkey",
  storeName: "codeData",
});

const viewRef = ref(null);
const editorTheme = new Compartment();
const langs = new Compartment();
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
          const saveData = async () => {
            await localforage.setItem("codehub", docContent);
            console.log("0 更新数据 - 已存储");
          };
          saveData();
          cmStore.setCmCode(docContent);
          Length.value = formatLength(docContent.length);
          docUpdate = false;
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
      if (!docUpdate && newValue !== view.state.doc.toString()) {
        console.log("0 Code更新到文档");
        view.dispatch({
          changes: {
            from: 0,
            to: view.state.doc.length,
            insert: newValue,
          },
        });
        getjsjson(newValue);
      }
    }
  );

  watch(isDarkModeEnabled, (isDark) => {
    if (isDark) {
      view.dispatch({
        effects: editorTheme.reconfigure(darkCode),
      });
    } else {
      view.dispatch({
        effects: editorTheme.reconfigure(lightCode),
      });
    }
  });
};
function formatLength(length) {
  if (length < 1024) {
    return length === 0 ? "" : length + " bytes";
  } else if (length < 1024 * 1024) {
    return (length / 1024).toFixed(2) + " KB";
  } else {
    return (length / (1024 * 1024)).toFixed(2) + " MB";
  }
}
const getjsjson = (res) => {
  Length.value = formatLength(res.length);
  try {
    const jsRegex = /(?:function|var|let|const|if|else|return|try|catch|finally|typeof|delete|async|await)\s/;
    if (jsRegex.test(res.slice(0, 4000))) {
      setHJ();

      console.log("---setHJ");
      return true;
    } else {
      if (/\{/.test(res.slice(0, 4000))) {
        try {
          res = res.replace(/^\/\* CH[\s\S]+CH \*\//, "");
          JSON.parse(res);
          setHJ();
          return true;
        } catch (error) {
          noHJ();
          return true;
        }
      } else {
        noHJ();
        return false;
      }
    }
  } catch (error) {
    noHJ();
    return false;
  }
};

onMounted(() => {
  CreateView();
  let lg = localStorage.getItem("highlightJS");
  if (!getjsjson(cmStore.CmCode)) {
    if (lg == 1 || lg == null) setHJ();
    else noHJ();
  }
});

const openPanel = ref(localStorage.getItem("openCodePanel") != 1);
const setPanel = () => {
  if (openPanel.value) {
    openPanel.value = false;
    localStorage.setItem("openCodePanel", 1);
  } else {
    openPanel.value = true;
    localStorage.setItem("openCodePanel", 0);
  }
};

let ishiCode = localStorage.getItem("highlightJS") != 1;
const hiCode = () => {
  if (ishiCode) {
    setHJ();
    ishiCode = false;
    localStorage.setItem("highlightJS", 1);
  } else {
    noHJ();
    ishiCode = true;
    localStorage.setItem("highlightJS", 0);
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

const setHJ = () => {
  view.dispatch({
    effects: langs.reconfigure(javascript()),
  });
};
const noHJ = () => {
  view.dispatch({
    effects: langs.reconfigure([]),
  });
};

const undoCode = () => undo(view);
const redoCode = () => redo(view);

async function formatCode() {
  try {
    cmStore.setCmCode(
      beautify
        .js_beautify(cmStore.CmCode, {
          indent_size: 2,
        })
        .replace(/^\s*[\r\n]/gm, "\n")
    );
  } catch (error) {
    console.error(error);
  }
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
