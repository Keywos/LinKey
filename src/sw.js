import { precacheAndRoute } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { clientsClaim } from "workbox-core";

self.skipWaiting();
clientsClaim();

// 保存预缓存清单引用（构建时被替换为实际数组）
const precacheEntries = self.__WB_MANIFEST || [];
precacheAndRoute(precacheEntries);

const CACHE_NAME = "workbox-precache-v2";

// 导航请求统一返回 index.html
// 若预缓存被清空（用户删除了 Cache Storage），手动重建
const handler = async ({ event }) => {
  const cache = await caches.open(CACHE_NAME);
  // ignoreSearch 兼容 precacheAndRoute 的 __WB_REVISION__ 参数和 rebuild 无参数两种存储格式
  const cached = await cache.match("/index.html", { ignoreSearch: true });

  if (!cached) {
    // 预缓存缺失 → 后台重建，当前导航从网络加载
    event.waitUntil(rebuildPrecache());
    try {
      return await fetch(event.request);
    } catch (e) {
      // 离线 + 缓存缺失 → 尝试从所有缓存中找 index.html 兜底
      const allCaches = await caches.keys();
      for (const name of allCaches) {
        const hit = await caches.match("/index.html", { cacheName: name });
        if (hit) return hit;
      }
      // 最终兜底：极简离线页面
      return new Response(
        '<!DOCTYPE html><html><head><meta charset="utf-8"><title>离线</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#f5f5f5;color:#333}</style></head><body><div><h1>⚠️ 离线</h1><p>请检查网络连接后重试</p></div></body></html>',
        { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }
  }

  if (cached.redirected) {
    // 如果缓存的响应是重定向得来的，克隆 body 创建新 Response
    const body = await cached.blob();
    return new Response(body, {
      status: cached.status,
      statusText: cached.statusText,
      headers: cached.headers,
    });
  }
  return cached;
};

registerRoute(new NavigationRoute(handler, {
  allowlist: [/^\/.*$/],
}));

// 重建预缓存：从网络重新拉取所有资源
// 使用与 precacheAndRoute 一致的缓存键（带 __WB_REVISION__ 参数），避免产生重复条目
async function rebuildPrecache() {
  const cache = await caches.open(CACHE_NAME);
  const origin = self.location.origin;
  for (const entry of precacheEntries) {
    const url = typeof entry === "string" ? entry : entry.url;
    const revision = typeof entry === "object" ? entry.revision : undefined;
    try {
      // 确保使用绝对 URL 作为缓存键
      const absUrl = url.startsWith("http") ? url : origin + (url.startsWith("/") ? url : "/" + url);
      const res = await fetch(absUrl);
      if (res.ok) {
        // 使用与 precacheAndRoute 完全一致的键（带 __WB_REVISION__），覆盖时不会产生重复
        const cacheKey = revision ? `${absUrl}?__WB_REVISION__=${revision}` : absUrl;
        await cache.put(cacheKey, res);
      }
    } catch (e) {
      console.warn("[SW] 重建缓存失败:", url);
    }
  }
  // 清理旧的不带 revision 的重复条目（如果存在）
  await deduplicateCache(cache, precacheEntries, origin);
}

// 清理缓存中同时存在"带 revision"和"不带 revision"两种情况下的旧条目
async function deduplicateCache(cache, entries, origin) {
  const keys = await cache.keys();
  for (const entry of entries) {
    if (typeof entry === "object" && entry.revision) {
      const absUrl = entry.url.startsWith("http") ? entry.url : origin + (entry.url.startsWith("/") ? entry.url : "/" + entry.url);
      const revKey = `${absUrl}?__WB_REVISION__=${entry.revision}`;
      // 如果 revision 键存在，删除无 revision 的旧条目
      if (keys.some((r) => r.url === revKey)) {
        await cache.delete(absUrl);
      }
    }
  }
}
