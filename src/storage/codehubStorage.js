import { openDB } from "idb";
import { toStableGistRawUrl } from "@/gist/rawUrl.js";

export const SAVES_INDEX_KEY = "codehub_saves_index";
export const GIST_LIST_KEY = "codehub_gist_list";
const SHOW_SAVES_KEY = "SHOW_SAVES_KEY";
const TOMBSTONE_RETENTION_MS = 60 * 24 * 60 * 60 * 1000;

const isSyncableStoreKey = (key) => key !== SAVES_INDEX_KEY && key !== SHOW_SAVES_KEY;

const pruneTombstones = (tombstones) => {
  const cutoff = Date.now() - TOMBSTONE_RETENTION_MS;
  return Object.fromEntries(
    Object.entries(tombstones || {}).filter(([, deletedAt]) => Number(deletedAt) >= cutoff),
  );
};

const compactGistFile = (file, filename) => {
  if (!file || typeof file !== "object") return { filename };
  return {
    filename: file.filename || filename,
    type: file.type,
    language: file.language,
    raw_url: file.raw_url,
    size: file.size,
    truncated: file.truncated,
  };
};

const compactGist = (gist) => {
  if (!gist || typeof gist !== "object") return gist;
  const files = Object.fromEntries(
    Object.entries(gist.files || {}).map(([filename, file]) => [filename, compactGistFile(file, filename)]),
  );
  const filesNames = Array.isArray(gist.filesNames) ? gist.filesNames : Object.keys(files);
  const updatedAt = Number(gist.updatedAt) || new Date(gist.updated_at || gist.updated).getTime();
  const createdAt = gist.created || gist.created_at;

  return {
    id: gist.id,
    html_url: gist.html_url || "",
    user: gist.user || gist.owner?.login || "",
    public: Boolean(gist.public),
    created: createdAt,
    updated: gist.updated || gist.updated_at,
    updatedAt: Number.isFinite(updatedAt) ? updatedAt : Date.now(),
    desc: gist.desc ?? gist.description ?? "",
    filesNames,
    primaryFilename: gist.primaryFilename || filesNames[0] || "",
    files,
  };
};

const dbPromise = openDB("codehub", 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains("store")) db.createObjectStore("store");
  },
});

export const codehubStorage = { 
  async getItem(key) {
    const value = await (await dbPromise).get("store", key);
    return key === GIST_LIST_KEY && Array.isArray(value) ? value.map(compactGist) : value;
  },
  async setItem(key, value) {
    if (key === SAVES_INDEX_KEY) {
      const db = await dbPromise;
      const tx = db.transaction("store", "readwrite");
      const store = tx.objectStore("store");
      const previousIndex = parseSavesIndex(await store.get(key));
      const nextIndex = parseSavesIndex(value);
      const gistListUpdatedAt = Number(value?.gistListUpdatedAt)
        || previousIndex.gistListUpdatedAt;
      const tombstones = pruneTombstones({ ...previousIndex.tombstones, ...nextIndex.tombstones });
      for (const item of nextIndex.items) delete tombstones[item.id];
      await store.put(
        { ...nextIndex, updatedAt: Date.now(), gistListUpdatedAt, tombstones },
        key,
      );
      await tx.done;
      return;
    }
    if (key !== GIST_LIST_KEY) return (await dbPromise).put("store", value, key);
    const db = await dbPromise;
    const tx = db.transaction("store", "readwrite");
    const store = tx.objectStore("store");
    const updatedAt = Date.now();
    await store.put(Array.isArray(value) ? value.map(compactGist) : value, key);
    const index = parseSavesIndex(await store.get(SAVES_INDEX_KEY));
    await store.put({ ...index, updatedAt, gistListUpdatedAt: updatedAt }, SAVES_INDEX_KEY);
    await tx.done;
  },
  async removeItem(key) {
    if (key !== GIST_LIST_KEY) return (await dbPromise).delete("store", key);
    const db = await dbPromise;
    const tx = db.transaction("store", "readwrite");
    const store = tx.objectStore("store");
    await store.delete(key);
    const index = parseSavesIndex(await store.get(SAVES_INDEX_KEY));
    const updatedAt = Date.now();
    await store.put({ ...index, updatedAt, gistListUpdatedAt: updatedAt }, SAVES_INDEX_KEY);
    await tx.done;
  },
  async getAllKeys() { 
    return (await dbPromise).getAllKeys("store");
  },
  async getAllEntries() {  
    const db = await dbPromise;
    const tx = db.transaction("store", "readonly");
    const store = tx.objectStore("store");
    const [keys, values] = await Promise.all([store.getAllKeys(), store.getAll()]);
    await tx.done;
    return keys.map((key, index) => ({ key, value: values[index] }));
  },
  async replaceAllEntries(entries) {
    const db = await dbPromise;
    const tx = db.transaction("store", "readwrite");
    const store = tx.objectStore("store");
    await store.clear();
    const updatedAt = Date.now();
    for (const { key, value } of entries) {
      await store.put(Array.isArray(value) ? value.map(compactGist) : value, key);
    }
    await store.put({ version: 3, updatedAt, gistListUpdatedAt: updatedAt, items: [] }, SAVES_INDEX_KEY);
    await tx.done;
  },
};

export const contentKey = (id) => `codehub_save_content:${id}`;
export const metaKey = (id) => `codehub_save_meta:${id}`;

/**
 * 字符串 SHA-256 快速哈希（安全且确定性）
 */
const sha256Hex = async (str) => {
  if (typeof crypto !== "undefined" && crypto?.subtle?.digest) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuf = await crypto.subtle.digest("SHA-256", data);
    const hashArr = Array.from(new Uint8Array(hashBuf));
    return hashArr.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  // 降级哈希算法（以防极端无 subtle 环境）
  let h1 = 0xdeadbeef;
  let h2 = 0x41c64e6d;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
};

// 同步计算确定性短散列（用于不可逆生成安全的本地存储 ID）
export const computeGistHash = (gistId, filename = "") => {
  const str = `${gistId}:${filename}`;
  let h1 = 0xdeadbeef ^ str.length;
  let h2 = 0x41c64e6d ^ str.length;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hashVal = 4294967296 * (2097151 & h2) + (h1 >>> 0);
  return hashVal.toString(16).padStart(12, "0").slice(0, 12);
};

/**
 * 获取或生成 Gist 对应安全不泄露的本地 Item ID
 * 格式形如：g_7a9f2b1c8e3d
 */
export const getGistItemId = (gistId, filename) => {
  if (!gistId) return `g_${Date.now().toString(36)}`;
  return `g_${computeGistHash(gistId, filename)}`;
};

/**
 * 标准化解析保存索引：兼容纯 ID 数组和精简对象结构。
 */
export const parseSavesIndex = (indexData) => {
  if (!indexData) {
    return { version: 3, updatedAt: Date.now(), gistListUpdatedAt: 0, items: [] };
  }
  if (Array.isArray(indexData)) {
    // 兼容历史纯 ID 数组或对象数组
    return {
      version: 3,
      updatedAt: Date.now(),
      gistListUpdatedAt: 0,
      items: indexData
        .map((item) => {
          if (typeof item === "string") return { id: item, name: "" };
          return item?.id
            ? {
                id: item.id,
                name: item.name || "",
                updatedAt: item.updatedAt,
                ...(item.isGist ? { isGist: true } : {}),
                ...(item.cf_meta ? { cf_meta: true } : {}),
                ...(item.cf_content ? { cf_content: true } : {}),
              }
            : null;
        })
        .filter(Boolean),
    };
  }
  if (typeof indexData === "object" && Array.isArray(indexData.items)) {
    return {
      version: 3,
      updatedAt: indexData.updatedAt || Date.now(),
      gistListUpdatedAt: Number(indexData.gistListUpdatedAt) || 0,
      tombstones: pruneTombstones(indexData.tombstones),
      items: indexData.items
        .filter((item) => item?.id)
        .map((item) => ({
          id: item.id,
          name: item.name || "",
          updatedAt: item.updatedAt,
          ...(item.isGist ? { isGist: true } : {}),
          ...(item.cf_meta ? { cf_meta: true } : {}),
          ...(item.cf_content ? { cf_content: true } : {}),
        })),
    };
  }
  return { version: 3, updatedAt: Date.now(), gistListUpdatedAt: 0, items: [] };
};

/**
 * 从保存索引中提取所有 ID 列表
 */
export const getIdsFromSavesIndex = (indexData) => {
  const parsed = parseSavesIndex(indexData);
  return parsed.items.map((it) => it.id);
};

export const markCodeHubItemsDeleted = async (ids) => {
  const targetIds = [...new Set(ids)].filter(Boolean);
  if (!targetIds.length) return;
  const db = await dbPromise;
  const tx = db.transaction("store", "readwrite");
  const store = tx.objectStore("store");
  const parsedIndex = parseSavesIndex(await store.get(SAVES_INDEX_KEY));
  const deletedAt = Date.now();
  const tombstones = { ...parsedIndex.tombstones };
  for (const id of targetIds) {
    await store.delete(contentKey(id));
    await store.delete(metaKey(id));
    tombstones[id] = deletedAt;
  }
  const removed = new Set(targetIds);
  await store.put(
    {
      ...parsedIndex,
      updatedAt: deletedAt,
      items: parsedIndex.items.filter((item) => !removed.has(item.id)),
      tombstones,
    },
    SAVES_INDEX_KEY,
  );
  await tx.done;
};

export const moveCodeHubItemId = async (oldId, newId) => {
  if (!oldId || !newId || oldId === newId) return;
  const db = await dbPromise;
  const tx = db.transaction("store", "readwrite");
  const store = tx.objectStore("store");
  const [savedIndex, oldContent, oldMeta] = await Promise.all([
    store.get(SAVES_INDEX_KEY),
    store.get(contentKey(oldId)),
    store.get(metaKey(oldId)),
  ]);

  if (typeof oldContent === "string") await store.put(oldContent, contentKey(newId));
  if (oldMeta) await store.put(oldMeta, metaKey(newId));
  await store.delete(contentKey(oldId));
  await store.delete(metaKey(oldId));

  const parsedIndex = parseSavesIndex(savedIndex);
  const updatedItems = parsedIndex.items.map((item) => (item.id === oldId ? { ...item, id: newId } : item));
  await store.put({ ...parsedIndex, updatedAt: Date.now(), items: updatedItems }, SAVES_INDEX_KEY);
  await tx.done;
};

export const updateGistDescriptionInCodeHub = async (gistId, description) => {
  const db = await dbPromise;
  const tx = db.transaction("store", "readwrite");
  const store = tx.objectStore("store");
  const savedIds = await store.get(SAVES_INDEX_KEY);
  const ids = parseSavesIndex(savedIds).items.map((item) => item.id);
  const gistHash = computeGistHash(gistId);

  for (const id of ids) {
    const meta = await store.get(metaKey(id));
    if (meta?.gist?.gistHash !== gistHash && meta?.gist?.id !== gistId) continue;
    await store.put(
      { ...meta, gist: { ...meta.gist, description, folderName: description || meta.gist.folderName } },
      metaKey(id),
    );
  }
  await tx.done;

  const cachedGists = await codehubStorage.getItem(GIST_LIST_KEY);
  if (!Array.isArray(cachedGists)) return;
  await codehubStorage.setItem(
    GIST_LIST_KEY,
    cachedGists.map((gist) => (gist?.id === gistId ? { ...gist, desc: description, description } : gist)),
  );
};

const formatGistTime = (value) => {
  const timestamp = new Date(value || Date.now()).getTime();
  const date = new Date(Number.isFinite(timestamp) ? timestamp : Date.now());
  const year = String(date.getFullYear()).slice(2);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}/${month}/${day} ${hours}:${minutes}`;
};

const toCachedGist = (gist) => {
  const files = { ...(gist.files || {}) };
  const filesNames = Object.keys(files);
  const updatedAt = getGistUpdatedAt(gist);
  return {
    ...gist,
    files,
    filesNames,
    primaryFilename: gist.primaryFilename || filesNames[0] || "",
    desc: gist.description ?? gist.desc ?? "",
    description: gist.description ?? gist.desc ?? "",
    created: gist.created || formatGistTime(gist.created_at),
    updated: gist.updated || formatGistTime(gist.updated_at || updatedAt),
    updatedAt,
    user: gist.user || gist.owner?.login || "",
  };
};

export const prependGistFileToCache = async (gist, filename, file) => {
  const cachedGists = await codehubStorage.getItem(GIST_LIST_KEY);
  const gists = Array.isArray(cachedGists) ? cachedGists : [];
  const remoteFiles = gist.files && typeof gist.files === "object" ? gist.files : null;
  let found = false;
  const nextGists = gists.map((cachedGist) => {
    if (cachedGist?.id !== gist.id) return cachedGist;
    found = true;
    const files = { ...(cachedGist.files || {}), ...(remoteFiles || {}), [filename]: file };
    const remoteFileNames = Object.keys(remoteFiles || files);
    const existingFileNames = cachedGist.filesNames || Object.keys(cachedGist.files || {});
    const filesNames = [...existingFileNames.filter((name) => remoteFileNames.includes(name)), ...remoteFileNames.filter((name) => !existingFileNames.includes(name))];
    return {
      ...toCachedGist({ ...cachedGist, ...gist, files, primaryFilename: cachedGist.primaryFilename || filename }),
      filesNames,
    };
  });
  if (!found) {
    const files = { ...(gist.files || {}), [filename]: file };
    nextGists.unshift(toCachedGist({ ...gist, files, primaryFilename: filename }));
  }
  await codehubStorage.setItem(GIST_LIST_KEY, nextGists);
};

export const renameGistFileInCodeHub = async (gistId, oldName, newName) => {
  if (!oldName || oldName === newName) return;
  const oldId = getGistItemId(gistId, oldName);
  const newId = getGistItemId(gistId, newName);
  const db = await dbPromise;
  const tx = db.transaction("store", "readwrite");
  const store = tx.objectStore("store");
  const [savedIndex, oldContent, oldMeta, newContent, newMeta] = await Promise.all([
    store.get(SAVES_INDEX_KEY),
    store.get(contentKey(oldId)),
    store.get(metaKey(oldId)),
    store.get(contentKey(newId)),
    store.get(metaKey(newId)),
  ]);
  const parsedIndex = parseSavesIndex(savedIndex);

  if (oldMeta && !newMeta) {
    await store.put(
      { ...oldMeta, name: newName, gist: { ...oldMeta.gist, filename: newName } },
      metaKey(newId),
    );
  }
  if (typeof oldContent === "string" && typeof newContent !== "string") {
    await store.put(oldContent, contentKey(newId));
  }
  await store.delete(contentKey(oldId));
  await store.delete(metaKey(oldId));

  const updatedItems = parsedIndex.items.map((item) =>
    item.id === oldId ? { ...item, id: newId, name: newName } : item,
  );
  const tombstones = { ...parsedIndex.tombstones, [oldId]: Date.now() };
  delete tombstones[newId];
  await store.put(
    { ...parsedIndex, updatedAt: Date.now(), items: updatedItems, tombstones },
    SAVES_INDEX_KEY,
  );
  await tx.done;

  const cachedGists = await codehubStorage.getItem(GIST_LIST_KEY);
  if (!Array.isArray(cachedGists)) return;
  const nextGists = cachedGists.map((gist) => {
    if (gist?.id !== gistId) return gist;
    const files = { ...(gist.files || {}) };
    if (files[oldName]) {
      files[newName] ||= { ...files[oldName], filename: newName };
      delete files[oldName];
    }
    return {
      ...gist,
      files,
      filesNames: (gist.filesNames || Object.keys(files)).map((name) => (name === oldName ? newName : name)),
      primaryFilename: gist.primaryFilename === oldName ? newName : gist.primaryFilename,
    };
  });
  await codehubStorage.setItem(GIST_LIST_KEY, nextGists);
};

export const removeGistFilesFromCodeHub = async (gistId, fileNames) => {
  const db = await dbPromise;
  const tx = db.transaction("store", "readwrite");
  const store = tx.objectStore("store");
  const savedIndex = await store.get(SAVES_INDEX_KEY);
  const parsedIndex = parseSavesIndex(savedIndex);
  const names = fileNames ? new Set(fileNames) : null;
  const targetGistHash = computeGistHash(gistId);
  const removedIds = [];

  for (const item of parsedIndex.items) {
    const meta = await store.get(metaKey(item.id));
    const isTargetGist = meta?.gist?.gistHash === targetGistHash || meta?.gist?.id === gistId;
    if (!isTargetGist || (names && !names.has(meta.gist.filename))) continue;
    await store.delete(contentKey(item.id));
    await store.delete(metaKey(item.id));
    removedIds.push(item.id);
  }

  if (removedIds.length) {
    const removed = new Set(removedIds);
    const deletedAt = Date.now();
    const tombstones = { ...parsedIndex.tombstones };
    for (const id of removedIds) tombstones[id] = deletedAt;
    await store.put(
      {
        ...parsedIndex,
        updatedAt: deletedAt,
        items: parsedIndex.items.filter((it) => !removed.has(it.id)),
        tombstones,
      },
      SAVES_INDEX_KEY,
    );
  }
  await tx.done;
  return removedIds;
};

export const removeGistFilesFromCache = async (gistId, fileNames) => {
  const cachedGists = await codehubStorage.getItem(GIST_LIST_KEY);
  if (!Array.isArray(cachedGists)) return;
  const names = fileNames ? new Set(fileNames) : null;
  const nextGists = [];

  for (const gist of cachedGists) {
    if (gist?.id !== gistId) {
      nextGists.push(gist);
      continue;
    }
    if (!names) continue;
    const files = { ...(gist.files || {}) };
    for (const name of names) delete files[name];
    const filesNames = (gist.filesNames || Object.keys(files)).filter((name) => !names.has(name));
    if (filesNames.length) {
      nextGists.push({ ...gist, files, filesNames, primaryFilename: filesNames.includes(gist.primaryFilename) ? gist.primaryFilename : filesNames[0] });
    }
  }
  await codehubStorage.setItem(GIST_LIST_KEY, nextGists);
};

export const getGistUpdatedAt = (gist) => {
  const value = gist?.updatedAt || gist?.updated_at || gist?.updated;
  const timestamp = typeof value === "number" ? value : new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : Date.now();
};

export const syncGistFilesToCodeHub = async (gists, { replace = false } = {}) => {
  if (!Array.isArray(gists)) return;
  const db = await dbPromise;
  const tx = db.transaction("store", "readwrite");
  const store = tx.objectStore("store");
  const savedIndex = await store.get(SAVES_INDEX_KEY);
  const parsedIndex = parseSavesIndex(savedIndex);

  // 现有条目 map: id -> item
  const existingMap = new Map();
  for (const it of parsedIndex.items) {
    existingMap.set(it.id, it);
  }

  // 整理远端 Gist ID 及其 Hash
  const remoteGistHashes = new Set(
    gists.map((g) => (g?.id ? computeGistHash(g.id) : null)).filter(Boolean),
  );
  const remoteGistIds = new Set(gists.map((g) => g?.id).filter(Boolean));

  if (replace) {
    for (const [existingId] of [...existingMap.entries()]) {
      const existing = await store.get(metaKey(existingId));
      if (existing?.gist) {
        const isRetained =
          (existing.gist.gistHash && remoteGistHashes.has(existing.gist.gistHash)) ||
          (existing.gist.id && remoteGistIds.has(existing.gist.id));
        if (!isRetained) {
          await store.delete(contentKey(existingId));
          await store.delete(metaKey(existingId));
          existingMap.delete(existingId);
        }
      }
    }
  }

  for (const gist of gists) {
    if (!gist?.id) continue;
    const gistHash = computeGistHash(gist.id);
    const updatedAt = getGistUpdatedAt(gist);
    const description = gist.description || gist.desc || "";
    const files = gist.files || {};
    const fileNames = Object.keys(files);

    // Gist 接口返回完整文件清单：删除远端已改名或已移除的旧本地条目。
    const remoteFileNames = new Set(fileNames);
    for (const [existingId] of [...existingMap.entries()]) {
      const existing = await store.get(metaKey(existingId));
      const matchGist =
        existing?.gist &&
        (existing.gist.gistHash === gistHash || existing.gist.id === gist.id);
      if (matchGist && !remoteFileNames.has(existing.gist.filename)) {
        await store.delete(contentKey(existingId));
        await store.delete(metaKey(existingId));
        existingMap.delete(existingId);
      }
    }

    for (const filename of fileNames) {
      const file = files[filename];
      if (!file?.raw_url) continue;
      const id = getGistItemId(gist.id, filename);
      // 清除可能存在的旧版明文 Gist ID 存储
      const oldLegacyId = `gist:${gist.id}:${encodeURIComponent(filename)}`;
      if (oldLegacyId !== id) {
        const legacyContent = await store.get(contentKey(oldLegacyId));
        const legacyMeta = await store.get(metaKey(oldLegacyId));
        if (legacyContent !== undefined) {
          await store.put(legacyContent, contentKey(id));
          await store.delete(contentKey(oldLegacyId));
        }
        if (legacyMeta) {
          await store.delete(metaKey(oldLegacyId));
        }
        existingMap.delete(oldLegacyId);
      }

      const [existing, content] = await Promise.all([
        store.get(metaKey(id)),
        store.get(contentKey(id)),
      ]);
      const downloaded = typeof content === "string";
      const length = downloaded
        ? content.length
        : file.size || existing?.length || 0;
      const preview = downloaded
        ? existing?.preview || content.slice(0, 123).replace(/\s+/g, " ").slice(0, 100)
        : existing?.preview || "Gist 远程文件，点击下载后缓存内容";
      const folderName = description || fileNames[0] || filename;

      // 存储安全的元数据：绝对不包含真实 gist.id，改用确定性安全单向散列 gistHash
      const metaToStore = {
        name: filename,
        length,
        preview,
        updatedAt,
        language: existing?.language || "",
        manualLanguage: existing?.manualLanguage || "",
        url: "",
        blobUrl: "",
        userAgent: "",
        tags: [
          ...new Set([
            ...(Array.isArray(existing?.tags) ? existing.tags : []).filter(
              (tag) => tag !== "CH" && tag !== "Url",
            ),
            "Gist",
          ]),
        ],
        gist: {
          gistHash, // 安全哈希标识，用于索引与查找对应 Gist，不暴露真实 ID
          folderName,
          filename,
          rawUrl: toStableGistRawUrl(file.raw_url),
          htmlUrl: gist.html_url || "",
          description,
          user: gist.user || gist.owner?.login || "",
          updatedAt,
          downloaded,
        },
      };

      await store.put(metaToStore, metaKey(id));

      // 建立/更新 codehub_saves_index 精简索引条目（只保留核心元属性，避免与 meta 重复）
      existingMap.set(id, {
        id,
        name: filename,
        updatedAt,
        isGist: true,
      });
    }
  }

  // 保持索引更新写入数据库
  const indexUpdatedAt = Date.now();
  const gistListUpdatedAt = await store.get(GIST_LIST_KEY)
    ? indexUpdatedAt
    : parsedIndex.gistListUpdatedAt;
  await store.put(
    {
      version: 3,
      updatedAt: indexUpdatedAt,
      gistListUpdatedAt,
      items: Array.from(existingMap.values()),
    },
    SAVES_INDEX_KEY,
  );
  await tx.done;
};
