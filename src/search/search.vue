<template>
  <div id="searchk">
    <div class="version-display" @click="showPopover = true">
      <p>点击查看关于/设置</p>
      <p>Made With By LinKey {{ version }} {{ screenWidth }}</p>

      <van-popover v-model:show="showPopover" placement="top" overlay :offset="[0, 45]">
        <van-grid square clickable :border="false" column-num="3" style="width: 130px; height: 230px; padding: 8px 16px 30px 18px">
          <div style="width: 130px; text-align: center">
            <p @click="showCenter = true">
              关于
              <van-icon name="question-o" />
            </p>

            <van-checkbox-group v-model="searchTabs" @change="checkedResultChange">
              <van-checkbox v-for="item in oldList" :key="item" :name="item" style="padding: 7px 14px; border-radius: 18px; margin-top: 6px">
                <div>
                  {{ item }}
                </div>
              </van-checkbox>
            </van-checkbox-group>
          </div>
        </van-grid>
      </van-popover>
    </div>

    <van-popup v-model:show="showCenter" position="bottom" round :style="{ padding: '6px 34px 20px 34px' }">
      <h3>关于页面</h3>
      ▸ 按住搜索栏下方标签可拖动排序
      <p>▸ 单击搜索栏上方图标可访问对应页面</p>
      <p>▸ 路由 searchs 或者 s 没有底部导航栏</p>
      ▸ 如果遇到问题
      <a @click="ClearCache">点击我清除缓存</a>
      <p>▸ 更多问题反馈 ThenKey</p>
      <p>▸ 本项目仅作个人测试学习所用</p>
      <p>▸ {{ version }}</p>
    </van-popup>

    <div style="height: 79vh">
      <div class="search-logo">
        <a id="Logohref" target="_blank" :href="LogoAlt">
          <img :src="Logoimg" />
        </a>
      </div>

      <div class="search-from">
        <form id="searchForm" action="/">
          <van-search v-model="searchFormvalue" :placeholder="'输入关键词 '" @search="onSearch" shape="round" background="transparent" />
        </form>
      </div>

      <draggable
        class="draggable-search"
        :scroll-sensitivity="200"
        :force-fallback="true"
        :scroll-speed="8"
        :scroll="true"
        @change="changeSort(searchTabs)"
        @start="changeSortStart"
        @end="changeSortEnd(searchTabs)"
        v-model="searchTabs"
        itemKey="title"
        v-bind="{
          animation: 400,
          disabled: false,
          chosenClass: 'kcard-bkcss',
          delay: 50,
        }"
      >
        <template #item="{ element, index }">
          <button class="selected-items" @click="setActiveTab(element, index)" :class="{ 'active-taba': activeTabTitle === element }">
            {{ element }}
          </button>
        </template>
      </draggable>

      <div class="indicatora" v-show="showST">
        <div class="indicators" :style="{ transform: `translateX(${nTab * 60}px)` }"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import { showToast } from "vant";
import draggable from "vuedraggable";
import githubLogo from "/gh.png";
import googleLogo from "/gg.png";
import baiduLogo from "/bd.png";
import bingLogo from "/bi.png";
import bilibiliLogo from "/bl.png";
import { useRoute, useRouter } from "vue-router";
import { onWidth } from "@/hooks/winWidth.js";
const version = import.meta.env.PACKAGE_VERSION;
const searchFormvalue = ref("");
const STabKeyWidth = ref("-115px");
const showST = ref(false);
const showCenter = ref(false);
const showPopover = ref(false);

const oldList = ["Bing", "Google", "Baidu", "GitHub", "BiliBili"];

const searchTabs = ref(["Bing", "Google", "Baidu"]);

const ClearCache = () => {
  localStorage.removeItem("SearchTabSort");
  localStorage.removeItem("SearchTabKey");
  searchTabs.value = oldList.slice(0, 3);
  showToast("清理完毕");
};

const checkedResultChange = (i) => {
  localStorage.setItem("SearchTabSort", JSON.stringify(i));
  console.log("写入多选框值数组");
  console.log(JSON.stringify(i));
};

let LocalGetArr = localStorage.getItem("SearchTabSort");

console.log("----");
function hasNullOrObject(i) {
  try {
    i = JSON.parse(i);
    for (let o = 0; o < i.length; o++) {
      if (i[o] === null || typeof i[o] === "object") {
        return false;
      }
      if (!oldList.includes(i[o])) {
        return false;
      }
    }
    return true;
  } catch (e) {
    return false;
  }
}

if (hasNullOrObject(LocalGetArr)) {
  console.log("有缓存,是数组");

  LocalGetArr = JSON.parse(LocalGetArr);

  if (LocalGetArr.length > 1) showST.value = true;
  searchTabs.value = LocalGetArr;
} else {
  console.log("首次写入...");
  LocalGetArr = searchTabs.value;
  localStorage.setItem("SearchTabSort", JSON.stringify(searchTabs.value));
}

const changeSort = (i) => {
  console.log("修改数组顺序");
  console.log(JSON.stringify(i));
  localStorage.setItem("SearchTabSort", JSON.stringify(i));
};

STabKeyWidth.value = findNthTerm(searchTabs.value.length);

function findNthTerm(n) {
  return 5 + (n - 1) * -30 + "px";
}

const onSearch = (val) => {
  console.log(searchkey.value + val);
  window.open(searchkey.value + val, "_blank");
};

const NowTabKey = ref(localStorage.getItem("SearchTabKey"));

if (!oldList.includes(NowTabKey.value)) {
  console.log("NowTabKey无效");
  localStorage.setItem("SearchTabKey", "Bing");
  NowTabKey.value = "Bing";
}

if (!searchTabs.value.includes(NowTabKey.value)) {
  NowTabKey.value = searchTabs.value[searchTabs.value.length - 1];
}

const SURL = {
  Bing: {
    url: "https://www.bing.com/search?q=",
    alt: "https://www.bing.com",
    img: bingLogo,
  },
  Baidu: {
    url: "https://www.baidu.com/s?word=",
    alt: "https://www.baidu.com",
    img: baiduLogo,
  },
  Google: {
    url: "https://www.google.com/search?q=",
    alt: "https://www.google.com/ncr",
    img: googleLogo,
  },
  GitHub: {
    url: "https://www.github.com/search?q=",
    alt: "https://www.github.com/search",
    img: githubLogo,
  },
  BiliBili: {
    url: "https://search.bilibili.com/all?keyword=",
    alt: "https://search.bilibili.com",
    img: bilibiliLogo,
  },
};

const searchkey = ref("https://www.bing.com/search?q=");
setUrl();
function setUrl() {
  if (SURL[NowTabKey.value]?.url) {
    searchkey.value = SURL[NowTabKey.value].url;
  }
}

const LogoAlt = ref("https://www.bing.com");
setLogoAlt();
function setLogoAlt() {
  if (SURL[NowTabKey.value]?.alt) {
    LogoAlt.value = SURL[NowTabKey.value].alt;
  }
}

const Logoimg = ref(bingLogo);
setLogoImg(NowTabKey.value);
function setLogoImg(i) {
  if (SURL[i]?.img) {
    Logoimg.value = SURL[i].img;
  }
}

const route = useRoute();
const router = useRouter();
const activeTabTitle = ref(NowTabKey.value);
const nTab = ref(0);
try {
  nTab.value = searchTabs.value.findIndex((tab) => tab === NowTabKey.value);
} catch (error) {}

const setActiveTab = (i, o) => {
  nTab.value = o;
  NowTabKey.value = i;
  setUrl();
  setLogoAlt();
  setLogoImg(i);
  activeTabTitle.value = i;
  localStorage.setItem("SearchTabKey", i);
};

const backgroundNew = ref("#8fa8cd");

const changeSortStart = () => {
  console.log("开始");
  backgroundNew.value = "transparent";
};

const changeSortEnd = (i) => {
  const indexOfBing = i.findIndex((tab) => tab === NowTabKey.value);
  nTab.value = indexOfBing;
  setTimeout(() => {
    backgroundNew.value = "#8fa8cda9";
    console.log(backgroundNew.value);
  }, 500);
};

const hasHistory = computed(() => {
  return route.meta?.hasHistory ?? false;
});
const onClickLeft = () => {
  if (hasHistory) {
    router.replace("/");
  } else {
    history.back();
  }
};

const screenWidth = ref(onWidth().screenWidth);

const fromWidth = computed(() => {
  console.log("screenWidth: " + screenWidth.value);
  return Math.round(90 + ((screenWidth.value - 500) * -45) / 1250) + "%";
});
watch(
  () => searchTabs.value,
  (i) => {
    const ilength = i.length;
    if (ilength >= 0) {
      STabKeyWidth.value = findNthTerm(ilength);
      console.log("i");
      console.log(NowTabKey.value);
      if (!i.includes(NowTabKey.value)) NowTabKey.value = i[ilength - 1];
      activeTabTitle.value = NowTabKey.value;
      setUrl();
      setLogoAlt();
      setLogoImg(NowTabKey.value);
      nTab.value = i.findIndex((tab) => tab === NowTabKey.value);
      if (ilength === 0) showST.value = false;
    }
  }
);
</script>

<style>
:root {
  --van-nav-bar-background: transparent: !important;
  --van-nav-bar-icon-color: #181717c1!important;
  --van-popover-light-background: #f3f3f4d2!important;
  /* 搜索 关于 弹窗 */

  /* --van-border-width: 0px; */
  /* --van-white:#2f3135; */
}
/* .van-checkbox__icon--checked .van-icon {
  color: #060708dc;
} */
.van-checkbox__icon--checked .van-icon {
    color: #3b3737e8!important;
  }
/* (--van-popover-light-background); */
/* __content */
.van-popover {
  /* overflow: hidden; */
  border-radius: 12px;
}
@media (prefers-color-scheme: dark) {
  :root {
    --van-popover-light-background: #1817177a!important;
    /* 搜索 关于 弹窗 */
    --van-nav-bar-icon-color: #f1f1f1c1!important;
    /* --van-border-width: 0px; */
    /* --van-white:#2f3135; */
  }
  .van-checkbox__icon--checked .van-icon {
    color: #060708dc!important;
  }


}



.draggable-search {
  display: flex;
  justify-content: center;
  margin-top: 10px;
}

.search-logo {
  padding-top: 18vh;
}
.search-logo img {
  opacity: 0.9;
  display: block;
  margin: 0 auto;
  width: auto;
  height: 60px;
}
.search-from {
  width: v-bind(fromWidth);
  margin: 0 auto;
}
.horizontal-tabs {
  display: flex;
  background-color: #ffffff63;
}
#searchk .van-field__control {
  margin-top: 4px;
}
:root {
  /* --van-checkbox-label-color: #ad4f4f; */
  --van-toast-background: #c1cbd5d8;
  --van-toast-radius: 20px;
  /* --van-toast-text-color: #ad4f4f; */

  /* --van-tabs-nav-background: */

  /* --van-padding-base:7px; */

  /* --van-search-background:#FFF; */
}
#searchForm .van-search__content--round {
  /* background-color: #181818cf; */
  height: 41px;
}

#searchForm .van-icon-clear {
  margin-top: 6px;
  padding: 0px 10px;
}
/* #searchForm .van-search__field {
  flex: 1;
  align-items: center;
  padding: 1px var(--van-padding-xs) 0 0;
  height: var(--van-search-input-height);
  background-color: transparent;
} */
.van-field__left-icon .van-icon, .van-field__right-icon .van-icon {
  padding-top: 8px;
}
.selected-items {
  background-color: #8fa8cdb6;
  margin-left: 5px;
  margin-right: 5px;
  padding: 0 5px;
  font-size: 11px;

  border-radius: 14px;

  color: #fff;
  z-index: 2;
  width: 50px;
  height: 26px;
  border-radius: 14px;
  display: -webkit-box;
  background-color: #8fa8cd2c;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.3s ease;
  border: none;
}
.selected-items:hover {
  background-color: #8fa8cda9;
}

.active-taba {
  background-color: #8fa8cd;
}

.indicatora {
  display: flex;
  justify-content: center;
  margin-top: -26px;
}
.indicators {
  position: relative;
  left: v-bind(STabKeyWidth);
  margin-right: 25px;
  margin-left: 15px;
  padding: 0 5px;
  transition: transform 0.4s ease;
  width: 40px;
  height: 26px;
  z-index: 0;
  border-radius: 14px;
  background-color: v-bind(backgroundNew);
}

.searchkeys {
  background: #8fa8cd;
}

.linekey {
  background-color: #7d94d524;
  width: 50px;
  height: 1px;
}
.version-display {
  position: fixed;
  bottom: 65px;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
  width: 100%;
  line-height: 4px;
  font-size: 10px;
  font-weight: 560;
  color: #7f7f8454;
}
</style>
