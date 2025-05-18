<!-- About.vue -->

<template>
  <h1>Home Page</h1>
  <p class="homept">
    Visits
    <span style="font-size: 11.5px">{{ count }}</span>
    V:{{ version }}
  </p>
  <homecard />
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
import { ref } from "vue";
import { useStore } from "./store/store";
const store = useStore();
const count = ref(store.count);
const version = import.meta.env.PACKAGE_VERSION;
</script>
