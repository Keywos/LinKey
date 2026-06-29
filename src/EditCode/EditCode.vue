<template>
  <h2 style="-webkit-user-select: none; user-select: none; display: flex; justify-content: space-between; width: 90%; margin-top: -10px">
    <span style="opacity: 0.6" @click="goFunction()">Code Hub</span>
    <div style="display: flex; align-items: center; gap: 10px; color: var(--text)">
      <span @click="toggleSaves" style="font-size: 16px; padding: 6px 10px; cursor: pointer; color: var(--text); line-height: 1; opacity: 0.4">{{ showSaves ? "▴" : "▾" }}</span>
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
          <button class="saves-item-del" @click.stop="deleteSingleItem(item)" title="删除">×</button>
          <input v-if="selectMode" type="checkbox" :value="item.id" v-model="checkedIds" />

          <div class="saves-item-info">
            <span class="saves-item-name">
              {{ item.name }}
            </span>

            <div class="saves-item-preview">
              <template v-if="item.url">
                <div v-if="item.blobUrl" class="saves-url-line" title="点击复制 blob URL" @click.stop="copyUrl(item, 'blob')">{{ truncateUrl(item.blobUrl) }}</div>
                <div class="saves-url-line" title="点击复制 raw URL" @click.stop="copyUrl(item, 'raw')">{{ truncateUrl(item.url) }}</div>
                <div class="saves-item-content-preview">{{ item.preview || "" }}</div>
              </template>
              <template v-else>
                <span class="saves-item-content-preview">{{ item.preview || "" }}</span>
              </template>
            </div>

            <span class="saves-item-meta">
              {{ formatTime(item.updatedAt) }}
              ·
              {{ formatBytes(item.length) }}
            </span>
          </div>

          <button
            class="saves-load-btn"
            :disabled="loadingItemId === item.id && (item.url || item.id !== currentItemId)"
            @click="item.id === currentItemId ? (item.url ? refreshUrlItem(item) : renameItem(item)) : loadItem(item)"
          >
            {{ item.id === currentItemId ? (item.url ? "重新拉取" : "重命名") : "加载" }}
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

  <!-- ★ 可拖拽控制台面板 -->
  <div
    v-if="showlog"
    class="log-panel"
    ref="logPanelRef"
    :style="{ left: logPos.x + 'px', top: logPos.y + 'px', width: logSize.w + 'px', height: logSize.h + 'px', maxWidth: '100vw', maxHeight: MAX_H + 'px' }"
  >
    <div class="log-header" @pointerdown.prevent="startDrag">
      <span class="log-title">
        <svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 450 130" width="60" height="17" @click.stop="onClickLogo">
          <ellipse cx="65" cy="65" rx="50" ry="52" stroke="rgb(220,60,54)" stroke-width="2" fill="rgb(237,108,96)" />
          <ellipse cx="225" cy="65" rx="50" ry="52" stroke="rgb(218,151,33)" stroke-width="2" fill="rgb(247,193,81)" />
          <ellipse cx="385" cy="65" rx="50" ry="52" stroke="rgb(27,161,37)" stroke-width="2" fill="rgb(100,200,86)" />
        </svg>
      </span>
      <span class="log-time">{{ logTime }}</span>
      <div class="log-actions">
        <button class="log-btn log-copy" @click.stop="copyText(logAllReactive)" title="复制日志">
          <svg viewBox="0 1 26 17" width="14" height="14" fill="currentColor">
            <rect x="9" y="3" width="12" height="15" rx="1.5" stroke="currentColor" stroke-width="1.5" fill="none"></rect>
            <path d="M15 21H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2" stroke="currentColor" stroke-width="1.5" fill="none"></path>
          </svg>
        </button>
        <button class="log-btn log-run" @click.stop="goFunction()" title="运行脚本">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><polygon points="5,3 19,12 5,21" /></svg>
        </button>
      </div>
    </div>
    <div class="log-body" ref="logBodyRef">
      <pre class="log-pre">{{ logAllReactive }}</pre>
    </div>
    <div class="log-resize-handle" @pointerdown.prevent="startResize">↘</div>
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
  async getAllKeys() {
    return (await dbPromise).getAllKeys("store");
  },
};

import JSZip from "jszip";
import "./env.js";
let skipWatchSave = false;
let isSwitchingItem = false; // 切换文件期间抑制自动保存 watch
const route = useRoute();
const israw = ref(false);
const grc = ref("");
const { toClipboard } = useV3Clipboard();
const cmStore = useCmStore();
const showlog = ref(false);
const EMPTY_CONTENT = "\n".repeat(19);
const { isDarkModeEnabled } = useTheme();
const logAllReactive = ref("");
const logTime = ref("");

// ===== 控制台面板位置/大小 =====
// const logPanelRef = ref(null);
const logBodyRef = ref(null);
const savedPos = localStorage.getItem("logPos");
const savedSize = localStorage.getItem("logSize");
const logPos = ref(savedPos ? JSON.parse(savedPos) : { x: 16, y: 80 });
const logSize = ref(
  savedSize
    ? JSON.parse(savedSize)
    : {
        w: Math.round(window.innerWidth * 0.99),
        h: Math.min(window.innerHeight * 0.35, 360),
      },
);
const MAX_H = Math.round(window.innerHeight * 0.6);

// 拖拽移动
let _dragData = null;
function startDrag(e) {
  _dragData = { sx: e.clientX, sy: e.clientY, ox: logPos.value.x, oy: logPos.value.y, moved: false };
  document.addEventListener("pointermove", onDrag);
  document.addEventListener("pointerup", endDrag);
}
function onDrag(e) {
  if (!_dragData) return;
  _dragData.moved = true;
  logPos.value.x = _dragData.ox + (e.clientX - _dragData.sx);
  logPos.value.y = Math.max(0, _dragData.oy + (e.clientY - _dragData.sy));
}
function endDrag() {
  if (_dragData) {
    localStorage.setItem("logPos", JSON.stringify(logPos.value));
  }
  _dragData = null;
  document.removeEventListener("pointermove", onDrag);
  document.removeEventListener("pointerup", endDrag);
}
function onClickLogo() {
  if (_dragData?.moved) return; // 拖拽不关闭
  showlog.value = false;
}

// 拖拽缩放
let _resizeData = null;
function startResize(e) {
  _resizeData = { sx: e.clientX, sy: e.clientY, ow: logSize.value.w, oh: logSize.value.h };
  document.addEventListener("pointermove", onResize);
  document.addEventListener("pointerup", endResize);
}
function onResize(e) {
  if (!_resizeData) return;
  logSize.value.w = Math.max(200, _resizeData.ow + (e.clientX - _resizeData.sx));
  logSize.value.h = Math.min(MAX_H, Math.max(80, _resizeData.oh + (e.clientY - _resizeData.sy)));
}
function endResize() {
  if (_resizeData) {
    localStorage.setItem("logSize", JSON.stringify(logSize.value));
  }
  _resizeData = null;
  document.removeEventListener("pointermove", onResize);
  document.removeEventListener("pointerup", endResize);
}
// ===== 控制台面板 end =====
const props = defineProps(["isReadOnly"]);
const lastSavedContent = ref("");
const promptInputRef = ref(null);

// ★ 修复：cmView 实例 ref，用于加载大文件前调用 skipNextLanguageSync
const cmViewRef = ref(null);

// ===== 自定义弹窗 =====
const promptState = ref({ visible: false, title: "", value: "", resolve: null });
const confirmState = ref({ visible: false, title: "", resolve: null });

watch(
  () => promptState.value.visible,
  (visible) => {
    if (visible) {
      nextTick(() => {
        promptInputRef.value?.focus();
      });
    }
  },
);

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
  } catch {}
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
const SAVES_INDEX_KEY = "codehub_saves_index";
const createId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

const contentKey = (id) => `codehub_save_content:${id}`;
const metaKey = (id) => `codehub_save_meta:${id}`;

const saveMeta = async (item) => {
  try {
    await idbStorage.setItem(metaKey(item.id), {
      name: item.name,
      length: item.length,
      preview: item.preview,
      updatedAt: item.updatedAt,
      language: item.language,
      manualLanguage: item.manualLanguage || "",
      url: item.url || "",
      blobUrl: item.blobUrl || "",
    });
  } catch (error) {
    console.error("保存元数据失败", error);
  }
};

const savedItems = ref([]);
const checkedIds = ref([]);
const showSaves = ref(false);
const loadingItemId = ref(null);
const selectMode = ref(false);
const savesListWidth = ref(0);
const savesListRef = ref(null);
let savesListObserver = null;

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
    try {
      e.target.releasePointerCapture(e.pointerId);
    } catch {}
  }
}
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
    const ids = Array.isArray(list) ? list : [];
    const items = [];
    for (const id of ids) {
      try {
        const meta = await idbStorage.getItem(metaKey(id));
        if (meta) {
          items.push({ id, ...meta });
        }
      } catch {}
    }

    // ★ 索引恢复：仅当列表为空时扫描 IDB 中的 meta/content 键，找回索引丢失的项
    if (items.length === 0) {
      try {
        const allKeys = await idbStorage.getAllKeys();
        const existingIds = new Set(items.map((i) => i.id));
        let recovered = 0;

        for (const key of allKeys) {
          if (typeof key !== "string") continue;

          if (key.startsWith("codehub_save_meta:")) {
            const id = key.slice(19);
            if (!existingIds.has(id)) {
              const meta = await idbStorage.getItem(key);
              if (meta) {
                items.push({ id, ...meta });
                existingIds.add(id);
                recovered++;
              }
            }
          } else if (key.startsWith("codehub_save_content:")) {
            const id = key.slice(21);
            if (!existingIds.has(id)) {
              const content = await idbStorage.getItem(key);
              if (typeof content === "string" && content.length > 0) {
                items.push({
                  id,
                  name: `recovered_${id}`,
                  length: content.length,
                  preview: content.slice(0, 100).replace(/\s+/g, " "),
                  updatedAt: Date.now(),
                  language: "",
                  manualLanguage: "",
                  url: "",
                  blobUrl: "",
                });
                existingIds.add(id);
                recovered++;
              }
            }
          }
        }

        if (recovered > 0) {
          console.log(`索引恢复：找回 ${recovered} 个丢失的项`);
          // 恢复后立即持久化索引
          const idList = items.map((item) => item.id);
          await idbStorage.setItem(SAVES_INDEX_KEY, idList);
        }
      } catch (e) {
        console.error("索引恢复扫描失败", e);
      }
    }

    savedItems.value = items;
  } catch (error) {
    console.error("读取保存列表失败", error);
    savedItems.value = [];
  }
};

const persistIndex = async () => {
  try {
    const idList = savedItems.value.map((item) => item.id);
    // ★ 防御：空列表写入前检查 IDB 是否仍有数据，防止意外清空索引
    if (idList.length === 0) {
      try {
        const allKeys = await idbStorage.getAllKeys();
        const hasData = allKeys.some((k) => typeof k === "string" && k.startsWith("codehub_save_meta:"));
        if (hasData) {
          console.warn("persistIndex: 拒绝写入空索引，IDB 中仍有保存数据");
          return;
        }
      } catch {}
    }
    await idbStorage.setItem(SAVES_INDEX_KEY, idList);
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
  manualLanguage: cmStore.manualLanguage || "",
});

const createNewBlank = async () => {
  if (currentItemId.value && !cmStore.CmCode) {
    showToast("已经是新建状态");
    return;
  }

  clearTimeout(autosaveTimer);

  // ★ 新建文件清除手动语言（需在 buildMeta 之前）
  cmStore.setManualLanguage("");

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
    await saveMeta(item);
    await persistIndex();

    // 先滚动列表到顶部再加载 cmView
    await nextTick();
    if (savesListRef.value) {
      savesListRef.value.scrollTop = 0;
    }
    await nextTick();

    skipWatchSave = true;

    cmViewRef.value?.skipNextHistory();
    cmViewRef.value?.skipNextFileRename();

    await setCurrentItem(item.id, item.name);

    cmStore.setCurrentFileName(item.name);
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

// ★ 单条删除
const deleteSingleItem = async (item) => {
  const ok = await askConfirm(`确定删除 "${item.name}" 吗？`);
  if (!ok) return;
  try {
    await idbStorage.removeItem(contentKey(item.id));
    await idbStorage.removeItem(metaKey(item.id));
  } catch (error) {
    console.error("删除失败", error);
  }
  savedItems.value = savedItems.value.filter((i) => i.id !== item.id);
  await persistIndex();

  if (currentItemId.value === item.id) {
    await setCurrentItem(null, "");
  }
  showToast("已删除");
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
    await Promise.all(ids.map((id) => Promise.all([idbStorage.removeItem(contentKey(id)), idbStorage.removeItem(metaKey(id))])));
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
const LARGE_FILE_THRESHOLD = 1.4 * 1024 * 1024;

const loadItem = async (item) => {
  // ★ 切换文件前先刷新防抖 store 同步，确保当前编辑内容已保存
  cmViewRef.value?.flushStoreSync?.();
  // 刷新后再保存当前项（如果有）
  if (isDirty && currentItemId.value) {
    await syncCurrentItemContent();
  }

  loadingItemId.value = item.id;

  try {
    const content = await idbStorage.getItem(contentKey(item.id));

    // ★ 大文件加载前先告诉 cmView 跳过立即语言同步，
    //   等 CodeMirror 渲染完成后再延迟触发，避免主线程卡死导致滚动崩溃
    if (content && content.length > LARGE_FILE_THRESHOLD) {
      cmViewRef.value?.skipNextLanguageSync();
    }

    cmViewRef.value?.skipNextHistory();
    cmViewRef.value?.skipNextFileRename();

    // 🔥 切换期间抑制自动保存 watch，避免内容设置触发 isDirty / 错误保存
    isSwitchingItem = true;
    cmStore.setCurrentFileName(item.name);
    cmStore.setManualLanguage(item.manualLanguage || "");
    cmStore.setCmCode(content || EMPTY_CONTENT);

    await setCurrentItem(item.id, item.name);

    lastSavedContent.value = content || EMPTY_CONTENT;

    nextTick(() => {
      clearTimeout(autosaveTimer);
      isDirty = false;
    });

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
    item.manualLanguage = cmStore.manualLanguage || "";
    await saveMeta(item);
    await persistIndex();

    // ★ 刷新 URL 内容同样走大文件保护
    if (content.length > LARGE_FILE_THRESHOLD) {
      cmViewRef.value?.skipNextLanguageSync();
    }

    cmViewRef.value?.skipNextHistory();
    cmViewRef.value?.skipNextFileRename();

    // ★ 用 URL 的文件名/后缀设置语言识别用的文件名，列表名不变
    const urlFileName = getFileNameFromUrl(item.url || "");

    isSwitchingItem = true;
    cmStore.setCurrentFileName(urlFileName);
    cmStore.setManualLanguage(item.manualLanguage || "");
    cmStore.setCmCode(content);
    await setCurrentItem(item.id, urlFileName);
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

const renameItem = async (item) => {
  const newName = await askPrompt("重命名", item.name);
  if (!newName || newName === item.name) return;
  item.name = newName;
  cmStore.setCurrentFileName(newName);
  await saveMeta(item);
  await persistIndex();
  showToast("已重命名为 " + newName);
};

const allChecked = computed(() => savedItems.value.length > 0 && checkedIds.value.length === savedItems.value.length);
const toggleCheckAll = () => {
  checkedIds.value = allChecked.value ? [] : savedItems.value.map((i) => i.id);
};

function truncateUrl(url) {
  if (!url) return url;
  // savesListWidth ≈ 容器可用宽度，按钮区域约 120px、padding 约 24px
  const availableWidth = Math.max(100, savesListWidth.value - 150);
  // 11px 字体平均字符宽约 6.2px
  const maxChars = Math.floor(availableWidth / 6.2);
  if (url.length <= maxChars) return url;
  const front = Math.floor(maxChars * 0.55);
  const back = maxChars - front - 3;
  return url.slice(0, front) + "..." + url.slice(-back);
}

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

  // ★ 大文件编辑后先刷新 store，确保拿到最新的编辑内容
  cmViewRef.value?.flushStoreSync?.();

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

    await saveMeta(savedItems.value[idx]);
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

// ★ 手动语言变化时自动入库
watch(
  () => cmStore.manualLanguage,
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
      await saveMeta(savedItems.value[idx]);
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

    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    await idbStorage.setItem(contentKey(id), text);
    savedItems.value.unshift({ id, name: file.name, ...buildMeta(text) });
    await saveMeta(savedItems.value[0]);
    await persistIndex();

    // 先滚动列表到顶部并确保列表渲染完成，再加载 cmView
    await nextTick();
    if (savesListRef.value) {
      savesListRef.value.scrollTop = 0;
    }
    await nextTick();

    cmViewRef.value?.skipNextHistory();
    cmViewRef.value?.skipNextFileRename();

    isSwitchingItem = true;
    cmStore.setCurrentFileName(file.name);
    cmStore.setManualLanguage(""); // 新导入文件清除手动语言
    cmStore.setCmCode(text);
    await setCurrentItem(id, file.name);
    lastSavedContent.value = text;
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

const buildExportFilename = (name, fallbackBase = "CH") => {
  return (name || fallbackBase).replace(/[\\/:*?"<>|]/g, "_");
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
  const fallbackName = `CH_${new Date()
    .toLocaleString("zh-CN")
    .replace(/[^\d\s]/g, "")
    .replace(/\D/g, "_")}`;
  const finalName = buildExportFilename(cmStore.currentFileName || fallbackName);
  downloadTextFile(finalName, content);
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
      const finalName = buildExportFilename(item.name);
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
      let finalName = buildExportFilename(item.name);
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
    await Promise.all(keys.map((k) => caches.delete(k)));
  }

  // 强制阻止旧 SW 复活
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: "SKIP_WAITING" });
  }

  showToast("重置完成");
  setTimeout(() => (location.href = location.href + "?t=" + Date.now()), 300);
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
  let addedItemId = null;
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
    addedItemId = id;
    // ★ 新 URL 清除手动语言（需在 buildMeta 之前）
    cmStore.setManualLanguage("");
    const item = {
      id,
      name: fileName,
      ...buildMeta(content),
      url: currentURL,
      blobUrl: bloburl,
    };

    await idbStorage.setItem(contentKey(id), content);
    savedItems.value.unshift(item);
    await saveMeta(item);
    await persistIndex();

    // 先滚动列表到顶部并确保列表渲染完成，再加载 cmView
    await nextTick();
    if (savesListRef.value) {
      savesListRef.value.scrollTop = 0;
    }
    await nextTick();

    // ★ URL 加载大文件同样保护
    if (content.length > LARGE_FILE_THRESHOLD) {
      cmViewRef.value?.skipNextLanguageSync();
    }

    cmViewRef.value?.skipNextHistory();
    cmViewRef.value?.skipNextFileRename();

    isSwitchingItem = true;
    cmStore.setCurrentFileName(fileName);
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
    // ★ 失败时清理可能残留的临时项，防止幽灵项
    if (addedItemId) {
      savedItems.value = savedItems.value.filter((i) => i.id !== addedItemId);
      try {
        await idbStorage.removeItem(contentKey(addedItemId));
        await idbStorage.removeItem(metaKey(addedItemId));
      } catch {}
    }
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

  // ★ 先加载已有列表，再处理 URL 请求，避免 loadUrlContent 的 persistIndex 覆盖已有索引
  await loadSaves();

  let urlLoaded = false;
  try {
    if (currentURL) {
      await loadUrlContent(currentURL);
      urlLoaded = true;
    }
  } catch {}

  const cc = cmStore.CmCode;
  let initialCode;

  if (urlLoaded) {
    // ★ URL 已由 loadUrlContent 完成加载，无需再走后续恢复逻辑
    initialCode = cmStore.CmCode;
  } else if (israw.value) {
    const fileName = getFileNameFromUrl(bloburl || currentURL);
    const id = createId();
    cmStore.setManualLanguage("");
    const item = {
      id,
      name: fileName,
      ...buildMeta(grc.value),
    };
    await idbStorage.setItem(contentKey(id), grc.value);
    savedItems.value.unshift(item);
    await saveMeta(item);
    await persistIndex();
    await setCurrentItem(id, fileName);
    lastSavedContent.value = grc.value;
    clearTimeout(autosaveTimer);
    isDirty = false;
    initialCode = grc.value;
  } else {
    // ★ 始终从 LAST_OPENED_KEY 恢复，避免导航回退时读到 Pinia 的旧缓存
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
      if (lastContent.length > LARGE_FILE_THRESHOLD) {
        nextTick(() => {
          cmViewRef.value?.skipNextLanguageSync();
        });
      }
      const lastItem = savedItems.value.find((i) => i.id === lastId);
      cmStore.setCurrentFileName(lastItem?.name || "");
      cmStore.setManualLanguage(lastItem?.manualLanguage || "");
      console.log("0 已默认载入最后打开的内容");
    } else if (cc != "") {
      // ★ 没有 LAST_OPENED_KEY 但 Pinia 有缓存时，用它兜底
      initialCode = cc;
    } else {
      const storedUsername = await idbStorage.getItem("codehub");
      if (storedUsername) {
        initialCode = storedUsername;
        cmStore.setCurrentFileName("");
        cmStore.setManualLanguage("");
        console.log("0 读取到草稿数据");
      } else {
        initialCode = xc;
        const firstId = createId();
        const firstName = "example.js";
        cmStore.setCurrentFileName(firstName);
        cmStore.setManualLanguage("");
        await idbStorage.setItem(contentKey(firstId), xc);
        savedItems.value.unshift({
          id: firstId,
          name: firstName,
          ...buildMeta(xc),
        });
        await saveMeta(savedItems.value[0]);
        await persistIndex();
        await setCurrentItem(firstId, firstName);
      }
    }
  }

  // ★ 大文件初始加载：通知 cmView 延迟语言同步，防止首次滚动时卡死
  cmViewRef.value?.skipNextHistory();
  cmViewRef.value?.skipNextFileRename();

  if (initialCode && initialCode.length > LARGE_FILE_THRESHOLD) {
    cmViewRef.value?.skipNextLanguageSync();
    await nextTick();
  }

  // ★ URL 加载已由 loadUrlContent 完成设置，跳过重复赋值避免触发多余 watcher
  if (!urlLoaded) {
    isSwitchingItem = true;
    cmStore.setCmCode(initialCode);
    lastSavedContent.value = initialCode || EMPTY_CONTENT;
    isDirty = false;
    isSwitchingItem = false;
  }

  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("beforeunload", handleBeforeUnload);

  // 监听 saves-list 宽度变化，动态计算 URL 截断长度
  savesListObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      savesListWidth.value = entry.contentRect.width;
    }
  });
  if (savesListRef.value) {
    savesListObserver.observe(savesListRef.value);
  }

  // ★ 初始加载完成后，如果有当前项且面板显示，滚动到该项
  scrollToCurrentItem();
});

// ★ 面板打开/关闭时，打开后自动滚动到当前项
watch(showSaves, (visible) => {
  if (visible) {
    nextTick(scrollToCurrentItem);
  }
});

function scrollToCurrentItem() {
  const id = currentItemId.value;
  if (!id || !savesListRef.value) return;
  nextTick(() => {
    const el = savesListRef.value.querySelector(".saves-item-current");
    el?.scrollIntoView?.({ block: "nearest", behavior: "auto" });
  });
}

function extractAndFormatUrl(rawUrl) {
  const regex = /https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)/;
  const match = rawUrl.match(regex);
  if (match) {
    return `https://github.com/${match[1]}/${match[2]}/blob/${match[3]}/${match[4]}`;
  } else return "Invalid URL";
}

let _sandboxWorker = null;
function getSandboxWorker() {
  if (!_sandboxWorker) {
    const w = new Worker(new URL("./sandboxWorker.js", import.meta.url), { type: "module" });
    _sandboxWorker = { worker: w, pending: null };
    w.onmessage = (e) => {
      _sandboxWorker.pending?.resolve(e.data);
      _sandboxWorker.pending = null;
    };
    w.onerror = () => {
      console.log("Worker 加载失败");
      _sandboxWorker.pending?.reject(new Error("Worker 加载失败"));
      _sandboxWorker.pending = null;
    };
  }
  return _sandboxWorker;
}

/** 在主线程中直接执行用户脚本（捕获 console 输出） */
function executeInMainThread(code, onLog) {
  return new Promise((resolve) => {
    const logs = [];
    const timers = {};

    const emit = (msg) => {
      logs.push(msg);
      onLog?.(msg);
    };

    const formatArg = (function () {
      var _visited = new WeakSet();
      return function (arg) {
        if (arg === null) return "null";
        if (arg === undefined) return "undefined";
        if (arg instanceof Error) return arg.stack || arg.name + ": " + arg.message;
        if (typeof arg === "object") {
          if (_visited.has(arg)) return "[circular]";
          _visited.add(arg);
          try {
            var s = JSON.stringify(arg, null, 2);
            _visited.delete(arg);
            return s;
          } catch (e) {
            _visited.delete(arg);
            return "[recursive/error]";
          }
        }
        return String(arg);
      };
    })();

    const mockConsole = {
      log: (...args) => emit(args.map(formatArg).join(" ")),
      error: (...args) => emit("[Error] " + args.map(formatArg).join(" ")),
      warn: (...args) => emit("[Warn] " + args.map(formatArg).join(" ")),
      info: (...args) => emit("[Info] " + args.map(formatArg).join(" ")),
      debug: (...args) => emit("[Debug] " + args.map(formatArg).join(" ")),
      trace: (...args) => emit("[Trace] " + args.map(formatArg).join(" ")),
      dir: (obj) => emit(formatArg(obj)),
      table: (data) => {
        if (Array.isArray(data)) {
          emit("[Table]\n" + data.map((row, i) => `  ${i}: ${formatArg(row)}`).join("\n"));
        } else {
          emit("[Table]\n" + formatArg(data));
        }
      },
      clear: () => {
        logs.length = 0;
      },
      time: (label) => {
        timers[String(label)] = performance.now();
      },
      timeEnd: (label) => {
        const key = String(label);
        const elapsed = timers[key] != null ? (performance.now() - timers[key]).toFixed(2) : "?";
        emit(`${key}: ${elapsed} ms`);
        delete timers[key];
      },
      count: (label) => {
        const key = String(label ?? "default");
        timers[key] = (timers[key] ?? 0) + 1;
        emit(`${key}: ${timers[key]}`);
      },
      group: () => {},
      groupEnd: () => {},
    };

    var _execError = null;
    var _execResult = null;
    var _savedConsole = window.console;
    window.console = mockConsole;
    try {
      _execResult = (0, eval)("(async function(){try{\n" + code + "\n}catch(e){try{console.error('[Uncaught] '+(e&&e.stack?e.stack:(e&&e.message?e.message:e)))}catch(_){}}})()");
    } catch (e) {
      _execError = e;
    }
    if (_execError) {
      window.console = _savedConsole;
      logs.push("[Build Error] " + _formatError(_execError));
      resolve({ logs });
      return;
    }

    if (!_execResult || typeof _execResult.then !== "function") {
      window.console = _savedConsole;
      logs.push("[Debug] fn returned non-thenable: " + String(_execResult));
      resolve({ logs });
      return;
    }

    setTimeout(function () {
      _execResult
        .then(function () {
          _finishResolve();
        })
        .catch(function (e) {
          logs.push("[Exception] " + _formatError(e));
          _finishResolve();
        });
    }, 0);

    setTimeout(function () {
      _safeResolve();
    }, 60000);

    function _finishResolve() {
      try {
        var _sp = typeof self !== "undefined" ? self.__surge_pending : 0;
        if (typeof _sp === "number" && _sp > 0) {
          self.__surge_on_idle = function () {
            _safeResolve();
          };
          setTimeout(function () {
            if (self.__surge_on_idle) {
              self.__surge_on_idle = null;
              _safeResolve();
            }
          }, 15000);
        } else {
          _safeResolve();
        }
      } catch (e2) {
        logs.push("[Finish Error] " + _formatError(e2));
        _safeResolve();
      }
    }

    function _safeResolve() {
      window.console = _savedConsole;
      try {
        resolve({ logs });
      } catch (e) {}
    }

    function _formatError(e) {
      try {
        if (!e) return String(e);
        if (e && e.stack) return String(e.stack).slice(0, 500);
        if (e && e.message) return String(e.message).slice(0, 500);
        return String(e).slice(0, 500);
      } catch (_) {
        return "unknown";
      }
    }
  });
}

const goFunction = async () => {
  const code = cmStore.CmCode;
  if (!code || !code.trim()) {
    showToast("没有可执行的代码");
    return;
  }

  // 重置实时日志
  logAllReactive.value = "";
  logTime.value = new Date().toLocaleString("zh-CN", { hour12: false });
  showlog.value = true;

  try {
    const { logs } = await executeInMainThread(code, (msg) => {
      // 实时刷新
      logAllReactive.value += "· " + msg + "\n";
      // 自动滚动到底部
      nextTick(() => {
        const el = logBodyRef.value;
        if (el) el.scrollTop = el.scrollHeight;
      });
    });

    // 确保最终完整输出
    if (logs && logs.length) {
      const full = "· " + logs.join("\n· ");
      logAllReactive.value = full + "\n";
    } else if (!logAllReactive.value) {
      logAllReactive.value = "· (无输出)\n";
    }
  } catch (error) {
    logAllReactive.value += "· [Exception] " + (error.message || "执行失败") + "\n";
  }

  // 最终滚动到底部
  await nextTick();
  const el = logBodyRef.value;
  if (el) el.scrollTop = el.scrollHeight;
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
  cmViewRef.value?.flushStoreSync?.(); // ★ 确保最后编辑内容同步到 store
  flushCurrentSave();
  document.removeEventListener("visibilitychange", handleVisibilityChange);
  window.removeEventListener("beforeunload", handleBeforeUnload);
  document.body.style.backgroundColor = "";
  const blurNavdiv = document.querySelector(".blurNavdiv");
  blurNavdiv?.classList.remove("blurNavdiv_code");
  if (savesListObserver) {
    savesListObserver.disconnect();
    savesListObserver = null;
  }
});
</script>

<style lang="css">
.saves-panel {
  /* width: 92%; */
  margin: 0 1% 4% 1%;
  /* margin-bottom: 13px; */
  display: flex;
  flex-direction: column;
  background: transparent;

  z-index: 996;
  position: relative;
  line-height: 16px;
  border-radius: 23px;
  /* box-shadow: 0 0 2px #919db687; */
  box-shadow: 0px 10px 10px -10px #919db695;
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
  border: 0px;
  background: #8f98c60e;
  color: var(--text);
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
  position: relative;
}

.saves-item-del {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 18px;
  height: 18px;
  line-height: 16px;
  text-align: center;
  font-size: 13px;
  border: none;
  background: transparent;
  color: var(--text);
  opacity: 0.1;
  cursor: pointer;
  border-radius: 50%;
  padding: 0;
  z-index: 1;
}

.saves-item-del:hover {
  opacity: 1;
  background: rgba(128, 128, 128, 0.15);
}

.saves-item-current .saves-load-btn {
  background: rgba(92, 125, 190, 0.2);
  border-color: rgba(92, 125, 190, 0.5);
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
  margin-top: -2px;
  padding-bottom: 4px;
  font-size: 14px;
  font-weight: 600;
  /* display: flex; */
  display: inline-flex;
  align-items: center;
  gap: 6px;
  opacity: 0.8;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* .saves-item-name-span { */
/* background: #7088d827;
  border-radius: 20px;
  padding: 4px 8px 4px 8px;  */
/* } */

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
  margin-top: 2px;
  font-size: 10.5px;
  opacity: 0.5;
}

.saves-load-btn {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 14px;
  border: 0px;
  background: #8f98c60e;
  color: var(--text);
  margin-right: 10px;
  margin-left: -4px;
  flex-shrink: 0;
}

.log-copy {
  /* margin-left: -4px; */
}
.saves-load-btn:disabled {
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

/* ===== 可拖拽控制台面板 ===== */
.log-panel {
  position: fixed;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  background: #f6f6f6f3;
  border: 0.1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  box-shadow: 0 8px 26px #919db687;
  overflow: hidden;
  font-size: 13px;
  line-height: 1.5;
  color: #e0e0e0;
  min-width: 200px;
  min-height: 80px;
  touch-action: none;
}
.log-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: rgba(232, 234, 236, 0.919);
  cursor: grab;
  color: #0000005c;
  user-select: none;
  flex-shrink: 0;
  touch-action: none;
  position: relative;
}

@media (prefers-color-scheme: dark) {
  .modal-box {
    background: #16181c;
  }
  .log-panel {
    background: #1c1e23f2;
    border: 0.1px solid #282a31f7;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.486);
    color: #e0e0e0;
  }

  .saves-panel {
    box-shadow: 0px 10px 20px -10px #0000005c;
  }
  .log-header {
    background: rgba(37, 38, 43, 0.733);
    color: #ceddfb9b;
  }
}

.log-header:active {
  cursor: grabbing;
}

.log-title {
  font-weight: 600;
  font-size: 12px;
  opacity: 0.7;
  display: flex;
  align-items: center;
}
.log-title svg {
  cursor: grab;
}
.log-title svg:active {
  cursor: grabbing;
}
.log-btn {
  background: transparent;
  border: none;
  color: inherit;
  cursor: pointer;
  font-size: 12px;
  opacity: 0.6;
  height: 18px;
  padding: 0px 6px;
  border-radius: 4px;
}
.log-btn:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.1);
}
.log-time {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  font-size: 11px;
  opacity: 0.5;
  user-select: none;
  touch-action: none;
  white-space: nowrap;
}
.log-actions {
  margin-left: auto;
  display: flex;
  gap: 4px;
  align-items: center;
}
.log-run {
  color: #4caf50;
  opacity: 1;
  display: flex;
  align-items: center;
}
.log-close {
  font-size: 16px;
}
.log-body {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 6px 10px;
  -webkit-overflow-scrolling: touch;
}
.log-pre {
  padding: 0;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
  font-family: "SF Mono", "Fira Code", "Consolas", monospace;
  font-size: 12px;
  line-height: 1.6;
  cursor: pointer;
  background: transparent;
}
.log-resize-handle {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 20px;
  height: 20px;
  cursor: nwse-resize;
  font-size: 12px;
  line-height: 20px;
  text-align: center;
  opacity: 0.3;
  user-select: none;
  touch-action: none;
}
.log-resize-handle:hover {
  opacity: 0.8;
}
</style>
