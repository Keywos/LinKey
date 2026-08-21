<!-- About.vue -->

<template>
  <div class="home-page">
    <header class="home-header">
      <!-- <h1 class="LINKEY__name">LINKEY</h1> -->
    </header>
    <search compact />
    <section class="home-shortcuts">
      <p class="homept">
        <span class="home-version">VER Visits {{ version }} - {{ count }}</span>
      </p>
      <homecard />
    </section>
  </div>
</template>

<style>
:root {
  --van-tabbar-background: #f3f3f3 !important;
  --van-tabbar-item-active-background: #00000000 !important;
  --van-grid-item-content-background: #00000000 !important;
  --van-grid-item-content-paddings: 8px !important;
  --van-popup-background: #f5f5f5 !important;
  /* 搜索 关于页面 弹窗 */
  --van-overlay-background: rgba(0, 0, 0, 0.326) !important;
  /* 搜索 关于页面 弹窗遮罩 */
}

@media (prefers-color-scheme: dark) {
  :root {
    --van-tabbar-background: #141414 !important;
    --van-popup-background: #181819 !important;
  }
}
</style>

<script setup>
import homecard from "@/homecard.vue";
import search from "@/search/search.vue";
import { ref } from "vue";
import { useStore } from "./store/store";
const store = useStore();
const count = ref(store.count);
const version = import.meta.env.PACKAGE_VERSION;
</script>

<style scoped>
.home-page {
  min-height: calc(100vh - 60px);
  margin-top: 10px;
}

.home-shortcuts {
  margin-top: 0;
}

.home-header {
  padding-top: 4px;
  margin-bottom: 30px;
}

.home-header h1 {
  margin-top: 0;
  margin-bottom: 2px;
  font-size: 22px;
}

.home-version {
  margin-left: 8px;
  opacity: 0.7;
}
.LINKEY__name {
  letter-spacing: 0.18em;
  transform: translateY(6px);
  font:
    800 20px/1 -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
  background: linear-gradient(90deg, #5a6a8a 0%, #6b7cff 45%, #8a6dff 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

/* .home-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.LINKEY__name {
  margin: 0;
}

 */
.homept {
  padding-left: 20px;
}
</style>
