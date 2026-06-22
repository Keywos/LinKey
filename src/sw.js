import { precacheAndRoute, matchPrecache } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { clientsClaim } from "workbox-core";

self.skipWaiting();
clientsClaim();

// 保存预缓存清单引用（构建时被替换为实际数组）
const precacheEntries = self.__WB_MANIFEST || [];
precacheAndRoute(precacheEntries);

// 导航请求统一返回 index.html
// 若预缓存被清空（用户删除了 Cache Storage），手动重建
const handler = async ({ event }) => {
  const cached = await matchPrecache("/index.html");

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
async function rebuildPrecache() {
  const cacheName = "workbox-precache-v2";
  const cache = await caches.open(cacheName);
  for (const entry of precacheEntries) {
    const url = typeof entry === "string" ? entry : entry.url;
    try {
      const res = await fetch(url);
      if (res.ok) {
        await cache.put(url, res);
      }
    } catch (e) {
      console.warn("[SW] 重建缓存失败:", url);
    }
  }
}
