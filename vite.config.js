import vue from "@vitejs/plugin-vue";
import path from "path";
import Components from "unplugin-vue-components/vite";
import { VantResolver } from "@vant/auto-import-resolver";
import { VitePWA } from "vite-plugin-pwa";
import fs from "fs";

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
  worker: {
    format: "es",
  },
  plugins: [
    vue(),
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
