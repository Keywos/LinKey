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
};

export const contentKey = (id) => `codehub_save_content:${id}`;
export const metaKey = (id) => `codehub_save_meta:${id}`;

export const getGistItemId = (gistId, filename) => `gist:${gistId}:${encodeURIComponent(filename)}`;

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

export const prependGistFileToCache = async (gist, filename, file) => {
  const cachedGists = await codehubStorage.getItem(GIST_LIST_KEY);
  if (!Array.isArray(cachedGists)) return;
  const nextGists = cachedGists.map((cachedGist) => {
    if (cachedGist?.id !== gist.id) return cachedGist;
    const files = { ...(cachedGist.files || {}), [filename]: file };
    return {
      ...cachedGist,
      files,
      filesNames: [filename, ...(cachedGist.filesNames || Object.keys(files)).filter((name) => name !== filename)],
      primaryFilename: cachedGist.primaryFilename || (cachedGist.filesNames || Object.keys(files))[0] || filename,
      desc: gist.description || cachedGist.desc || "",
      description: gist.description || cachedGist.description || "",
      updatedAt: new Date(gist.updated_at || Date.now()).getTime(),
    };
  });
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
      files[newName] = { ...files[oldName], filename: newName };
      delete files[oldName];
    }
    return { ...gist, files, filesNames: (gist.filesNames || Object.keys(files)).map((name) => (name === oldName ? newName : name)) };
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
    if (filesNames.length) nextGists.push({ ...gist, files, filesNames });
  }
  await codehubStorage.setItem(GIST_LIST_KEY, nextGists);
};

export const getGistUpdatedAt = (gist) => {
  const value = gist?.updatedAt || gist?.updated_at || gist?.updated;
  const timestamp = typeof value === "number" ? value : new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : Date.now();
};

export const syncGistFilesToCodeHub = async (gists) => {
  if (!Array.isArray(gists) || gists.length === 0) return;
  const db = await dbPromise;
  const tx = db.transaction("store", "readwrite");
  const store = tx.objectStore("store");
  const savedIds = await store.get(SAVES_INDEX_KEY);
  const ids = new Set(Array.isArray(savedIds) ? savedIds : []);

  for (const gist of gists) {
    const updatedAt = getGistUpdatedAt(gist);
    const description = gist.description || gist.desc || "";
    const files = gist.files || {};
    const fileNames = gist.filesNames || Object.keys(files);

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
