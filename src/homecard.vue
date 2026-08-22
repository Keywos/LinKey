<template>
  <div class="homecarda" :class="`homecarda--${layout}`" :style="iconLayoutStyle" style="-webkit-user-select: none; user-select: none">
    <div v-if="showIconLayoutSettings" class="icon-layout-settings" @click.self="showIconLayoutSettings = false">
      <section class="icon-layout-settings__panel" role="dialog" aria-modal="true" aria-label="图标布局设置">
        <div class="icon-layout-settings__header">
          <strong>图标布局</strong>
          <button type="button" aria-label="关闭设置" @click="showIconLayoutSettings = false">
            <van-icon name="cross" />
          </button>
        </div>

        <div class="icon-layout-settings__switch">
          <span>卡片样式 / 图标</span>
          <van-switch :model-value="layout === 'icon'" size="20px" @update:model-value="setLayoutMode" />
        </div>

        <label v-if="layout === 'icon'" class="icon-layout-settings__control">
          <span>
            <span>图标左右间距</span>
            <b>{{ iconSpacing }}px</b>
          </span>
          <input v-model.number="iconSpacing" type="range" min="0" max="20" step="1" />
        </label>

        <label v-if="layout === 'icon'" class="icon-layout-settings__control">
          <span>
            <span>图标圆角</span>
            <b>{{ iconRadius }}px</b>
          </span>
          <input v-model.number="iconRadius" type="range" min="0" max="26" step="1" />
        </label>

        <div class="icon-layout-settings__preview">
          <span class="icon-layout-settings__preview-icon">✦</span>
          <span>实时预览</span>
        </div>
      </section>
    </div>

    <draggable
      class="kcard-all"
      v-model="displayCards"
      itemKey="id"
      :scroll-sensitivity="200"
      :force-fallback="true"
      :scroll-speed="8"
      :scroll="true"
      v-bind="{
        animation: 200,
        disabled: false,
        delay: 200,
        chosenClass: 'kcard-bkcss',
        handle: '.kcard-homea',
      }"
      @start="handleDragStart"
      @end="handleDragEnd"
      @change="changeSort"
    >
      <template #item="{ element }">
        <div class="kcard-one" @click="activateCard(element)">
          <div :key="element.id" class="kcard-homea">
            <template v-if="layout === 'icon'">
              <div class="kcard-font_size">
                <span class="kcard-icon-background" :class="{ 'kcard-icon-background-special': element.special }">
                  <template v-if="element.special">
                    <img class="kcardimg kcardimg-built-in" :src="element.img" alt="" />
                  </template>
                  <template v-else>
                    <span v-if="isCustomUrlIcon(element)" class="kcard-icon-slot">
                      <img class="kcardimg kcardimg-custom" :style="getIconSizeStyle(element)" :src="element.img" alt="" />
                    </span>
                    <img v-else-if="isImageIcon(element.img)" class="kcardimg" :class="{ 'kcardimg-built-in': isBuiltInSvgIcon(element.img) }" :src="element.img" alt="" />
                    <span v-else class="kcardimg-emoji">{{ element.img }}</span>
                  </template>
                </span>
                <span class="kcard-onepan">{{ element.label || element.id }}</span>
              </div>
            </template>
            <template v-else>
              <div class="kcard-font_size">
                <img v-if="element.special" class="kcardimg kcard-special-card-icon" :src="element.img" alt="" />
                <template v-else>
                  <span v-if="isCustomUrlIcon(element)" class="kcard-icon-slot">
                    <img class="kcardimg kcardimg-custom" :style="getIconSizeStyle(element)" :src="element.img" alt="" />
                  </span>
                  <img v-else-if="isImageIcon(element.img)" class="kcardimg" :src="element.img" alt="" />
                  <span v-else class="kcardimg-emoji">{{ element.img }}</span>
                </template>
                <span class="kcard-onepan">{{ element.label || element.id }}</span>
              </div>
            </template>
          </div>
        </div>
      </template>
    </draggable>

    <AddShortcut v-model:show="showAddShortcut" @saved="onShortcutSaved" />
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { showToast } from "vant";
import { useRouter } from "vue-router";
import draggable from "vuedraggable";
import myArray from "./arr.js";
import { getHomeCards, saveHomeCards } from "./homeCards.js";
import AddShortcut from "./AddShortcut.vue";
import editIcon from "./img/svg/edit.svg";
import moreIcon from "./img/svg/more.svg";
import yjurlIcon from "./img/svg/yjurl.svg";

const router = useRouter();
const hcard = ref(getHomeCards().filter((card) => card.enabled));
const layout = ref(localStorage.getItem("HomeCardLayout") === "icon" ? "icon" : "card");
const storedIconRadius = localStorage.getItem("HomeIconRadius");
const storedIconSpacing = localStorage.getItem("HomeIconSpacing");
const iconRadius = ref(storedIconRadius === null ? 15 : Number(storedIconRadius));
const iconSpacing = ref(storedIconSpacing === null ? 4 : Number(storedIconSpacing));
const showIconLayoutSettings = ref(false);
const isDragging = ref(false);
let ignoreClickUntil = 0;
const iconLayoutStyle = computed(() => ({
  "--icon-radius": `${iconRadius.value}px`,
  "--icon-spacing": `${iconSpacing.value}px`,
}));
const specialTiles = [
  { id: "__icon-settings__", label: "图标设置", img: editIcon, special: "icon-settings" },
  { id: "__add__", label: "添加", img: yjurlIcon, special: "add" },
  { id: "__settings__", label: "设置", img: moreIcon, special: "settings" },
];
const displayCards = ref([]);
const showAddShortcut = ref(false);
const isImageIcon = (icon) => icon.startsWith("/") || icon.startsWith("data:") || /^https?:\/\//.test(icon);
const isBuiltInSvgIcon = (icon) => {
  if (!icon) return false;
  return /^data:image\/svg\+xml(?:[;,]|$)/i.test(icon) || (icon.startsWith("/") && /\.svg(?:[?#]|$)/i.test(icon));
};
const isCustomUrlIcon = (card) => /^https?:\/\//.test(card.img) && typeof card.iconSize === "number";
const getIconSizeStyle = (card) => (isCustomUrlIcon(card) ? { "--custom-icon-size": `${card.iconSize}px` } : undefined);

const changeSort = () => {
  const allCards = getHomeCards();
  const hiddenCards = allCards.filter((card) => !card.enabled);
  const orderedCards = displayCards.value.filter((card) => !card.special);
  hcard.value = orderedCards;
  sethomes(orderedCards);
  saveHomeCards([...orderedCards, ...hiddenCards]);
  localStorage.setItem("HomeIconTileOrder", JSON.stringify(displayCards.value.map((card) => card.id)));
};
function sethomes(i) {
  const nameSortArray = Object.fromEntries(i.map((k, index) => [k.id, index]));
  localStorage.setItem("HomePageSort", JSON.stringify(nameSortArray));
}

const refreshHomeCards = () => {
  if (isDragging.value) return;
  hcard.value = getHomeCards().filter((card) => card.enabled);
  rebuildDisplayCards();
};
const refreshHomeCardLayout = (event) => {
  layout.value = event.detail?.layout === "icon" ? "icon" : "card";
  rebuildDisplayCards();
};
const rebuildDisplayCards = () => {
  const tiles = [...specialTiles, ...hcard.value];
  const savedOrder = JSON.parse(localStorage.getItem("HomeIconTileOrder") || "[]");
  const orderMap = new Map(savedOrder.map((id, index) => [id, index]));
  tiles.sort((first, second) => (orderMap.get(first.id) ?? Number.MAX_SAFE_INTEGER) - (orderMap.get(second.id) ?? Number.MAX_SAFE_INTEGER));
  displayCards.value = tiles;
};
const setLayoutMode = (enabled) => {
  const nextLayout = enabled ? "icon" : "card";
  localStorage.setItem("HomeCardLayout", nextLayout);
  layout.value = nextLayout;
  window.dispatchEvent(new CustomEvent("home-card-layout-change", { detail: { layout: nextLayout } }));
};
watch(iconSpacing, (value) => localStorage.setItem("HomeIconSpacing", String(value)));
watch(iconRadius, (value) => localStorage.setItem("HomeIconRadius", String(value)));
onMounted(() => window.addEventListener("home-cards-change", refreshHomeCards));
onMounted(() => window.addEventListener("home-card-layout-change", refreshHomeCardLayout));
onMounted(rebuildDisplayCards);
onUnmounted(() => {
  window.removeEventListener("home-cards-change", refreshHomeCards);
  window.removeEventListener("home-card-layout-change", refreshHomeCardLayout);
});

let xarri = 0;
function showToastXA() {
  const xarr = [`I need somebody to heal`, `Somebody to know`, `Somebody to have`, `Somebody to hold`, `It's easy to say`, `But it's never the same`];
  showToast(xarr[xarri]);
  xarri++;
  if (xarri >= xarr.length) xarri = 0;
}

let xarris = 0;
function showToastXAS() {
  const xarr = [
    "Why do you have to be ready to go?",
    "You can never be 100% ready.",
    "You know what?",
    "You have to dive in first",
    "And then it's refined.",
    "If you plan more and think more",
    "You will fall into the trap of perfectionism",
    "That will make you very painful",
    "So you have to remember",
    "Don't do it when you see hope",
    "It's about doing it to see hope",
    "In the process",
    "You will encounter a lot of unhappy things",
    "But remember",
    "If you are not happy, go to the supermarket",
    "You will also encounter things that make you very angry",
    "But remember",
    "If you are right",
    "You don't have to be angry.",
    "If you are wrong",
    "You have no right to be angry",
    "Do you understand？",
  ];
  showToast(xarr[xarris]);
  xarris++;
  if (xarris >= xarr.length) xarris = 0;
}

function getRandARR(array) {
  const randomIndex = Math.floor(Math.random() * array.length);
  return array[randomIndex];
}
const navigateToRoute = (route) => {
  if (route === "/") {
    showToast(getRandARR(myArray));
  } else if (route === "/key") {
    showToastXA();
  } else if (route === "/keys") {
    showToastXAS();
  } else if (route.startsWith("https://")) {
    window.open(route, "_blank");
  } else router.push(route);
};
const activateCard = (card) => {
  if (isDragging.value || Date.now() < ignoreClickUntil) return;
  if (card.special === "icon-settings") {
    showIconLayoutSettings.value = true;
    return;
  }
  if (card.special === "add") {
    showAddShortcut.value = true;
    return;
  }
  if (card.special === "settings") {
    router.push("/setting");
    return;
  }
  navigateToRoute(card.r);
};
const onShortcutSaved = () => {
  hcard.value = getHomeCards().filter((card) => card.enabled);
  rebuildDisplayCards();
};
const handleDragStart = () => {
  isDragging.value = true;
};
const handleDragEnd = () => {
  isDragging.value = false;
  ignoreClickUntil = Date.now() + 250;
};
</script>

<style lang="css">
.homecarda {
  position: relative;
  padding-bottom: 30px;
}

.icon-layout-settings {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 92px 18px 24px;
  background: rgba(25, 31, 48, 0.12);
}

.icon-layout-settings__panel {
  width: min(360px, 100%);
  padding: 18px;
  border: 1px solid rgba(255, 255, 255, 0.42);
  border-radius: 24px;
  color: inherit;
  background: rgba(255, 255, 255, 0.58);
  box-shadow: 0 18px 55px rgba(62, 77, 126, 0.22);
  backdrop-filter: blur(24px) saturate(1.35);
  -webkit-backdrop-filter: blur(24px) saturate(1.35);
}

.homecarda--icon .kcard-special {
  display: flex;
  width: 60px;
  min-width: 60px;
  flex-direction: column;
  align-items: center;
  justify-self: center;
  gap: 6px;
  padding: 0;
  border: 0;
  color: inherit;
  background: transparent;
  font: inherit;
  font-size: 12px;
  line-height: 1.4;
  white-space: nowrap;
}

.kcard-special__icon {
  display: grid;
  width: 52px;
  height: 52px;
  place-items: center;
  border-radius: var(--icon-radius);
  color: inherit;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.92), rgba(224, 231, 248, 0.88));
  box-shadow:
    0 1px 2px rgba(56, 73, 112, 0.14),
    0 5px 12px rgba(94, 117, 177, 0.16),
    inset 0 0 0 1px rgba(255, 255, 255, 0.5);
}

.kcard-special__icon .van-icon {
  font-size: 25px;
}

.icon-layout-settings__header,
.icon-layout-settings__control > span {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.icon-layout-settings__header {
  margin-bottom: 18px;
  font-size: 16px;
}

.icon-layout-settings__switch {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0 4px;
  font-size: 13px;
}

.icon-layout-settings__header button {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 50%;
  color: inherit;
  background: rgba(255, 255, 255, 0.38);
}

.icon-layout-settings__control {
  display: block;
  margin-top: 18px;
  font-size: 13px;
}

.icon-layout-settings__control b {
  font-size: 14px;
}

.icon-layout-settings__control input {
  display: block;
  width: 100%;
  margin-top: 12px;
  accent-color: #7187dc;
}

.icon-layout-settings__preview {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 22px;
  padding-top: 14px;
  border-top: 1px solid rgba(100, 110, 140, 0.16);
  font-size: 12px;
  opacity: 0.7;
}

.icon-layout-settings__preview-icon {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border-radius: var(--icon-radius);
  color: #fff;
  background: linear-gradient(145deg, #6e95ff, #8a6dff);
}

@media (prefers-color-scheme: dark) {
  .icon-layout-settings__header button,
  .kcard-special__icon {
    border-color: rgba(255, 255, 255, 0.12);
    background: rgba(45, 49, 58, 0.72);
  }

  .icon-layout-settings {
    background: rgba(0, 0, 0, 0.22);
  }

  .icon-layout-settings__panel {
    border-color: rgba(255, 255, 255, 0.12);
    background: rgba(35, 39, 48, 0.78);
    box-shadow: 0 18px 55px rgba(0, 0, 0, 0.32);
  }
}

.homecarda--icon .kcard-all {
  grid-template-columns: repeat(auto-fit, minmax(60px, 1fr));
  column-gap: var(--icon-spacing);
  padding-inline: calc(var(--icon-spacing) - 10px);
  box-sizing: border-box;
  row-gap: 16px;
}

.homecarda--card .kcard-special-card-icon {
  width: 20px;
  height: 20px;
  object-fit: contain;
}

.homecarda--icon .kcard-one {
  width: 60px;
  min-width: 60px;
  min-height: 0;
  padding: 0;
  background: transparent;
  border: 0;
  box-shadow: none;
  justify-self: center;
}

.homecarda--icon .kcard-icon-background-special {
  flex-shrink: 0;
}

.homecarda--icon .kcard-special-icon {
  width: 52px;
  height: 52px;
  object-fit: contain;
}

.homecarda--icon .kcard-homea {
  display: flex;
  height: auto;
  min-height: 0;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 6px;
  padding: 0;
}

.homecarda--icon .kcard-font_size {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: 100%;
}

.homecarda--icon .kcard-onepan {
  width: 78px;
  max-width: 78px;
  justify-content: center;
  text-align: center;
  font-size: 12px;
  line-height: 1.4;
  opacity: 0.82;
  overflow: visible;
}

.homecarda--icon .kcardimg,
.homecarda--icon .kcardimg-emoji,
.homecarda--icon .kcard-icon-slot {
  width: 52px;
  height: 52px;
  margin: 0;
}

.homecarda--icon .kcard-icon-background {
  display: flex;
  width: 58px;
  height: 58px;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: var(--icon-radius);
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.92), rgba(224, 231, 248, 0.88));
  box-shadow:
    0 1px 2px rgba(56, 73, 112, 0.14),
    0 5px 12px rgba(94, 117, 177, 0.16),
    inset 0 0 0 1px rgba(255, 255, 255, 0.3);
}

.homecarda--icon .kcard-icon-slot {
  width: auto;
  height: auto;
}

.kcardimg-emoji {
  opacity: 0.9;
}
.homecarda--icon .kcardimg,
.homecarda--icon .kcardimg-custom {
  border-radius: 15px;
  object-fit: cover;
}

.homecarda--icon .kcardimg-emoji {
  align-items: center;
  justify-content: center;
  font-size: 34px;
}

.homecarda--icon .kcard-icon-slot .kcardimg {
  width: var(--custom-icon-size);
  height: var(--custom-icon-size);
}

.homecarda--icon img {
  -webkit-user-drag: none;
  user-drag: none;
  pointer-events: none;
}

@media (prefers-color-scheme: dark) {
  .homecarda--icon .kcard-icon-background {
    background: linear-gradient(145deg, rgba(70, 76, 92, 0.4), rgba(47, 53, 68, 0.1));
    box-shadow:
      0 4px 12px rgba(0, 0, 0, 0.22),
      inset 0 0 0 1px rgba(255, 255, 255, 0.01);
  }
}

.kcard-homea {
  padding: 10px 6px 6px 18px;
}
.kcardimg-emoji {
  display: flex;
  margin-top: -8px;
  width: 20px;
  height: 20px;
  margin-bottom: 30px;
  font-size: 24px;
}

.kcardimg {
  object-fit: contain;
}

.kcardimg-custom {
  width: var(--custom-icon-size);
  height: var(--custom-icon-size);
}

.kcard-icon-slot {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 62px;
  margin-left: -5px;
  margin-top: -20px;
}

.kcard-icon-slot .kcardimg {
  margin-bottom: 0;
}

/* kcardimg-special？ */


.homecarda--icon .kcardimg-built-in  {
  /* svg 图标形状 */
  width: 28px;
  height: 28px;
  border-radius: 0;
  /* max(0px, calc(var(--icon-radius) - 4px)); */
}
</style>
