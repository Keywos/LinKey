import {
  codehubStorage,
  contentKey,
  getIdsFromSavesIndex,
  metaKey,
  parseSavesIndex,
  SAVES_INDEX_KEY,
  GIST_LIST_KEY,
  markCodeHubItemsDeleted,
} from "@/storage/codehubStorage.js";
import { CryptoJS } from "@/st/cpto.js";

export const CODEHUB_SYNC_URL_KEY = "CodeHubSyncUrl";
export const CODEHUB_SYNC_TOKEN_KEY = "CodeHubSyncToken";
export const CODEHUB_SYNC_SECRET_KEY = "CodeHubSyncKey";
export const CODEHUB_SYNC_KEY_KEY = CODEHUB_SYNC_SECRET_KEY;
export const MAX_SYNC_FILE_SIZE = 50 * 1024 * 1024; // 单个文件最大 50MB
const SHOW_SAVES_KEY = "SHOW_SAVES_KEY";

const isSyncableStoreKey = (key) => key !== SAVES_INDEX_KEY && key !== SHOW_SAVES_KEY;

const getLogicalFileId = (key) => {
  if (key === GIST_LIST_KEY) return GIST_LIST_KEY;
  if (key.startsWith("codehub_save_meta:")) return key.slice("codehub_save_meta:".length);
  if (key.startsWith("codehub_save_content:")) return key.slice("codehub_save_content:".length);
  return key;
};

export const getCodeHubSyncConfig = () => {
  const url = (localStorage.getItem(CODEHUB_SYNC_URL_KEY) || "").trim().replace(/\/$/, "");
  const token = (localStorage.getItem(CODEHUB_SYNC_TOKEN_KEY) || "").trim();
  const secretKey = (localStorage.getItem(CODEHUB_SYNC_SECRET_KEY) || "").trim();
  return {
    url,
    token,
    // 解密密钥独立：若用户未单独填写，默认回退使用 token，平滑向下兼容
    secretKey: secretKey || token,
  };
};

const apiFetch = async (path, options = {}) => {
  const { url, token } = getCodeHubSyncConfig();
  if (!url || !token) throw new Error("请先在设置中填写 CF 同步地址和密钥");

  const headers = {
    Authorization: `Bearer ${token}`,
    ...(options.headers || {}),
  };

  const response = await fetch(`${url}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let msg = `请求失败 (${response.status})`;
    try {
      const err = await response.json();
      if (err?.error) msg = err.error;
    } catch {}
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

// 获取并解密云端索引（仅解析加密密文，不再兼容明文）
export const fetchAndDecryptRemoteIndex = async (secretKey) => {
  try {
    const res = await apiFetch("/index");
    const data = await res.json();
    const rawIndex = data?.index;
    if (!rawIndex || typeof rawIndex !== "string") return null;

    const decrypted = await decryptContent(rawIndex, secretKey);
    return JSON.parse(decrypted);
  } catch (err) {
    console.warn("获取或解密云端索引失败:", err);
  }
  return null;
};

// 上传：检查时间戳，只有本地比云端更新或云端缺失的文件才上传
export const uploadCodeHubSnapshot = async () => {
  const { secretKey } = getCodeHubSyncConfig();
  const remoteIndex = await fetchAndDecryptRemoteIndex(secretKey);
  const localEntries = await codehubStorage.getAllEntries();
  const localIndex = parseSavesIndex(await codehubStorage.getItem(SAVES_INDEX_KEY));
  const remoteIndexData = parseSavesIndex(remoteIndex);
  const remoteItems = new Map(remoteIndexData.items.map((item) => [item.id, item]));
  const localValues = new Map(localEntries.map(({ key, value }) => [key, value]));
  const localIds = new Set(localIndex.items.map((item) => item.id));
  const remoteKeys = new Set(Array.isArray(remoteIndex?.entries) ? remoteIndex.entries : []);
  const localTombstones = localIndex.tombstones || {};
  const remoteTombstones = remoteIndexData.tombstones || {};
  const allTombstones = { ...localTombstones };
  for (const [id, deletedAt] of Object.entries(remoteTombstones)) {
    if (Number(deletedAt) > Number(allTombstones[id] || 0)) allTombstones[id] = deletedAt;
  }
  const remoteDeletedIds = localIndex.items
    .filter((item) => Number(allTombstones[item.id] || 0) >= Number(item.updatedAt || 0))
    .map((item) => item.id);
  const fileIdsToUpload = localIndex.items
    .filter((item) => !remoteDeletedIds.includes(item.id))
    .filter(
      (item) =>
        !remoteItems.has(item.id) ||
        Number(item.updatedAt) > Number(remoteItems.get(item.id)?.updatedAt || 0),
    )
    .map((item) => item.id);
  const entriesToUpload = fileIdsToUpload.flatMap((id) => [
    { key: metaKey(id), value: localValues.get(metaKey(id)) },
    { key: contentKey(id), value: localValues.get(contentKey(id)) },
  ]).filter(({ value }) => value !== undefined);
  const localGistListTime = Number(localIndex.gistListUpdatedAt) || 0;
  const remoteGistListTime = Number(remoteIndexData.gistListUpdatedAt) || 0;
  if (!remoteKeys.has(GIST_LIST_KEY) || localGistListTime > remoteGistListTime) {
    const gistList = localValues.get(GIST_LIST_KEY);
    if (gistList !== undefined) entriesToUpload.push({ key: GIST_LIST_KEY, value: gistList });
  }
  const remoteKeysToDelete = [...remoteKeys].filter(
    (key) => {
      if (key === GIST_LIST_KEY) return !localValues.has(key);
      const id = key.startsWith("codehub_save_meta:")
        ? key.slice("codehub_save_meta:".length)
        : key.startsWith("codehub_save_content:")
          ? key.slice("codehub_save_content:".length)
          : null;
      return id
        ? !localIds.has(id) || remoteDeletedIds.includes(id)
        : !localValues.has(key);
    },
  );
  const mergedTombstones = { ...allTombstones };
  for (const item of localIndex.items) {
    if (Number(item.updatedAt || 0) > Number(mergedTombstones[item.id] || 0)) {
      delete mergedTombstones[item.id];
    }
  }
  const successfulKeys = new Set();
  const failedUploadErrors = [];
  const failedDeleteErrors = [];

  await runWithConcurrency(entriesToUpload, 4, async ({ key, value }) => {
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
    } catch (error) {
      failedUploadErrors.push({ key, error });
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

  if (remoteDeletedIds.length) await markCodeHubItemsDeleted(remoteDeletedIds);

  const uploadedLogicalIds = new Set([...successfulKeys].map(getLogicalFileId));
  const failedLogicalIds = new Set(failedUploadErrors.map(({ key }) => getLogicalFileId(key)));
  const deletedLogicalIds = new Set([...successfullyDeletedIds].map(getLogicalFileId));
  const completedLogicalIds = new Set(
    [...uploadedLogicalIds].filter((id) => !failedLogicalIds.has(id)),
  );

  const currentRawIndex = await codehubStorage.getItem(SAVES_INDEX_KEY);
  const parsedIndex = parseSavesIndex(currentRawIndex);
  const updatedItems = parsedIndex.items.map((item) => {
    const metaKeyName = metaKey(item.id);
    const contentKeyName = contentKey(item.id);
    const copy = { ...item };
    if (successfulKeys.has(metaKeyName)) copy.cf_meta = true;
    else delete copy.cf_meta;
    if (successfulKeys.has(contentKeyName)) copy.cf_content = true;
    else delete copy.cf_content;
    return copy;
  });
  const syncedIndex = {
    ...parsedIndex,
    updatedAt: Date.now(),
    items: updatedItems,
    tombstones: mergedTombstones,
  };
  await codehubStorage.setItem(SAVES_INDEX_KEY, syncedIndex);

  const latestEntries = await codehubStorage.getAllEntries();

  const indexEntries = [
    ...new Set([
      ...remoteKeysToDelete.filter((key) => !successfullyDeletedIds.has(key)),
      ...[...remoteKeys].filter((key) => latestEntries.some((entry) => entry.key === key)),
      ...latestEntries
        .filter(({ key }) => isSyncableStoreKey(key) && successfulKeys.has(key))
        .map(({ key }) => key),
    ]),
  ];
  const newIndex = {
    version: 4,
    updatedAt: Date.now(),
    entries: indexEntries,
    items: updatedItems,
    tombstones: mergedTombstones,
    gistListUpdatedAt: successfulKeys.has(GIST_LIST_KEY)
      ? localGistListTime
      : remoteGistListTime,
    ids: updatedItems.map((item) => item.id),
    files: Object.fromEntries(
      latestEntries
        .filter(({ key }) => key.startsWith("codehub_save_meta:") && successfulKeys.has(key))
        .map(({ key, value }) => [key.slice("codehub_save_meta:".length), value]),
    ),
    gistList: latestEntries.find(({ key }) => key === GIST_LIST_KEY)?.value || [],
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

  return {
    uploaded: completedLogicalIds.size,
    failed: failedLogicalIds.size,
    deleted: deletedLogicalIds.size,
    failedDeleted: new Set(failedDeleteErrors.map(({ key }) => getLogicalFileId(key))).size,
    total: localEntries.length,
    changed:
      entriesToUpload.length > 0 ||
      successfullyDeletedIds.size > 0 ||
      failedUploadErrors.length > 0 ||
      failedDeleteErrors.length > 0,
  };
};

// 恢复：拉取 index，仅下载本地没有或云端时间戳更新的 content
export const restoreCodeHubSnapshot = async () => {
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
  const remoteTombstones = remoteIndexData.tombstones || {};
  const remoteDeletedIds = new Set(
    [...Object.entries(remoteTombstones)]
      .filter(([id, deletedAt]) => Number(deletedAt) >= Number(localItems.get(id)?.updatedAt || 0))
      .map(([id]) => id),
  );
  const entriesToDownload = remoteEntries.filter((key) => {
    if (key === GIST_LIST_KEY) {
      return !localKeys.has(key) || Number(remoteIndexData.gistListUpdatedAt) > Number(localIndex.gistListUpdatedAt);
    }
    const id = key.startsWith("codehub_save_meta:")
      ? key.slice("codehub_save_meta:".length)
      : key.startsWith("codehub_save_content:")
        ? key.slice("codehub_save_content:".length)
        : null;
    return id && !remoteDeletedIds.has(id)
      && (!localItems.has(id) || Number(remoteItems.get(id)?.updatedAt) > Number(localItems.get(id)?.updatedAt));
  });
  await runWithConcurrency(entriesToDownload, 4, async (key) => {
    const fileRes = await apiFetch(`/files/${encodeURIComponent(key)}`);
    const encryptedContent = await fileRes.text();
    const serialized = await decryptContent(encryptedContent, secretKey);
    await codehubStorage.setItem(key, JSON.parse(serialized));
    localKeys.delete(key);
  });

  if (remoteDeletedIds.size) await markCodeHubItemsDeleted([...remoteDeletedIds]);

  // 只删除云端索引中已不存在的本地键；未下载的同名键仍是有效数据。
  const remoteEntrySet = new Set(remoteEntries);
  await runWithConcurrency(
    [...localKeys].filter((key) => isSyncableStoreKey(key) && !remoteEntrySet.has(key)),
    4,
    async (key) => {
    await codehubStorage.removeItem(key);
    },
  );

  const restoredIndex = await codehubStorage.getItem(SAVES_INDEX_KEY);
  const parsedIndex = parseSavesIndex(restoredIndex);
  const restoredItems = remoteIndexData.items.map((item) => ({
    ...item,
    cf_meta: true,
    cf_content: true,
  }));
  await codehubStorage.setItem(SAVES_INDEX_KEY, {
    ...parsedIndex,
    items: restoredItems,
    gistListUpdatedAt: remoteIndexData.gistListUpdatedAt,
    updatedAt: Date.now(),
  });

  return {
    downloaded: new Set(entriesToDownload.map(getLogicalFileId)).size,
    total: new Set(remoteEntries.map(getLogicalFileId)).size,
  };
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
export const checkCodeHubSyncDiff = async () => {
  const { url, token, secretKey } = getCodeHubSyncConfig();
  if (!url || !token) return null;

  const [localIndex, remoteIndex] = await Promise.all([
    getLocalIndex(),
    fetchAndDecryptRemoteIndex(secretKey),
  ]);

  if (!remoteIndex || !Array.isArray(remoteIndex.entries)) {
    return null;
  }

  const localIndexData = parseSavesIndex(await codehubStorage.getItem(SAVES_INDEX_KEY));
  const remoteIndexData = parseSavesIndex(remoteIndex);
  const localKeys = new Set(localIndexData.items.map((item) => item.id));
  const remoteItems = new Map(remoteIndexData.items.map((item) => [item.id, item]));
  const remoteKeys = new Set(remoteIndexData.items.map((item) => item.id));
  const toDownload = [...remoteKeys].filter(
    (id) => !localKeys.has(id) || Number(remoteItems.get(id)?.updatedAt) > Number(localIndexData.items.find((item) => item.id === id)?.updatedAt),
  ).length;
  const toUpload = [...localKeys].filter(
    (id) => !remoteKeys.has(id) || Number(localIndexData.items.find((item) => item.id === id)?.updatedAt) > Number(remoteItems.get(id)?.updatedAt),
  ).length;
  const gistListChanged = Number(localIndexData.gistListUpdatedAt) !== Number(remoteIndexData.gistListUpdatedAt);
  const changedKeyCount = gistListChanged ? 1 : 0;

  const hasChanges = toDownload > 0 || toUpload > 0 || changedKeyCount > 0;

  return {
    hasChanges,
    toDownload,
    toUpload,
    remoteNewCount: toDownload,
    localNewCount: toUpload,
    remoteCount: remoteKeys.size,
    localCount: localKeys.length,
  };
};
