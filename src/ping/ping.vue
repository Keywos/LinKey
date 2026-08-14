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
    <van-cell center title="请求次数" label="点击右边数字可以输入">
      <van-stepper v-model="Pcs" button-size="22" step="50" min="0" />
    </van-cell>

    <van-cell center title="RULE 并发次数" label="">
      <van-stepper v-model="RuleConcurrency" button-size="22" step="3" min="1" :max="200" />
    </van-cell>

    <van-cell center title="普通 Ping 并发次数" label="">
      <van-stepper v-model="PingConcurrency" button-size="22" step="3" min="1" :max="200" />
    </van-cell>
    <van-cell center title="超时时间 [ms]">
      <van-stepper v-model="Timeouts" button-size="22" step="50" min="50" />
    </van-cell>
    <van-cell center title="刷新间隔 [ms]">
      <van-stepper v-model="ChartInterval" button-size="22" step="50" min="10" />
    </van-cell>
    <van-cell class="van-cell-sw" center title="测试结束后再更新图表" inset label="">
      <template #right-icon>
        <van-switch v-model="deferChartUpdate" />
      </template>
    </van-cell>
    <van-cell class="van-cell-sw" center title="域名前 不加时间戳" inset label="">
      <template #right-icon>
        <van-switch v-model="tsDomain" />
      </template>
    </van-cell>

    <van-cell title="模块地址" @click="copyModuleUrl()" is-link />
    <van-cell title="RULE 测试地址" @click="copyRuleUrl()" is-link />
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
  </van-cell-group>
  <br />
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

// 单个 series 最大原始数据
const MAX_RAW_POINTS = 5000;
// 每次超过上限以后裁掉多少
const RAW_POINTS_TRIM_SIZE = 100;
// ECharts 最终显示多少点
const RENDER_THRESHOLD = 1000;
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
// 图表刷新间隔。

const hasEcharts = ref(false);
const isloding = ref(false);
const is_body = ref(false);
const apiPing = ref(localStorage.getItem("setApiPing") == 1 || false);
// 测试结束后再更新 TuA 与曲线，减少测试过程中 UI/ECharts 对测速精度的影响
const deferChartUpdate = ref(localStorage.getItem("deferChartUpdate") == "1");

const tsDomain = ref(localStorage.getItem("tsDomain") == "1");
const Pcs = ref(Number(localStorage.getItem("getc")) || 50);
const Timeouts = ref(Number(localStorage.getItem("timeouts")) || 1000);
const ChartInterval = ref(Number(localStorage.getItem("ChartInterval")) || 200);

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
  min: 0,
  max: 0,
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
  min: 0,
  max: 0,
  count: 0,
};
const MAX = ref("--");
const AVG = ref("--");
const MIN = ref("--");
const Namec = ref("--");
const Nlength = ref(1);
function sleep() {
  return new Promise((resolve) => setTimeout(resolve, 3));
}
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
  }, ChartInterval.value);
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
    min: 0,
    max: 0,
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
    min: 0,
    max: 0,
    count: 0,
  };
  TuA.value[n] = "";
  after[n] = "";
  dev.value[n] = n;
  dirtySeries.delete(n);
  MAX.value = "--";
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
// const ruleDomains = ref([]);
// async function loadRuleDomains() {
//   ruleDomains.value = ruleDomainList;
//   return ruleDomains.value;
// }

async function pingRuleDomain(domain, timeout) {
  const start = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  const url = !tsDomain.value ? `https://td${Date.now()}.${domain}/favicon.ico?_=${start}` : `https://${domain}/favicon.ico?_=${start}`;
  try {
    await fetch(url, {
      method: "GET",
      mode: "no-cors",
      cache: "no-store",
      signal: controller.signal,
    });
    const ms = performance.now() - start;
    return {
      domain,
      ms: Math.min(Math.max(ms, 0.1), timeout), // 保留小数，最低显示 0.1
      reject: false,
    };
  } catch {
    const ms = performance.now() - start;
    return {
      domain,
      ms: Math.min(Math.max(ms, 0.1), timeout),
      reject: true,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function updateRuleApp(n) {
  try {
    const res = await sendReq("get", `https://getapp.linkey.com/api/ping?url=test`, {});
    if (res?.data?.app !== undefined) {
      dev.value[n] = res.data.app;
    }
  } catch {
    dev.value[n] = "未知设备";
  }
}

let lastUiUpdateAt = 0;

function maybeUpdateUi(n, payload, force = false) {
  const now = Date.now();
  if (!force && now - lastUiUpdateAt < ChartInterval.value) {
    return;
  }
  lastUiUpdateAt = now;

  const { avg, min, max, total, name, text } = payload;
  AVG.value = Number.isFinite(avg) ? avg.toFixed(2) : "--";
  MIN.value = Number.isFinite(min) ? Math.floor(min) : "--";
  MAX.value = Number.isFinite(max) ? Math.floor(max) : "--";
  Namec.value = name || "--";
  Nlength.value = total || 0;
  if (text != null) {
    TuA.value[n] = text;
  }
}

function applyPendingPointsToChart(n, pendingPoints) {
  if (!pendingPoints.length) return;
  chartData[n] = pendingPoints.slice();
  seriesStartIndex[n] = 0;
  if (chartData[n].length > MAX_RAW_POINTS) {
    const excess = chartData[n].length - MAX_RAW_POINTS;
    chartData[n].splice(0, excess);
    // 与 appendChartPoint 裁剪策略对齐时可改为：
    // while (chartData[n].length > MAX_RAW_POINTS) {
    //   chartData[n].splice(0, RAW_POINTS_TRIM_SIZE);
    //   seriesStartIndex[n] += RAW_POINTS_TRIM_SIZE;
    // }
  }
  downsampleCache.delete(n);
}

// ========== RULE 模式 ==========
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

  // 热路径用普通对象，避免每条结果写 ref

  let min = 0;
  let max = 0;
  let reject = 0;
  let total = 0;
  const pendingPoints = [];

  chartData[n] = [];
  seriesStartIndex[n] = 0;
  downsampleCache.delete(n);
  lastUiUpdateAt = 0;

  ruleStats.value = {
    avg: 0,
    min: 0,
    max: 0,
    reject: 0,
    total: 0,
  };

  try {
    const domains = ruleDomainList;
    let cursor = 0;

    const worker = async () => {
      const timeout = Math.max(1, Number(Timeouts.value) || 1000);
      // 支持任意请求次数（可超过 domains.length）
      const maxCount = Math.max(0, Number(Pcs.value) || 0);

      if (deferChartUpdate.value) {
        while (chartRunning.value[n]) {
          const index = cursor++;
          if (index >= maxCount) return;
          const domain = domains[index % domains.length];
          const result = await pingRuleDomain(domain, timeout);
          if (!chartRunning.value[n]) return;
          const ms = result.ms;
          total++;
          if (result.reject) reject++;
          pendingPoints.push(ms);
        }
      } else {
        while (chartRunning.value[n]) {
          const index = cursor++;
          if (index >= maxCount) return;
          const domain = domains[index % domains.length];
          const result = await pingRuleDomain(domain, timeout);
          if (!chartRunning.value[n]) return;
          const ms = result.ms;
          total++;
          if (result.reject) reject++;
          pendingPoints.push(ms);
          appendChartPoint(n, ms);
          scheduleChartFlush(n);
        }
      }
    };

    const workerCount = Math.min(concurrency, domains.length);
    await Promise.all(Array.from({ length: workerCount }, worker));
  } catch (error) {
    showToast(String(error));
  } finally {
    max = Math.max(...pendingPoints);
    min = Math.min(...pendingPoints);

    await updateRuleApp(n);
    chartRunning.value[n] = false;
    isGet.value[n] = false;

    if (deferChartUpdate.value && pendingPoints.length > 0) {
      applyPendingPointsToChart(n, pendingPoints);
    }
    const avg = (pendingPoints.reduce((acc, val) => acc + val, 0) / pendingPoints.length).toFixed(2);
    ruleStats.value = {
      avg,
      min,
      max,
      reject,
      total,
    };
    maybeUpdateUi(
      n,
      {
        avg,
        min,
        max,
        total,
        name: "RULE",
        text: `并发: ${concurrency}　Avg: ${avg}　` + `Min/Max: ${min.toFixed(0)}/${max.toFixed(0)}　` + `REJECT: ${reject}/${total}`,
      },
      true,
    );
    scheduleChartFlush(n);
  }
}

// ========== 普通图表 Ping ==========
const runChartPing = async (io, n) => {
  if (io === "RULE") {
    await runRulePing(n);
    return;
  }

  if (io === "TEST" && apiPing.value === false) {
    showToast("❌ 未开启 [使用辅助 API Ping] 无法测试 'TEST'");
    return;
  }

  if (chartRunning.value[n]) {
    chartRunning.value[n] = false;
    isGet.value[n] = false;
    return;
  }

  hasEcharts.value = false;

  const url = listArr[io];
  const concurrency = Math.min(MAX_RULE_CONCURRENCY, Math.max(1, Math.floor(Number(PingConcurrency.value) || 1)));
  PingConcurrency.value = concurrency;

  chartRunning.value[n] = true;
  isGet.value[n] = true;

  // 热路径普通变量

  let min = 0;
  let max = 0;
  let total = 0;
  let avg = 0;
  const pendingPoints = [];
  let cursor = 0;
  const totalRequests = Math.max(0, Math.floor(Number(Pcs.value) || 0));
  const ts = Date.now();
  let elapsed = 0;

  chartData[n] = [];
  seriesStartIndex[n] = 0;
  downsampleCache.delete(n);
  first[n] = "";
  after[n] = 0;
  lastUiUpdateAt = 0;

  // 结束时再写回，避免热路径写 pingStats ref 结构
  pingStats[n] = {
    min: 0,
    max: 0,
    count: 0,
  };

  try {
    const worker = async () => {
      const timeout = Math.max(1, Number(Timeouts.value) || 1000);

      if (deferChartUpdate.value) {
        while (chartRunning.value[n]) {
          const index = cursor++;
          if (index >= totalRequests || !chartRunning.value[n]) return;
          let x = await fetchPing(url, io, n, timeout);
          total++;
          pendingPoints.push(x);
        }
      } else {
        while (chartRunning.value[n]) {
          const index = cursor++;
          if (index >= totalRequests || !chartRunning.value[n]) return;
          let x = await fetchPing(url, io, n, timeout);
          total++;
          pendingPoints.push(x);
          elapsed = Date.now() - ts;
          after[n] = elapsed;
          appendChartPoint(n, x);
          scheduleChartFlush(n);
        }
      }
    };

    const workerCount = Math.min(concurrency, totalRequests);
    await Promise.all(Array.from({ length: workerCount }, worker));
  } catch (error) {
    showToast(String(error));
  } finally {
    chartRunning.value[n] = false;
    isGet.value[n] = false;
    max = Math.max(...pendingPoints);
    min = Math.min(...pendingPoints);

    avg = (pendingPoints.reduce((acc, val) => acc + val, 0) / pendingPoints.length).toFixed(2);
    pingStats[n] = {
      min,
      max,
      count: total,
    };

    if (deferChartUpdate.value && pendingPoints.length > 0) {
      applyPendingPointsToChart(n, pendingPoints);
    }

    if (total > 0) {
      elapsed = after[n] || Date.now() - ts;
      maybeUpdateUi(
        n,
        {
          avg,
          min,
          max,
          total,
          name: io,
          text: `并发: ${concurrency}　Avg: ${avg}　` + `Min/Max: ${min.toFixed(0)}/${max.toFixed(0)}　` + `${total}次 [` + `${formatDuration(elapsed)}/` + `${(elapsed / total).toFixed(1)}ms]`,
        },
        true,
      );
      scheduleChartFlush(n);
    }
    updateRuleApp(n);
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
  let pinglist = [];
  if (cardRunning.value.has(index)) {
    cardRunning.value.delete(index);
    activeIndex.value = null;
    return;
  }
  cardRunning.value.add(index);
  activeIndex.value = index;
  try {
    topStats = {
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
      const x = await fetchPing(item.url, item.name, 0, timeout);
      if (!cardRunning.value.has(index)) {
        break;
      }
      pinglist.push(x);
      topStats.count++;
      Nlength.value = topStats.count;

      item.ms = x;
      AVG.value = (pinglist.reduce((acc, val) => acc + val, 0) / pinglist.length).toFixed(2);
      MIN.value = Math.floor(Math.min(...pinglist));
      MAX.value = Math.floor(Math.max(...pinglist));
      if (!chartRunning.value[0]) {
        appendChartPoint(0, x);
        if (!deferChartUpdate.value) {
          scheduleChartFlush(0);
        }
      }
    }
  } finally {
    cardRunning.value.delete(index);
    activeIndex.value = null;
    if (deferChartUpdate.value && !chartRunning.value[0] && (chartData[0]?.length || 0) > 0) {
      scheduleChartFlush(0);
    }
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
        const x = await fetchPing(card.url, card.name, 0, Timeouts.value);
        card.ms = x;
      } catch {
        card.ms = Timeouts.value;
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
      const res = await Promise.race([sendReq("GET", "https://test.linkey.com/api/ping?url=test"), new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 500))]);
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

const fetchPing = async (url, name, n, timeout) => {
  if (apiPing.value) {
    try {
      if (url == "test") {
        let ts = Date.now();
        const td = !tsDomain.value ? `${ts}` : "0";
        try {
          if (is_body.value) {
            await fetch(`https://pingbody${td}.linkey.com/api/ping?url=test`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ts: ts,
                name,
                url: "test",
              }),
            });
          } else {
            await fetch(`https://ping${td}.linkey.com/api/ping?url=test`);
          }
          ts = Date.now() - ts;
        } catch {
          ts = timeout;
        } finally {
          return Math.min(ts, timeout);
        }
      }
      let iu = "";
      const tss = Date.now();
      const td = !tsDomain.value ? `${tss}` : "0";
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

      const qs = `url=${encodeURIComponent(iu)}&name=${encodeURIComponent(name)}&ts=${td}&timeout=${timeout}`;
      let res;

      if (is_body.value) {
        const response = await fetch(`https://pingbody${td}.linkey.com/api/ping?${qs}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ts: tss,
            name,
            url: iu,
          }),
        });
        res = { data: await response.json() };
      } else {
        const response = await fetch(`https://ping${td}.linkey.com/api/ping?${qs}`);
        res = { data: await response.json() };
      }

      const elapsed = Date.now() - tss;
      // 保留辅助模块返回的 app，只是不再使用它返回的 ms
      if (n !== undefined && res?.data?.app !== undefined) {
        if (dev.value[n] !== res.data.app) {
          dev.value[n] = res.data.app;
        }
        if (res.data.ms !== undefined) {
          return Math.min(res.data.ms, timeout);
        }
      }
      return Math.min(elapsed, timeout);
    } catch {
      return timeout;
    }
  }

  const start = Date.now();
  const timeoutMs = Math.max(1, timeout || 1000);
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
    localStorage.setItem("ChartInterval", String(ChartInterval.value));
    localStorage.setItem("PingList", JSON.stringify(checkedSet.value));
  }, 300);
}
watch(Pcs, persistSettings);
watch(Timeouts, persistSettings);
watch(ChartInterval, persistSettings);
watch(checkedSet, persistSettings, {
  deep: true,
});

watch(deferChartUpdate, (v) => {
  localStorage.setItem("deferChartUpdate", v ? "1" : "0");
});

watch(tsDomain, (v) => {
  localStorage.setItem("tsDomain", v ? "1" : "0");
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
