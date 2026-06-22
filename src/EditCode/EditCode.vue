<template>
  <h2 style="-webkit-user-select: none; user-select: none; display: flex; justify-content: space-between; width: 90%">
    <span @click="goFunction()">Code Hub</span>
    <div style="display: flex; align-items: center; gap: 10px; color: var(--text)">
      <span @click="toggleSaves" style="font-size: 14px; padding: 6px 10px; cursor: pointer; color: var(--text)">{{ showSaves ? "关闭" : "载入" }}</span>
      <!-- <span @click="rePwa()" style="font-size: 14px; padding: 6px 20px; opacity: 0.1">⟳</span> -->
    </div>
  </h2>
  <!-- 保存列表面板 -->
  <div v-if="showSaves" class="saves-panel">
    <div class="saves-body">
      <div class="saves-toolbar">
        <button class="saves-btn" @click="toggleSelectMode">{{ selectMode ? "完成" : "选择" }}</button>

        <template v-if="selectMode">
          <label class="saves-check-all">
            <input type="checkbox" :checked="allChecked" @change="toggleCheckAll" />
            全选
          </label>
          <button class="saves-btn" :disabled="checkedIds.length === 0" @click="deleteSelected">删除({{ checkedIds.length }})</button>

          <button class="saves-btn" :disabled="checkedIds.length === 0" @click="exportSelected">导出选中({{ checkedIds.length }})</button>
        </template>

        <template v-else>
          <button class="saves-btn" @click="createNewBlank">新建</button>

          <button class="saves-btn" @click="requestUrlContent">URL</button>

          <button class="saves-btn" @click="triggerImport">导入</button>

          <button class="saves-btn" @click="exportCurrent">导出</button>
        </template>

        <input ref="importInputRef" type="file" style="display: none" @change="onImportFileChange" />
      </div>
      <div ref="savesListRef" class="saves-list" :style="{ maxHeight: savesPanelHeight + 'px' }">
        <div v-if="savedItems.length === 0" class="saves-empty">暂无保存的内容</div>
        <div v-for="item in savedItems" :key="item.id" class="saves-item" :class="{ 'saves-item-current': item.id === currentItemId }">
          <input v-if="selectMode" type="checkbox" :value="item.id" v-model="checkedIds" />

          <div class="saves-item-info">
            <div class="saves-item-name">
              {{ item.name }}
            </div>

            <div class="saves-item-preview">
              <template v-if="item.url">
                <div v-if="item.blobUrl" class="saves-url-line" title="点击复制 blob URL" @click.stop="copyUrl(item, 'blob')">{{ item.blobUrl }}</div>
                <div class="saves-url-line" title="点击复制 raw URL" @click.stop="copyUrl(item, 'raw')">{{ item.url }}</div>
                <div class="saves-item-content-preview">{{ item.preview || "" }}</div>
              </template>
              <template v-else>
                <span class="saves-item-content-preview">{{ item.preview || "" }}</span>
              </template>
            </div>

            <div class="saves-item-meta">
              {{ formatTime(item.updatedAt) }}
              ·
              {{ formatBytes(item.length) }}
            </div>
          </div>

          <template v-if="item.url">
            <button class="saves-refresh-btn" :disabled="loadingItemId === item.id" @click="refreshUrlItem(item)" title="重新请求 URL 更新当前文件">请求</button>
          </template>
          <button class="saves-load-btn" :disabled="loadingItemId === item.id" @click="loadItem(item)">
            <!-- {{ loadingItemId === item.id ? "加载中" : "加载" }} -->
            加载
          </button>
        </div>
      </div>
    </div>
    <!-- 拖拽调整高度手柄 -->
    <div ref="savesHandleRef" class="saves-resize-handle" @mousedown="startSavesResize">
      <div class="saves-resize-bar"></div>
    </div>
  </div>

  <cmView id="main" :isReadOnly="false" />
  <div v-if="showlog" style="padding: 0 2%; position: fixed; bottom: 0; left: 0; width: 96%; z-index: 999">
    <div style="display: flex; justify-content: space-between">
      <div class="pretitcode" @click="showlogs" />
      <div @click="goFunction()" style="position: relative; top: 40px; position: relative; height: 25px; right: 0; width: 40%" />
    </div>
    <pre @click="copyText(logAll)" class="prem-code"> {{ logAll.replace(/ /g, "&nbsp;") }}</pre>
  </div>

  <!-- 自定义输入弹窗（替代 window.prompt，iOS PWA 独立模式下 prompt 不可用） -->
  <div v-if="promptState.visible" class="modal-mask" @click.self="promptCancel">
    <div class="modal-box">
      <div class="modal-title">{{ promptState.title }}</div>
      <input ref="promptInputRef" v-model="promptState.value" class="modal-input" type="text" @keyup.enter="promptConfirm" @keyup.esc="promptCancel" />
      <div class="modal-actions">
        <button class="modal-btn" @click="pasteToPromptInput">粘贴</button>
        <button class="modal-btn" @click="promptCancel">取消</button>
        <button class="modal-btn modal-btn-primary" @click="promptConfirm">确定</button>
      </div>
    </div>
  </div>

  <!-- 自定义确认弹窗（替代 window.confirm） -->
  <div v-if="confirmState.visible" class="modal-mask" @click.self="confirmNo">
    <div class="modal-box">
      <div class="modal-title">{{ confirmState.title }}</div>
      <div class="modal-actions">
        <button class="modal-btn" @click="confirmNo">取消</button>
        <button class="modal-btn modal-btn-primary" @click="confirmYes">确定</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import cmView from "./cmView.vue";
import { ref, computed, nextTick, watch, watchEffect, onMounted, onBeforeUnmount } from "vue";
import { showToast } from "vant";
import { useTheme } from "@/hooks/theme";
import { useCmStore } from "@/store/cmCodeStore.js";
import { getExportExtensionByLanguage } from "@/EditCode/fileLanguageUtils";
import useV3Clipboard from "vue-clipboard3";
import { useRoute } from "vue-router";
import { sendReq } from "@/http/http.js";
import { openDB } from "idb";

const dbPromise = openDB("codehub", 1, {
  upgrade(db) {
    db.createObjectStore("store");
  },
});

const idbStorage = {
  async getItem(key) {
    return (await dbPromise).get("store", key);
  },
  async setItem(key, value) {
    return (await dbPromise).put("store", value, key);
  },
  async removeItem(key) {
    return (await dbPromise).delete("store", key);
  },
};

import JSZip from "jszip";
let skipWatchSave = false;
const route = useRoute();
const israw = ref(false);
const grc = ref("");
const { toClipboard } = useV3Clipboard();
const cmStore = useCmStore();
const showlog = ref(false);
const showlogs = () => {
  showlog.value = false;
};
const EMPTY_CONTENT = "\n".repeat(19);
const { isDarkModeEnabled } = useTheme();
const logAll = ref("");
const props = defineProps(["isReadOnly"]);
const lastSavedContent = ref("");
// ===== 自定义弹窗（替代 window.prompt / window.confirm） =====
const promptState = ref({ visible: false, title: "", value: "", resolve: null });
const confirmState = ref({ visible: false, title: "", resolve: null });

async function requestUrlContent() {
  const url = await askPrompt("输入 Github/raw/普通文本链接");

  if (!url) return;

  await loadUrlContent(url.trim());
}
function askPrompt(title, defaultValue = "") {
  return new Promise((resolve) => {
    promptState.value = {
      visible: true,
      title,
      value: defaultValue,
      resolve,
    };
  });
}

const promptConfirm = () => {
  const { resolve, value } = promptState.value;
  promptState.value.visible = false;
  resolve?.(value);
};
const promptCancel = () => {
  const { resolve } = promptState.value;
  promptState.value.visible = false;
  resolve?.(null);
};

async function pasteToPromptInput() {
  try {
    const text = await navigator.clipboard.readText();
    if (text) {
      promptState.value.value = text;
    }
  } catch {
    // 静默失败
  }
}

function askConfirm(title) {
  return new Promise((resolve) => {
    confirmState.value = { visible: true, title, resolve };
  });
}
const confirmYes = () => {
  const { resolve } = confirmState.value;
  confirmState.value.visible = false;
  resolve?.(true);
};
const confirmNo = () => {
  const { resolve } = confirmState.value;
  confirmState.value.visible = false;
  resolve?.(false);
};
// ===== 自定义弹窗 end =====

// ===== 保存列表 =====
const SAVES_INDEX_KEY = "codehub_saves_index";
const createId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

const createMeta = (name, content) => ({
  id: createId(),
  name,
  ...buildMeta(content),
});

const contentKey = (id) => `codehub_save_content:${id}`;

const savedItems = ref([]); // 索引数组: [{id, name, preview, length, updatedAt, language}]，不含 content
const checkedIds = ref([]);
const showSaves = ref(false);
const loadingItemId = ref(null); // 当前正在异步加载内容的项 id
const selectMode = ref(false); // 是否处于"选择"模式（显示复选框/全选/删除/导出选中）

// ===== 保存面板拖拽调整高度 =====
const MIN_SAVES_HEIGHT = 10;
const SAVES_HEIGHT_KEY = "codehub_saves_panel_height";
const savesPanelHeight = ref(parseInt(localStorage.getItem(SAVES_HEIGHT_KEY), 10) || Math.round(window.innerHeight * 0.3));
const savesHandleRef = ref(null);
let savesResizeStartY = 0;
let savesResizeStartHeight = 0;

function startSavesResize(e) {
  savesResizeStartY = e.clientY;
  savesResizeStartHeight = savesPanelHeight.value;
  document.addEventListener("mousemove", onSavesResize);
  document.addEventListener("mouseup", endSavesResize);
  document.body.style.cursor = "row-resize";
  e.preventDefault();
}

function startSavesResizeTouch(e) {
  if (e.touches.length !== 1) return;
  savesResizeStartY = e.touches[0].clientY;
  savesResizeStartHeight = savesPanelHeight.value;
  document.addEventListener("touchmove", onSavesResizeTouch);
  document.addEventListener("touchend", endSavesResize);
  e.preventDefault();
}

function onSavesResize(e) {
  const delta = e.clientY - savesResizeStartY;
  savesPanelHeight.value = Math.max(MIN_SAVES_HEIGHT, savesResizeStartHeight + delta);
}

function onSavesResizeTouch(e) {
  if (e.touches.length !== 1) return;
  const delta = e.touches[0].clientY - savesResizeStartY;
  savesPanelHeight.value = Math.max(MIN_SAVES_HEIGHT, savesResizeStartHeight + delta);
}

function endSavesResize() {
  document.removeEventListener("mousemove", onSavesResize);
  document.removeEventListener("mouseup", endSavesResize);
  document.removeEventListener("touchmove", onSavesResizeTouch);
  document.removeEventListener("touchend", endSavesResize);
  document.body.style.cursor = "";
  localStorage.setItem(SAVES_HEIGHT_KEY, savesPanelHeight.value.toString());
}
// ===== 保存面板拖拽调整高度 end =====

const toggleSaves = async () => {
  showSaves.value = !showSaves.value;

  await idbStorage.setItem("SHOW_SAVES_KEY", showSaves.value);
};
const toggleSelectMode = () => {
  selectMode.value = !selectMode.value;
  if (!selectMode.value) {
    checkedIds.value = []; // 退出选择模式时清空已勾选项
  }
};

const loadSaves = async () => {
  try {
    const list = await idbStorage.getItem(SAVES_INDEX_KEY);
    savedItems.value = Array.isArray(list) ? list : [];
  } catch (error) {
    console.error("读取保存列表失败", error);
    savedItems.value = [];
  }
};

const persistIndex = async () => {
  try {
    const plainList = savedItems.value.map((item) => ({ ...item }));
    await idbStorage.setItem(SAVES_INDEX_KEY, plainList);
  } catch (error) {
    console.error("写入保存列表索引失败", error);
    showToast("保存列表写入失败");
  }
};

// 预览只需要取内容的前一小段处理，不要对整份大文件做正则扫描
const buildMeta = (content) => ({
  length: content.length,
  preview: content.slice(0, 60).replace(/\s+/g, " ").slice(0, 30),
  updatedAt: Date.now(),
  language: cmStore.activeLanguage, // 保存时记录当前识别出的语言，供导出时决定后缀
});

const createNewBlank = async () => {
  if (currentItemId.value && !cmStore.CmCode) {
    showToast("已经是新建状态");
    return;
  }

  clearTimeout(autosaveTimer);

  const defaultName = `CH_${new Date()
    .toLocaleString("zh-CN")
    .replace(/[^\d\s]/g, "")
    .replace(/\D/g, "_")}.js`;
  const item = {
    id: createId(),
    name: defaultName,
    ...buildMeta(EMPTY_CONTENT),
    language: "plaintext", // 新建内容固定为空白，语言结果是确定的，不依赖 cmStore.activeLanguage（此刻它还是切换前文件的残留值）
  };

  try {
    await idbStorage.setItem(contentKey(item.id), "");

    savedItems.value.unshift(item);
    await persistIndex();

    // 🔥 关键：从这里开始加锁
    skipWatchSave = true;

    // 👉 先切换当前文件
    await setCurrentItem(item.id, item.name);

    // 👉 再清空编辑器
    cmStore.setCmCode(EMPTY_CONTENT);
    lastSavedContent.value = EMPTY_CONTENT;

    // 强制再写一次数据库（关键）
    await idbStorage.setItem(contentKey(item.id), EMPTY_CONTENT);

    isDirty = false;

    // 🔥 下一帧解锁（防止 watch 误触）
    nextTick(() => {
      skipWatchSave = false;
    });
  } catch (e) {
    console.log(e);
    showToast("新建失败");
  }
};

const deleteSelected = async () => {
  if (checkedIds.value.length === 0) {
    showToast("请先勾选要删除的项");
    return;
  }
  const ids = [...checkedIds.value];
  const ok = await askConfirm(`确定要删除选中的 ${ids.length} 项吗？此操作不可恢复。`);
  if (!ok) return;

  try {
    await Promise.all(ids.map((id) => idbStorage.removeItem(contentKey(id))));
  } catch (error) {
    console.error("删除内容失败", error);
  }
  savedItems.value = savedItems.value.filter((item) => !ids.includes(item.id));
  checkedIds.value = [];
  await persistIndex();

  if (currentItemId.value && ids.includes(currentItemId.value)) {
    await setCurrentItem(null, "");
  }

  showToast(`已删除 ${ids.length} 项`);
};

const loadItem = async (item) => {
  loadingItemId.value = item.id;

  try {
    const content = await idbStorage.getItem(contentKey(item.id));

    cmStore.setCmCode(content || EMPTY_CONTENT);

    await setCurrentItem(item.id, item.name);

    lastSavedContent.value = content || EMPTY_CONTENT;

    // setCmCode / setCurrentItem 触发的 watch 是异步的，会在本轮同步代码跑完后
    // 把 isDirty 误置为 true（内容/文件名其实都没有"新改动"，只是刚从存储里读出来）。
    // 等一拍再纠正，避免触发一次无意义的自动保存写入。
    await nextTick();
    clearTimeout(autosaveTimer);
    isDirty = false;

    showToast("已加载：" + item.name);
  } catch (e) {
    console.log(e);

    showToast("加载失败");
  } finally {
    loadingItemId.value = null;
  }
};

async function copyUrl(item, type) {
  const text = type === "blob" && item.blobUrl ? item.blobUrl : item.url;
  try {
    await toClipboard(text);
    showToast("已复制 " + (type === "blob" ? "blob" : "raw") + " URL");
  } catch {
    showToast("复制失败");
  }
}

async function refreshUrlItem(item) {
  if (!item.url) return;
  loadingItemId.value = item.id;
  try {
    let currentURL = item.url;
    let res = await sendReq("GET", currentURL);
    if (!res || !res.data) {
      const localURL = `https://surgetool.com/api/fetch?url=${encodeURIComponent(currentURL)}`;
      showToast("模块请求转发中…");
      res = await sendReq("GET", localURL);
    }
    if (!res || !res.data) {
      showToast("请求失败");
      return;
    }
    let content = res.data;
    if (typeof content !== "string") {
      content = JSON.stringify(content, null, 2);
    }
    await idbStorage.setItem(contentKey(item.id), content);
    item.length = content.length;
    item.preview = content.slice(0, 60).replace(/\s+/g, " ").slice(0, 30);
    item.updatedAt = Date.now();
    await persistIndex();
    cmStore.setCmCode(content);
    await setCurrentItem(item.id, item.name);
    lastSavedContent.value = content;
    await nextTick();
    clearTimeout(autosaveTimer);
    isDirty = false;
    showToast("已刷新：" + item.name);
  } catch (e) {
    console.log(e);
    showToast("刷新失败");
  } finally {
    loadingItemId.value = null;
  }
}

const allChecked = computed(() => savedItems.value.length > 0 && checkedIds.value.length === savedItems.value.length);
const toggleCheckAll = () => {
  checkedIds.value = allChecked.value ? [] : savedItems.value.map((i) => i.id);
};

function formatBytes(length) {
  if (!length) return "0 B";
  if (length < 1024) return length + " B";
  if (length < 1024 * 1024) return (length / 1024).toFixed(1) + " KB";
  return (length / (1024 * 1024)).toFixed(2) + " MB";
}
function formatTime(ts) {
  if (!ts) return "";

  return new Date(ts).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
// ===== 保存列表 end =====

// ===== 当前文件追踪 / 自动保存 / 记忆最后打开项 =====
const LAST_OPENED_KEY = "codehub_last_opened_id";

const currentItemId = ref(null);

const setCurrentItem = async (id, fileName = "") => {
  currentItemId.value = id;
  cmStore.setCurrentFileName(fileName); // 同步当前文件名（仅展示用，语言识别以内容检测为准，后缀会被自动改写）
  try {
    if (id) {
      await idbStorage.setItem(LAST_OPENED_KEY, id);
    } else {
      await idbStorage.removeItem(LAST_OPENED_KEY);
    }
  } catch (error) {
    console.error("记录最后打开项失败", error);
  }
};

let isDirty = false;

const syncCurrentItemContent = async () => {
  const id = currentItemId.value;
  if (!id) return;
  if (!isDirty) return;

  const content = cmStore.CmCode || "";

  try {
    await idbStorage.setItem(contentKey(id), content);

    lastSavedContent.value = content;
    isDirty = false;

    const idx = savedItems.value.findIndex((i) => i.id === id);

    if (idx === -1) return;

    savedItems.value[idx] = {
      ...savedItems.value[idx],
      name: cmStore.currentFileName || savedItems.value[idx].name,
      ...buildMeta(content),
    };

    await persistIndex();
  } catch (e) {
    console.log(e);
  }
};

let autosaveTimer = null;

const AUTOSAVE_BASE_DELAY = 800;
const getAutosaveDelay = (length) => {
  if (length > 2000000) return 3000; // > 2MB
  if (length > 500000) return 1500; // > 500KB
  return AUTOSAVE_BASE_DELAY;
};

watch(
  () => cmStore.CmCode,
  (newVal) => {
    if (skipWatchSave) return; // 🔥 加这一行
    if (!currentItemId.value) return;

    isDirty = true;

    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(
      () => {
        syncCurrentItemContent();
      },
      getAutosaveDelay(newVal?.length || 0),
    );
  },
);

// 文件名后缀会被 cmView.vue 按语言检测结果自动改写（与内容变化是两件独立的事），
// 之前只有 cmStore.CmCode 变化会触发 isDirty/自动保存，导致文件名改写后
// 如果用户不再继续输入内容，这次改名永远没有保存窗口，列表里的 name 就一直是旧的。
// 这里单独监听文件名变化，同样标记 isDirty 并触发（短）防抖保存。
watch(
  () => cmStore.currentFileName,
  () => {
    if (skipWatchSave) return;
    if (!currentItemId.value) return;

    isDirty = true;

    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => {
      syncCurrentItemContent();
    }, AUTOSAVE_BASE_DELAY);
  },
);

const flushCurrentSave = async () => {
  clearTimeout(autosaveTimer);
  const id = currentItemId.value;
  if (!id || !isDirty) return;
  console.log("flush length:", cmStore.CmCode?.length);
  const content = cmStore.CmCode;
  if (content == null) return;
  try {
    await idbStorage.setItem(contentKey(id), content);

    lastSavedContent.value = content;
    isDirty = false;

    const idx = savedItems.value.findIndex((i) => i.id === id);
    if (idx !== -1) {
      savedItems.value[idx] = { ...savedItems.value[idx], name: cmStore.currentFileName || savedItems.value[idx].name, ...buildMeta(content) };
      await persistIndex();
    }
  } catch (error) {
    console.error("退出前保存失败", error);
  }
};

const handleVisibilityChange = () => {
  if (document.visibilityState === "hidden") {
    flushCurrentSave();
  }
};
const handleBeforeUnload = () => {
  flushCurrentSave();
};
// ===== 当前文件追踪 end =====

// ===== 导入 / 导出文件 =====
const importInputRef = ref(null);

const triggerImport = () => {
  importInputRef.value?.click();
};

const onImportFileChange = async (e) => {
  const file = e.target.files?.[0];
  e.target.value = "";
  if (!file) return;

  try {
    const text = await file.text();
    cmStore.setCmCode(text);

    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    await idbStorage.setItem(contentKey(id), text);
    await setCurrentItem(id, file.name);

    savedItems.value.unshift({ id, name: file.name, ...buildMeta(text) });
    await persistIndex();

    lastSavedContent.value = text;

    // 同 loadItem：等 watch 异步触发完，再把误置的 isDirty 纠正回去
    await nextTick();
    clearTimeout(autosaveTimer);
    isDirty = false;

    showToast("已导入：" + file.name);
  } catch (error) {
    console.error("导入文件失败", error);
    showToast("导入失败：无法以文本方式读取该文件");
  }
};

const downloadTextFile = (filename, content) => {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// 根据记录的语言（item.language）得到导出文件名：
// - 后缀由语言决定（javascript/json/json5 -> js，yaml -> yaml，ini -> ini，其他/未识别 -> txt）
// - 如果文件名本身已经带有和目标后缀相同的扩展名，不重复拼接
const buildExportFilename = (name, language, fallbackBase = "CH") => {
  const safeBase = (name || fallbackBase).replace(/[\\/:*?"<>|]/g, "_");
  const ext = getExportExtensionByLanguage(language);

  const dotIndex = safeBase.lastIndexOf(".");
  const currentExt = dotIndex > 0 ? safeBase.slice(dotIndex + 1).toLowerCase() : "";

  if (currentExt === ext) return safeBase;
  return `${safeBase}.${ext}`;
};

// 重名去重：把序号插在扩展名前面，而不是结尾再加后缀
const dedupeFilename = (name, usedNames) => {
  if (!usedNames.has(name)) return name;
  const dotIndex = name.lastIndexOf(".");
  const base = dotIndex > 0 ? name.slice(0, dotIndex) : name;
  const ext = dotIndex > 0 ? name.slice(dotIndex) : "";
  let suffix = 1;
  let candidate = `${base}_${suffix}${ext}`;
  while (usedNames.has(candidate)) {
    suffix++;
    candidate = `${base}_${suffix}${ext}`;
  }
  return candidate;
};

const exportCurrent = () => {
  const content = cmStore.CmCode || "";
  if (!content) {
    showToast("当前内容为空，无需导出");
    return;
  }

  const ext = getExportExtensionByLanguage(cmStore.activeLanguage);
  downloadTextFile(
    `CH_${new Date()
      .toLocaleString("zh-CN")
      .replace(/[^\d\s]/g, "")
      .replace(/\D/g, "_")}.${ext}`,
    content,
  );
  showToast("已导出");
};

// 把列表中勾选的项导出：只有一项时直接下载该文件，多项才打包成 zip
const exportSelected = async () => {
  if (checkedIds.value.length === 0) {
    showToast("请先勾选要导出的项");
    return;
  }
  const ids = [...checkedIds.value];
  const items = savedItems.value.filter((item) => ids.includes(item.id));

  // 只有一项：直接下载单个文件，不压缩
  if (items.length === 1) {
    const item = items[0];
    try {
      const content = await idbStorage.getItem(contentKey(item.id));
      const finalName = buildExportFilename(item.name, item.language);
      downloadTextFile(finalName, content || "");
      showToast("已导出");
    } catch (error) {
      console.error("导出失败：" + item.name, error);
      showToast("导出失败");
    }
    return;
  }

  // 多项：打包成 zip
  const zip = new JSZip();
  const usedNames = new Set();
  let okCount = 0;

  for (const item of items) {
    try {
      const content = await idbStorage.getItem(contentKey(item.id));
      let finalName = buildExportFilename(item.name, item.language);

      // 避免重名条目互相覆盖（序号插在扩展名前面）
      finalName = dedupeFilename(finalName, usedNames);
      usedNames.add(finalName);

      zip.file(finalName, content || "");
      okCount++;
    } catch (error) {
      console.error("打包失败：" + item.name, error);
    }
  }

  if (okCount === 0) {
    showToast("导出失败");
    return;
  }

  showToast("正在打包…");

  try {
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `CodeHub_${Date.now()}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`已打包导出 ${okCount}/${items.length} 项`);
  } catch (error) {
    console.error("生成压缩包失败", error);
    showToast("生成压缩包失败");
  }
};
// ===== 导入 / 导出文件 end =====

const rePwa = async () => {
  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (let registration of registrations) {
      await registration.unregister();
    }
  }
  if ("caches" in window) {
    const cacheNames = await caches.keys();
    for (let cacheName of cacheNames) {
      await caches.delete(cacheName);
    }
  }
  showToast("重置 PWA 成功，即将刷新页面");
  setTimeout(() => {
    location.reload();
  }, 100);
};

function getFileNameFromUrl(url) {
  try {
    const pathname = new URL(url).pathname;

    let name = pathname.split("/").pop() || "";

    name = decodeURIComponent(name);

    if (!name) {
      name = `CH_${new Date()
        .toLocaleString("zh-CN")
        .replace(/[^\d\s]/g, "")
        .replace(/\D/g, "_")}.txt`;
    }
    return name;
  } catch {
    return `CH_${new Date()
      .toLocaleString("zh-CN")
      .replace(/[^\d\s]/g, "")
      .replace(/\D/g, "_")}.txt`;
  }
}

let xc = `/* 快捷方式
- 高亮
- 撤销
- 反向撤销
- 格式化 [Js / Json / 换行]
- 搜索 [查找替换/大小写匹配/全匹配/正则匹配]
- 复制
- 清空
- 粘贴
*/

// 链接快捷预览
// http://localhost:5173/EditCode

// 代码折叠
function a(i) {
  return [...new Set(i)].join('')
}

const arr = [1, 2, 3, 4, 2, 5, 6, 3]
console.log(a(arr))

console.log(new Date().toLocaleString('zh-CN'))

const x = 'Hello '
console.log( x + Date.now() )
// console.error(x)

const i = {
  username: 'Key',
  autoTheme: true,
  o: {
    a: 1,
    c: [ "1", "a", "2"]
  }
}
console.log(i.o.c[2])


// console.log(JSON.stringify(i,null,2))


// This is an example




















// end`;

async function loadUrlContent(inputUrl) {
  try {
    let currentURL = inputUrl;
    let bloburl = "";

    if (!/^https?:\/\//.test(currentURL)) {
      showToast("链接无效");
      return;
    }

    // github blob/raw
    if (/^https:\/\/github\.com\/.+?\/(blob|raw)\//.test(currentURL)) {
      bloburl = currentURL;

      currentURL = currentURL.replace(/\/(blob|raw)/, "").replace("github.com", "raw.githubusercontent.com");
    }

    // raw
    else if (/^https:\/\/raw\.githubusercontent\.com\//.test(currentURL)) {
      bloburl = extractAndFormatUrl(currentURL);
    }

    showToast("请求中");

    // 先尝试直连；若被 CORS 拦截则走本地同源接口（Vite dev server 中转）
    let res = await sendReq("GET", currentURL);
    if (!res || !res.data) {
      const localURL = `https://surgetool.com/api/fetch?url=${encodeURIComponent(currentURL)}`;
      showToast("模块请求转发中…");
      res = await sendReq("GET", localURL);
    }

    if (!res || !res.data) {
      showToast("请求失败");
      return;
    }

    let content = res.data;

    if (typeof content !== "string") {
      content = JSON.stringify(content, null, 2);
    }

    // 文件名
    const fileName = getFileNameFromUrl(bloburl || currentURL);

    // 每次创建新文件
    const id = createId();

    const item = {
      id,
      name: fileName,
      ...buildMeta(content),
      url: currentURL,
      blobUrl: bloburl,
    };

    await idbStorage.setItem(contentKey(id), content);

    savedItems.value.unshift(item);

    await persistIndex();

    cmStore.setCmCode(content);

    await setCurrentItem(id, fileName);

    lastSavedContent.value = content;

    isDirty = false;

    showToast("载入成功");
  } catch (e) {
    console.log(e);

    showToast("请求失败");
  }
}

onMounted(async () => {
  const blurNavdiv = document.querySelector(".blurNavdiv");
  blurNavdiv?.classList.add("blurNavdiv_code");
  let currentURL = Object.keys(route.query)[0] || "";
  let bloburl = "";
  const state = await idbStorage.getItem("SHOW_SAVES_KEY");

  if (typeof state === "boolean") {
    showSaves.value = state;
  }
  // try {
  //   if (currentURL !== "" && /^https:\/\/\w+/.test(currentURL)) {
  //     if (/^https:\/\/github\.com\/.+?\/(blob|raw)\/.+/.test(currentURL)) {
  //       console.log(currentURL);
  //       if (/^https:\/\/github\.com\/.+?\/raw\/.+/.test(currentURL)) {
  //         bloburl = currentURL.replace(/\/raw/, "/blob");
  //       } else {
  //         bloburl = currentURL;
  //       }
  //       currentURL = currentURL.replace(/\/(blob|raw)/, "").replace("github.com", "raw.githubusercontent.com");
  //       console.log(currentURL);
  //     } else if (/^https:\/\/raw\.githubusercontent\.com\/.+/.test(currentURL)) {
  //       bloburl = extractAndFormatUrl(currentURL);
  //     }
  //     showToast("请求链接：" + currentURL);
  //     let res = await sendReq("GET", currentURL);

  //     if (res.data) {
  //       let rd = res.data;
  //       if (rd && typeof rd === "object") {
  //         rd = JSON.stringify(rd, null, 2);
  //       } else {
  //         rd = String(rd);
  //       }
  //       showToast("请求成功：" + currentURL);
  //       israw.value = true;
  //       grc.value = rd;
  //       //           `/* CH
  //       // 原链接:
  //       // ${bloburl}

  //       // RAW链接:
  //       // ${currentURL}

  //       // CH */\n` + rd;
  //     } else {
  //       console.log(res);
  //       showToast(`请求失败:${res.status} ${res.message}: ${currentURL}`);
  //     }
  //   }
  // } catch (error) {}

  try {
    if (currentURL) {
      await loadUrlContent(currentURL);
    }
  } catch {}
  await loadSaves();

  const cc = cmStore.CmCode;
  let initialCode;

  if (israw.value) {
    // 从 blob 链接提取文件名
    const fileName = getFileNameFromUrl(bloburl || currentURL);

    // 每次都是新文件
    const id = createId();

    const item = {
      id,
      name: fileName,
      ...buildMeta(grc.value),
    };

    // 保存内容
    await idbStorage.setItem(contentKey(id), grc.value);

    // 插入列表顶部
    savedItems.value.unshift(item);

    // 保存索引
    await persistIndex();

    // 设为当前文件
    await setCurrentItem(id, fileName);

    lastSavedContent.value = grc.value;

    clearTimeout(autosaveTimer);

    isDirty = false;

    initialCode = grc.value;
  } else if (cc != "") {
    initialCode = cc;
  } else {
    let lastId = null;
    try {
      lastId = await idbStorage.getItem(LAST_OPENED_KEY);
    } catch (error) {
      console.error("读取最后打开项失败", error);
    }

    let lastContent = null;
    if (lastId) {
      try {
        lastContent = await idbStorage.getItem(contentKey(lastId));
      } catch (error) {
        console.error("读取最后打开内容失败", error);
      }
    }

    if (lastId && lastContent !== null && lastContent !== undefined) {
      initialCode = lastContent;
      currentItemId.value = lastId; // 直接赋值，避免重复写一次 LAST_OPENED_KEY

      const lastItem = savedItems.value.find((i) => i.id === lastId);
      cmStore.setCurrentFileName(lastItem?.name || "");

      console.log("0 已默认载入最后打开的内容");
    } else {
      const storedUsername = await idbStorage.getItem("codehub");
      if (storedUsername) {
        initialCode = storedUsername;
        console.log("0 读取到草稿数据");
      } else {
        initialCode = xc;
        // 首次启动：把示例代码存为列表项
        const firstId = createId();
        const firstName = "example.js";
        await idbStorage.setItem(contentKey(firstId), xc);
        savedItems.value.unshift({
          id: firstId,
          name: firstName,
          ...buildMeta(xc),
        });
        await persistIndex();
        await setCurrentItem(firstId, firstName);
      }
    }
  }
  cmStore.setCmCode(initialCode);
  lastSavedContent.value = initialCode || EMPTY_CONTENT;
  isDirty = false;

  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("beforeunload", handleBeforeUnload);

  // 被动 touchstart 绑定，消除浏览器 warning
  if (savesHandleRef.value) {
    savesHandleRef.value.addEventListener("touchstart", startSavesResizeTouch, { passive: false });
  }
});

// v-if 切换时重新绑定 touchstart 监听
watch(showSaves, (val) => {
  if (val) {
    nextTick(() => {
      if (savesHandleRef.value) {
        savesHandleRef.value.addEventListener("touchstart", startSavesResizeTouch, { passive: false });
      }
    });
  }
});

function extractAndFormatUrl(rawUrl) {
  const regex = /https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)/;
  const match = rawUrl.match(regex);
  if (match) {
    const formattedUrl = `https://github.com/${match[1]}/${match[2]}/blob/${match[3]}/${match[4]}`;
    return formattedUrl;
  } else return "Invalid URL";
}

const goFunction = async () => {
  try {
    const logs = [];
    const Consoles = {
      log: function (...args) {
        logs.push(args.map((arg) => String(arg)).join(" "));
      },
      error: function (...args) {
        logs.push("[Error] " + args.map((arg) => String(arg)).join(" "));
      },
    };
    try {
      const myFunction = new Function("console", cmStore.CmCode);
      await myFunction(Consoles);
    } catch (error) {
      logs.push(`[Err]: ${error.message}`);
    }
    showlog.value = true;
    logAll.value = "· " + logs.join("\n· ");
  } catch (error) {
    showlog.value = true;
    logAll.value = error.message;
  }
};

const copyText = async (i) => {
  if (i.length > 0) {
    await toClipboard(i);
    showToast("已复制字符串数: " + i.length);
  }
};

watchEffect(() => {
  if (isDarkModeEnabled.value) {
    document.body.style.backgroundColor = "#282c34";
  } else document.body.style.backgroundColor = "#f3f3f3";
});

onBeforeUnmount(() => {
  flushCurrentSave();
  document.removeEventListener("visibilitychange", handleVisibilityChange);
  window.removeEventListener("beforeunload", handleBeforeUnload);

  document.body.style.backgroundColor = "";
  const blurNavdiv = document.querySelector(".blurNavdiv");
  blurNavdiv?.classList.remove("blurNavdiv_code");
});
</script>

<style scoped>
.saves-panel {
  width: 92%;
  margin: 2% 4% 4% 4%;
  display: flex;
  flex-direction: column;
  background: transparent;
  border-radius: 20px;
  z-index: 996;
  position: relative;
  line-height: 16px;
  box-shadow: 0 0 5px #919db687;
}

.saves-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid rgba(128, 128, 128, 0.2);
  flex-wrap: wrap;
}

.saves-body {
  overflow: hidden;
  border-radius: 20px;
}

.saves-btn {
  font-size: 13px;
  padding: 5px;
  border-radius: 14px;
  border: 1px solid rgba(128, 128, 128, 0.4);
  background: transparent;
  color: inherit;
  flex: 1;
}

.saves-btn:disabled {
  opacity: 0.4;
}

.saves-btn-danger {
  color: #e25555;
  border-color: #e2555566;
}

.saves-check-all {
  display: flex;
  align-items: center;
  font-size: 13px;
  opacity: 0.8;
}

.saves-list {
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 4px 0;
}

.saves-empty {
  padding: 20px 0;
  text-align: center;
  opacity: 0.5;
  font-size: 13px;
}

/* 拖拽调整高度手柄 */
.saves-resize-handle {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 4px;
  height: 26px;
  cursor: row-resize;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  background: transparent;
}

.saves-resize-bar {
  width: 80px;
  height: 4px;
  border-radius: 2px;
  background: rgba(128, 128, 128, 0.35);
  transition: background 0.15s;
}

.saves-resize-handle:hover .saves-resize-bar,
.saves-resize-handle:active .saves-resize-bar {
  background: rgba(128, 128, 128, 0.55);
}

.saves-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-bottom: 1px solid rgba(128, 128, 128, 0.1);
}

.saves-item-current {
  background: rgba(92, 125, 190, 0.15);
}

.saves-item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
  color: var(--van-cell-text-color);
}

.saves-item-name {
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;

  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.saves-item-preview {
  margin-top: 3px;
  font-size: 12px;
  opacity: 0.7;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* URL 项预览多行布局 */
.saves-item-preview:has(.saves-url-line) {
  white-space: normal;
  overflow: visible;
}

.saves-url-line {
  cursor: pointer;
  text-decoration: underline;
  opacity: 0.7;
  font-size: 11px;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.saves-url-line:hover {
  opacity: 1;
}

.saves-item-content-preview {
  margin-top: 3px;
  font-size: 12px;
  opacity: 0.7;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.saves-item-meta {
  margin-top: 4px;

  font-size: 11px;
  opacity: 0.5;
}

.saves-load-btn {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 14px;
  border: 1px solid rgba(128, 128, 128, 0.4);
  background: transparent;
  color: inherit;
  flex-shrink: 0;
}

.saves-load-btn:disabled {
  opacity: 0.4;
}

.saves-refresh-btn {
  font-size: 14px;
  padding: 4px 8px;
  border-radius: 14px;
  border: 1px solid rgba(128, 128, 128, 0.4);
  background: transparent;
  color: inherit;
  flex-shrink: 0;
  cursor: pointer;
  line-height: 1;
}
.saves-refresh-btn:disabled {
  opacity: 0.4;
}

.saves-url-line {
  cursor: pointer;
  text-decoration: underline;
  opacity: 0.7;
  font-size: 11px;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.saves-url-line:hover {
  opacity: 1;
}

.saves-item-content-preview {
  margin-top: 3px;
  font-size: 12px;
  opacity: 0.7;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ===== 自定义弹窗样式 ===== */
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  z-index: 1000;
  padding: 123px 8% 0;
}

.modal-box {
  width: 100%;
  max-width: 320px;
  background: #d7d7d7;
  color: var(--text, #222);
  border-radius: 20px;
  padding: 18px 16px 14px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.25);
}

.modal-title {
  font-size: 15px;
  margin-bottom: 12px;
  line-height: 1.4;
}

.modal-input {
  width: 100%;
  box-sizing: border-box;
  font-size: 14px;
  padding: 8px 10px;
  border-radius: 14px;
  border: 1px solid rgba(128, 128, 128, 0.4);
  background: transparent;
  color: inherit;
  outline: none;
  margin-bottom: 14px;
}

.modal-input:focus {
  border-color: #5c7dbe;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.modal-btn {
  font-size: 12px;
  padding: 4px 15px;
  border-radius: 14px;
  border: 1px solid rgba(128, 128, 128, 0.4);
  background: transparent;
  color: inherit;
}

.modal-btn-primary {
  border-color: #5c7dbe;
  color: #5c7dbe;
}

@media (prefers-color-scheme: dark) {
  .modal-box {
    background: #16181c;
  }
}
</style>
