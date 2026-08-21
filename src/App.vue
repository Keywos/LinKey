<template>
  <van-config-provider :theme="theme">
    <div>
      <div v-if="isbgc" class="jbsss" />
    </div>

    <main class="page-body" :class="{ 'page-body-with-back': isNavBackRef }" @scroll="handleScroll">
      <router-view v-slot="{ Component, route: currentRoute }">
        <keep-alive>
          <component :is="Component" v-if="currentRoute.meta.keepAlive" />
        </keep-alive>
        <component :is="Component" v-if="!currentRoute.meta.keepAlive" />
      </router-view>
    </main>
    <van-dialog />
    <button v-if="isNavBackRef && !hideBackButton" class="settings-fab" aria-label="返回" @click="onClickLeft">
      <van-icon name="arrow-left" />
    </button>
  </van-config-provider>
</template>

<script setup>
import { ref, watchEffect, computed, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useTheme } from "@/hooks/theme";
import { onWidth } from "@/hooks/winWidth";
const { screenWidth } = onWidth();

import { sendReq } from "./http/http";

import { useStore } from "./store/store";
const store = useStore();
const count = ref(store.count);

const fetchData = async () => {
  try {
    const res = await sendReq("GET", "https://api.xn--ji8h.eu.org/count/json");
    if (res?.data?.count) {
      const i = res.data.count;
      count.value = i;
      store.setCount(i);
    }
  } catch (error) {
    store.setIsCount();
    console.error("Error fetching data:", error);
  }
};
const { theme } = useTheme();

const breakpoints = [
  { width: 359, value: "20px" },
  { width: 366, value: "2px" },
  { width: 376, value: "6px" },
  { width: 389, value: "8px" },
  { width: 431, value: "18px" },
];

const noWmargin = computed(() => {
  const bp = breakpoints.find((b) => screenWidth.value < b.width);
  return bp ? bp.value : "18px";
});

onMounted(() => {
  if (store.iscount) {
    fetchData();
    store.setIsCount();
  }
});

const router = useRouter();
const onClickLeft = () => {
  const { path, meta } = router.currentRoute.value;
  if (meta.backTo) {
    router.replace(meta.backTo);
  } else if (path !== "/") {
    router.replace("/");
  } else {
    history.back();
  }
};

const isNavBackRef = ref(false);
const hideBackButton = ref(localStorage.getItem("HideBackButton") === "1");

const isbgc = ref(localStorage.getItem("ISBGC") == "1" || false);
const route = useRoute();

watchEffect(() => {
  const meta = route.meta || {};
  isNavBackRef.value = !!meta.isNavBack;
});
onMounted(() => {
  window.addEventListener("back-button-visibility-change", (event) => {
    hideBackButton.value = event.detail.hidden;
  });
});
</script>

<style lang="scss">
.tabzw {
  height: v-bind(tabHeight);
}

.van-nav-bar__left,
.van-nav-bar__right,
.van-nav-bar__content {
  height: v-bind(tabHeight);
  flex-direction: column-reverse;
  bottom: 13px;
}

.van-nav-bar__title {
  margin-bottom: -3px;
}

.van-nav-bar__left {
  width: 40px;
  height: 40px;
  min-height: 34px;
  padding: 0;
  border-radius: 50%;
  // position: absolute;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 0.5px solid rgba(255, 255, 255, 0.066);
  background:
    radial-gradient(circle at 30% 22%, rgba(255, 255, 255, 0.017), transparent 34%),
    rgba(255, 255, 255, 0.06);
  box-shadow:
    inset 0 0.5px 0.5px rgba(255, 255, 255, 0.05),
    inset 0 -0.5px 1px rgba(255, 255, 255, 0.05),
    0 3px 10px rgba(30, 45, 60, 0.049);
  backdrop-filter: blur(7px) saturate(1.35);
  -webkit-backdrop-filter: blur(7px) saturate(1.35);
  transform: translate(20px, 26px);
}

// .van-nav-bar__left::before {
//   content: "";
//   position: absolute;
//   inset: 0;
//   border: 0.5px solid transparent;
//   border-radius: inherit;
//   background: linear-gradient(to bottom, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.2) 20%, rgba(255, 255, 255, 0.015) 38%, rgba(255, 255, 255, 0.03) 62%, rgba(255, 255, 255, 0.2) 80%, rgba(255, 255, 255, 0.2) 100%) border-box;
//   -webkit-mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
//   mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
//   -webkit-mask-composite: xor;
//   mask-composite: exclude;
//   pointer-events: none;
// }

.pwa-standalone .pwa-nav-bar .van-nav-bar__left {
  transform: translate(20px, calc(26px + env(safe-area-inset-top)));
}

.van-nav-bar__arrow {
  position: relative;
  z-index: 1;
  font-weight: 1200;
  transform: scale(1.2);
}

.blurNavdiv {
  /* 顶部毛玻璃 */
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  /* border-bottom: #00000004 solid 1px; */
  /* background-color: #00000044; */
  /* 顶部栏 */
  /* height: v-bind(tabHeight); */
  z-index: 9000;
}

.blurNavdiv_border {
  border-bottom: #00000004 solid 1px;
}

.blurNavdiv-hidden {
  background: transparent;
}

.blurNavdiv-hidden.blurNavdiv_border {
  border-bottom: 0;
}

.van-nav-bar {
  /* background:transparent; van-nav-bar__content */
  border-style: none;
  border: none;
  /* border-bottom-width:0px; */
}
.van-tabbar {
  border-top: #00000004 solid 1px;
  height: v-bind(tabbar_height) !important;
  /* margin-bottom: -10px; */
}

.settings-fab {
  position: fixed;
  left: 16px;
  top: calc(100svh - 60px - env(safe-area-inset-bottom));
  bottom: auto;
  z-index: 1024;
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 50%;
  color: inherit;
  background: rgba(255, 255, 255, 0.42);
  box-shadow: 0 5px 18px rgba(70, 90, 130, 0.18);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  cursor: pointer;
}

.settings-fab .van-icon {
  font-size: 21px;
}

.page-body {
  padding-top: 0;
}

.page-body-with-back {
  padding-top: 0;
}

.pwa-standalone .page-body {
  padding-top: calc(10px + env(safe-area-inset-top));
}

.pwa-standalone .page-body-with-back {
  padding-top: calc(10px + env(safe-area-inset-top));
}

.global-back-button {
  position: fixed;
  left: 18px;
  top: calc(100svh - 132px - env(safe-area-inset-bottom));
  bottom: auto;
  z-index: 1024;
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 50%;
  color: inherit;
  background: rgba(255, 255, 255, 0.42);
  box-shadow: 0 5px 18px rgba(70, 90, 130, 0.15);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  cursor: pointer;
}

.global-back-button .van-icon {
  font-size: 20px;
}

@media (prefers-color-scheme: dark) {
  .settings-fab,
  .global-back-button {
    border-color: rgba(255, 255, 255, 0.12);
    background: rgba(45, 49, 58, 0.72);
  }
}
/* 底部导航栏 */
.tb-evenly .van-tabbar-item { justify-content: space-evenly !important; }
.tb-center .van-tabbar-item { justify-content: center !important; }

.kcard-font_size {
  font-size: 14px;
  font-weight: 460;
}

.kcard-onepan {
  /* 阻止换行 */
  display: flex;
  white-space: nowrap;
  overflow: hidden;
  max-width: 130px;
  color: #242323e3;
  /* text-overflow: ellipsis; */
}
.kcard-all {
  /* 禁止选中 */
  -webkit-user-select: none;
  user-select: none;
  max-width: 100%;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(165px, 1fr));
  gap: 17px;
  margin: v-bind(noWmargin);
  /*  计算宽度 */
}
.homept,
.plengclass,
h1,
h2,
h3 {
  padding-left: v-bind(noWmargin);
}

.homept {
  font-size: 13px;
  opacity: 0.4;
}

.plengclass {
  margin-left: -12px;
  font-size: 13px;
  /* opacity: 0.5; */
}

.kcard-bkcss {
  box-shadow: 0 0 10px #80a8c9a5;
  border-radius: 20px;
}

.kcard-one {
  background-color: var(--kcard-bgc);
  min-width: 150px;
  min-height: 80px;
  border-radius: 20px;
  padding: 6px 0 8px 0;
  /* display: flex; */
  justify-content: space-between;
  border: 1.2px solid transparent;
  border: border-color 0.3s ease;
}
.kcard-one.active {
  box-shadow: 0 0 10px #4962ae;
}

.van-image__loading-icon {
  font-size: 24px;
}
/* android */
:root {
  --van-image-loading-icon-size: 35px !important;
  /* 加载图 */
  --kcard-bgc: #86afd164;
  /* --van-image-loading-icon-color: #d7d2d28d; */
  /* 加载失败或加载中 */
  --van-image-placeholder-background: transparent;
  --van-grid-item-content-padding: 14px 14px 10px 8px !important;
  --kcard-bgc: #c4d4f08f;
  /* c4d4f08f  淡蓝色*/
  /* 卡片颜色 */
  /* a1b4d861 */
}
.kcard-one {
  box-shadow: -2px 2px 6px #7a8cdb97;
  /* box-shadow: 1px 4px 9px #0000001c; */
}
@media (prefers-color-scheme: dark) {
  :root {
    --kcard-bgc: #454a5362;
  }

  .kcard-onepan {
    color: #dbd9d9e8;
  }
  .gicdeimg,
  .kcard-imggit,
  .kcardimg {
    /*  图标 反转 */
    filter: none;
  }
  .kcard-one {
    box-shadow: none;
    /* box-shadow: 1px 4px 9px #0000001c; */
  }
}

.kcardimg {
  /*  图标 反转 */
  /* opacity: ; */
  /* filter: invert(1); */
  width: 20px;
  height: 20px;
  margin-bottom: 18px;
}
</style>
