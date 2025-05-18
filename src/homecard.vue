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
      @change="changeSort(hcard)"
    >
      <template #item="{ element }">
        <div class="kcard-one" @click="navigateToRoute(element.r)">
          <div :key="element.id" class="kcard-homea">
            <div class="kcard-font_size">
              <img class="kcardimg" :src="element.img" alt="" />
              <span class="kcard-onepan">{{ element.id }}</span>
            </div>
          </div>
        </div>
      </template>
    </draggable>
  </div>
</template>

<script setup>
import { ref } from "vue";
import ts from "@/img/svg/ts.svg";
import success from "@/img/svg/success.svg";
import carry from "@/img/svg/carry.svg";
import cny from "@/img/svg/cny.svg";
import sf from "@/img/svg/sf.svg";
import safa from "@/img/svg/safa.svg";
import hgithub from "@/img/svg/hgithub.svg";
import w from "@/img/svg/w.svg";
import { showToast } from "vant";
import { useRouter } from "vue-router";
import draggable from "vuedraggable";
import myArray from "./arr.js";

const router = useRouter();
const hcard = ref([
  {
    id: "极简搜索",
    img: safa,
    r: "/s",
  },
  {
    id: "URL 工具箱",
    img: sf,
    r: "/codeurl",
  },
  {
    id: "Ping",
    img: carry,
    r: "/ping",
  },
  {
    id: "性能测试",
    img: safa,
    r: "/netms",
  },
  {
    id: "时间戳转换",
    img: ts,
    r: "/timestamp",
  },
  {
    id: "代码编辑器",
    img: w,
    r: "/EditCode",
  },
  {
    id: "极简代码编辑器",
    img: w,
    r: "/EditCode_noNav",
  },
  {
    id: "Base64 转换",
    img: cny,
    r: "/base64",
  },
  {
    id: "Troubleshoot",
    img: safa,
    r: "/st",
  },
  {
    id: "Gist File",
    img: hgithub,
    r: "/gist",
  },
  {
    id: "Unicode ",
    img: sf,
    r: "/unicode",
  },
  {
    id: "Punycode 编解码",
    img: w,
    r: "/punycode",
  },
  {
    id: "Count",
    img: cny,
    r: "/count",
  },
  {
    id: "OPEN AI",
    img: safa,
    r: "/",
  },
  {
    id: "Symbian",
    img: w,
    r: "/",
  },
  {
    id: "WP",
    img: cny,
    r: "/",
  },
  {
    id: "Nothing",
    img: safa,
    r: "/",
  },
  {
    id: "Lumia",
    img: w,
    r: "/",
  },
  {
    id: "SONY",
    img: success,
    r: "/key",
  },
  {
    id: "ZEISS",
    img: success,
    r: "/keys",
  },
  {
    id: "Mon",
    img: success,
    r: "/",
  },
  {
    id: "SAMSNUG",
    img: success,
    r: "/",
  },
]);

const changeSort = (i) => {
  sethomes(i);
};
let iserr = false;
try {
  const getsort = JSON.parse(localStorage.getItem("HomePageSort"));
  if (Object.keys(getsort)?.length === hcard.value.length) {
    hcard.value.sort((a, b) => getsort[a.id] - getsort[b.id]);
  } else iserr = true;
} catch (e) {
  iserr = true;
}
if (iserr) sethomes(hcard.value);

function sethomes(i) {
  const nameSortArray = Object.fromEntries(i.map((k, index) => [k.id, index]));
  localStorage.setItem("HomePageSort", JSON.stringify(nameSortArray));
}

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
</style>
