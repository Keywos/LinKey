import { precacheAndRoute, matchPrecache } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { clientsClaim } from "workbox-core";

self.skipWaiting();
clientsClaim();

// 注入预缓存清单（由 vite-plugin-pwa 构建时填充）
precacheAndRoute(self.__WB_MANIFEST);

// 导航请求统一返回 index.html（克隆以清除 redirected 标志）
const handler = async ({ event }) => {
  const cached = await matchPrecache("/index.html");
  if (cached && cached.redirected) {
    // 如果缓存的响应是重定向得来的，克隆 body 创建新 Response
    const body = await cached.blob();
    return new Response(body, {
      status: cached.status,
      statusText: cached.statusText,
      headers: cached.headers,
    });
  }
  return cached || (await fetch(event.request));
};

registerRoute(new NavigationRoute(handler, {
  allowlist: [/^\/.*$/],
}));
