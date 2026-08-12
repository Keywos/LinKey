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
        <van-cell v-if="chartCount > 1 || chartCount < MAX_CHARTS" center>
          <template #title>
            <div style="display: flex; align-items: center; justify-content: space-around">
              <div v-if="chartCount > 1" style="color: #ee0a24; display: flex; align-items: center; gap: 4px" @touchend="removeLastChartSlot">
                <van-icon name="delete-o" size="16" />
                <span>删除图表</span>
              </div>
              <div v-if="chartCount < MAX_CHARTS" style="color: #1989fa; display: flex; align-items: center; gap: 4px" @touchend="addChartSlot">
                <van-icon name="plus" size="16" />
                <span>添加图表</span>
              </div>
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
    <van-cell title="RULE 测试地址" @click="copyRuleUrl()" is-link />
    <van-cell center title="RULE 并发次数" label="RULE 模式同时请求数量">
      <van-stepper v-model="RuleConcurrency" button-size="22" step="3" min="1" :max="200" />
    </van-cell>

    <van-cell center title="普通 Ping 并发次数" label="普通 Ping 同时请求数量">
      <van-stepper v-model="PingConcurrency" button-size="22" step="3" min="1" :max="200" />
    </van-cell>
    <van-cell center title="超时时间 [ms]">
      <van-stepper v-model="Timeouts" button-size="22" step="200" min="200" />
    </van-cell>
  </van-cell-group>
  <van-checkbox-group v-model="checkedSet" style="padding-bottom: 60px">
    <van-cell-group inset title="Ping 选项设置">
      <van-cell v-for="(item, index) in listSet" clickable :key="item" :title="item" @click="toggleCheckbox(index)">
        <template #right-icon>
          <span @click.stop>
            <van-checkbox :name="item" :ref="(el) => (checkboxRefs[index] = el)" />
          </span>
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
import { ruleDomainList } from "./r.list.js";
import useV3Clipboard from "vue-clipboard3";
const { toClipboard } = useV3Clipboard();
const { screenWidth } = onWidth();
const version = import.meta.env.PACKAGE_VERSION;

const MAX_CHARTS = 10;
// 图表刷新间隔。
// 不要设置成 16ms。
// Ping 测量和 ECharts 绘制没有必要 60FPS。
const CHART_FLUSH_INTERVAL = 120;
// 单个 series 最大原始数据
const MAX_RAW_POINTS = 5000;
// 每次超过上限以后裁掉多少
const RAW_POINTS_TRIM_SIZE = 500;
// ECharts 最终显示多少点
const RENDER_THRESHOLD = 999;
// RULE 最大并发
const MAX_RULE_CONCURRENCY = 200;

const chartColors = ["#4962ae", "#8cc370", "#ee6666", "#b56bdb", "#fc8452", "#9a60b4", "#ea7ccc", "#5ab1ef", "#67e0e3", "#3ba272"];

const copyModuleUrl = async () => {
  await toClipboard("https://github.com/Keywos/rule/tree/main/script/linkey");
  showToast("已拷贝模块地址");
};
const copyRuleUrl = async () => {
  await toClipboard("https://raw.githubusercontent.com/Keywos/rule/main/Scipting/r.list");
  showToast("已拷贝 RULE 地址");
};
const chartCount = ref(Math.min(Number(localStorage.getItem("chartCount")) || 4, MAX_CHARTS));
const hasEcharts = ref(false);
const isloding = ref(false);
const is_body = ref(false);
const apiPing = ref(localStorage.getItem("setApiPing") == 1 || false);
const Pcs = ref(Number(localStorage.getItem("getc")) || 50);
const Timeouts = ref(Number(localStorage.getItem("timeouts")) || 1000);

const RuleConcurrency = ref(Math.min(MAX_RULE_CONCURRENCY, Math.max(1, Number(localStorage.getItem("ruleConcurrency")) || 4)));

const PingConcurrency = ref(Math.min(MAX_RULE_CONCURRENCY, Math.max(1, Number(localStorage.getItem("pingConcurrency")) || 4)));

const isGet = ref(new Array(chartCount.value).fill(false));
const TuA = ref(new Array(chartCount.value).fill(""));
const checked = ref(new Array(chartCount.value).fill("WeChat"));
const dev = ref(Array.from({ length: chartCount.value }, (_, i) => i));
const showPopover = ref(new Array(chartCount.value).fill(false));
const intag = ref(new Array(chartCount.value).fill(""));

const chartRunning = ref(new Array(chartCount.value).fill(false));

let chartData = Array.from({ length: chartCount.value }, () => [0]);
let seriesStartIndex = new Array(chartCount.value).fill(0);
let first = new Array(chartCount.value).fill("");
let after = new Array(chartCount.value).fill("");
let pingStats = Array.from({ length: chartCount.value }, () => ({
  sum: 0,
  min: Infinity,
  max: -Infinity,
  count: 0,
}));
let ruleStats = ref({
  avg: 0,
  min: 0,
  max: 0,
  reject: 0,
  total: 0,
});

let topStats = {
  sum: 0,
  min: Infinity,
  max: -Infinity,
  count: 0,
};
const MAX = ref("--");
const AVG = ref("--");
const MIN = ref("--");
const Namec = ref("--");
const Nlength = ref(1);

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
    icon: apple,
    name: "Apple",
    ms: "--",
    url: "https://www.apple.com/favicon.ico",
  },
  {
    icon: HUAWEI,
    name: "HUAWEI",
    ms: "--",
    url: "https://www.huawei.com/favicon.ico",
  },
];
const list = ["Ali", "Baidu", "WeChat", "Netease", "BiliBili", "Google", "HOK", "DouYin"];
let lg;
try {
  lg = JSON.parse(localStorage.getItem("PingList")) || list;
} catch {
  lg = list;
}
const listys = ["Ali", "Baidu", "WeChat", "Netease", "BiliBili", "Cloudflare", "Google", "GitHub", "Openai", "YouTube", "DouYin", "HOK", "VIVO", "Apple", "TEST", "RULE"];
try {
  const notFound = lg.filter((item) => !listys.includes(item));
  if (notFound.length > 0) {
    lg = list;
    localStorage.setItem("PingList", JSON.stringify(list));
  }
} catch {
  lg = list;
}
const listSet = ref(["Ali", "Baidu", "WeChat", "Netease", "BiliBili", "Cloudflare", "Google", "GitHub", "Openai", "YouTube", "DouYin", "HOK", "VIVO", "Apple", "RULE"]);
const checkedSet = ref(lg);
const checkboxRefs = ref([]);
const toggleCheckbox = (index) => {
  checkboxRefs.value[index]?.toggle();
};
const PingCard = computed(() => listy.filter((item) => checkedSet.value.includes(item.name)));

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
  if (!e) return;
  const touch = e.changedTouches[0];
  const distanceX = Math.abs(touch.pageX - startX);
  const distanceY = Math.abs(touch.pageY - startY);
  if (distanceX < 10 && distanceY < 10) {
    runCardPing(element, index);
  } else {
    activeIndex.value = null;
  }
};

let continuousRefreshInterval = null;
let batchPingCount = 0;
const startBatchPing = () => {
  batchPingCount = 0;
  clearInterval(continuousRefreshInterval);
  isloding.value = true;
  refreshAllCards();
  continuousRefreshInterval = setInterval(() => {
    batchPingCount++;
    if (batchPingCount > 50) {
      showToast("本次测试次数超限" + lg.length * 50);
      stopBatchPing(false);
      return;
    }
    refreshAllCards();
  }, 200);
};
const stopBatchPing = (showMessage = true) => {
  if (showMessage && batchPingCount > 5) {
    showToast("本次请求次数" + lg.length * batchPingCount);
  }
  isloding.value = false;
  clearInterval(continuousRefreshInterval);
  continuousRefreshInterval = null;
  batchPingCount = 0;
};

const chartContainer = ref(null);
let myChart = null;
let option = null;

const dirtySeries = new Set();

const downsampleCache = new Map();

let chartFlushTimer = null;
let chartFlushPending = false;

let resizeTimer = null;

let globalMax = -Infinity;
let seriesRawLen = new Array(chartCount.value).fill(0);

function appendChartPoint(n, value) {
  if (!chartData[n]) {
    chartData[n] = [];
  }
  chartData[n].push(Number(value));
  if (chartData[n].length > MAX_RAW_POINTS) {
    chartData[n].splice(0, RAW_POINTS_TRIM_SIZE);
    seriesStartIndex[n] += RAW_POINTS_TRIM_SIZE;
    downsampleCache.delete(n);
  }
}

function lttbDownsample(data, threshold, startIndex = 0) {
  if (!data || data.length <= threshold) {
    return data.map((value, index) => [startIndex + index, value]);
  }
  const sampled = [];
  sampled.push([startIndex, data[0]]);
  const bucketSize = (data.length - 2) / (threshold - 2);
  let prevIndex = 0;
  for (let i = 1; i < threshold - 1; i++) {
    const rangeStart = Math.floor((i - 1) * bucketSize) + 1;
    const rangeEnd = Math.min(Math.floor(i * bucketSize) + 1, data.length - 1);
    const nextStart = Math.floor(i * bucketSize) + 1;
    const nextEnd = Math.min(Math.floor((i + 1) * bucketSize) + 1, data.length - 1);
    let nextAvgX = 0;
    let nextAvgY = 0;
    const nextLen = nextEnd - nextStart + 1;
    for (let j = nextStart; j <= nextEnd; j++) {
      nextAvgX += j;
      nextAvgY += data[j];
    }
    nextAvgX /= nextLen;
    nextAvgY /= nextLen;
    let maxArea = -1;
    let maxIdx = rangeStart;
    for (let j = rangeStart; j <= rangeEnd; j++) {
      const area = Math.abs((prevIndex - nextAvgX) * (data[j] - data[prevIndex]) - (prevIndex - j) * (nextAvgY - data[prevIndex])) * 0.5;
      if (area > maxArea) {
        maxArea = area;
        maxIdx = j;
      }
    }
    sampled.push([startIndex + maxIdx, data[maxIdx]]);
    prevIndex = maxIdx;
  }
  sampled.push([startIndex + data.length - 1, data[data.length - 1]]);
  return sampled;
}

function flushChart() {
  if (!myChart || !option || dirtySeries.size === 0) {
    return;
  }

  const changedSeries = Array.from(dirtySeries);
  dirtySeries.clear();

  const seriesUpdate = [];

  for (const i of changedSeries) {
    if (!option.series || !option.series[i]) {
      continue;
    }

    const raw = chartData[i] || [];

    if (raw.length === 0) {
      option.series[i].data = [];

      seriesUpdate.push({
        id: `ping-series-${i}`,
        data: [],
      });

      continue;
    }

    const cached = downsampleCache.get(i);

    let renderData;

    if (raw.length <= RENDER_THRESHOLD) {
      renderData = raw.map((value, index) => [seriesStartIndex[i] + index, value]);

      downsampleCache.delete(i);
    } else if (cached && cached.len === raw.length && cached.startIndex === seriesStartIndex[i]) {
      renderData = cached.data;
    } else {
      renderData = lttbDownsample(raw, RENDER_THRESHOLD, seriesStartIndex[i]);

      downsampleCache.set(i, {
        len: raw.length,
        startIndex: seriesStartIndex[i],
        data: renderData,
      });
    }

    option.series[i].data = renderData;
    seriesRawLen[i] = raw.length;

    seriesUpdate.push({
      id: `ping-series-${i}`,
      data: renderData,
    });
  }

  if (seriesUpdate.length === 0) {
    return;
  }

  myChart.setOption(
    {
      series: seriesUpdate,
    },
    {
      lazyUpdate: true,
    },
  );
}

function scheduleChartFlush(n) {
  if (n !== undefined && n !== null) {
    dirtySeries.add(n);
  }
  if (chartFlushPending) {
    return;
  }
  chartFlushPending = true;

  chartFlushTimer = setTimeout(() => {
    chartFlushTimer = null;
    chartFlushPending = false;
    flushChart();
  }, CHART_FLUSH_INTERVAL);
}

function rebuildChartSeries() {
  if (!option) return;

  dirtySeries.clear();
  downsampleCache.clear();

  seriesRawLen = chartData.map((d) => d.length);

  const series = chartData.map((data, i) => {
    let renderData;

    if (!data || data.length === 0) {
      renderData = [];
    } else if (data.length <= RENDER_THRESHOLD) {
      renderData = data.map((value, index) => [seriesStartIndex[i] + index, value]);
    } else {
      renderData = lttbDownsample(data, RENDER_THRESHOLD, seriesStartIndex[i]);

      downsampleCache.set(i, {
        len: data.length,
        startIndex: seriesStartIndex[i],
        data: renderData,
      });
    }

    return {
      id: `ping-series-${i}`,
      animation: false,
      type: "line",
      data: renderData,
      lineStyle: {
        width: 1,
        color: chartColors[i % chartColors.length],
      },
      itemStyle: {
        opacity: 0,
      },
      showSymbol: false,
    };
  });

  series.push({
    id: "ping-series-empty",
    animation: false,
    type: "line",
    data: [],
    itemStyle: {
      opacity: 0,
    },
  });

  option.series = series;

  if (myChart) {
    myChart.setOption(
      {
        series,
      },
      {
        lazyUpdate: true,
        replaceMerge: ["series"],
      },
    );
  }
}

function createChartOption() {
  return {
    title: {
      text: "",
    },
    xAxis: {
      type: "value",
      show: false,
    },
    yAxis: {
      type: "value",
      axisLine: {
        show: false,
      },
      axisTick: {
        show: false,
      },
      splitLine: {
        lineStyle: {
          color: "#cccccc40",
          type: "dotted",
        },
      },
      // max: 100,
    },
    animation: false,
    progressive: 400,
    progressiveThreshold: 300,
    series: chartData
      .map((data, i) => ({
        id: `ping-series-${i}`,
        animation: false,
        type: "line",
        // large: true,
        largeThreshold: 300,
        // sampling: "lttb",
        polyline: false,
        data: data.map((value, index) => [seriesStartIndex[i] + index, value]),
        lineStyle: {
          width: 1,
          color: chartColors[i % chartColors.length],
        },
        itemStyle: {
          opacity: 0,
        },
        showSymbol: false,
      }))
      .concat([
        {
          id: "ping-series-empty",
          animation: false,
          type: "line",
          data: [],
          itemStyle: {
            opacity: 0,
          },
        },
      ]),
  };
}

function addChartSlot() {
  if (chartCount.value >= MAX_CHARTS) {
    return;
  }

  const n = chartCount.value;
  chartCount.value++;
  isGet.value.push(false);
  TuA.value.push("");
  checked.value.push("TEST");
  dev.value.push(n);
  showPopover.value.push(false);
  intag.value.push("");
  chartRunning.value.push(false);

  chartData.push([]);
  seriesStartIndex.push(0);
  first.push("");
  after.push("");

  pingStats.push({
    sum: 0,
    min: Infinity,
    max: -Infinity,
    count: 0,
  });

  seriesRawLen.push(0);

  rebuildChartSeries();

  localStorage.setItem("chartCount", String(chartCount.value));
}

function removeLastChartSlot() {
  if (chartCount.value <= 1) {
    return;
  }
  const n = chartCount.value - 1;
  chartRunning.value[n] = false;
  isGet.value[n] = false;
  chartCount.value--;
  isGet.value.pop();
  TuA.value.pop();
  checked.value.pop();
  dev.value.pop();
  showPopover.value.pop();
  intag.value.pop();
  chartRunning.value.pop();
  chartData.pop();
  seriesStartIndex.pop();
  first.pop();
  after.pop();
  pingStats.pop();
  seriesRawLen.pop();
  dirtySeries.delete(n);
  downsampleCache.delete(n);
  localStorage.removeItem(`checkedValue${n}`);
  localStorage.removeItem(`intag${n}`);
  localStorage.setItem("chartCount", String(chartCount.value));
  rebuildChartSeries();
}

const clearChart = (n) => {
  chartRunning.value[n] = false;
  isGet.value[n] = false;
  chartData[n] = [];
  seriesStartIndex[n] = 0;
  downsampleCache.delete(n);
  seriesRawLen[n] = 0;
  pingStats[n] = {
    sum: 0,
    min: Infinity,
    max: -Infinity,
    count: 0,
  };
  TuA.value[n] = "";
  after[n] = "";
  dev.value[n] = n;
  dirtySeries.delete(n);
  globalMax = -Infinity;
  for (const stats of pingStats) {
    if (Number.isFinite(stats.max) && stats.max > globalMax) {
      globalMax = stats.max;
    }
  }
  MAX.value = Number.isFinite(globalMax) ? Math.floor(globalMax) : "--";
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
  Apple: "https://www.apple.com/favicon.ico",
  HUAWEI: "https://www.huawei.com/favicon.ico",
  TEST: "test",
  RULE: "rule",
};
const ruleDomains = ref([]);
async function loadRuleDomains() {
  ruleDomains.value = ruleDomainList;
  return ruleDomains.value;
}
function pingRuleDomain(domain) {
  const timeout = Math.max(1, Number(Timeouts.value) || 1000);
  const start = Date.now();
  return new Promise((resolve) => {
    let finished = false;
    const finish = (ms, reject) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      resolve({
        domain,
        ms: Math.min(ms, timeout),
        reject,
      });
    };
    const timer = setTimeout(() => {
      finish(timeout, true);
    }, timeout);
    const image = new Image();
    image.onload = () => {
      finish(Date.now() - start, false);
    };
    image.onerror = () => {
      finish(Date.now() - start, true);
    };
    image.src = `https://${domain}/favicon.ico?nfi=${start}`;
  });
}

async function updateRuleApp(n) {
  try {
    const res = await sendReq("get", "https://surgetool.com/api/ping?url=test&name=TEST&ts=" + Date.now() + "&timeout=200", {});
    if (res?.data?.app !== undefined) {
      dev.value[n] = res.data.app;
    }
  } catch {
    dev.value[n] = "未知设备";
  }
}

async function runRulePing(n) {
  if (chartRunning.value[n]) {
    chartRunning.value[n] = false;
    isGet.value[n] = false;
    return;
  }
  const concurrency = Math.min(MAX_RULE_CONCURRENCY, Math.max(1, Math.floor(Number(RuleConcurrency.value) || 20)));
  RuleConcurrency.value = concurrency;
  chartRunning.value[n] = true;
  isGet.value[n] = true;
  ruleStats.value = {
    avg: 0,
    min: 0,
    max: 0,
    reject: 0,
    total: 0,
  };
  chartData[n] = [];
  seriesStartIndex[n] = 0;
  downsampleCache.delete(n);

  let sum = 0;
  let min = Infinity;
  let max = -Infinity;
  let reject = 0;
  let total = 0;
  try {
    const domains = await loadRuleDomains();
    let cursor = 0;
    const worker = async () => {
      while (chartRunning.value[n]) {
        const index = cursor++;
        if (index >= domains.length) {
          return;
        }
        const result = await pingRuleDomain(domains[index]);
        if (!chartRunning.value[n]) {
          return;
        }

        total++;
        sum += result.ms;
        if (result.ms < min) {
          min = result.ms;
        }
        if (result.ms > max) {
          max = result.ms;
        }
        if (result.reject) {
          reject++;
        }
        const avg = sum / total;
        ruleStats.value = {
          avg,
          min,
          max,
          reject,
          total,
        };
        AVG.value = avg.toFixed(1);
        MIN.value = min.toFixed(0);
        MAX.value = max.toFixed(0);
        Namec.value = "RULE";
        Nlength.value = total;
        appendChartPoint(n, result.ms);

        scheduleChartFlush(n);
        TuA.value[n] = `并发: ${RuleConcurrency.value}　Avg: ${avg.toFixed(1)}　Min/Max: ${min.toFixed(0)}/${max.toFixed(0)}　REJECT: ${reject}/${total}`;
      }
    };
    const workerCount = Math.min(concurrency, domains.length);
    await Promise.all(
      Array.from(
        {
          length: workerCount,
        },
        worker,
      ),
    );
  } catch (error) {
    showToast(String(error));
  } finally {
    await updateRuleApp(n);
    chartRunning.value[n] = false;
    isGet.value[n] = false;
  }
}

const runChartPing = async (io, n) => {
  if (io === "RULE") {
    await runRulePing(n);
    return;
  }

  if (io === "TEST" && apiPing.value === false) {
    showToast("❌ 未开启 [使用辅助 API Ping] 无法测试 'TEST'");
    return;
  }

  // 当前图表正在运行：停止
  if (chartRunning.value[n]) {
    chartRunning.value[n] = false;
    isGet.value[n] = false;
    return;
  }

  hasEcharts.value = false;

  const url = listArr[io];

  const concurrency = Math.min(MAX_RULE_CONCURRENCY, Math.max(1, Math.floor(Number(PingConcurrency.value) || 1)));
  // 同步回写，避免 UI 输入超过最大值
  PingConcurrency.value = concurrency;

  chartRunning.value[n] = true;
  isGet.value[n] = true;

  pingStats[n] = {
    sum: 0,
    min: Infinity,
    max: -Infinity,
    count: 0,
  };

  chartData[n] = [];
  seriesStartIndex[n] = 0;
  downsampleCache.delete(n);

  first[n] = "";

  // 当前测试总次数
  const totalRequests = Math.max(0, Math.floor(Number(Pcs.value) || 0));

  // 增量统计
  let sum = 0;
  let min = Infinity;
  let max = -Infinity;
  let total = 0;

  // 已分配给 worker 的任务编号
  let cursor = 0;

  // 整个测试开始时间
  const ts = Date.now();

  try {
    const worker = async () => {
      while (chartRunning.value[n]) {
        const index = cursor++;

        // 总请求次数达到 Pcs
        if (index >= totalRequests) {
          return;
        }

        let x;

        try {
          const requestStart = Date.now();

          x = await fetchPing(url, io, n);

          // 停止后，当前已经返回的请求不再进入统计
          if (!chartRunning.value[n]) {
            return;
          }

          void requestStart;
        } catch {
          if (!chartRunning.value[n]) {
            return;
          }

          x = Number(Timeouts.value);
        }

        // O(1) 增量统计
        total++;
        sum += x;

        if (x < min) {
          min = x;
        }

        if (x > max) {
          max = x;
        }

        const avg = sum / total;

        pingStats[n] = {
          sum,
          min,
          max,
          count: total,
        };

        // 图表数据
        appendChartPoint(n, x);
        scheduleChartFlush(n);

        // 顶部统计
        AVG.value = Math.floor(avg);
        MIN.value = Math.floor(min);
        MAX.value = Math.floor(max);

        Namec.value = io;
        Nlength.value = total;

        // 总耗时
        const elapsed = Date.now() - ts;

        after[n] = elapsed;

        TuA.value[n] =
          `并发: ${concurrency}　Avg: ${Math.floor(avg)}　` +
          `Min/Max: ${Math.floor(min)}/${Math.floor(max)}　` +
          `${total}次 [` +
          `${formatDuration(elapsed)}/` +
          `${(elapsed / total).toFixed(1)}ms]`;

        // 全局 MAX
        if (x > globalMax) {
          globalMax = x;
          MAX.value = Math.floor(x);

          if (option && option.yAxis && globalMax > Number(option.yAxis.max)) {
            scheduleChartFlush(n);
          }
        }
      }
    };

    // 实际 worker 数量不能超过请求总数
    const workerCount = Math.min(concurrency, totalRequests);

    await Promise.all(
      Array.from(
        {
          length: workerCount,
        },
        worker,
      ),
    );
  } catch (error) {
    showToast(String(error));
  } finally {
    chartRunning.value[n] = false;
    isGet.value[n] = false;
  }
};

function formatDuration(e) {
  e = Number(e) || 0;
  if (e < 1000) {
    return `${e.toFixed(0)}ms`;
  }
  if (e < 60000) {
    return `${(e / 1000).toFixed(2)}S`;
  }
  if (e < 3600000) {
    return `${(e / 60000).toFixed(2)}分钟`;
  }
  return `${(e / 3600000).toFixed(2)}小时`;
}

const cardRunning = ref(new Set());
const runCardPing = async (item, index) => {
  hasEcharts.value = true;

  if (cardRunning.value.has(index)) {
    cardRunning.value.delete(index);
    activeIndex.value = null;
    return;
  }
  cardRunning.value.add(index);
  activeIndex.value = index;
  try {
    topStats = {
      sum: 0,
      min: Infinity,
      max: -Infinity,
      count: 0,
    };
    Namec.value = item.name;
    Nlength.value = 0;

    if (!chartRunning.value[0]) {
      chartData[0] = [];
      seriesStartIndex[0] = 0;
      downsampleCache.delete(0);
    }
    for (let c = 0; c < Number(Pcs.value) && cardRunning.value.has(index); c++) {
      const x = await fetchPing(item.url, item.name);
      if (!cardRunning.value.has(index)) {
        break;
      }
      topStats.sum += x;
      topStats.count++;
      Nlength.value = topStats.count;
      if (x < topStats.min) {
        topStats.min = x;
      }
      if (x > topStats.max) {
        topStats.max = x;
      }
      item.ms = x;
      AVG.value = Math.floor(topStats.sum / topStats.count);
      MIN.value = Math.floor(topStats.min);
      MAX.value = Math.floor(topStats.max);

      if (!chartRunning.value[0]) {
        appendChartPoint(0, x);
        scheduleChartFlush(0);
      }
    }
  } finally {
    cardRunning.value.delete(index);
    activeIndex.value = null;
  }
};

const calcProgress = (x) => {
  if (typeof x !== "number") {
    return 10;
  }
  const range = x < 200 ? 70 : 100;
  return x > 900 ? 96 : Math.floor((x / Math.ceil(x / 100)) * (range / 100));
};

let isRefreshingCards = false;
async function refreshAllCards() {
  if (isRefreshingCards) {
    return;
  }
  isRefreshingCards = true;
  try {
    const promises = PingCard.value.map(async (card) => {
      try {
        const x = await fetchPing(card.url, card.name);
        card.ms = x;
      } catch {
        card.ms = Number(Timeouts.value);
      }
    });
    await Promise.all(promises);
  } finally {
    isRefreshingCards = false;
  }
}

const toggleApiModule = async (enabled) => {
  if (enabled) {
    try {
      const res = await Promise.race([sendReq("GET", "https://surgetool.com/api/ping?url=test"), new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 500))]);
      if (res?.data?.sp) {
        showToast("检测到 SPing 模块, 当前为代理APP请求");
        localStorage.setItem("setApiPing", 1);
        apiPing.value = true;
      } else {
        showApiError();
      }
    } catch {
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
      let iu = "";
      const tss = Date.now();
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
      const requestStart = Date.now();
      let res;
      if (is_body.value) {
        res = await sendReq(
          "post",
          "https://surgetool.com/api/ping?url=" + encodeURIComponent(iu) + "&name=" + encodeURIComponent(name) + "&ts=" + tss + "&timeout=" + Timeouts.value,
          undefined,
          JSON.stringify({
            ts: tss,
            name,
            url: iu,
          }),
        );
      } else {
        res = await sendReq("get", "https://surgetool.com/api/ping?url=" + encodeURIComponent(iu) + "&name=" + encodeURIComponent(name) + "&ts=" + tss + "&timeout=" + Timeouts.value);
      }

      // 保留辅助模块返回的 app，只是不再使用它返回的 ms
      if (n !== undefined && res?.data?.app !== undefined) {
        if (dev.value[n] !== res.data.app) {
          dev.value[n] = res.data.app;
        }
        if (url !== "test" && res.data.ms !== undefined) {
          return Math.min(res.data.ms, Number(Timeouts.value));
        }
      }
      const elapsed = Date.now() - requestStart;
      return Math.min(elapsed, Number(Timeouts.value));
    } catch {
      return Number(Timeouts.value);
    }
  }

  const start = Date.now();
  const timeoutMs = Math.max(1, Number(Timeouts.value) || 1000);
  return new Promise((resolve) => {
    let finished = false;
    const finish = (value) => {
      if (finished) {
        return;
      }
      finished = true;
      clearTimeout(timeoutTimer);
      resolve(Math.min(value, timeoutMs));
    };
    const timeoutTimer = setTimeout(() => {
      finish(timeoutMs);
    }, timeoutMs);
    const img = new Image();
    img.onload = () => {
      finish(Date.now() - start);
    };
    img.onerror = () => {
      finish(Date.now() - start);
    };
    img.src = `${url}?nfi=${Date.now()}`;
  });
};

async function ensureECharts() {
  if (window.echarts) {
    return window.echarts;
  }
  const script = document.createElement("script");
  script.src = "echarts.mins.js";
  const scriptLoaded = new Promise((resolve, reject) => {
    script.onload = resolve;
    script.onerror = reject;
  });
  document.head.appendChild(script);
  await scriptLoaded;
  return window.echarts;
}

let settingsDebounce = null;
function persistSettings() {
  clearTimeout(settingsDebounce);
  settingsDebounce = setTimeout(() => {
    localStorage.setItem("getc", String(Pcs.value));
    localStorage.setItem("timeouts", String(Timeouts.value));
    localStorage.setItem("PingList", JSON.stringify(checkedSet.value));
  }, 300);
}
watch(Pcs, persistSettings);
watch(Timeouts, persistSettings);
watch(checkedSet, persistSettings, {
  deep: true,
});

watch(RuleConcurrency, (value) => {
  const v = Math.min(200, Math.max(1, Number(value) || 1));
  if (v !== value) {
    RuleConcurrency.value = v;
  }
  localStorage.setItem("ruleConcurrency", String(v));
});

watch(PingConcurrency, (value) => {
  const v = Math.min(200, Math.max(1, Number(value) || 1));
  if (v !== value) {
    PingConcurrency.value = v;
  }
  localStorage.setItem("pingConcurrency", String(v));
});

let checkedDebounce = null;
let intagDebounce = null;
onMounted(() => {
  for (let i = 0; i < chartCount.value; i++) {
    checked.value[i] = localStorage.getItem(`checkedValue${i}`) || "WeChat";
    intag.value[i] = localStorage.getItem(`intag${i}`) || "";
  }

  if (localStorage.getItem("setApiPing") == 1) {
    apiPing.value = true;
    toggleApiModule(true);
  }

  ensureECharts()
    .then(() => {
      option = createChartOption();
      myChart = echarts.init(chartContainer.value);
      myChart.setOption(option, true);

      watch(screenWidth, (newScreenWidth, oldScreenWidth) => {
        if (newScreenWidth === oldScreenWidth) {
          return;
        }
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          if (!myChart || !chartContainer.value) {
            return;
          }
          myChart.resize();
        }, 100);
      });

      watch(
        checked,
        (newVal, oldVal) => {
          newVal.forEach((val, index) => {
            if (oldVal && index < oldVal.length && val !== oldVal[index]) {
              clearTimeout(checkedDebounce);

              clearTimeout(checkedDebounce);
              checkedDebounce = setTimeout(() => {
                clearChart(index);
              }, 100);
            }
            localStorage.setItem(`checkedValue${index}`, val);
          });
        },
        {
          deep: true,
        },
      );

      watch(
        intag,
        (newVal) => {
          clearTimeout(intagDebounce);
          intagDebounce = setTimeout(() => {
            newVal.forEach((val, index) => {
              localStorage.setItem(`intag${index}`, val);
            });
          }, 500);
        },
        {
          deep: true,
        },
      );
    })
    .catch((error) => {
      console.error("ECharts 加载失败:", error);
    });

  let counta = 0;
  const firstRefresh = setInterval(() => {
    refreshAllCards();
    counta++;
    if (counta > 2) {
      clearInterval(firstRefresh);
    }
  }, 150);
});

onBeforeUnmount(() => {
  chartRunning.value = chartRunning.value.map(() => false);

  cardRunning.value.clear();

  stopBatchPing(false);

  clearTimeout(chartFlushTimer);
  chartFlushTimer = null;
  chartFlushPending = false;

  clearTimeout(settingsDebounce);
  clearTimeout(checkedDebounce);
  clearTimeout(intagDebounce);
  clearTimeout(resizeTimer);

  if (myChart) {
    try {
      myChart.dispose();
    } catch {}
    myChart = null;
  }
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
