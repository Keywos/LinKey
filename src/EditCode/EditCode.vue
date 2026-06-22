<template>
  <h2 style="-webkit-user-select: none; user-select: none; display: flex; justify-content: space-between; width: 90%">
    <span @click="goFunction()">Code Hub</span>
    <div style="display: flex; align-items: center; gap: 10px; color: var(--text)">
      <span @click="toggleSaves" style="font-size: 16px; padding: 6px 10px; cursor: pointer; color: var(--text); line-height: 1; opacity: .4;">{{ showSaves ? "▴" : "▾" }}</span>
    </div>
  </h2>

  <!-- 保存列表面板 -->
  <div v-if="showSaves" class="saves-panel">
    <div class="saves-body" :style="{ height: savesPanelHeight + 'px' }">
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
      <div ref="savesListRef" class="saves-list">
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
            加载
          </button>
        </div>
      </div>
    </div>
    <!-- 拖拽调整高度手柄 -->
    <div ref="savesHandleRef" class="saves-resize-handle" @pointerdown="startSavesResizePointer">
      <div class="saves-resize-bar"></div>
    </div>
  </div>

  <!-- ★ 修复：加上 ref="cmViewRef" 供 loadItem 调用 skipNextLanguageSync -->
  <cmView ref="cmViewRef" id="main" :isReadOnly="false" />

  <div v-if="showlog" style="padding: 0 2%; position: fixed; bottom: 0; left: 0; width: 96%; z-index: 999">
    <div style="display: flex; justify-content: space-between">
      <div class="pretitcode" @click="showlogs" />
      <div @click="goFunction()" style="position: relative; top: 40px; position: relative; height: 25px; right: 0; width: 40%" />
    </div>
    <pre @click="copyText(logAll)" class="prem-code"> {{ logAll.replace(/ /g, "&nbsp;") }}</pre>
  </div>

  <!-- 自定义输入弹窗 -->
  <div v-if="promptState.visible" class="modal-mask" @click.self="promptCancel">
    <div class="modal-box">
      <div class="modal-title">{{ promptState.title }}</div>
      <input ref="promptInputRef" v-model="promptState.value" class="modal-input" type="text" autofocus @keyup.enter="promptConfirm" @keyup.esc="promptCancel" />
      <div class="modal-actions">
        <button class="modal-btn" @click="pasteToPromptInput">粘贴</button>
        <button class="modal-btn" @click="promptCancel">取消</button>
        <button class="modal-btn modal-btn-primary" @click="promptConfirm">确定</button>
      </div>
    </div>
  </div>

  <!-- 自定义确认弹窗 -->
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
let isSwitchingItem = false; // 切换文件期间抑制自动保存 watch
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
const promptInputRef = ref(null);

// ★ 修复：cmView 实例 ref，用于加载大文件前调用 skipNextLanguageSync
const cmViewRef = ref(null);

// ===== 自定义弹窗 =====
const promptState = ref({ visible: false, title: "", value: "", resolve: null });
const confirmState = ref({ visible: false, title: "", resolve: null });

watch(() => promptState.value.visible, (visible) => {
  if (visible) {
    nextTick(() => {
      promptInputRef.value?.focus();
    });
  }
});

async function requestUrlContent() {
  const url = await askPrompt("输入 Github/raw/普通文本链接");
  if (!url) return;
  await loadUrlContent(url.trim());
}

function askPrompt(title, defaultValue = "") {
  return new Promise((resolve) => {
    promptState.value = { visible: true, title, value: defaultValue, resolve };
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

const savedItems = ref([]);
const checkedIds = ref([]);
const showSaves = ref(false);
const loadingItemId = ref(null);
const selectMode = ref(false);

// ===== 保存面板拖拽调整高度 =====
const MIN_SAVES_HEIGHT = 57;
const SAVES_HEIGHT_KEY = "codehub_saves_panel_height";
const savesPanelHeight = ref(parseInt(localStorage.getItem(SAVES_HEIGHT_KEY), 10) || Math.round(window.innerHeight * 0.3));
let savesResizeStartY = 0;
let savesResizeStartHeight = 0;

function startSavesResizePointer(e) {
  e.preventDefault();
  savesResizeStartY = e.clientY;
  savesResizeStartHeight = savesPanelHeight.value;
  document.addEventListener("pointermove", onSavesResizePointer);
  document.addEventListener("pointerup", endSavesResizePointer);
  document.body.style.cursor = "row-resize";
  e.target.setPointerCapture(e.pointerId);
}

function onSavesResizePointer(e) {
  const delta = e.clientY - savesResizeStartY;
  savesPanelHeight.value = Math.max(MIN_SAVES_HEIGHT, savesResizeStartHeight + delta);
}

function endSavesResizePointer(e) {
  document.removeEventListener("pointermove", onSavesResizePointer);
  document.removeEventListener("pointerup", endSavesResizePointer);
  document.body.style.cursor = "";
  localStorage.setItem(SAVES_HEIGHT_KEY, savesPanelHeight.value.toString());
  if (e.target) {
    try { e.target.releasePointerCapture(e.pointerId); } catch {}
  }
}
// ===== 保存面板拖拽调整高度 end =====

const toggleSaves = async () => {
  showSaves.value = !showSaves.value;
  await idbStorage.setItem("SHOW_SAVES_KEY", showSaves.value);
};

const toggleSelectMode = () => {
  selectMode.value = !selectMode.value;
  if (!selectMode.value) {
    checkedIds.value = [];
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

const buildMeta = (content) => ({
  length: content.length,
  preview: content.slice(0, 123).replace(/\s+/g, " ").slice(0, 100),
  updatedAt: Date.now(),
  language: cmStore.activeLanguage,
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
    language: "plaintext",
  };

  try {
    await idbStorage.setItem(contentKey(item.id), "");

    savedItems.value.unshift(item);
    await persistIndex();

    skipWatchSave = true;

    await setCurrentItem(item.id, item.name);

    cmStore.setCmCode(EMPTY_CONTENT);
    lastSavedContent.value = EMPTY_CONTENT;

    await idbStorage.setItem(contentKey(item.id), EMPTY_CONTENT);

    isDirty = false;

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

// ★ 修复：loadItem 加载大文件前通知 cmView 延迟语言同步
const LARGE_FILE_THRESHOLD = 50000;

const loadItem = async (item) => {
  loadingItemId.value = item.id;

  try {
    const content = await idbStorage.getItem(contentKey(item.id));

    // ★ 大文件加载前先告诉 cmView 跳过立即语言同步，
    //   等 CodeMirror 渲染完成后再延迟触发，避免主线程卡死导致滚动崩溃
    if (content && content.length > LARGE_FILE_THRESHOLD) {
      cmViewRef.value?.skipNextLanguageSync();
    }

    // 🔥 切换期间抑制自动保存 watch，避免内容设置触发 isDirty / 错误保存
    isSwitchingItem = true;
    cmStore.setCmCode(content || EMPTY_CONTENT);

    await setCurrentItem(item.id, item.name);

    lastSavedContent.value = content || EMPTY_CONTENT;

    await nextTick();
    clearTimeout(autosaveTimer);
    isDirty = false;

    showToast("已加载：" + item.name);
  } catch (e) {
    console.log(e);
    showToast("加载失败");
  } finally {
    loadingItemId.value = null;
    isSwitchingItem = false;
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
    item.preview = content.slice(0, 123).replace(/\s+/g, " ").slice(0, 100);
    item.updatedAt = Date.now();
    await persistIndex();

    // ★ 刷新 URL 内容同样走大文件保护
    if (content.length > LARGE_FILE_THRESHOLD) {
      cmViewRef.value?.skipNextLanguageSync();
    }

    isSwitchingItem = true;
    cmStore.setCmCode(content);
    await setCurrentItem(item.id, item.name);
    lastSavedContent.value = content;
    await nextTick();
    clearTimeout(autosaveTimer);
    isDirty = false;
    isSwitchingItem = false;
    showToast("已刷新：" + item.name);
  } catch (e) {
    console.log(e);
    showToast("刷新失败");
    isSwitchingItem = false;
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

// ===== 当前文件追踪 / 自动保存 =====
const LAST_OPENED_KEY = "codehub_last_opened_id";
const currentItemId = ref(null);

const setCurrentItem = async (id, fileName = "") => {
  currentItemId.value = id;
  cmStore.setCurrentFileName(fileName);
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
  if (length > 2000000) return 3000;
  if (length > 500000) return 1500;
  return AUTOSAVE_BASE_DELAY;
};

watch(
  () => cmStore.CmCode,
  (newVal) => {
    if (skipWatchSave || isSwitchingItem) return;
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

watch(
  () => cmStore.currentFileName,
  () => {
    if (skipWatchSave || isSwitchingItem) return;
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

    // ★ 导入大文件同样保护
    if (text.length > LARGE_FILE_THRESHOLD) {
      cmViewRef.value?.skipNextLanguageSync();
    }

    isSwitchingItem = true;
    cmStore.setCmCode(text);

    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    await idbStorage.setItem(contentKey(id), text);
    await setCurrentItem(id, file.name);

    savedItems.value.unshift({ id, name: file.name, ...buildMeta(text) });
    await persistIndex();

    lastSavedContent.value = text;

    await nextTick();
    clearTimeout(autosaveTimer);
    isDirty = false;
    isSwitchingItem = false;

    showToast("已导入：" + file.name);
  } catch (error) {
    console.error("导入文件失败", error);
    showToast("导入失败：无法以文本方式读取该文件");
    isSwitchingItem = false;
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

const buildExportFilename = (name, language, fallbackBase = "CH") => {
  const safeBase = (name || fallbackBase).replace(/[\\/:*?"<>|]/g, "_");
  const ext = getExportExtensionByLanguage(language);
  const dotIndex = safeBase.lastIndexOf(".");
  const currentExt = dotIndex > 0 ? safeBase.slice(dotIndex + 1).toLowerCase() : "";
  if (currentExt === ext) return safeBase;
  return `${safeBase}.${ext}`;
};

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

const exportSelected = async () => {
  if (checkedIds.value.length === 0) {
    showToast("请先勾选要导出的项");
    return;
  }
  const ids = [...checkedIds.value];
  const items = savedItems.value.filter((item) => ids.includes(item.id));

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

  const zip = new JSZip();
  const usedNames = new Set();
  let okCount = 0;

  for (const item of items) {
    try {
      const content = await idbStorage.getItem(contentKey(item.id));
      let finalName = buildExportFilename(item.name, item.language);
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
  showToast("正在重置 PWA缓存...");

  if ("serviceWorker" in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations();
    for (const r of regs) {
      await r.unregister();
    }
  }

  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
  }

  // 强制阻止旧 SW 复活
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: "SKIP_WAITING" });
  }

  showToast("重置完成");
  setTimeout(() => location.href = location.href + "?t=" + Date.now(), 300);
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

    if (/^https:\/\/github\.com\/.+?\/(blob|raw)\//.test(currentURL)) {
      bloburl = currentURL;
      currentURL = currentURL.replace(/\/(blob|raw)/, "").replace("github.com", "raw.githubusercontent.com");
    } else if (/^https:\/\/raw\.githubusercontent\.com\//.test(currentURL)) {
      bloburl = extractAndFormatUrl(currentURL);
    }

    showToast("请求中");

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

    const fileName = getFileNameFromUrl(bloburl || currentURL);
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

    // ★ URL 加载大文件同样保护
    if (content.length > LARGE_FILE_THRESHOLD) {
      cmViewRef.value?.skipNextLanguageSync();
    }

    isSwitchingItem = true;
    cmStore.setCmCode(content);
    await setCurrentItem(id, fileName);
    lastSavedContent.value = content;
    isDirty = false;
    isSwitchingItem = false;

    showToast("载入成功");
  } catch (e) {
    console.log(e);
    showToast("请求失败");
    isSwitchingItem = false;
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

  try {
    if (currentURL) {
      await loadUrlContent(currentURL);
    }
  } catch {}

  await loadSaves();

  const cc = cmStore.CmCode;
  let initialCode;

  if (israw.value) {
    const fileName = getFileNameFromUrl(bloburl || currentURL);
    const id = createId();
    const item = {
      id,
      name: fileName,
      ...buildMeta(grc.value),
    };
    await idbStorage.setItem(contentKey(id), grc.value);
    savedItems.value.unshift(item);
    await persistIndex();
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
      currentItemId.value = lastId;
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

  isSwitchingItem = true;
  cmStore.setCmCode(initialCode);
  lastSavedContent.value = initialCode || EMPTY_CONTENT;
  isDirty = false;
  isSwitchingItem = false;

  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("beforeunload", handleBeforeUnload);
});

function extractAndFormatUrl(rawUrl) {
  const regex = /https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)/;
  const match = rawUrl.match(regex);
  if (match) {
    return `https://github.com/${match[1]}/${match[2]}/blob/${match[3]}/${match[4]}`;
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
  border-radius: 23px;
  z-index: 996;
  position: relative;
  line-height: 16px;
  box-shadow: 0 0 2px #919db687;
}

.saves-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12.5px 12px;
  border-bottom: 0px solid rgba(128, 128, 128, 0);
  flex-wrap: wrap;
}

.saves-body {
  overflow: hidden;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  min-height: 0;
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
  flex: 1;
  min-height: 0;
}

.saves-empty {
  padding: 20px 0;
  text-align: center;
  opacity: 0.5;
  font-size: 13px;
}

.saves-resize-handle {
  position: absolute;
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 90px;
  height: 40px;
  cursor: row-resize;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  background: transparent;
}

.saves-resize-bar {
  position: absolute;
  bottom: 17px;
  left: 50%;
  transform: translateX(-50%);
  width: 90px;
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
  border-bottom: 1px solid rgba(128, 128, 128, 0.03);
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