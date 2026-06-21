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
  plugins: [
    vue(),
    fetchProxyPlugin(),
    Components({
      resolvers: [VantResolver()],
    }),
    VitePWA({
      srcDir: "src",
      outDir: "dist",
      strategies: "generateSW",
      registerType: "autoUpdate",
      manifest: {
        name: "LinKey",
        short_name: "LinKey",
        description: "LinKey Web App",
        id: "/",
        start_url: "/",
        scope: "/",
        lang: "zh",
        display: "standalone",
        icons: [
          {
            src: "144x144.png",
            sizes: "144x144",
            type: "image/png",
          },
          {
            src: "192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
        ],
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/(?:www|s1|apps|res|github|chat)\./,
            handler: "NetworkOnly",
          },
          {
            urlPattern: /.*\.(?:js|css|gz|html|json)/i,
            handler: "CacheFirst",
            options: {
              cacheName: "Linkey-cache",
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24,
              },
              cacheableResponse: {
                statuses: [200],
              },
            },
          },
          {
            urlPattern: /.*\.(?:png|svg|ico|woff|woff2|ttf|eot)/i,
            handler: "CacheFirst",
            options: {
              cacheName: "Linkey-res-cache",
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 7,
              },
              cacheableResponse: {
                statuses: [200],
              },
            },
          },
        ],
      },
      selfDestroying: false,
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
    input: {
      main: "src/splash.js",
    },
    rollupOptions: {
      output: {
        manualChunks: {
          v: ["vant"],
          js: ["@/EditCode/lang-js"],
        },
        entryFileNames: "[name].[hash].js",
        chunkFileNames: "js/[name].[hash].js",
        assetFileNames: "assets/[name].[hash].[ext]",
      },
    },
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
  define: {
    "import.meta.env.PACKAGE_VERSION": JSON.stringify(JSON.parse(fs.readFileSync(path.join(__dirname, "package.json"), "utf-8")).version.trim()),
  },
};
