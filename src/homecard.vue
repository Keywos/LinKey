<template>
  <div class="homecarda" style="-webkit-user-select: none; user-select: none">
    <draggable
      class="kcard-all"
      v-model="hcard"
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
        handle: 'div',
      }"
      @change="changeSort"
    >
      <template #item="{ element }">
        <div class="kcard-one" @click="navigateToRoute(element.r)">
          <div :key="element.id" class="kcard-homea">
            <div class="kcard-font_size">
              <span v-if="isCustomUrlIcon(element)" class="kcard-icon-slot">
                <img class="kcardimg kcardimg-custom" :style="getIconSizeStyle(element)" :src="element.img" alt="" />
              </span>
              <img v-else-if="isImageIcon(element.img)" class="kcardimg" :src="element.img" alt="" />
              <span v-else class="kcardimg-emoji">{{ element.img }}</span>
              <span class="kcard-onepan">{{ element.id }}</span>
            </div>
          </div>
        </div>
      </template>
    </draggable>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from "vue";
import { showToast } from "vant";
import { useRouter } from "vue-router";
import draggable from "vuedraggable";
import myArray from "./arr.js";
import { getHomeCards, saveHomeCards } from "./homeCards.js";

const router = useRouter();
const hcard = ref(getHomeCards().filter((card) => card.enabled));
const isImageIcon = (icon) => icon.startsWith("/") || icon.startsWith("data:") || /^https?:\/\//.test(icon);
const isCustomUrlIcon = (card) => /^https?:\/\//.test(card.img) && typeof card.iconSize === "number";
const getIconSizeStyle = (card) => (isCustomUrlIcon(card) ? { "--custom-icon-size": `${card.iconSize}px` } : undefined);

const changeSort = () => {
  const allCards = getHomeCards();
  const hiddenCards = allCards.filter((card) => !card.enabled);
  sethomes(hcard.value);
  saveHomeCards([...hcard.value, ...hiddenCards]);
};
function sethomes(i) {
  const nameSortArray = Object.fromEntries(i.map((k, index) => [k.id, index]));
  localStorage.setItem("HomePageSort", JSON.stringify(nameSortArray));
}

const refreshHomeCards = () => {
  hcard.value = getHomeCards().filter((card) => card.enabled);
};
onMounted(() => window.addEventListener("home-cards-change", refreshHomeCards));
onUnmounted(() => window.removeEventListener("home-cards-change", refreshHomeCards));

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
</script>

<style lang="css">
.homecarda {
  padding-bottom: 30px;
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
</style>
