<!-- About.vue -->

<template>
  <div class="home-page">
    <header class="home-header">
      <!-- <h1 class="LINKEY__name">LINKEY</h1> -->
    </header>
    <search compact />
    <div class="home-content" :class="{ 'home-content--meta-after': homeMetaAfter }" :style="homeContentStyle">
      <section class="home-shortcuts">
        <p class="homept" :class="{ 'homept--dragging': isDraggingHomeMeta }" :style="homeptStyle" @pointerdown="onHomeptPointerDown">
          <span v-if="!isEditingHome" class="home-version">VER Visits {{ version }} - {{ count }}</span>
          <span v-else class="home-edit-hint">此文字可上下拖动调整布局 / 下方图标可以拖动调整位置</span>
        </p>
        <homecard @edit-mode-change="isEditingHome = $event" />
      </section>
    </div>
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
import { computed, ref } from "vue";
import { useStore } from "./store/store";
const store = useStore();
const count = ref(store.count);
const version = import.meta.env.PACKAGE_VERSION;
const isEditingHome = ref(false);
const homeMetaAfter = ref(localStorage.getItem("HomeMetaAfter") === "1");
const homeGap = ref(Number(localStorage.getItem("HomeGap")) || 66);
const isDraggingHomeMeta = ref(false);
const homeptDragStartY = ref(0);
const homeptDragStartGap = ref(0);
const homeptDragOffset = ref(0);
const homeContentStyle = computed(() => ({
  marginTop: `${homeGap.value}px`,
}));
const homeptStyle = computed(() => {
  if (!isDraggingHomeMeta.value) return {};
  return { transform: `translateY(${homeptDragOffset.value}px)` };
});
const onHomeptPointerDown = (event) => {
  if (!isEditingHome.value) return;
  isDraggingHomeMeta.value = true;
  homeptDragStartY.value = event.clientY;
  homeptDragStartGap.value = homeGap.value;
  homeptDragOffset.value = 0;
  window.addEventListener("pointermove", onHomeptPointerMove);
  window.addEventListener("pointerup", onHomeptPointerUp);
  window.addEventListener("pointercancel", onHomeptPointerUp);
  event.preventDefault();
};
const onHomeptPointerMove = (event) => {
  if (!isDraggingHomeMeta.value) return;
  const delta = event.clientY - homeptDragStartY.value;
  homeptDragOffset.value = Math.max(-homeptDragStartGap.value, Math.min(520 - homeptDragStartGap.value, delta));
};
const onHomeptPointerUp = () => {
  if (!isDraggingHomeMeta.value) return;
  isDraggingHomeMeta.value = false;
  homeGap.value = Math.max(0, Math.min(520, homeptDragStartGap.value + homeptDragOffset.value));
  homeptDragOffset.value = 0;
  localStorage.setItem("HomeGap", String(homeGap.value));
  window.removeEventListener("pointermove", onHomeptPointerMove);
  window.removeEventListener("pointerup", onHomeptPointerUp);
  window.removeEventListener("pointercancel", onHomeptPointerUp);
};
</script>

<style scoped>
.home-page {
  min-height: calc(100vh - 60px);
  margin-top: 10px;
  margin-bottom: 100px;
}

.home-shortcuts {
  margin-top: 0;
}

.home-content {
  display: flex;
  flex-direction: column;
}

.home-content .homept {
  order: 1;
}

.home-content .home-shortcuts {
  order: 2;
}

.home-content--meta-after .homept {
  order: 2;
}

.home-content--meta-after .home-shortcuts {
  order: 1;
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

.home-edit-hint {
  margin-left: 6px;
  color: #7187dc;
  opacity: 0.9;
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

.homept[draggable="true"] {
  cursor: grab;
}

.homept[draggable="true"]:active {
  cursor: grabbing;
}

.homept {
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}

.homept--dragging {
  cursor: grabbing;
  opacity: 0.85;
}
</style>
