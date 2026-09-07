import {
  codehubStorage,
  contentKey,
  metaKey,
  SAVES_INDEX_KEY,
} from "@/storage/codehubStorage.js";
import { CryptoJS } from "@/st/cpto.js";

export const CODEHUB_SYNC_URL_KEY = "CodeHubSyncUrl";
export const CODEHUB_SYNC_TOKEN_KEY = "CodeHubSyncToken";
export const CODEHUB_SYNC_SECRET_KEY = "CodeHubSyncKey";
export const CODEHUB_SYNC_KEY_KEY = CODEHUB_SYNC_SECRET_KEY;
export const MAX_SYNC_FILE_SIZE = 50 * 1024 * 1024; // 单个文件最大 50MB

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

// 获取本地仅包含元数据的轻量索引
export const getLocalIndex = async () => {
  const ids = await codehubStorage.getItem(SAVES_INDEX_KEY);
  const idList = Array.isArray(ids) ? ids : [];
  const files = {};
  for (const id of idList) {
    const meta = await codehubStorage.getItem(metaKey(id));
    if (meta) files[id] = meta;
  }
  return { version: 2, updatedAt: Date.now(), ids: idList, files };
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
  const { token, secretKey } = getCodeHubSyncConfig();
  const localIndex = await getLocalIndex();
  const remoteIndex = await fetchAndDecryptRemoteIndex(secretKey);

  const remoteFiles = remoteIndex?.files || {};
  const remoteIds = Array.isArray(remoteIndex?.ids) ? remoteIndex.ids : [];
  const filesToUpload = [];

  for (const id of localIndex.ids) {
    const localMeta = localIndex.files[id];
    if (!localMeta) continue;

    const remoteMeta = remoteFiles[id];
    const isNew = !remoteMeta;
    const localTime = getMetaTimestamp(localMeta);
    const remoteTime = getMetaTimestamp(remoteMeta);
    // 严格检查时间戳：仅当云端没有，或者本地时间戳严格大于云端时间戳时才上传
    const isLocalNewer = localTime > remoteTime;

    if (isNew || isLocalNewer) {
      filesToUpload.push(id);
    }
  }

  // 找出本地已经删除但云端依然存在的文件（需从云端同步删除）
  const filesToDelete = remoteIds.filter((id) => !localIndex.ids.includes(id));
  const hasNewIds = localIndex.ids.some((id) => !remoteIds.includes(id));
  const hasDeletedIds = filesToDelete.length > 0;

  // 如果没有任何文件需要上传，没有新文件，也没有需要删除的文件，直接返回，不发起任何写请求
  if (filesToUpload.length === 0 && !hasNewIds && !hasDeletedIds) {
    return {
      uploaded: 0,
      deleted: 0,
      total: localIndex.ids.length,
      changed: false,
    };
  }

  // 并发从云端彻底删除本地已删除的文件（每次最多 4 个并发）
  if (filesToDelete.length > 0) {
    await runWithConcurrency(filesToDelete, 4, async (id) => {
      try {
        await apiFetch(`/files/${encodeURIComponent(id)}`, {
          method: "DELETE",
        });
      } catch (err) {
        console.warn(`删除云端文件 ${id} 失败:`, err);
      }
    });
  }

  // 并发加密并上传仅变更或新增的文件的 content（每次最多 4 个并发）
  if (filesToUpload.length > 0) {
    await runWithConcurrency(filesToUpload, 4, async (id) => {
      const content = await codehubStorage.getItem(contentKey(id));
      const textToUpload = typeof content === "string" ? content : "";

      // 本地校验：单个文件不得超过 50MB
      const byteSize = new Blob([textToUpload]).size;
      if (byteSize > MAX_SYNC_FILE_SIZE) {
        const fileTitle = localIndex.files[id]?.title || id;
        throw new Error(
          `文件 "${fileTitle}" 超过 50MB 大小限制 (当前 ${(byteSize / (1024 * 1024)).toFixed(1)}MB)，已取消上传`
        );
      }

      // 本地端到端 AES 加密，云端仅存储密文
      const encryptedBody = await encryptContent(textToUpload, secretKey);
      await apiFetch(`/files/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "text/plain; charset=utf-8" },
        body: encryptedBody,
      });
    });
  }

  // 合并元数据：同步删除已失效文件的元数据，保留本地最新的文件列表
  const mergedFiles = {};
  for (const id of localIndex.ids) {
    const localMeta = localIndex.files[id];
    const remoteMeta = remoteFiles[id];
    const localTime = getMetaTimestamp(localMeta);
    const remoteTime = getMetaTimestamp(remoteMeta);

    if (!remoteMeta || localTime >= remoteTime) {
      if (localMeta) mergedFiles[id] = localMeta;
    } else {
      mergedFiles[id] = remoteMeta;
    }
  }

  const newIndex = {
    version: 2,
    updatedAt: Date.now(),
    ids: localIndex.ids,
    files: mergedFiles,
  };

  const indexJsonStr = JSON.stringify(newIndex);
  if (new Blob([indexJsonStr]).size > MAX_SYNC_FILE_SIZE) {
    throw new Error("云端索引超出 50MB 大小限制");
  }

  // 索引同样在本地端到端 AES 加密后再上传云端
  const encryptedIndex = await encryptContent(indexJsonStr, secretKey);
  await apiFetch("/index", {
    method: "PUT",
    headers: { "Content-Type": "text/plain; charset=utf-8" },
    body: encryptedIndex,
  });

  return {
    uploaded: filesToUpload.length,
    deleted: filesToDelete.length,
    total: localIndex.ids.length,
    changed: true,
  };
};

// 恢复：拉取 index，仅下载本地没有或云端时间戳更新的 content
export const restoreCodeHubSnapshot = async () => {
  const { token, secretKey } = getCodeHubSyncConfig();
  const remoteIndex = await fetchAndDecryptRemoteIndex(secretKey);

  if (!remoteIndex || !Array.isArray(remoteIndex.ids) || !remoteIndex.files) {
    throw new Error("云端暂无可用的文件索引，或密钥错误无法解密");
  }

  const localIndex = await getLocalIndex();
  const localFiles = localIndex.files;
  const filesToDownload = [];

  for (const id of remoteIndex.ids) {
    const remoteMeta = remoteIndex.files[id];
    if (!remoteMeta) continue;

    const localMeta = localFiles[id];
    const isMissing = !localMeta;
    const localTime = getMetaTimestamp(localMeta);
    const remoteTime = getMetaTimestamp(remoteMeta);
    // 仅当本地缺失，或云端时间戳严格大于本地时间戳时才需要下载
    const isRemoteNewer = remoteTime > localTime;

    if (isMissing || isRemoteNewer) {
      filesToDownload.push({ id, meta: remoteMeta });
    }
  }

  // 并发拉取内容并使用 Token 本地解密（每次最多 4 个并发）
  if (filesToDownload.length > 0) {
    await runWithConcurrency(filesToDownload, 4, async ({ id, meta }) => {
      const fileRes = await apiFetch(`/files/${encodeURIComponent(id)}`);
      const encryptedContent = await fileRes.text();
      // 本地使用独立密钥解密密文
      const decryptedContent = await decryptContent(encryptedContent, secretKey);
      await codehubStorage.setItem(contentKey(id), decryptedContent);
      await codehubStorage.setItem(metaKey(id), meta);
    });
  }

  // 合并本地保存索引列表
  const mergedIds = [...new Set([...localIndex.ids, ...remoteIndex.ids])];
  await codehubStorage.setItem(SAVES_INDEX_KEY, mergedIds);

  return {
    downloaded: filesToDownload.length,
    total: remoteIndex.ids.length,
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

  if (!remoteIndex || !Array.isArray(remoteIndex.ids)) {
    return null;
  }

  const localFileMap = localIndex.files || {};
  const remoteFileMap = remoteIndex.files || {};

  // 1. 检查云端相对于本地的新增或更新（本地需要下载）
  let toDownload = 0;
  for (const id of remoteIndex.ids) {
    const remoteMeta = remoteFileMap[id];
    const localMeta = localFileMap[id];
    if (!localMeta) {
      toDownload++;
    } else if (remoteMeta?.updatedAt && localMeta?.updatedAt) {
      if (remoteMeta.updatedAt > localMeta.updatedAt) {
        toDownload++;
      }
    }
  }

  // 2. 检查本地相对于云端的新增或更新（本地需要上传）
  let toUpload = 0;
  for (const id of localIndex.ids) {
    const localMeta = localFileMap[id];
    const remoteMeta = remoteFileMap[id];
    if (!remoteMeta) {
      toUpload++;
    } else if (localMeta?.updatedAt && remoteMeta?.updatedAt) {
      if (localMeta.updatedAt > remoteMeta.updatedAt) {
        toUpload++;
      }
    }
  }

  const hasChanges = toDownload > 0 || toUpload > 0;

  return {
    hasChanges,
    toDownload,
    toUpload,
    remoteNewCount: toDownload,
    localNewCount: toUpload,
    remoteCount: remoteIndex.ids.length,
    localCount: localIndex.ids.length,
  };
};
