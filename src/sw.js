import { precacheAndRoute, matchPrecache } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { clientsClaim } from "workbox-core";

self.skipWaiting();
clientsClaim();

// 注入预缓存清单（由 vite-plugin-pwa 构建时填充）
precacheAndRoute(self.__WB_MANIFEST);

// 导航请求统一返回 index.html
// 若预缓存被清空，自动注销 SW，重载页面触发重新安装
const handler = async ({ event }) => {
  const cached = await matchPrecache("/index.html");

  if (!cached) {
    // 预缓存缺失（用户清空了 Cache Storage）→ 重新注册
    event.waitUntil(
      (async () => {
        await self.registration.unregister();
        const allClients = await self.clients.matchAll({ type: "window" });
        allClients.forEach((c) => c.navigate(c.url));
      })()
    );
    // 回退到网络
    return fetch(event.request);
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
