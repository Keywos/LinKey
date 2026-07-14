import { openDB } from "idb";

export const SAVES_INDEX_KEY = "codehub_saves_index";
export const GIST_LIST_KEY = "codehub_gist_list";

const dbPromise = openDB("codehub", 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains("store")) db.createObjectStore("store");
  },
});

export const codehubStorage = {
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
    for (const { key, value } of entries) {
      await store.put(value, key);
    }
    await tx.done;
  },
};

export const contentKey = (id) => `codehub_save_content:${id}`;
export const metaKey = (id) => `codehub_save_meta:${id}`;

export const getGistItemId = (gistId, filename) => `gist:${gistId}:${encodeURIComponent(filename)}`;

export const moveCodeHubItemId = async (oldId, newId) => {
  if (!oldId || !newId || oldId === newId) return;
  const db = await dbPromise;
  const tx = db.transaction("store", "readwrite");
  const store = tx.objectStore("store");
  const [savedIds, oldContent] = await Promise.all([store.get(SAVES_INDEX_KEY), store.get(contentKey(oldId))]);
  const ids = Array.isArray(savedIds) ? savedIds : [];

  if (typeof oldContent === "string") await store.put(oldContent, contentKey(newId));
  await store.delete(contentKey(oldId));
  await store.delete(metaKey(oldId));
  await store.put([...new Set(ids.map((id) => (id === oldId ? newId : id)))], SAVES_INDEX_KEY);
  await tx.done;
};

export const updateGistDescriptionInCodeHub = async (gistId, description) => {
  const db = await dbPromise;
  const tx = db.transaction("store", "readwrite");
  const store = tx.objectStore("store");
  const savedIds = await store.get(SAVES_INDEX_KEY);
  const ids = Array.isArray(savedIds) ? savedIds : [];

  for (const id of ids) {
    const meta = await store.get(metaKey(id));
    if (meta?.gist?.id !== gistId) continue;
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
  const [savedIds, oldContent, oldMeta, newContent, newMeta] = await Promise.all([
    store.get(SAVES_INDEX_KEY),
    store.get(contentKey(oldId)),
    store.get(metaKey(oldId)),
    store.get(contentKey(newId)),
    store.get(metaKey(newId)),
  ]);
  const ids = Array.isArray(savedIds) ? savedIds : [];

  if (oldMeta && !newMeta) {
    await store.put({ ...oldMeta, name: newName, gist: { ...oldMeta.gist, filename: newName } }, metaKey(newId));
  }
  if (typeof oldContent === "string" && typeof newContent !== "string") {
    await store.put(oldContent, contentKey(newId));
  }
  await store.delete(contentKey(oldId));
  await store.delete(metaKey(oldId));
  await store.put([...new Set(ids.map((id) => (id === oldId ? newId : id)))], SAVES_INDEX_KEY);
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
  const savedIds = await store.get(SAVES_INDEX_KEY);
  const ids = Array.isArray(savedIds) ? savedIds : [];
  const names = fileNames ? new Set(fileNames) : null;
  const removedIds = [];

  for (const id of ids) {
    const meta = await store.get(metaKey(id));
    if (meta?.gist?.id !== gistId || (names && !names.has(meta.gist.filename))) continue;
    await store.delete(contentKey(id));
    await store.delete(metaKey(id));
    removedIds.push(id);
  }

  if (removedIds.length) {
    const removed = new Set(removedIds);
    await store.put(ids.filter((id) => !removed.has(id)), SAVES_INDEX_KEY);
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
  const savedIds = await store.get(SAVES_INDEX_KEY);
  const ids = new Set(Array.isArray(savedIds) ? savedIds : []);

  if (replace) {
    const remoteGistIds = new Set(gists.map((gist) => gist?.id).filter(Boolean));
    for (const existingId of [...ids]) {
      const existing = await store.get(metaKey(existingId));
      if (existing?.gist?.id && !remoteGistIds.has(existing.gist.id)) {
        await store.delete(contentKey(existingId));
        await store.delete(metaKey(existingId));
        ids.delete(existingId);
      }
    }
  }

  for (const gist of gists) {
    const updatedAt = getGistUpdatedAt(gist);
    const description = gist.description || gist.desc || "";
    const files = gist.files || {};
    const fileNames = Object.keys(files);

    // Gist 接口返回完整文件清单：删除远端已改名或已移除的旧本地条目。
    const remoteFileNames = new Set(fileNames);
    for (const existingId of [...ids]) {
      const existing = await store.get(metaKey(existingId));
      if (existing?.gist?.id === gist.id && !remoteFileNames.has(existing.gist.filename)) {
        await store.delete(contentKey(existingId));
        await store.delete(metaKey(existingId));
        ids.delete(existingId);
      }
    }

    for (const filename of fileNames) {
      const file = files[filename];
      if (!file?.raw_url) continue;
      const id = getGistItemId(gist.id, filename);
      const [existing, content] = await Promise.all([store.get(metaKey(id)), store.get(contentKey(id))]);
      const downloaded = typeof content === "string";
      await store.put(
        {
          name: filename,
          length: downloaded ? content.length : file.size || existing?.length || 0,
          preview: downloaded ? existing?.preview || content.slice(0, 123).replace(/\s+/g, " ").slice(0, 100) : existing?.preview || "Gist 远程文件，点击下载后缓存内容",
          updatedAt,
          language: existing?.language || "",
          manualLanguage: existing?.manualLanguage || "",
          url: "",
          blobUrl: "",
          tags: [...new Set([...(Array.isArray(existing?.tags) ? existing.tags : []).filter((tag) => tag !== "CH" && tag !== "Url"), "Gist"])],
          gist: {
            id: gist.id,
            folderName: description || fileNames[0] || filename,
            filename,
            rawUrl: file.raw_url,
            htmlUrl: gist.html_url || "",
            description,
            user: gist.user || gist.owner?.login || "",
            updatedAt,
            downloaded,
          },
        },
        metaKey(id),
      );
      ids.add(id);
    }
  }

  await store.put([...ids], SAVES_INDEX_KEY);
  await tx.done;
};
