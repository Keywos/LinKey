import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { registerRoute, NavigationRoute } from "workbox-routing";
import { NetworkFirst, CacheFirst } from "workbox-strategies";
import { clientsClaim } from "workbox-core";

self.skipWaiting();
clientsClaim();

/**
 * =========================
 * 1. 清理旧缓存
 * =========================
 */
cleanupOutdatedCaches();

/**
 * =========================
 * 2. Precache（只缓存必要资源）
 * =========================
 */
const allowlist = [
  "index.html",

  // JS/CSS
  /linkjs\//,
  /linkassets\//,
  /\.js$/,
  /\.css$/,

  // icons & images
  /\.(png|ico|svg|webmanifest|json)$/
];

precacheAndRoute(
  (self.__WB_MANIFEST || []).filter((item) => {
    const url = typeof item === "string" ? item : item.url;

    return allowlist.some((rule) =>
      rule instanceof RegExp ? rule.test(url) : url.includes(rule)
    );
  })
);

/**
 * =========================
 * 3. SPA 路由
 * =========================
 */
registerRoute(
  new NavigationRoute(async ({ event }) => {
    return caches.match("/index.html", { ignoreSearch: true });
  })
);

/**
 * =========================
 * 4. JS / CSS（CacheFirst）
 * =========================
 */
registerRoute(
  ({ request }) =>
    request.destination === "script" || request.destination === "style",
  new CacheFirst({
    cacheName: "static-assets",
  })
);

/**
 * =========================
 * 5. 图片（CacheFirst）
 * =========================
 */
registerRoute(
  ({ request }) => request.destination === "image",
  new CacheFirst({
    cacheName: "image-cache",
  })
);

/**
 * =========================
 * 6. ECharts / 大库（Runtime）
 * =========================
 */
registerRoute(
  ({ url }) => url.pathname.includes("echarts"),
  new NetworkFirst({
    cacheName: "runtime-lib",
  })
);