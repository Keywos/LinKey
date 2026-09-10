import {
  codehubStorage,
  contentKey,
  getIdsFromSavesIndex,
  getLogicalFileId,
  metaKey,
  parseSavesIndex,
  SAVES_INDEX_KEY,
  GIST_LIST_KEY,
  markCodeHubItemsDeleted,
  TOMBSTONE_RETENTION_MS,
  getTombstoneDeletedAt,
  // getTombstoneInfo,
  mergeTombstones,
  areTombstonesEqual,
} from "@/storage/codehubStorage.js";
import { CryptoJS } from "@/st/cpto.js";

export const CODEHUB_SYNC_URL_KEY = "CodeHubSyncUrl";
export const CODEHUB_SYNC_TOKEN_KEY = "CodeHubSyncToken";
export const CODEHUB_SYNC_SECRET_KEY = "CodeHubSyncKey";
export const CODEHUB_SYNC_KEY_KEY = CODEHUB_SYNC_SECRET_KEY;
export const CODEHUB_SYNC_AUTO_CHECK_KEY = "CodeHubSyncAutoCheck";
export const CODEHUB_AUTO_SYNC_KEY = "CodeHubAutoSync";
export const CODEHUB_AUTO_SYNC_INTERVAL_KEY = "CodeHubAutoSyncInterval";
export const CODEHUB_AUTO_SYNC_LOGS_KEY = "CodeHubAutoSyncLogs";
export const DEFAULT_AUTO_SYNC_INTERVAL_SECONDS = 300;
export const MIN_AUTO_SYNC_INTERVAL_SECONDS = 10; // 自动同步 设置 最小时间 s
export const MAX_AUTO_SYNC_INTERVAL_SECONDS = 3600; // 最大
export const MAX_AUTO_SYNC_LOGS = 60;
export const MAX_SYNC_FILE_SIZE = 50 * 1024 * 1024; // 单个文件最大 50MB
const SHOW_SAVES_KEY = "SHOW_SAVES_KEY";

/**
 * 判断是否开启了“进入时自动检查更新”（默认开启）
 */
export const isCodeHubSyncAutoCheckEnabled = () => {
  const val = localStorage.getItem(CODEHUB_SYNC_AUTO_CHECK_KEY);
  return val === null || val === "1" || val === "true";
};

/**
 * 设置“进入时自动检查更新”状态
 */
export const setCodeHubSyncAutoCheckEnabled = (enabled) => {
  localStorage.setItem(CODEHUB_SYNC_AUTO_CHECK_KEY, enabled ? "1" : "0");
};

/**
 * 判断是否开启了“自动云同步”（默认关闭）
 */
export const isCodeHubAutoSyncEnabled = () => {
  const val = localStorage.getItem(CODEHUB_AUTO_SYNC_KEY);
  return val === "1" || val === "true";
};

/**
 * 设置“自动云同步”状态
 */
export const setCodeHubAutoSyncEnabled = (enabled) => {
  localStorage.setItem(CODEHUB_AUTO_SYNC_KEY, enabled ? "1" : "0");
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("codehub-auto-sync-change"));
  }
};

/**
 * 获取自动云同步时间间隔（秒，最小10，最大3600，默认300秒）
 */
export const getCodeHubAutoSyncInterval = () => {
  const raw = localStorage.getItem(CODEHUB_AUTO_SYNC_INTERVAL_KEY);
  const val = parseInt(raw, 10);
  if (isNaN(val)) return DEFAULT_AUTO_SYNC_INTERVAL_SECONDS;
  return Math.min(MAX_AUTO_SYNC_INTERVAL_SECONDS, Math.max(MIN_AUTO_SYNC_INTERVAL_SECONDS, val));
};

/**
 * 设置自动云同步时间间隔（秒，最小10，最大3600）
 */
export const setCodeHubAutoSyncInterval = (seconds) => {
  let val = parseInt(seconds, 10);
  if (isNaN(val) || val < MIN_AUTO_SYNC_INTERVAL_SECONDS) val = MIN_AUTO_SYNC_INTERVAL_SECONDS;
  else if (val > MAX_AUTO_SYNC_INTERVAL_SECONDS) val = MAX_AUTO_SYNC_INTERVAL_SECONDS;
  localStorage.setItem(CODEHUB_AUTO_SYNC_INTERVAL_KEY, String(val));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("codehub-auto-sync-change"));
  }
  return val;
};

/**
 * 获取自动同步历史日志（最多60条）
 */
export const getCodeHubAutoSyncLogs = () => {
  try {
    const raw = localStorage.getItem(CODEHUB_AUTO_SYNC_LOGS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

/**
 * 添加一条自动同步日志到本地（最多保留60条）
 * @param {Object} logEntry
 * @param {string} logEntry.type 'success' | 'info' | 'warn' | 'error'
 * @param {string} logEntry.summary 简要描述
 * @param {string} [logEntry.details] 详细内容
 * @param {number} [logEntry.time] 时间戳
 */
export const addCodeHubAutoSyncLog = (logEntry) => {
  try {
    const logs = getCodeHubAutoSyncLogs();
    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      time: logEntry.time || Date.now(),
      type: logEntry.type || "info",
      summary: logEntry.summary || "",
      details: logEntry.details || "",
    };
    logs.unshift(entry);
    if (logs.length > MAX_AUTO_SYNC_LOGS) {
      logs.length = MAX_AUTO_SYNC_LOGS;
    }
    localStorage.setItem(CODEHUB_AUTO_SYNC_LOGS_KEY, JSON.stringify(logs));
    return entry;
  } catch (e) {
    console.warn("保存自动同步日志失败:", e);
  }
};

/**
 * 清空自动同步日志
 */
export const clearCodeHubAutoSyncLogs = () => {
  localStorage.removeItem(CODEHUB_AUTO_SYNC_LOGS_KEY);
};

const isSyncableStoreKey = (key) =>
  key !== SAVES_INDEX_KEY &&
  key !== SHOW_SAVES_KEY &&
  !key.startsWith("codehub_trash_content:") &&
  !key.startsWith("codehub_trash_meta:");

export const getCodeHubSyncConfig = () => {
  let url = (localStorage.getItem(CODEHUB_SYNC_URL_KEY) || "").trim();
  if (url && !/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  url = url.replace(/\/+$/, "");

  const token = (localStorage.getItem(CODEHUB_SYNC_TOKEN_KEY) || "").trim();
  const secretKey = (localStorage.getItem(CODEHUB_SYNC_SECRET_KEY) || "").trim();
  return {
    url,
    token,
    // 解密密钥独立：若用户未单独填写，默认回退使用 token，平滑向下兼容
    secretKey: secretKey || token,
  };
};

// 默认请求超时时间（15 秒），防止网络异常或 Worker 无响应时无限挂起
const DEFAULT_FETCH_TIMEOUT = 15000;

const apiFetch = async (path, options = {}) => {
  const { url, token } = getCodeHubSyncConfig();
  if (!url || !token) throw new Error("请先在设置中填写 CF 同步地址和访问 Token");

  // 规范化 URL 与路径，防止多余斜杠引发 404 或路由失效
  const baseUrl = url.trim().replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  const headers = {
    Authorization: `Bearer ${token.trim()}`,
    ...(options.headers || {}),
  };

  // 使用 AbortController 实现超时，避免 fetch 无限挂起
  const timeout = options.timeout || DEFAULT_FETCH_TIMEOUT;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  let response;
  try {
    response = await fetch(`${baseUrl}${normalizedPath}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } catch (netErr) {
    if (netErr.name === "AbortError") {
      throw new Error(`请求超时 (${timeout / 1000}秒)，请检查网络连接和 Worker 地址是否正确`);
    }
    throw new Error(`网络连接失败 (${netErr.message || "无法连接到 Worker"})`);
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    let msg = `请求失败 (${response.status})`;
    try {
      const err = await response.json();
      if (err?.error) {
        if (response.status === 401 && (err.error === "no router" || err.error.includes("auth"))) {
          msg = "Worker 鉴权失败：访问 Token 不正确";
        } else {
          msg = err.error;
        }
      }
    } catch {
      if (response.status === 401) {
        msg = "Worker 鉴权失败：访问 Token 不正确";
      } else if (response.status === 404) {
        msg = `Worker 路由未找到 (404)，请检查 Worker 地址是否配置正确: ${normalizedPath}`;
      }
    }
    throw new Error(msg);
  }

  return response;
};

// ============================================
// 端到端 AES 加密/解密 + Gzip 压缩/解压
// 仅保留纯密文（Gzip 压缩 + AES-ECB-Pkcs7 加密，前面无任何前缀，绝不存储/返回明文）
// ============================================

// 原生 gzip 压缩（返回 Uint8Array）
const gzipCompress = async (str) => {
  const stream = new Response(
    new Blob([new TextEncoder().encode(str)]).stream().pipeThrough(new CompressionStream("gzip"))
  );
  const buffer = await stream.arrayBuffer();
  return new Uint8Array(buffer);
};

// 原生 gzip 解压（返回 UTF-8 字符串）
const gzipDecompress = async (bytes) => {
  const stream = new Response(
    new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"))
  );
  const buffer = await stream.arrayBuffer();
  return new TextDecoder("utf-8").decode(buffer);
};

// Uint8Array 转 Base64（分块安全处理大数据）
const bytesToBase64 = (bytes) => {
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk);
  }
  return btoa(binary);
};

// Base64 转 Uint8Array
const base64ToBytes = (base64) => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

// 将任意长度的密钥转换为固定的 16 字节 AES WordArray Key
const secretKeyToWordArray = (secretKey) => {
  const str = String(secretKey || "");
  const words = [0x6b657931, 0x6b657932, 0x6b657933, 0x6b657934];
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    const idx = i % 4;
    words[idx] = ((words[idx] << 5) - words[idx] + code) | 0;
  }
  return {
    words,
    sigBytes: 16,
  };
};

// 本地 gzip 压缩后 AES 加密（纯密文，前面不加前缀）
export const encryptContent = async (plainText, secretKey) => {
  const text = typeof plainText === "string" ? plainText : "";
  try {
    // 1. 先进行 Gzip 压缩
    const compressedBytes = await gzipCompress(text);
    const payload = bytesToBase64(compressedBytes);

    // 2. 将压缩后的数据用 AES-ECB-Pkcs7 加密
    const key = secretKeyToWordArray(secretKey);
    const encrypted = CryptoJS.AES.encrypt(payload, key, {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7,
    });

    // 3. 直接返回纯 AES 密文字符串（不带任何前缀）
    return CryptoJS.enc.Base64.stringify(encrypted.ciphertext);
  } catch (err) {
    console.error("加密失败：", err);
    throw new Error("本地加密失败: " + (err.message || "未知错误"));
  }
};

// 本地解密 content（先 AES 解密，再 Gzip 解压还原明文，不接受明文返回）
export const decryptContent = async (text, secretKey) => {
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("密文无效或为空，无法解密");
  }

  // 兼容剔除可能残留的旧前缀
  let rawCipher = text.trim();
  if (rawCipher.startsWith("ENC:AES:GZIP:")) {
    rawCipher = rawCipher.slice("ENC:AES:GZIP:".length);
  } else if (rawCipher.startsWith("ENC:AES:")) {
    rawCipher = rawCipher.slice("ENC:AES:".length);
  }

  try {
    const key = secretKeyToWordArray(secretKey);
    const ciphertext = CryptoJS.enc.Base64.parse(rawCipher);
    const decrypted = CryptoJS.AES.decrypt({ ciphertext }, key, {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7,
    });
    const decryptedBase64 = CryptoJS.enc.Utf8.stringify(decrypted);
    if (!decryptedBase64 && rawCipher !== "") {
      throw new Error("解密结果为空，加密密钥与云端密文不匹配");
    }
    const compressedBytes = base64ToBytes(decryptedBase64);
    return await gzipDecompress(compressedBytes);
  } catch (err) {
    throw new Error("解密或解压失败：" + (err.message || "加密密钥不匹配或数据已损坏"));
  }
};

// 简单的轻量并发控制器
const runWithConcurrency = async (items, limit, fn) => {
  const results = [];
  const executing = [];
  for (const item of items) {
    const p = Promise.resolve().then(() => fn(item));
    results.push(p);
    if (limit <= items.length) {
      const e = p.then(() => executing.splice(executing.indexOf(e), 1));
      executing.push(e);
      if (executing.length >= limit) {
        await Promise.race(executing);
      }
    }
  }
  return Promise.all(results);
};

// 统一且安全地解析元数据中的修改时间戳
const getMetaTimestamp = (meta) => {
  if (!meta) return 0;
  const val = meta.updatedAt ?? meta.createAt ?? meta.createdAt;
  if (!val) return 0;
  const num = typeof val === "string" ? (Date.parse(val) || Number(val)) : Number(val);
  return Number.isFinite(num) ? num : 0;
};

// 获取本地仅包含元数据的轻量索引，普通文件和 Gist 文件都参与同步
export const getLocalIndex = async () => {
  const rawIndex = await codehubStorage.getItem(SAVES_INDEX_KEY);
  const idList = getIdsFromSavesIndex(rawIndex);
  const files = {};
  const syncableIds = [];
  for (const id of idList) {
    const meta = await codehubStorage.getItem(metaKey(id));
    if (meta) {
      files[id] = meta;
      syncableIds.push(id);
    }
  }
  const gistList = await codehubStorage.getItem(GIST_LIST_KEY);
  return {
    version: 2,
    updatedAt: Date.now(),
    ids: syncableIds,
    files,
    gistList: Array.isArray(gistList) ? gistList : [],
  };
};

// 云端索引短时内存缓存（TTL: 15秒）与并发合并
let _cachedRemoteIndex = null;
let _cachedRemoteIndexTime = 0;
let _pendingRemoteIndexPromise = null;
const REMOTE_INDEX_CACHE_TTL = 6000;

export const setCachedRemoteIndex = (index) => {
  if (index && typeof index === "object") {
    _cachedRemoteIndex = JSON.parse(JSON.stringify(index));
    _cachedRemoteIndexTime = Date.now();
  }
};

export const invalidateRemoteIndexCache = () => {
  _cachedRemoteIndex = null;
  _cachedRemoteIndexTime = 0;
  _pendingRemoteIndexPromise = null;
};

// 获取并解密云端索引（仅解析加密密文，空云端返回默认空结构，异常抛出详细原因）
export const fetchAndDecryptRemoteIndex = async (secretKey, options = {}) => {
  const forceFresh = options === true || options?.forceFresh === true;
  const now = Date.now();

  // 1. 命中短时内存缓存，直接复用，避免在弹窗打开/确认/上传各步骤中重复发 GET /index
  if (!forceFresh && _cachedRemoteIndex && now - _cachedRemoteIndexTime < REMOTE_INDEX_CACHE_TTL) {
    return _cachedRemoteIndex;
  }

  // 2. 避免并发多次拉取
  if (!forceFresh && _pendingRemoteIndexPromise) {
    return _pendingRemoteIndexPromise;
  }

  const task = (async () => {
    try {
      const res = await apiFetch("/index");
      const data = await res.json();
      const rawIndex = data?.index;

      // 云端尚未上传过任何索引（初始空桶状态），视为合法空数据
      if (!rawIndex || (typeof rawIndex === "string" && !rawIndex.trim())) {
        const emptyIndex = {
          version: 2,
          updatedAt: 0,
          keys: {},
          items: [],
          tombstones: {},
        };
        _cachedRemoteIndex = emptyIndex;
        _cachedRemoteIndexTime = Date.now();
        return emptyIndex;
      }

      let parsed = null;
      if (typeof rawIndex === "object") {
        // 兼容彻底删除旧版本写入的 { index: "密文" } 包装格式。
        if (typeof rawIndex.index === "string" && rawIndex.index.trim()) {
          const decrypted = await decryptContent(rawIndex.index, secretKey);
          parsed = JSON.parse(decrypted);
        } else {
          parsed = rawIndex;
        }
      } else if (typeof rawIndex === "string") {
        const decrypted = await decryptContent(rawIndex, secretKey);
        parsed = JSON.parse(decrypted);
      } else {
        throw new Error("云端索引格式异常：非预期的密文字符串");
      }

      _cachedRemoteIndex = parsed;
      _cachedRemoteIndexTime = Date.now();
      return parsed;
    } catch (err) {
      console.error("获取或解密云端索引失败:", err);
      throw err;
    } finally {
      _pendingRemoteIndexPromise = null;
    }
  })();

  if (!forceFresh) {
    _pendingRemoteIndexPromise = task;
  }
  return task;
};

// 上传：检查时间戳，只有本地比云端更新或云端缺失的文件才上传
export const uploadCodeHubSnapshot = async (options = {}) => {
  const onProgress = typeof options === "function" ? options : options?.onProgress;
  const { secretKey } = getCodeHubSyncConfig();
  const uploadStartTime = Date.now();
  const remoteIndex = await fetchAndDecryptRemoteIndex(secretKey);
  const localEntries = await codehubStorage.getAllEntries();
  const localIndex = parseSavesIndex(await codehubStorage.getItem(SAVES_INDEX_KEY));
  const remoteIndexData = parseSavesIndex(remoteIndex);
  const remoteItems = new Map(remoteIndexData.items.map((item) => [item.id, item]));
  const localValues = new Map(localEntries.map(({ key, value }) => [key, value]));
  const remoteKeys = new Set(Array.isArray(remoteIndex?.entries) ? remoteIndex.entries : []);
  const allTombstones = mergeTombstones(
    localIndex.tombstones,
    remoteIndexData.tombstones,
    [...localIndex.items, ...remoteIndexData.items],
  );

  // 本地已被有效墓碑标记删除的文件
  const localDeletedIds = localIndex.items
    .filter((item) => getTombstoneDeletedAt(allTombstones[item.id]) >= Number(item.updatedAt || 0))
    .map((item) => item.id);
  if (localDeletedIds.length) {
    await markCodeHubItemsDeleted(localDeletedIds);
  }

  // 本地有效项
  const activeLocalItems = localIndex.items.filter((item) => !localDeletedIds.includes(item.id));

  // 本地新增或比云端更新的文件才上传
  const fileIdsToUpload = activeLocalItems
    .filter((item) => {
      const r = remoteItems.get(item.id);
      return !r || Number(item.updatedAt || 0) > Number(r?.updatedAt || 0);
    })
    .map((item) => item.id);

  const entriesToUpload = fileIdsToUpload.flatMap((id) => [
    { key: metaKey(id), value: localValues.get(metaKey(id)) },
    { key: contentKey(id), value: localValues.get(contentKey(id)) },
  ]).filter(({ value }) => value !== undefined);

  // 调试日志：输出待上传文件详情与排查幽灵项
  console.group("🚀 [CodeHub Sync Upload] 开始执行上传");
  console.log("本地有效项数:", activeLocalItems.length, "云端有效项数:", remoteItems.size);
  console.log("待上传文件ID列表 (fileIdsToUpload):", fileIdsToUpload);
  console.log("实际生成的条目数 (entriesToUpload):", entriesToUpload.length);

  const uploadedKeysLogicalIds = new Set(entriesToUpload.map((e) => getLogicalFileId(e.key)));
  const ghostIds = fileIdsToUpload.filter((id) => !uploadedKeysLogicalIds.has(id));
  if (ghostIds.length > 0) {
    console.error("⚠️ [CodeHub Sync Upload] 检测到幽灵项（索引中存在但本地缺失 meta/content 数据）:", ghostIds);
  }

  // 对于处于有效墓碑（60 天保留期内）的文件：
  // 若云端尚未备份（!remoteKeys.has(cKey) 或 !remoteKeys.has(mKey)），
  // 且本地存有数据（来自 codehub_trash_content / codehub_trash_meta 或常规键），
  // 也将其作为标准云端键上传，确保云端在 60 天内具备可恢复备份！
  for (const [id, tombstoneVal] of Object.entries(allTombstones)) {
    const tombstoneTime = getTombstoneDeletedAt(tombstoneVal);
    if (!tombstoneTime || Date.now() - tombstoneTime >= TOMBSTONE_RETENTION_MS) continue;
    const mKey = metaKey(id);
    const cKey = contentKey(id);
    if (!remoteKeys.has(cKey) || !remoteKeys.has(mKey)) {
      const metaVal = localValues.get(mKey) ?? localValues.get(`codehub_trash_meta:${id}`);
      const contentVal = localValues.get(cKey) ?? localValues.get(`codehub_trash_content:${id}`);
      if (metaVal !== undefined && !remoteKeys.has(mKey)) {
        entriesToUpload.push({ key: mKey, value: metaVal });
      }
      if (contentVal !== undefined && !remoteKeys.has(cKey)) {
        entriesToUpload.push({ key: cKey, value: contentVal });
      }
    }
  }

  const localGistListTime = Number(localIndex.gistListUpdatedAt) || 0;
  const remoteGistListTime = Number(remoteIndexData.gistListUpdatedAt) || 0;
  if (!remoteKeys.has(GIST_LIST_KEY) || localGistListTime > remoteGistListTime) {
    const gistList = localValues.get(GIST_LIST_KEY);
    if (gistList !== undefined) entriesToUpload.push({ key: GIST_LIST_KEY, value: gistList });
  }

  // 只有当存在有效墓碑且墓碑晚于远端文件更新时间，且距今超过 60 天时，才从远端删除该 key！
  // 60 天内的文件在云端保留，支持管理页面随时恢复！
  const remoteKeysToDelete = [...remoteKeys].filter((key) => {
    const id = key.startsWith("codehub_save_meta:")
      ? key.slice("codehub_save_meta:".length)
      : key.startsWith("codehub_save_content:")
        ? key.slice("codehub_save_content:".length)
        : null;
    if (!id) return false;
    const remoteItem = remoteItems.get(id);
    const tombstoneTime = getTombstoneDeletedAt(allTombstones[id]);
    if (!tombstoneTime) return false;
    const isDeleted = tombstoneTime >= Number(remoteItem?.updatedAt || 0);
    if (!isDeleted) return false;
    // 关键条件：必须超过 60 天才在云端物理删除！
    return Date.now() - tombstoneTime >= TOMBSTONE_RETENTION_MS;
  });

  const successfulKeys = new Set();
  const failedUploadErrors = [];
  const failedDeleteErrors = [];

  const idKeyCounts = new Map();
  const idSuccessCounts = new Map();
  const idStarted = new Set();
  for (const { key } of entriesToUpload) {
    const id = key === GIST_LIST_KEY ? "__gist_list__" : getLogicalFileId(key);
    idKeyCounts.set(id, (idKeyCounts.get(id) || 0) + 1);
  }

  await runWithConcurrency(entriesToUpload, 4, async ({ key, value }) => {
    const id = key === GIST_LIST_KEY ? "__gist_list__" : getLogicalFileId(key);
    if (!idStarted.has(id)) {
      idStarted.add(id);
      onProgress?.({ id, status: "uploading" });
    }
    try {
      const serialized = JSON.stringify(value);
      if (new Blob([serialized]).size > MAX_SYNC_FILE_SIZE) {
        throw new Error(`IndexedDB 项 "${key}" 超过 50MB 大小限制`);
      }
      await apiFetch(`/files/${encodeURIComponent(key)}`, {
        method: "PUT",
        headers: { "Content-Type": "text/plain; charset=utf-8" },
        body: await encryptContent(serialized, secretKey),
      });
      successfulKeys.add(key);
      const succ = (idSuccessCounts.get(id) || 0) + 1;
      idSuccessCounts.set(id, succ);
      if (succ === idKeyCounts.get(id)) {
        onProgress?.({ id, status: "success" });
      }
    } catch (error) {
      failedUploadErrors.push({ key, error });
      onProgress?.({ id, status: "error", error });
      console.error(`同步 IndexedDB 项 ${key} 失败:`, error);
    }
  });

  const successfullyDeletedIds = new Set();
  await runWithConcurrency(remoteKeysToDelete, 4, async (key) => {
    try {
      await apiFetch(`/files/${encodeURIComponent(key)}`, { method: "DELETE" });
      successfullyDeletedIds.add(key);
    } catch (error) {
      failedDeleteErrors.push({ key, error });
    }
  });

  const uploadedLogicalIds = new Set([...successfulKeys].map(getLogicalFileId));
  const failedLogicalIds = new Set(failedUploadErrors.map(({ key }) => getLogicalFileId(key)));
  const deletedLogicalIds = new Set([...successfullyDeletedIds].map(getLogicalFileId));
  const completedLogicalIds = new Set(
    [...uploadedLogicalIds].filter((id) => !failedLogicalIds.has(id)),
  );

  // 在生成并上传最新云端索引前：
  // 仅当上传条目较多（> 20 项）或上传耗时较长（> 15 秒）时，才重新向云端发请求校验；
  // 对于日常少量文件同步（通常耗时仅数百毫秒），直接复用已持有的 remoteIndex，避免冗余网络往返
  let latestRemoteIndex = remoteIndex;
  const uploadDuration = Date.now() - uploadStartTime;
  if (entriesToUpload.length > 20 || uploadDuration > 15000) {
    try {
      const refreshedRemote = await fetchAndDecryptRemoteIndex(secretKey, { forceFresh: true });
      if (refreshedRemote) {
        latestRemoteIndex = refreshedRemote;
      }
    } catch (refreshErr) {
      console.warn("上传完成时拉取最新云端索引失败，将使用初始索引合并:", refreshErr);
    }
  }
  const latestRemoteIndexData = parseSavesIndex(latestRemoteIndex);
  const latestRemoteKeys = new Set(
    Array.isArray(latestRemoteIndex?.entries) ? latestRemoteIndex.entries : []
  );

  // 合并本地墓碑、初始墓碑与云端最新墓碑
  const finalAllTombstones = mergeTombstones(
    allTombstones,
    latestRemoteIndexData.tombstones,
    [...localIndex.items, ...latestRemoteIndexData.items],
  );

  // 更新本地保存索引
  const currentRawIndex = await codehubStorage.getItem(SAVES_INDEX_KEY);
  const parsedIndex = parseSavesIndex(currentRawIndex);
  const isKeyOnCloud = (keyName, previousFlag) => {
    if (successfullyDeletedIds.has(keyName)) return false;
    if (successfulKeys.has(keyName)) return true;
    if (latestRemoteKeys.has(keyName) || remoteKeys.has(keyName)) return true;
    return Boolean(previousFlag);
  };
  const updatedItems = parsedIndex.items.map((item) => {
    const metaKeyName = metaKey(item.id);
    const contentKeyName = contentKey(item.id);
    const copy = { ...item };
    if (isKeyOnCloud(metaKeyName, item.cf_meta)) copy.cf_meta = true;
    else delete copy.cf_meta;
    if (isKeyOnCloud(contentKeyName, item.cf_content)) copy.cf_content = true;
    else delete copy.cf_content;
    return copy;
  });
  const syncedIndex = {
    ...parsedIndex,
    updatedAt: Date.now(),
    items: updatedItems,
    tombstones: finalAllTombstones,
  };
  await codehubStorage.setItem(SAVES_INDEX_KEY, syncedIndex);

  // 云端索引三方合并：保留远端其他设备新增的有效项，同时加入/更新本地上传的项
  const cloudMergedItemsMap = new Map();
  // 1. 先载入远端最新原有的项（过滤已被墓碑删除的）
  for (const rItem of latestRemoteIndexData.items) {
    if (getTombstoneDeletedAt(finalAllTombstones[rItem.id]) < Number(rItem.updatedAt || 0)) {
      cloudMergedItemsMap.set(rItem.id, { ...rItem, cf_meta: true, cf_content: true });
    }
  }
  // 2. 本地有效项，合并/覆盖到云端项中
  for (const item of updatedItems) {
    const hasMeta = isKeyOnCloud(metaKey(item.id), item.cf_meta);
    const hasContent = isKeyOnCloud(contentKey(item.id), item.cf_content);
    if (hasMeta || hasContent) {
      cloudMergedItemsMap.set(item.id, {
        ...item,
        ...(hasMeta ? { cf_meta: true } : {}),
        ...(hasContent ? { cf_content: true } : {}),
      });
    }
  }
  const cloudMergedItems = Array.from(cloudMergedItemsMap.values());

  const latestEntries = await codehubStorage.getAllEntries();

  // 云端 entries 也是三方合并：保留远端原有未被删除的 key，加上本次新成功上传的 key
  const successfullyDeletedKeySet = successfullyDeletedIds;
  const survivingRemoteKeys = [...new Set([...remoteKeys, ...latestRemoteKeys])].filter(
    (k) => !successfullyDeletedKeySet.has(k)
  );
  const indexEntries = [
    ...new Set([
      ...survivingRemoteKeys,
      ...[...successfulKeys],
    ]),
  ];

  const cloudFiles = {
    ...(remoteIndexData.files || {}),
    ...(latestRemoteIndexData.files || {}),
  };
  for (const [id] of Object.entries(finalAllTombstones)) {
    if (getTombstoneDeletedAt(finalAllTombstones[id]) >= Number(cloudMergedItemsMap.get(id)?.updatedAt || 0)) {
      delete cloudFiles[id];
    }
  }
  for (const { key, value } of latestEntries) {
    if (key.startsWith("codehub_save_meta:") && successfulKeys.has(key)) {
      cloudFiles[key.slice("codehub_save_meta:".length)] = value;
    }
  }

  const latestRemoteGistListTime = Number(latestRemoteIndexData.gistListUpdatedAt) || remoteGistListTime;
  const newIndex = {
    version: 4,
    updatedAt: Date.now(),
    entries: indexEntries,
    items: cloudMergedItems,
    tombstones: finalAllTombstones,
    gistListUpdatedAt: successfulKeys.has(GIST_LIST_KEY)
      ? localGistListTime
      : latestRemoteGistListTime,
    ids: cloudMergedItems.map((item) => item.id),
    files: cloudFiles,
    gistList: successfulKeys.has(GIST_LIST_KEY)
      ? (latestEntries.find(({ key }) => key === GIST_LIST_KEY)?.value || [])
      : (latestRemoteIndex.gistList || remoteIndex.gistList || []),
  };
  const indexJsonStr = JSON.stringify(newIndex);
  if (new Blob([indexJsonStr]).size > MAX_SYNC_FILE_SIZE) {
    throw new Error("云端索引超出 50MB 大小限制");
  }
  await apiFetch("/index", {
    method: "PUT",
    headers: { "Content-Type": "text/plain; charset=utf-8" },
    body: await encryptContent(indexJsonStr, secretKey),
  });

  // ★ 写入云端成功后，立即将本地刚生成的最新 newIndex 注入内存缓存，
  // 使得随后的 openSyncModal() 或 checkCodeHubSyncDiff() 无需再向云端发 GET /index 重复拉取刚上传的数据
  setCachedRemoteIndex(newIndex);

  // 上传云端成功后，同步将合并后的墓碑和最新的 items 回写到本地 IndexedDB，
  // 避免本地索引与云端索引存在细微差异导致反复触发“有内容需上传”的假报警
  try {
    const localCurrentIndex = parseSavesIndex(await codehubStorage.getItem(SAVES_INDEX_KEY));
    await codehubStorage.setItem(SAVES_INDEX_KEY, {
      ...localCurrentIndex,
      updatedAt: newIndex.updatedAt,
      tombstones: finalAllTombstones,
    });
  } catch (err) {
    console.warn("上传后同步本地索引失败:", err);
  }

  const tombstoneChanged = !areTombstonesEqual(remoteIndexData.tombstones || {}, finalAllTombstones);
  const itemsChanged =
    remoteIndexData.items.length !== cloudMergedItems.length ||
    remoteIndexData.items.some((rItem) => {
      const merged = cloudMergedItemsMap.get(rItem.id);
      return !merged || Number(merged.updatedAt) !== Number(rItem.updatedAt);
    });
  const indexChanged = tombstoneChanged || itemsChanged || successfulKeys.has(GIST_LIST_KEY);

  const changed =
    entriesToUpload.length > 0 ||
    successfullyDeletedIds.size > 0 ||
    failedUploadErrors.length > 0 ||
    failedDeleteErrors.length > 0 ||
    indexChanged;

  console.log("📊 [CodeHub Sync Upload] 上传结果概览:", {
    uploaded: completedLogicalIds.size,
    failed: failedLogicalIds.size,
    deleted: deletedLogicalIds.size,
    failedDeleted: failedDeleteErrors.length,
    tombstoneChanged,
    itemsChanged,
    indexChanged,
    changed,
  });
  console.groupEnd();

  return {
    uploaded: completedLogicalIds.size,
    failed: failedLogicalIds.size,
    deleted: deletedLogicalIds.size,
    failedDeleted: new Set(failedDeleteErrors.map(({ key }) => getLogicalFileId(key))).size,
    total: localEntries.length,
    changed,
    indexChanged,
  };
};

// 恢复：拉取 index，仅下载本地没有或云端时间戳更新的 content
export const restoreCodeHubSnapshot = async (options = {}) => {
  const onProgress = typeof options === "function" ? options : options?.onProgress;
  const { secretKey } = getCodeHubSyncConfig();
  const remoteIndex = await fetchAndDecryptRemoteIndex(secretKey);

  if (!remoteIndex || !Array.isArray(remoteIndex.entries)) {
    throw new Error("云端暂无可用的文件索引，或密钥错误无法解密");
  }

  const localIndex = parseSavesIndex(await codehubStorage.getItem(SAVES_INDEX_KEY));
  const remoteIndexData = parseSavesIndex(remoteIndex);
  const localKeys = new Set(await codehubStorage.getAllKeys());
  const remoteEntries = remoteIndex.entries.filter(isSyncableStoreKey);
  const remoteItems = new Map(remoteIndexData.items.map((item) => [item.id, item]));
  const localItems = new Map(localIndex.items.map((item) => [item.id, item]));
  const allTombstones = mergeTombstones(
    localIndex.tombstones,
    remoteIndexData.tombstones,
    [...localIndex.items, ...remoteIndexData.items],
  );

  // 只有被有效墓碑标记删除的文件才从本地删除
  const localDeletedIds = localIndex.items
    .filter((item) => getTombstoneDeletedAt(allTombstones[item.id]) >= Number(item.updatedAt || 0))
    .map((item) => item.id);
  if (localDeletedIds.length) {
    await markCodeHubItemsDeleted(localDeletedIds);
  }

  const entriesToDownload = remoteEntries.filter((key) => {
    if (key === GIST_LIST_KEY) {
      return !localKeys.has(key) || Number(remoteIndexData.gistListUpdatedAt) > Number(localIndex.gistListUpdatedAt);
    }
    const id = key.startsWith("codehub_save_meta:")
      ? key.slice("codehub_save_meta:".length)
      : key.startsWith("codehub_save_content:")
        ? key.slice("codehub_save_content:".length)
        : null;
    if (!id) return false;
    const isDeleted = getTombstoneDeletedAt(allTombstones[id]) >= Number(remoteItems.get(id)?.updatedAt || 0);
    return !isDeleted
      && (!localItems.has(id) || Number(remoteItems.get(id)?.updatedAt) > Number(localItems.get(id)?.updatedAt));
  });

  const idKeyCounts = new Map();
  const idSuccessCounts = new Map();
  const idStarted = new Set();
  for (const key of entriesToDownload) {
    const id = key === GIST_LIST_KEY ? "__gist_list__" : getLogicalFileId(key);
    idKeyCounts.set(id, (idKeyCounts.get(id) || 0) + 1);
  }

  await runWithConcurrency(entriesToDownload, 4, async (key) => {
    const id = key === GIST_LIST_KEY ? "__gist_list__" : getLogicalFileId(key);
    if (!idStarted.has(id)) {
      idStarted.add(id);
      onProgress?.({ id, status: "downloading" });
    }
    try {
      const fileRes = await apiFetch(`/files/${encodeURIComponent(key)}`);
      const encryptedContent = await fileRes.text();
      const serialized = await decryptContent(encryptedContent, secretKey);
      await codehubStorage.setItem(key, JSON.parse(serialized));
      const succ = (idSuccessCounts.get(id) || 0) + 1;
      idSuccessCounts.set(id, succ);
      if (succ === idKeyCounts.get(id)) {
        onProgress?.({ id, status: "success" });
      }
    } catch (err) {
      onProgress?.({ id, status: "error", error: err });
      throw err;
    }
  });

  // 本地保存索引三方合并：
  // 1. 保留本地自己新增且未被墓碑删除的文件（绝对不能被云端覆盖删除！）
  // 2. 融入云端恢复回来的有效项
  const restoredIndex = await codehubStorage.getItem(SAVES_INDEX_KEY);
  const parsedIndex = parseSavesIndex(restoredIndex);
  const localMergedItemsMap = new Map();

  // 先放本地当前有效且未被墓碑删除的 items
  for (const item of parsedIndex.items) {
    if (getTombstoneDeletedAt(allTombstones[item.id]) < Number(item.updatedAt || 0)) {
      localMergedItemsMap.set(item.id, { ...item });
    }
  }

  // 再把远端有效 items 合并进来（如果远端更新或者本地没有）
  for (const rItem of remoteIndexData.items) {
    if (getTombstoneDeletedAt(allTombstones[rItem.id]) >= Number(rItem.updatedAt || 0)) {
      continue;
    }
    const localItem = localMergedItemsMap.get(rItem.id);
    if (!localItem || Number(rItem.updatedAt || 0) >= Number(localItem.updatedAt || 0)) {
      localMergedItemsMap.set(rItem.id, {
        ...rItem,
        cf_meta: true,
        cf_content: true,
      });
    }
  }

  const finalLocalItems = Array.from(localMergedItemsMap.values());
  await codehubStorage.setItem(SAVES_INDEX_KEY, {
    ...parsedIndex,
    items: finalLocalItems,
    tombstones: allTombstones,
    gistListUpdatedAt: Math.max(
      Number(localIndex.gistListUpdatedAt) || 0,
      Number(remoteIndexData.gistListUpdatedAt) || 0,
    ),
    updatedAt: Date.now(),
  });

  // 下载完成后，将已知的最新 remoteIndex 保持在缓存中
  setCachedRemoteIndex(remoteIndex);

  return {
    downloaded: new Set(entriesToDownload.map(getLogicalFileId)).size,
    total: new Set(remoteEntries.map(getLogicalFileId)).size,
  };
};

/**
 * 格式化时间差为可读文本（秒 / 分钟 / 小时 / 天）
 * @param {number} diffMs 时间差（毫秒）
 * @returns {string} 如 "12秒"、"5分钟"、"2小时"、"3天"
 */
export const formatTimeDiff = (diffMs) => {
  const totalSeconds = Math.max(1, Math.round(Math.abs(diffMs) / 1000));
  if (totalSeconds < 60) {
    return `${totalSeconds}秒`;
  }
  const minutes = Math.floor(totalSeconds / 60);
  if (minutes < 60) {
    return `${minutes}分钟`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}小时`;
  }
  const days = Math.floor(hours / 24);
  return `${days}天`;
};

/**
 * 检查本地与云端的差异（不自动更新）
 * 返回值:
 * {
 *   hasChanges: boolean,
 *   toDownload: number,     // 云端有新增或较新的文件数
 *   toUpload: number,       // 本地有新增或较新的文件数
 *   remoteDeleted: number,  // 云端已删除的文件数（本地还存在）
 *   localDeleted: number,   // 本地已删除的文件数（云端还存在）
 *   remoteFiles: Array,
 *   localFiles: Array
 * }
 */
export const checkCodeHubSyncDiff = async (options = {}) => {
  const { url, token, secretKey } = getCodeHubSyncConfig();
  if (!url || !token) return null;

  const [remoteIndex, localKeysArr] = await Promise.all([
    fetchAndDecryptRemoteIndex(secretKey, options),
    codehubStorage.getAllKeys(),
  ]);

  const localKeysSet = new Set(localKeysArr);
  const localIndexData = parseSavesIndex(await codehubStorage.getItem(SAVES_INDEX_KEY));
  const remoteIndexData = parseSavesIndex(remoteIndex || {});
  const allTombstones = mergeTombstones(
    localIndexData.tombstones,
    remoteIndexData.tombstones,
    [...localIndexData.items, ...remoteIndexData.items],
  );
  const remoteItems = new Map(remoteIndexData.items.map((item) => [item.id, item]));
  const localItems = new Map(localIndexData.items.map((item) => [item.id, item]));

  const activeRemoteItems = remoteIndexData.items.filter(
    (item) => getTombstoneDeletedAt(allTombstones[item.id]) < Number(item.updatedAt || 0),
  );
  const activeLocalItems = localIndexData.items.filter(
    (item) => getTombstoneDeletedAt(allTombstones[item.id]) < Number(item.updatedAt || 0),
  );

  const uploadItems = [];
  for (const item of activeLocalItems) {
    const r = remoteItems.get(item.id);
    const lTime = Number(item.updatedAt || 0);
    const rTime = Number(r?.updatedAt || 0);
    const isNewer = !r || lTime > rTime;
    if (isNewer) {
      const isNameChanged = Boolean(r && item.name && r.name && item.name !== r.name);
      const hasMeta = localKeysSet.has(metaKey(item.id));
      const hasContent = localKeysSet.has(contentKey(item.id));
      uploadItems.push({
        id: item.id,
        name: item.name || "未命名文件",
        reason: !r
          ? "未上传云端"
          : isNameChanged
            ? "本地重命名"
            : `本地更新 (相差 ${formatTimeDiff(lTime - rTime)})`,
        localUpdatedAt: lTime,
        localTimeStr: lTime ? new Date(lTime).toLocaleString() : "无",
        remoteUpdatedAt: rTime,
        remoteTimeStr: rTime ? new Date(rTime).toLocaleString() : "云端无此文件",
        hasLocalMeta: hasMeta,
        hasLocalContent: hasContent,
        isGhost: !hasMeta && !hasContent,
      });
    }
  }

  const downloadItems = [];
  for (const item of activeRemoteItems) {
    const l = localItems.get(item.id);
    const rTime = Number(item.updatedAt || 0);
    const lTime = Number(l?.updatedAt || 0);
    const isRemoteNewer = !l || rTime > lTime;
    if (isRemoteNewer) {
      const isNameChanged = Boolean(l && item.name && l.name && item.name !== l.name);
      downloadItems.push({
        id: item.id,
        name: item.name || "未命名文件",
        reason: !l
          ? "本地缺失"
          : isNameChanged
            ? "云端重命名"
            : `云端更新 (相差 ${formatTimeDiff(rTime - lTime)})`,
        remoteUpdatedAt: rTime,
        remoteTimeStr: rTime ? new Date(rTime).toLocaleString() : "无",
        localUpdatedAt: lTime,
        localTimeStr: lTime ? new Date(lTime).toLocaleString() : "本地无此文件",
      });
    }
  }

  const localGistListTime = Number(localIndexData.gistListUpdatedAt) || 0;
  const remoteGistListTime = Number(remoteIndexData.gistListUpdatedAt) || 0;
  const gistListUploadNeeded = localGistListTime > remoteGistListTime;
  const gistListDownloadNeeded = remoteGistListTime > localGistListTime;
  const gistListChanged = gistListUploadNeeded || gistListDownloadNeeded;
  const changedKeyCount = gistListChanged ? 1 : 0;

  const tombstoneChanged = !areTombstonesEqual(
    localIndexData.tombstones || {},
    remoteIndexData.tombstones || {}
  );

  const remoteKeys = new Set(
    Array.isArray(remoteIndex?.entries)
      ? remoteIndex.entries
      : remoteIndex?.keys
      ? Object.keys(remoteIndex.keys)
      : []
  );
  const trashPendingUploadItems = [];
  const trashPendingLocalCleanupItems = [];
  for (const [id, tombVal] of Object.entries(localIndexData.tombstones || {})) {
    const tTime = getTombstoneDeletedAt(tombVal);
    if (!tTime || Date.now() - tTime >= TOMBSTONE_RETENTION_MS) continue;
    // 如果云端已经知晓该墓碑记录，说明该文件的删除标记已在云端生效，不再将其视作“需要触发上传”的项目
    const remoteHasTombstone = Boolean(
      remoteIndexData.tombstones &&
      getTombstoneDeletedAt(remoteIndexData.tombstones[id]) >= tTime
    );
    const remoteHasFile =
      remoteKeys.has(contentKey(id)) ||
      remoteKeys.has(metaKey(id)) ||
      Object.prototype.hasOwnProperty.call(remoteIndexData.files || {}, id);
    if (!remoteHasTombstone && !remoteHasFile) {
      trashPendingLocalCleanupItems.push({
        id,
        name: tombVal?.name || id,
        deletedAt: tTime,
        deleteTimeStr: new Date(tTime).toLocaleString(),
        reason: "云端已彻底删除，待清理本地回收站",
      });
      continue;
    }
    if (!remoteHasTombstone && !remoteKeys.has(contentKey(id))) {
      const hasLocalData =
        localKeysSet.has(contentKey(id)) ||
        localKeysSet.has(`codehub_trash_content:${id}`) ||
        localKeysSet.has(metaKey(id)) ||
        localKeysSet.has(`codehub_trash_meta:${id}`);
      if (hasLocalData) {
        trashPendingUploadItems.push({
          id,
          name: tombVal?.name || id,
          deletedAt: tTime,
          deleteTimeStr: new Date(tTime).toLocaleString(),
          reason: "云端未备份回收站内容",
        });
      } else {
        console.warn(`[CodeHub Diff] 回收站文件 ${id} 云端未备份但本地亦无缓存数据，跳过`);
      }
    }
  }

  const effectiveUploadCount =
    uploadItems.length +
    (trashPendingUploadItems.length > 0 ? 1 : 0) +
    (trashPendingLocalCleanupItems.length > 0 ? 1 : 0);
  const hasChanges =
    downloadItems.length > 0 ||
    effectiveUploadCount > 0 ||
    changedKeyCount > 0 ||
    tombstoneChanged;

  console.group("🔍 [CodeHub Sync Diff] 差异比对详细报告 (checkCodeHubSyncDiff)");
  console.log(`📊 本地有效文件: ${activeLocalItems.length} 个, 云端有效文件: ${activeRemoteItems.length} 个`);
  if (uploadItems.length > 0) {
    console.warn(`📤 【本地待上传文件 (${uploadItems.length} 个)】:`, uploadItems);
    console.table(uploadItems);
  } else {
    console.log("📤 本地待上传文件: 0 个");
  }
  if (downloadItems.length > 0) {
    console.warn(`📥 【云端待下载文件 (${downloadItems.length} 个)】:`, downloadItems);
    console.table(downloadItems);
  } else {
    console.log("📥 云端待下载文件: 0 个");
  }
  if (trashPendingUploadItems.length > 0) {
    console.warn(`🗑️ 【回收站待备份项目 (${trashPendingUploadItems.length} 个)】:`, trashPendingUploadItems);
    console.table(trashPendingUploadItems);
  }
  if (gistListChanged) {
    console.info("📋 Gist 列表时间戳不一致:", {
      local: localIndexData.gistListUpdatedAt,
      remote: remoteIndexData.gistListUpdatedAt,
    });
  }
  if (tombstoneChanged) {
    console.info("🏷️ 墓碑字典不一致 (包含新增/删除的墓碑记录)");
  }
  console.groupEnd();

  return {
    hasChanges,
    toDownload: downloadItems.length,
    toUpload: effectiveUploadCount,
    remoteNewCount: downloadItems.length,
    localNewCount: effectiveUploadCount,
    remoteCount: activeRemoteItems.length,
    localCount: activeLocalItems.length,
    uploadItems,
    downloadItems,
    trashPendingUploadItems,
    trashPendingLocalCleanupItems,
    gistListChanged,
    gistListUploadNeeded,
    gistListDownloadNeeded,
    tombstoneChanged,
  };
};

// 从云端拉取被删除但仍在 60 天保留期内的文件数据以供恢复
export const restoreFileFromCloud = async (id) => {
  const { secretKey } = getCodeHubSyncConfig();
  if (!id || !secretKey) return null;
  try {
    const metaRes = await apiFetch(`/files/${encodeURIComponent(metaKey(id))}`);
    const metaEncrypted = await metaRes.text();
    const metaJson = await decryptContent(metaEncrypted, secretKey);
    const meta = JSON.parse(metaJson);

    const contentRes = await apiFetch(`/files/${encodeURIComponent(contentKey(id))}`);
    const contentEncrypted = await contentRes.text();
    const contentJson = await decryptContent(contentEncrypted, secretKey);
    const content = JSON.parse(contentJson);

    return { meta, content };
  } catch (err) {
    console.warn("从云端恢复文件失败:", err);
    return null;
  }
};

// 获取云端当前的 keys 与 tombstones，用于在回收站打上精准的云端标识
export const fetchCloudTrashInfo = async () => {
  const { url, token, secretKey } = getCodeHubSyncConfig();
  if (!url || !token) return null;
  try {
    const remoteIndex = await fetchAndDecryptRemoteIndex(secretKey);
    if (!remoteIndex) return null;
    return {
      keys: remoteIndex.keys || {},
      tombstones: remoteIndex.tombstones || {},
      items: remoteIndex.items || [],
    };
  } catch (err) {
    console.warn("获取云端回收站状态失败:", err);
    return null;
  }
};

// 彻底从云端删除指定文件及其元数据与根索引记录
export const apiDeleteFileFromCloud = async (id, options = {}) => {
  if (!id) return false;
  const onProgress = typeof options === "function" ? options : options?.onProgress;
  const { secretKey } = getCodeHubSyncConfig();

  try {
    onProgress?.({ step: "deleting_files", message: "正在从云端存储删除文件与元数据..." });
    // 1. 删除 Worker R2 里的实际加密文件
    await Promise.allSettled([
      apiFetch(`/files/${encodeURIComponent(metaKey(id))}`, { method: "DELETE" }),
      apiFetch(`/files/${encodeURIComponent(contentKey(id))}`, { method: "DELETE" }),
    ]);

    // 2. 更新云端根索引，彻底移除该 id 的 tombstones、keys 和 items
    onProgress?.({ step: "updating_index", message: "正在更新云端根索引并清除标记..." });
    const remoteIndex = await fetchAndDecryptRemoteIndex(secretKey);
    if (remoteIndex && typeof remoteIndex === "object") {
      let indexChanged = false;
      if (remoteIndex.tombstones && remoteIndex.tombstones[id]) {
        delete remoteIndex.tombstones[id];
        indexChanged = true;
      }
      if (remoteIndex.keys) {
        if (remoteIndex.keys[metaKey(id)]) {
          delete remoteIndex.keys[metaKey(id)];
          indexChanged = true;
        }
        if (remoteIndex.keys[contentKey(id)]) {
          delete remoteIndex.keys[contentKey(id)];
          indexChanged = true;
        }
      }
      if (Array.isArray(remoteIndex.items)) {
        const prevLen = remoteIndex.items.length;
        remoteIndex.items = remoteIndex.items.filter((it) => it.id !== id);
        if (remoteIndex.items.length !== prevLen) {
          indexChanged = true;
        }
      }
      if (Array.isArray(remoteIndex.entries)) {
        const prevLen = remoteIndex.entries.length;
        remoteIndex.entries = remoteIndex.entries.filter(
          (key) => getLogicalFileId(key) !== id,
        );
        if (remoteIndex.entries.length !== prevLen) {
          indexChanged = true;
        }
      }
      if (Array.isArray(remoteIndex.ids)) {
        const prevLen = remoteIndex.ids.length;
        remoteIndex.ids = remoteIndex.ids.filter((itemId) => itemId !== id);
        if (remoteIndex.ids.length !== prevLen) {
          indexChanged = true;
        }
      }
      if (remoteIndex.files && typeof remoteIndex.files === "object") {
        if (Object.prototype.hasOwnProperty.call(remoteIndex.files, id)) {
          delete remoteIndex.files[id];
          indexChanged = true;
        }
      }
      if (indexChanged) {
        remoteIndex.updatedAt = Date.now();
        const encryptedIndex = await encryptContent(JSON.stringify(remoteIndex), secretKey);
        await apiFetch("/index", {
          method: "PUT",
          headers: { "Content-Type": "text/plain; charset=utf-8" },
          body: encryptedIndex,
        });
        invalidateRemoteIndexCache();
      }
    }
    onProgress?.({ step: "done", message: "云端已彻底删除完毕" });
    return true;
  } catch (err) {
    console.warn("从云端彻底删除文件失败:", err);
    throw err;
  }
};

// 批量从云端彻底删除多个文件及其根索引
export const apiDeleteMultipleFilesFromCloud = async (ids = [], options = {}) => {
  if (!ids || ids.length === 0) return true;
  const onProgress = typeof options === "function" ? options : options?.onProgress;
  const { secretKey } = getCodeHubSyncConfig();

  try {
    const total = ids.length;
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      onProgress?.({
        step: "deleting_files",
        current: i + 1,
        total,
        message: `正在删除云端文件 (${i + 1}/${total})...`,
      });
      await Promise.allSettled([
        apiFetch(`/files/${encodeURIComponent(metaKey(id))}`, { method: "DELETE" }),
        apiFetch(`/files/${encodeURIComponent(contentKey(id))}`, { method: "DELETE" }),
      ]);
    }

    onProgress?.({ step: "updating_index", message: "正在清理云端根索引记录..." });
    const remoteIndex = await fetchAndDecryptRemoteIndex(secretKey);
    if (remoteIndex && typeof remoteIndex === "object") {
      let indexChanged = false;
      const idSet = new Set(ids);
      if (remoteIndex.tombstones) {
        for (const id of ids) {
          if (remoteIndex.tombstones[id]) {
            delete remoteIndex.tombstones[id];
            indexChanged = true;
          }
        }
      }
      if (remoteIndex.keys) {
        for (const id of ids) {
          if (remoteIndex.keys[metaKey(id)]) {
            delete remoteIndex.keys[metaKey(id)];
            indexChanged = true;
          }
          if (remoteIndex.keys[contentKey(id)]) {
            delete remoteIndex.keys[contentKey(id)];
            indexChanged = true;
          }
        }
      }
      if (Array.isArray(remoteIndex.items)) {
        const prevLen = remoteIndex.items.length;
        remoteIndex.items = remoteIndex.items.filter((it) => !idSet.has(it.id));
        if (remoteIndex.items.length !== prevLen) {
          indexChanged = true;
        }
      }
      if (Array.isArray(remoteIndex.entries)) {
        const prevLen = remoteIndex.entries.length;
        remoteIndex.entries = remoteIndex.entries.filter(
          (key) => !idSet.has(getLogicalFileId(key)),
        );
        if (remoteIndex.entries.length !== prevLen) {
          indexChanged = true;
        }
      }
      if (Array.isArray(remoteIndex.ids)) {
        const prevLen = remoteIndex.ids.length;
        remoteIndex.ids = remoteIndex.ids.filter((id) => !idSet.has(id));
        if (remoteIndex.ids.length !== prevLen) {
          indexChanged = true;
        }
      }
      if (remoteIndex.files && typeof remoteIndex.files === "object") {
        for (const id of ids) {
          if (Object.prototype.hasOwnProperty.call(remoteIndex.files, id)) {
            delete remoteIndex.files[id];
            indexChanged = true;
          }
        }
      }
      if (indexChanged) {
        remoteIndex.updatedAt = Date.now();
        const encryptedIndex = await encryptContent(JSON.stringify(remoteIndex), secretKey);
        await apiFetch("/index", {
          method: "PUT",
          headers: { "Content-Type": "text/plain; charset=utf-8" },
          body: encryptedIndex,
        });
        invalidateRemoteIndexCache();
      }
    }
    onProgress?.({ step: "done", message: "云端批量删除完成" });
    return true;
  } catch (err) {
    console.warn("从云端批量彻底删除文件失败:", err);
    throw err;
  }
};

/**
 * 验证/测试 CodeHub Worker 同步配置与端到端密钥
 * @param {Object} [customConfig] 可选自定义配置 { url, token, secretKey }，默认读取本地存储
 * @returns {Promise<{ success: boolean, message: string, isNewCloud: boolean }>}
 */
export const testCodeHubSyncConfig = async (customConfig = null) => {
  let { url, token, secretKey } = customConfig || getCodeHubSyncConfig();
  if (!url) throw new Error("Worker 地址不能为空");
  if (!token) throw new Error("访问令牌 (Token) 不能为空");

  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  url = url.trim().replace(/\/+$/, "");
  token = token.trim();
  secretKey = (secretKey || token).trim();

  // 1. 发起网络请求测试 Worker /index 连通性与 Token 鉴权
  let response;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时防护
    response = await fetch(`${url}/index`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
  } catch (netErr) {
    if (netErr.name === "AbortError") {
      throw new Error("连接超时 (10秒)，请检查 Worker 地址或网络连接");
    }
    throw new Error(`无法连接到 Worker: ${netErr.message || "网络请求失败，请检查 Worker 地址"}`);
  }

  // 2. HTTP 状态码判定
  if (response.status === 401) {
    throw new Error("访问令牌 (Token) 错误，Worker 鉴权未通过");
  }
  if (response.status === 404) {
    throw new Error("Worker 路由未匹配 (404)，请检查 Worker 是否正确部署 codehub-sync-worker");
  }
  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const errJson = await response.json();
      if (errJson?.error) {
        detail = errJson.error === "no router" ? "Token 鉴权失败" : errJson.error;
      }
    } catch {}
    throw new Error(`Worker 响应异常: ${detail}`);
  }

  // 3. 验证端到端加密密钥与数据格式
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("Worker 返回了非 JSON 格式数据，请检查 Worker 路由地址是否正确");
  }

  const rawIndex = data?.index;
  // 若云端有加密数据，测试能否成功解密
  if (rawIndex && typeof rawIndex === "string" && rawIndex.trim()) {
    try {
      const decrypted = await decryptContent(rawIndex, secretKey);
      JSON.parse(decrypted);
    } catch (decryptErr) {
      throw new Error(`Worker 连接成功，但端到端加密密钥与云端数据不匹配 (${decryptErr.message || "解密失败"})`);
    }
  }

  const isNewCloud = !rawIndex;
  return {
    success: true,
    isNewCloud,
    message: isNewCloud
      ? "Worker 连接与令牌验证通过（云端尚无数据，准备就绪）"
      : "Worker 连接、令牌及端到端密钥全部验证通过！",
  };
};
