import vue from "@vitejs/plugin-vue";
import path from "path";
import Components from "unplugin-vue-components/vite";
import { VantResolver } from "@vant/auto-import-resolver";
import { VitePWA } from "vite-plugin-pwa";
import fs from "fs";

function fetchProxyPlugin() {
  return {
    name: "fetch-proxy",
    configureServer(server) {
      server.middlewares.use("/api/fetch", async (req, res) => {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const target = url.searchParams.get("url");
        if (!target) {
          res.statusCode = 400;
          res.end("Missing ?url= parameter");
          return;
        }
        try {
          const response = await fetch(target);
          if (!response.ok) {
            res.statusCode = response.status;
            res.end(`Fetch failed: ${response.statusText}`);
            return;
          }
          const text = await response.text();
          res.setHeader("Content-Type", response.headers.get("content-type") || "text/plain");
          res.end(text);
        } catch (e) {
          res.statusCode = 502;
          res.end(`Fetch error: ${e.message}`);
        }
      });
    },
  };
}

export default {
  server: {
    host: "0.0.0.0",
    port: 5173,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  // ★ shikiWorker.js 里用了 import("shiki/core") 等动态 import（代码分片），
  //   Vite 的 worker 默认用 'iife' 格式打包，不支持代码分片，构建会直接报错：
  //   "Invalid value 'iife' for option 'output.format' - UMD and IIFE output
  //   formats are not supported for code-splitting builds."
  //   所以 worker 输出格式必须显式指定为 'es'。
  worker: {
    format: "es",
  },
  plugins: [
    vue(),
    fetchProxyPlugin(),
    Components({
      resolvers: [VantResolver()],
    }),
    VitePWA({
      strategies: "generateSW",
      registerType: "autoUpdate",

      manifest: {
        name: "App",
        short_name: "App",
        start_url: "/",
        scope: "/",
        display: "standalone",
        icons: [
          { src: "144x144.png", sizes: "144x144", type: "image/png" },
          { src: "192x192.png", sizes: "192x192", type: "image/png" },
          { src: "512x512.png", sizes: "512x512", type: "image/png" },
        ],
      },

      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest,json}"],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === "script",

            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "js-cache",
            },
          },
          {
            urlPattern: ({ request }) => request.destination === "style" || request.destination === "image" || request.destination === "document" || request.destination === "font",

            handler: "CacheFirst",
            options: {
              cacheName: "asset-cache",
            },
          },
        ],
        skipWaiting: true,
        clientsClaim: true,
      },
    }),
  ],
  build: {
    outDir: "dist",
    sourcemap: false,
    cssCodeSplit: true,
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 4096,
    target: "es2020",
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
      },
    },
    input: {
      main: "src/splash.js",
    },
    rollupOptions: {
      output: {
        manualChunks: {
          linkv: ["vant"],
          linkterser: ["terser"],
          linkjs: ["@/EditCode/lang-js"],
        },
        entryFileNames: "[name].[hash].js",
        chunkFileNames: "linkjs/[name].[hash].js",
        assetFileNames: "linkassets/[name].[hash].[ext]",
      },
    },
  },
  define: {
    "import.meta.env.PACKAGE_VERSION": JSON.stringify(JSON.parse(fs.readFileSync(path.join(__dirname, "package.json"), "utf-8")).version.trim()),
  },
};
