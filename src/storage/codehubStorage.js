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
