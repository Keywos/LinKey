<template>
  <div style="overflow-x: hidden; -webkit-user-select: none; user-select: none">
    <h2>Network Ping</h2>

    <div class="homept girepaly" style="justify-content: space-between; padding-right: 24px">
      <p class="plengclass">Ping V:{{ version }}</p>
      <van-button icon="replay" color="#cccccc36" round :loading="isloding" size="small" type="success" @touchstart="startBatchPing" @touchend="stopBatchPing">Ping</van-button>
    </div>

    <div class="kcard-all">
      <div
        v-for="(element, index) in PingCard"
        :key="element.name"
        class="kcard-one"
        :class="{ active: activeIndex === index }"
        @touchstart="onCardTouchStart($event, index)"
        @touchend="onCardTouchEnd($event, element, index)"
      >
        <div :key="element.id" class="kcard-font_size kcard-ping_jd">
          <img class="kcard-imggit" :src="element.icon" />
          <div style="padding: 34px 0 0 3px; position: absolute; width: 100%">
            <div class="kcard-onepan" style="position: absolute; display: contents">
              {{ element.name }}
            </div>

            <div class="kcard-t">
              <div style="width: 100%">
                <div style="width: 96%; padding-left: 4px">
                  <van-progress :percentage="calcProgress(element.ms)" stroke-width="16" pivot-text="" color="linear-gradient(to right, #be99ff, #7232dd)" />
                </div>
                <div
                  :style="{
                    color: element.ms > 4000 ? 'red' : '',
                  }"
                  style="position: absolute; font-size: 11px; opacity: 0.7; bottom: 13px; padding-bottom: 1.5px; right: 12px"
                >
                  {{ element.ms }} ms
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div ref="chartContainer" style="height: 310px; margin: -30px; padding-left: 32px; padding-right: 12px" />
    <div>
      <div class="echart_span" v-if="hasEcharts">
        <span class="ecsi" style="min-width: 46px; padding-left: 20px">AVG: {{ AVG }}</span>
        <span class="ecsi" style="min-width: 46px">MIN: {{ MIN }}</span>
        <span class="ecsi" style="min-width: 50px">MAX: {{ MAX }}</span>
        <span class="ecsi" style="min-width: 69px">{{ Namec }}: {{ Nlength }}</span>
      </div>
      <div v-else class="echart_span"></div>
    </div>
    <div>
      <van-cell-group inset title="">
        <van-cell v-for="ci in chartCount" :key="'chart-' + ci" class="van-cell-sw" :label="TuA[ci - 1]">
          <template #title>
            <van-button size="small" :color="chartColors[(ci - 1) % chartColors.length]" @touchend="showPopover[ci - 1] = true">
              <div style="min-width: 82px">{{ dev[ci - 1] }}: {{ checked[ci - 1] }}</div>
            </van-button>
            <van-button size="small" color="#00000000">
              <van-field v-model="intag[ci - 1]" placeholder="输入标签" style="width: 70px; padding: 0px" />
            </van-button>
            <van-button
              icon="replay"
              color="#cccccc36"
              :loading="isGet[ci - 1]"
              size="small"
              type="primary"
              @touchend="runChartPing(checked[ci - 1], ci - 1)"
              style="position: absolute; top: 14px; right: 76px"
            ></van-button>
            <van-button size="small" type="primary" @touchend="clearChart(ci - 1)" style="position: absolute; top: 14px; right: 14px">清空</van-button>
            <van-popover v-model:show="showPopover[ci - 1]" placement="top" overlay :offset="[-134, 20]">
              <van-grid square clickable :border="false" column-num="3" style="width: 100px; height: 486px; padding: 6px 42px 30px 6px">
                <div style="width: 130px; text-align: center">
                  <van-radio-group v-model="checked[ci - 1]">
                    <van-radio v-for="(item, index) in listys" :key="index" :name="item" style="padding: 8px 16px 8px 18px">
                      {{ item }}
                    </van-radio>
                  </van-radio-group>
                </div>
              </van-grid>
            </van-popover>
          </template>
        </van-cell>
        <van-cell v-if="chartCount < MAX_CHARTS" clickable @touchend="addChartSlot" center>
          <template #title>
            <div style="text-align: center; color: #1989fa; display: flex; align-items: center; justify-content: center; gap: 4px">
              <van-icon name="plus" size="16" />
              <span>添加图表</span>
            </div>
          </template>
        </van-cell>
      </van-cell-group>
    </div>
  </div>
  <van-cell-group inset title="Ping 设置">
    <van-cell title="模块地址" @click="copyModuleUrl()" is-link />

    <van-cell class="van-cell-sw" center title="使用辅助 API Ping" inset label="需要安装上面的辅助模块">
      <template #right-icon>
        <van-switch v-model="apiPing" @change="toggleApiModule(apiPing)" />
      </template>
    </van-cell>

    <van-cell class="van-cell-sw" center title="请求 body 加入负载" inset label="需要安装上面的辅助模块">
      <template #right-icon>
        <van-switch v-model="is_body" />
      </template>
    </van-cell>

    <van-cell center title="请求次数" label="点击右边数字可以输入">
      <van-stepper v-model="Pcs" button-size="22" step="50" min="0" />
    </van-cell>
    <van-cell center title="超时时间 [ms]">
      <van-stepper v-model="Timeouts" button-size="22" step="200" min="200" />
    </van-cell>
  </van-cell-group>
  <van-checkbox-group v-model="checkedSet" style="padding-bottom: 60px">
    <van-cell-group inset title="Ping 选项设置">
      <van-cell v-for="(item, index) in listSet" clickable :key="item" :title="item" @click="toggleCheckbox(index)">
        <template #right-icon>
          <van-checkbox :name="item" :ref="(el) => (checkboxRefs[index] = el)" @touchend.stop />
        </template>
      </van-cell>
    </van-cell-group>
  </van-checkbox-group>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue";
import github from "@/img/svg/github.svg";
import ali from "@/img/svg/ali.svg";
import baidu from "@/img/svg/baidu.svg";
import bili from "@/img/svg/bili.svg";
import cloudflare from "@/img/svg/cloudflare.svg";
import google from "@/img/svg/google.svg";
import Netease from "@/img/svg/netease.svg";
import openai from "@/img/svg/openai.svg";
import wechat from "@/img/svg/wechat.svg";
import wz from "@/img/svg/wz.svg";
import vivo from "@/img/svg/vivo.svg";
import HUAWEI from "@/img/svg/HUAWEI.svg";
import apple from "@/img/svg/apple.svg";
import dy from "@/img/svg/dy.svg";
import youtube from "@/img/svg/youtube.svg";
import { showToast } from "vant";
import { onWidth } from "@/hooks/winWidth";
import { sendReq } from "@/http/http.js";
import { apis } from "./ap.js";
import useV3Clipboard from "vue-clipboard3";
const { toClipboard } = useV3Clipboard();
const { screenWidth } = onWidth();
const version = import.meta.env.PACKAGE_VERSION;

const copyModuleUrl = async () => {
  await toClipboard("https://github.com/Keywos/rule/tree/main/script/linkey");
  showToast("已拷贝模块地址");
};

const chartColors = ['#4962ae', '#8cc370', '#ee6666', '#b56bdb', '#fc8452', '#9a60b4', '#ea7ccc', '#5ab1ef', '#67e0e3', '#3ba272'];
const MAX_CHARTS = 10;
const chartCount = ref(Math.min(Number(localStorage.getItem('chartCount')) || 4, MAX_CHARTS));

const hasEcharts = ref(false);
const isloding = ref(false);
const is_body = ref(false);
const apiPing = ref(localStorage.getItem("setApiPing") == 1 || false);

const isGet = ref(new Array(chartCount.value).fill(false));
const TuA = ref(new Array(chartCount.value).fill(''));
const checked = ref(new Array(chartCount.value).fill('WeChat'));
const dev = ref(Array.from({ length: chartCount.value }, (_, i) => i));
const showPopover = ref(new Array(chartCount.value).fill(false));
const intag = ref(new Array(chartCount.value).fill(''));
let chartData = Array.from({ length: chartCount.value }, () => []);
let first = new Array(chartCount.value).fill('');
let after = new Array(chartCount.value).fill('');
let pingStats = Array.from({ length: chartCount.value }, () => ({ sum: 0, min: Infinity, max: -Infinity, count: 0 }));
let topStats = { sum: 0, min: Infinity, max: -Infinity, count: 0 };

const MAX = ref("--");
const AVG = ref("--");
const MIN = ref("--");
const Namec = ref("--");
const Nlength = ref(1);

let startX = 0;
let startY = 0;

const activeIndex = ref(null);
const onCardTouchStart = (e, index) => {
  activeIndex.value = index;
  const touch = e.touches[0];
  startX = touch.pageX;
  startY = touch.pageY;
};
const onCardTouchEnd = (e, element, index) => {
  if (!e) {
    return;
  }
  const touch = e.changedTouches[0];
  const distanceX = Math.abs(touch.pageX - startX);
  const distanceY = Math.abs(touch.pageY - startY);
  if (distanceX < 10 || distanceY < 10) {
    runCardPing(element, index);
  } else {
    activeIndex.value = null;
  }
};

const listy = [
  {
    icon: wechat,
    name: "WeChat",
    ms: "--",
    url: "https://res.wx.qq.com/a/wx_fed/assets/res/NTI4MWU5.ico",
  },
  {
    icon: ali,
    name: "Ali",
    ms: "--",
    url: "https://www.taobao.com/favicon.ico",
  },
  {
    icon: bili,
    name: "BiliBili",
    ms: "--",
    url: "https://www.bilibili.com/favicon.ico",
  },

  {
    icon: baidu,
    name: "Baidu",
    ms: "--",
    url: "https://apps.bdimg.com/favicon.ico",
  },

  {
    icon: Netease,
    name: "Netease",
    ms: "--",
    url: "https://interface.music.163.com/favicon.ico",
  },
  {
    icon: github,
    name: "GitHub",
    ms: "--",
    url: "https://github.githubassets.com/favicon.ico",
  },

  {
    icon: google,
    name: "Google",
    ms: "--",
    url: "https://www.google.com/images/errors/robot.png",
  },
  {
    icon: cloudflare,
    name: "Cloudflare",
    ms: "--",
    url: "https://www.cloudflare.com/favicon.ico",
  },
  {
    icon: youtube,
    name: "YouTube",
    ms: "--",
    url: "https://www.youtube.com/favicon.ico",
  },
  {
    icon: openai,
    name: "Openai",
    ms: "--",
    url: "https://chat.openai.com/favicon.ico",
  },
  {
    icon: wz,
    name: "HOK",
    ms: "--",
    url: "https://pvp.qq.com/favicon.ico",
  },
  {
    icon: dy,
    name: "DouYin",
    ms: "--",
    url: "https://www.douyin.com/favicon.ico",
  },
  {
    icon: vivo,
    name: "VIVO",
    ms: "--",
    url: "https://www.vivo.com.cn/favicon.ico",
  },
  {
    icon: HUAWEI,
    name: "HUAWEI",
    ms: "--",
    url: "https://www.huawei.com/favicon.ico",
  },
  {
    icon: apple,
    name: "Apple",
    ms: "--",
    url: "https://www.apple.com/favicon.ico",
  },
];
const list = ["Ali", "Baidu", "WeChat", "Netease", "BiliBili", "Google", "HOK", "DouYin"];
let lg = JSON.parse(localStorage.getItem("PingList")) || list;
const listys = ["Ali", "Baidu", "WeChat", "Netease", "BiliBili", "Cloudflare", "Google", "GitHub", "Openai", "YouTube", "DouYin", "HOK", "VIVO", "HUAWEI", "Apple", "TEST"];

try {
  const notFound = lg.filter((item) => !listys.includes(item));
  if (notFound.length > 0) {
    localStorage.setItem("PingList", JSON.stringify(list));
  }
} catch (error) {}

const listSet = ref(["Ali", "Baidu", "WeChat", "Netease", "BiliBili", "Cloudflare", "Google", "GitHub", "Openai", "YouTube", "DouYin", "HOK", "VIVO", "HUAWEI", "Apple"]);
const checkedSet = ref(lg);
const checkboxRefs = ref([]);
const toggleCheckbox = (index) => {
  checkboxRefs.value[index].toggle();
};

const Pcs = ref(localStorage.getItem("getc") || 50);

const Timeouts = ref(localStorage.getItem("timeouts") || 1000);

const PingCard = computed(() => listy.filter((i) => checkedSet.value.includes(i.name)));
const chartContainer = ref(null);

let continuousRefreshInterval = null;

let x = 0;
const startBatchPing = () => {
  x = 0;
  clearInterval(continuousRefreshInterval);
  isloding.value = true;
  refreshAllCards();
  continuousRefreshInterval = setInterval(() => {
    x++;
    if (x > 50) {
      showToast("本次测试次数超限" + lg.length * 50);
      clearInterval(continuousRefreshInterval);
      isloding.value = false;
      x = 0;
    }
    refreshAllCards();
  }, 200);
};

const stopBatchPing = () => {
  if (x > 5) showToast("本次请求次数" + lg.length * x);
  isloding.value = false;
  clearInterval(continuousRefreshInterval);
  x = 0;
};

let myChart;
let option;
let chartRafPending = false;
const dirtySeries = new Set();
let globalMax = -Infinity;
const downsampleCache = new Map();
const DOWNSAMPLE_THROTTLE = 3;
let downsampleTick = 0;
let seriesRawLen = [];

function flushChart() {
  if (!myChart || !option || dirtySeries.size === 0) return;
  downsampleTick++;
  const shouldRecompute = downsampleTick >= DOWNSAMPLE_THROTTLE;
  if (shouldRecompute) downsampleTick = 0;

  dirtySeries.forEach(i => {
    if (!option.series[i]) return;
    const raw = chartData[i];
    const cached = downsampleCache.get(i);
    let renderData;
    if (raw.length <= RENDER_THRESHOLD) {
      renderData = raw;
      downsampleCache.delete(i);
    } else if (cached && cached.len === raw.length) {
      renderData = cached.data;
    } else if (!shouldRecompute && cached) {
      renderData = cached.data;
    } else {
      renderData = lttbDownsample(raw, RENDER_THRESHOLD);
      downsampleCache.set(i, { len: raw.length, data: renderData });
    }
    option.series[i].data = renderData;
    seriesRawLen[i] = raw.length;
  });

  const maxLen = option.series.reduce((m, s, i) => {
    if (i === option.series.length - 1) return m; 
    return Math.max(m, s.data.length);
  }, 0);
  for (let i = 0; i < option.series.length - 1; i++) {
    const sd = option.series[i].data;
    if (sd.length < maxLen) {
      option.series[i].data = sd.concat(new Array(maxLen - sd.length).fill(null));
    }
  }

  myChart.setOption(option, { replaceMerge: ['series'] });
  dirtySeries.clear();
}

function scheduleChartFlush(n) {
  if (n !== undefined) dirtySeries.add(n);
  if (!chartRafPending && myChart) {
    chartRafPending = true;
    requestAnimationFrame(() => {
      flushChart();
      chartRafPending = false;
    });
  }
}

function rebuildChartSeries() {
  if (!option) return;
  dirtySeries.clear();
  downsampleCache.clear();
  seriesRawLen = chartData.map(d => d.length);
  option.series = chartData.map((data, i) => ({
    animation: false,
    type: 'line',
    large: true,
    largeThreshold: 300,
    sampling: 'lttb',
    data,
    lineStyle: { width: 1, color: chartColors[i % chartColors.length] },
    itemStyle: { opacity: 0 },
    showSymbol: false,
  }));
  option.series.push({
    animation: false,
    type: 'line',
    data: [1],
    itemStyle: { opacity: 0 },
  });
  if (myChart) myChart.setOption(option, true);
}

function addChartSlot() {
  if (chartCount.value >= MAX_CHARTS) return;
  const n = chartCount.value;
  chartCount.value++;
  isGet.value.push(false);
  TuA.value.push('');
  checked.value.push('WeChat');
  dev.value.push(n);
  showPopover.value.push(false);
  intag.value.push('');
  chartData.push([]);
  first.push('');
  after.push(0);
  pingStats.push({ sum: 0, min: Infinity, max: -Infinity, count: 0 });
  seriesRawLen.push(0);
  rebuildChartSeries();
  localStorage.setItem('chartCount', chartCount.value);
}

function lttbDownsample(data, threshold) {
  if (data.length <= threshold) return data;
  const sampled = [data[0]];
  const bucketSize = (data.length - 2) / (threshold - 2);
  let prevIndex = 0;
  for (let i = 1; i < threshold - 1; i++) {
    const rangeStart = Math.floor((i - 1) * bucketSize) + 1;
    const rangeEnd = Math.min(Math.floor(i * bucketSize) + 1, data.length - 1);
    const nextStart = Math.floor(i * bucketSize) + 1;
    const nextEnd = Math.min(Math.floor((i + 1) * bucketSize) + 1, data.length - 1);
    let nextAvgX = 0, nextAvgY = 0;
    const nextLen = nextEnd - nextStart + 1;
    for (let j = nextStart; j <= nextEnd; j++) { nextAvgX += j; nextAvgY += data[j]; }
    nextAvgX /= nextLen; nextAvgY /= nextLen;
    let maxArea = -1, maxIdx = rangeStart;
    for (let j = rangeStart; j <= rangeEnd; j++) {
      const area = Math.abs((prevIndex - nextAvgX) * (data[j] - data[prevIndex]) - (prevIndex - j) * (nextAvgY - data[prevIndex])) * 0.5;
      if (area > maxArea) { maxArea = area; maxIdx = j; }
    }
    sampled.push(data[maxIdx]);
    prevIndex = maxIdx;
  }
  sampled.push(data[data.length - 1]);
  return sampled;
}

const RENDER_THRESHOLD = 666;

function createChartOption() {
  return {
    title: { text: '' },
    xAxis: { type: 'category', data: '', show: false },
    yAxis: {
      type: 'value',
      max: 60,
      splitLine: { lineStyle: { color: '#cccccc40', type: 'dotted' } },
    },
    animation: false,
    progressive: 400,
    progressiveThreshold: 300,
    series: chartData.map((data, i) => ({
      animation: false,
      type: 'line',
      large: true,
      largeThreshold: 300,
      sampling: 'lttb',
      polyline: false,
      data,
      lineStyle: { width: 1, color: chartColors[i % chartColors.length] },
      itemStyle: { opacity: 0 },
      showSymbol: false,
    })).concat([{
      animation: false,
      type: 'line',
      data: [1],
      itemStyle: { opacity: 0 },
    }]),
  };
}

let isRunning = false;
onMounted(() => {
  for (let i = 0; i < chartCount.value; i++) {
    checked.value[i] = localStorage.getItem(`checkedValue${i}`) || 'WeChat';
    intag.value[i] = localStorage.getItem(`intag${i}`) || '';
  }

  if (localStorage.getItem("setApiPing") == 1) {
    apiPing.value = true;
    toggleApiModule(apiPing);
  }
  ensureECharts().then(() => {
    option = createChartOption();
    myChart = echarts.init(chartContainer.value);
    myChart.setOption(option, true);

    watch(screenWidth, (newScreenWidth, oldScreenWidth) => {
      if (newScreenWidth !== oldScreenWidth) {
        myChart.dispose();
        myChart = echarts.init(chartContainer.value);
        myChart.setOption(option, true);
      }
    });

    let checkedDebounce = null;
    const pendingClears = new Set();
    watch(checked, (newVal, oldVal) => {
      newVal.forEach((val, index) => {
        if (oldVal && index < oldVal.length && val !== oldVal[index]) {
          pendingClears.add(index);
        }
        localStorage.setItem(`checkedValue${index}`, val);
      });
      clearTimeout(checkedDebounce);
      checkedDebounce = setTimeout(() => {
        pendingClears.forEach(idx => clearChart(idx));
        pendingClears.clear();
      }, 100);
    }, { deep: true });

    let intagDebounce = null;
    watch(intag, (newVal) => {
      clearTimeout(intagDebounce);
      intagDebounce = setTimeout(() => {
        newVal.forEach((val, index) => {
          localStorage.setItem(`intag${index}`, val);
        });
      }, 500);
    }, { deep: true });
  });

  setTimeout(() => {
    let counta = 0;
    const interval = setInterval(() => {
      refreshAllCards();
      counta++;
      if (counta > 2) clearInterval(interval);
    }, 100);
  }, 100);
});

async function ensureECharts() {
  if (!window.echarts) {
    const script = document.createElement("script");
    script.src = "echarts.mins.js";
    const scriptLoaded = new Promise((resolve) => {
      script.onload = resolve;
    });
    document.head.appendChild(script);
    await scriptLoaded;
  }
  return window.echarts;
}

const clearChart = (n) => {
  isRunning = false;
  chartData[n] = [];
  downsampleCache.delete(n);
  seriesRawLen[n] = 0;
  pingStats[n] = { sum: 0, min: Infinity, max: -Infinity, count: 0 };
  TuA.value[n] = "";
  after[n] = "";
  dev.value[n] = n;
  globalMax = pingStats.reduce((m, s) => Math.max(m, s.max), -Infinity);
  MAX.value = isFinite(globalMax) ? Math.floor(globalMax) : "--";
  option.yAxis.max = isFinite(globalMax) ? Math.ceil(globalMax / 30) * 30 : 60;
  rebuildChartSeries();
};

const listArr = {
  WeChat: "https://res.wx.qq.com/a/wx_fed/assets/res/NTI4MWU5.ico",
  Ali: "https://www.taobao.com/favicon.ico",
  BiliBili: "https://www.bilibili.com/favicon.ico",
  Baidu: "https://apps.bdimg.com/favicon.ico",
  Netease: "https://s1.music.126.net/style/favicon.ico",
  GitHub: "https://github.githubassets.com/favicon.ico",
  Google: "https://www.gstatic.com/images/branding/searchlogo/ico/favicon.ico",
  Cloudflare: "https://www.cloudflare.com/favicon.ico",
  YouTube: "https://www.youtube.com/favicon.ico",
  Openai: "https://chat.openai.com/favicon.ico",
  HOK: "https://pvp.qq.com/favicon.ico",
  DouYin: "https://www.douyin.com/favicon.ico",
  VIVO: "https://www.vivo.com.cn/favicon.ico",
  HUAWEI: "https://www.huawei.com/favicon.ico",
  Apple: "https://www.apple.com/favicon.ico",
  TEST: "test",
};

const runChartPing = async (io, n) => {
  if (io === "TEST" && apiPing.value == false) {
    showToast("❌ 未开启 [使用辅助 API Ping] 无法测试 'TEST'");
    isRunning = false;
    return;
  }
  if (isRunning) { isRunning = false; return; }
  hasEcharts.value = false;
  const i = listArr[io];
  let ts = Date.now();
  isRunning = true;
  let x;
  isGet.value[n] = true;
  pingStats[n] = { sum: 0, min: Infinity, max: -Infinity, count: 0 };
  chartData[n] = [];
  if (first[n] === "") { first[n] = i; }
  else { ts = Date.now() - after[n]; }
  try {
    let c = 1;
    while (c <= Pcs.value) {
      c++;
      if (!isRunning) break;
      try {
        const tns = Date.now();
        x = await fetchPing(i, io, n);
        if (!isRunning) return;
        if (checked.value[n] == "TEST") x = Date.now() - tns;
        const s = pingStats[n];
        s.sum += x; s.count++;
        if (x < s.min) s.min = x;
        if (x > s.max) s.max = x;
        chartData[n].push(x);
        scheduleChartFlush(n);
        if (s.max > globalMax) {
          globalMax = s.max;
          MAX.value = Math.floor(globalMax);
          if (globalMax > option.yAxis.max) {
            option.yAxis.max = Math.ceil(globalMax / 30) * 30;
          }
        }
        after[n] = Date.now() - ts;
        TuA.value[n] = `Avg: ${Math.floor(s.sum / s.count)}\u3000Min/Max: ${Math.floor(s.min)}/${Math.floor(s.max)}\u3000${s.count}次 [${formatDuration(after[n])}/${(after[n] / s.count).toFixed(1)}ms]`;
      } catch (error) { break; }
    }
  } finally {
    isGet.value.fill(false);
    isRunning = false;
  }
};
function formatDuration(e) {
  e = e.toString();
  if (e < 1e3) {
    return `${e}ms`;
  } else if (e < 6e4) {
    return `${(e / 1e3).toFixed(2)}S`;
  } else if (e < 36e5) {
    return `${(e / 6e4).toFixed(2)}分钟`;
  }
}

const runCardPing = async (i, n) => {
  hasEcharts.value = true;
  if (isRunning) { isRunning = false; activeIndex.value = null; return; }
  isRunning = true;
  try {
    for (let c = 1; c <= Pcs.value && isRunning; c++) {
      try {
        activeIndex.value = n;
        const x = await fetchPing(i.url, i.name);
        PingCard.value[n].ms = x;
        if (Namec.value === '' || Namec.value !== i.name) {
          const isNewTarget = Namec.value !== '' && Namec.value !== i.name;
          Nlength.value = isNewTarget ? 1 : Nlength.value + 1;
          Namec.value = i.name;
          topStats = { sum: x, min: x, max: x, count: 1 };
          chartData[0] = [x];
          downsampleCache.delete(0);
          rebuildChartSeries();
          if (isNewTarget) { option.yAxis.max = 100; globalMax = -Infinity; }
        } else {
          Nlength.value++;
          topStats.sum += x; topStats.count++;
          if (x < topStats.min) topStats.min = x;
          if (x > topStats.max) topStats.max = x;
          chartData[0].push(x);
          scheduleChartFlush(0);
          MIN.value = Math.floor(topStats.min);
          MAX.value = Math.floor(topStats.max);
          if (topStats.max > globalMax) {
            globalMax = topStats.max;
            if (globalMax > option.yAxis.max) {
              option.yAxis.max = Math.ceil(globalMax / 100) * 100;
            }
          }
          AVG.value = Math.floor(topStats.sum / topStats.count);
        }
      } catch (error) { break; }
    }
  } finally {
    isRunning = false;
    activeIndex.value = null;
  }
};

const calcProgress = (x) => {
  if (typeof x != "number") return 10;
  const range = x < 200 ? 70 : 100;
  return x > 900 ? 96 : Math.floor((x / Math.ceil(x / 100)) * (range / 100));
};
async function refreshAllCards() {
  const promises = [];
  for (const card of PingCard.value) {
    promises.push(
      fetchPing(card.url, card.name).then((x) => {
        card.ms = x;
      })
    );
  }
  await Promise.all(promises);
}

const toggleApiModule = async (i) => {
  if (i) {
    try {
      let res = await Promise.race([sendReq("GET", "https://surgetool.com/api/ping?url=test"), new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 500))]);
      if (res?.data["sp"]) {
        showToast("检测到 SPing 模块, 当前为代理APP请求");
        localStorage.setItem("setApiPing", 1);
        apiPing.value = true;
      } else {
        showApiError();
      }
    } catch (error) {
      showApiError();
    }
  } else {
    localStorage.removeItem("setApiPing");
  }
};

function showApiError() {
  showToast("❌ 未检测到 SPing 模块, 当前为浏览器发起请求");
  localStorage.removeItem("setApiPing");
  apiPing.value = false;
}
const fetchPing = async (url, name, n) => {
  if (apiPing.value) {
    try {
      let iu = "",
        tss = Date.now();
      if (apis[name]) {
        iu = apis[name];
        if (iu.includes("favicon.ico")) {
          iu += "?nfi=" + tss;
        }
      } else if (url.includes("favicon.ico")) {
        iu = url + "?nfi=" + tss;
      } else {
        iu = url;
      }
      let res;

      if (is_body.value) {
        res = await sendReq(
          "post",
          "https://surgetool.com/api/ping?url=" + encodeURIComponent(iu) + "&name=" + name + "&ts=" + tss + "&timeout=" + Timeouts.value,
          undefined,
          JSON.stringify({ ts: tss, name: name, url: iu })
        );
      } else {
        res = await sendReq("get", "https://surgetool.com/api/ping?url=" + encodeURIComponent(iu) + "&name=" + name + "&ts=" + tss + "&timeout=" + Timeouts.value);
      }
      if (res?.data["app"]) {
        const devs = res?.data["app"] || false;

        if (devs !== false) {
          if (dev.value[n] !== devs) {
            dev.value[n] = devs;
          }
        }
        return res?.data["ms"];
      } else {
        return Number(Timeouts.value);
      }
    } catch (error) {
      return Number(Timeouts.value);
    }
  } else {
    const t1 = Date.now();
    return new Promise((resolve) => {
      const img = new Image();
      const timeout = setTimeout(() => {
        resolve(Number(Timeouts.value));
      }, Timeouts.value);

      img.onload = () => {
        clearTimeout(timeout);
        const x = Date.now() - t1;
        resolve(x);
      };

      img.onerror = () => {
        clearTimeout(timeout);
        const x = Date.now() - t1;
        resolve(x);
      };

      img.src = `${url}?nfi=${Date.now()}`;
    });
  }
};

let settingsDebounce = null;
function persistSettings() {
  clearTimeout(settingsDebounce);
  settingsDebounce = setTimeout(() => {
    localStorage.setItem("getc", Pcs.value);
    localStorage.setItem("timeouts", Timeouts.value);
    localStorage.setItem("PingList", JSON.stringify(checkedSet.value));
  }, 300);
}
watch(Pcs, persistSettings);
watch(Timeouts, persistSettings);
watch(checkedSet, persistSettings, { deep: true });

onBeforeUnmount(() => {
  isRunning = false;
  clearTimeout(settingsDebounce);
});
</script>

<style>
.echart_span {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: -54px;
  margin-bottom: 30px;
}
.ecsi {
  padding: 0 5px;
  font-size: 11px;
  opacity: 0.5;
}
.van-button--success {
  border: none;
}
.van-circle__text {
  opacity: 0.7;
  font-size: 10px !important;
}
.van-circle__layer {
  stroke: #837e7e8c;
}

.van-progress {
  position: relative;
  height: var(--van-progress-height);
  background: #ebedf021;
  border-radius: 10px;
}

.kcard-ping_jd {
  position: relative;
  margin-left: 8px;
  margin-right: 17px;
}
</style>
