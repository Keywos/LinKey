<template>
  <div style="overflow-x: hidden; -webkit-user-select: none; user-select: none">
    <h2>Speedtest</h2>
    <div class="live-data-panel">
      <van-row>
        <van-col span="8" class="speed-stat">
          <div class="stat-label">当前速度</div>
          <div class="stat-value text-info">{{ currentSpeed }}</div>
        </van-col>
        <van-col span="8" class="speed-stat">
          <div class="stat-label">平均速度</div>
          <div class="stat-value text-success">{{ avgSpeed }}</div>
        </van-col>
        <van-col span="8" class="speed-stat">
          <div class="stat-label">已下载</div>
          <div class="stat-value text-warning">{{ totalDownloaded }}</div>
        </van-col>
      </van-row>
      <van-row>
        <van-col span="8" class="speed-stat">
          <div class="stat-label">延迟</div>
          <div class="stat-value" :style="{ color: pingMs > 200 ? 'red' : pingMs > 80 ? 'orange' : 'green' }">{{ pingMs }} ms</div>
        </van-col>
        <van-col span="8" class="speed-stat">
          <div class="stat-label">总耗时</div>
          <div class="stat-value" style="opacity: 0.6">{{ elapsedTime }}</div>
        </van-col>
        <van-col span="8" class="speed-stat">
          <div class="stat-label">带宽</div>
          <div class="stat-value text-primary">{{ bandwidth }}</div>
        </van-col>
      </van-row>
    </div>

    <div ref="chartContainer" style="height: 260px; margin-left: 12px; width: 96%" />

    <div class="stats-row">
      <div class="stats-item">
        <span class="stats-value">MAX: {{ maxSpeedText }}</span>
      </div>
      <div class="stats-item">
        <span class="stats-value">MIN: {{ minSpeedText }}</span>
      </div>
      <div class="stats-item">
        <span class="stats-value">AVG: {{ avgPingText }}</span>
      </div>
    </div>
    <div style="padding: 12px 16px">
      <van-button :type="isRunning ? 'danger' : 'primary'" block round @click="toggleTest">
        {{ isStarting ? "验证中..." : isRunning ? "停止测试" : "开始测试" }}
      </van-button>
    </div>

    <van-cell-group inset title="测试设置">
      <van-cell center title="并发线程数">
        <template #value>
          <van-stepper v-model="threads" button-size="22" step="1" min="1" max="20" />
        </template>
      </van-cell>
      <div>
        <div v-for="(item, index) in allUrls" :key="item.value + index" class="url-item-row">
          <van-cell clickable :class="{ 'url-selected': testUrl === item.value }" style="flex: 1; min-width: 0" @click="handleUrlClick(item.value)">
            <template #title>
              <span class="url-item-title">{{ item.text }}</span>
            </template>
          </van-cell>
          <van-tag v-if="testUrl === item.value" type="primary" size="mini" style="padding: 0px 6px 1px; border-radius: 8px; flex-shrink: 0">当前</van-tag>
          <van-button v-if="!item.preset" size="small" type="danger" style="margin-right: 16px; border-radius: 10px" @click.stop="removeCustomUrl(index)">删除</van-button>
        </div>
      </div>
      <van-cell style="padding: 6px 0">
        <template #title>
          <van-field v-model="newCustomUrl" placeholder="输入自定义下载链接" @keypress.enter="addCustomUrl" />
        </template>
        <template #right-icon>
          <van-button size="small" type="primary" style="margin-right: 16px" :disabled="!newCustomUrl" @click="addCustomUrl">添加</van-button>
        </template>
      </van-cell>

      <van-cell center title="Ping 测试地址">
        <template #value>
          <van-field v-model="pingUrl" placeholder="输入 Ping 地址" style="width: 100%; padding: 0" />
        </template>
      </van-cell>

      <van-cell center title="自动停止 (MB)" label="0 表示不限量">
        <template #value>
          <van-stepper v-model="maxMB" button-size="22" step="50" min="0" />
        </template>
      </van-cell>
    </van-cell-group>

    <div style="padding: 16px; text-align: center; font-size: 12px; opacity: 0.4">V{{ version }} — 使用文件下载进行网速测试</div>
    <br />
    <br />
    <br />
    <br />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue";
import { showToast, showConfirmDialog } from "vant";
import { onWidth } from "@/hooks/winWidth";

const { screenWidth } = onWidth();
const version = import.meta.env.PACKAGE_VERSION;

const presetUrls = [];

const STORAGE_KEY = "Speedtest_CustomUrls";
const customUrls = ref(loadCustomUrls());

function loadCustomUrls() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}
function saveCustomUrls() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(customUrls.value));
}

const allUrls = computed(() => [...presetUrls, ...customUrls.value]);

const testUrl = ref(presetUrls.length > 0 ? presetUrls[0].value : customUrls.value.length > 0 ? customUrls.value[0].value : "");
const pingUrl = ref("https://connectivitycheck.platform.hicloud.com/generate_204");
const threads = ref(4);
const maxMB = ref(0);
const newCustomUrl = ref("");

function selectUrl(value) {
  testUrl.value = value;
}

function handleUrlClick(value) {
  if (testUrl.value === value) {
    copyToClipboard(value);
  } else {
    selectUrl(value);
  }
}

function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showToast("已复制链接");
    }).catch(() => {
      fallbackCopy(text);
    });
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand("copy");
    showToast("已复制链接");
  } catch {
    showToast("复制失败");
  }
  document.body.removeChild(textarea);
}

function addCustomUrl() {
  const url = newCustomUrl.value.trim();
  if (!url) return;
  if (customUrls.value.some((u) => u.value === url)) {
    showToast("该地址已存在");
    return;
  }
  customUrls.value.push({ text: url.length > 36 ? url.slice(0, 36) + "..." : url, value: url, preset: false });
  saveCustomUrls();
  newCustomUrl.value = "";
  testUrl.value = url;
  showToast("已添加自定义地址");
}

async function removeCustomUrl(index) {
  try {
    await showConfirmDialog({
      title: "确认删除",
      message: "确定要删除这个自定义地址吗？",
    });
  } catch {
    return;
  }
  const customIndex = index - presetUrls.length;
  const removed = customUrls.value.splice(customIndex, 1);
  saveCustomUrls();
  if (testUrl.value === removed[0].value) {
    testUrl.value = presetUrls.length > 0 ? presetUrls[0].value : customUrls.value.length > 0 ? customUrls.value[0].value : "";
  }
  showToast("已删除");
}

const isRunning = ref(false);
const isStarting = ref(false);

const currentSpeed = ref("0 B/s");
const avgSpeed = ref("0 B/s");
const totalDownloaded = ref("0 B");
const bandwidth = ref("0 Mbps");
const elapsedTime = ref("0s");
const pingMs = ref("--");
const maxSpeedText = ref("0 B/s");
const minSpeedText = ref("0 B/s");
const avgPingText = ref("--");

// Download state
let abortControllers = [];
let validateAbort = null;
let running = false;
let totalBytes = 0;
let lastTotalBytes = 0;
let speedHistory = [];
let startTime = 0;
let lastCalcTime = 0;
let calcInterval = null;
let pingInterval = null;
let currentMaxSpeed = 0;
let currentMinSpeed = Infinity;
let totalPingSum = 0;
let totalPingCount = 0;

// Chart
const chartContainer = ref(null);
let myChart = null;
let chartOption = null;
let chartData = [];
const CHART_MAX_POINTS = 300;

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 2 : 0) + " " + units[i];
}

function formatSpeed(bytesPerSec) {
  if (bytesPerSec === 0) return "0 B/s";
  const units = ["B/s", "KB/s", "MB/s", "GB/s", "TB/s"];
  const i = Math.floor(Math.log(bytesPerSec) / Math.log(1024));
  return (bytesPerSec / Math.pow(1024, i)).toFixed(i > 0 ? 2 : 0) + " " + units[i];
}

function formatBandwidth(bytesPerSec) {
  const bitsPerSec = bytesPerSec * 8;
  if (bitsPerSec < 1000) return "0 Mbps";
  return (bitsPerSec / 1000 / 1000).toFixed(2) + " Mbps";
}

function formatTime(ms) {
  const totalSec = Math.floor(ms / 1000);
  if (totalSec < 60) return totalSec + "s";
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return min + "m " + sec + "s";
}

async function downloadThread(index) {
  if (!running) return;
  try {
    const controller = new AbortController();
    abortControllers.push(controller);
    const response = await fetch(testUrl.value, {
      cache: "no-store",
      mode: "cors",
      referrerPolicy: "no-referrer",
      signal: controller.signal,
    });
    const reader = response.body.getReader();
    while (running) {
      const { value, done } = await reader.read();
      if (done) break;
      totalBytes += value.length;
    }
    reader.cancel();
  } catch (err) {
    if (err.name === "AbortError") return;
    console.warn(`Thread ${index} error:`, err.message);
  }
  if (running) {
    downloadThread(index);
  }
}

function startDownload() {
  if (!testUrl.value || testUrl.value.length < 10) {
    showToast("请输入有效的下载链接");
    return;
  }
  isStarting.value = true;
  // Validate URL first
  const ac = new AbortController();
  validateAbort = ac;
  fetch(testUrl.value, {
    cache: "no-store",
    mode: "cors",
    referrerPolicy: "no-referrer",
    signal: ac.signal,
  })
    .then((response) => {
      if (!response.ok && response.status !== 206) throw new Error("HTTP " + response.status);
      const reader = response.body.getReader();
      return reader.read();
    })
    .then(({ value }) => {
      if (!value || value.length <= 0) throw new Error("资源响应异常");
      doStart();
    })
    .catch((err) => {
      if (err.name === "AbortError") return;
      console.warn(err);
      showToast("链接不可用，可能被跨域限制");
      isStarting.value = false;
    });
}

function doStart() {
  isStarting.value = false;
  isRunning.value = true;
  running = true;
  totalBytes = 0;
  lastTotalBytes = 0;
  startTime = Date.now();
  lastCalcTime = startTime;
  speedHistory = [];
  chartData = [];
  currentMaxSpeed = 0;
  currentMinSpeed = Infinity;
  totalPingSum = 0;
  totalPingCount = 0;
  abortControllers = [];

  maxSpeedText.value = "0 B/s";
  minSpeedText.value = "0 B/s";
  avgPingText.value = "--";
  bandwidth.value = "0 Mbps";

  // Start download threads
  for (let i = 0; i < threads.value; i++) {
    downloadThread(i);
  }

  // Speed calculation timer (every 250ms)
  calcInterval = setInterval(() => {
    if (!running) return;
    const now = Date.now();
    const delta = now - lastCalcTime;
    const bytes = totalBytes - lastTotalBytes;
    const speed = bytes / (delta / 1000);

    if (speed > 0) {
      speedHistory.push(speed);
      chartData.push(speed);
      if (chartData.length > CHART_MAX_POINTS) {
        chartData.shift();
      }

      currentSpeed.value = formatSpeed(speed);
      const avg = totalBytes / ((now - startTime) / 1000);
      avgSpeed.value = formatSpeed(avg);
      bandwidth.value = formatBandwidth(speed);

      if (speed > currentMaxSpeed) {
        currentMaxSpeed = speed;
        maxSpeedText.value = formatSpeed(speed);
      }
      if (speed < currentMinSpeed) {
        currentMinSpeed = speed;
        minSpeedText.value = formatSpeed(speed);
      }

      updateChart();
    }

    elapsedTime.value = formatTime(now - startTime);
    totalDownloaded.value = formatBytes(totalBytes);
    lastTotalBytes = totalBytes;
    lastCalcTime = now;

    // Check auto-stop
    if (maxMB.value > 0 && totalBytes >= maxMB.value * 1024 * 1024) {
      stopTest();
      showToast("已达到设定上限，自动停止");
    }
  }, 250);

  // Ping timer (every 3s)
  pingInterval = setInterval(() => {
    doPing();
  }, 3000);
  doPing();
}

async function doPing() {
  if (!pingUrl.value) return;
  const start = Date.now();
  try {
    await fetch(pingUrl.value, {
      method: "HEAD",
      cache: "no-store",
      mode: "no-cors",
      referrerPolicy: "no-referrer",
    });
    const ms = Date.now() - start;
    pingMs.value = ms;
    totalPingSum += ms;
    totalPingCount++;
    avgPingText.value = (totalPingSum / totalPingCount).toFixed(1) + " ms";
  } catch {
    pingMs.value = "--";
  }
}

function stopTest() {
  running = false;
  isRunning.value = false;
  isStarting.value = false;
  clearInterval(calcInterval);
  clearInterval(pingInterval);
  // Abort validation
  if (validateAbort) {
    validateAbort.abort();
    validateAbort = null;
  }
  // Abort all pending requests
  abortControllers.forEach((c) => c.abort());
  abortControllers = [];
  if (speedHistory.length > 0) {
    const avg = speedHistory.reduce((a, b) => a + b, 0) / speedHistory.length;
    avgSpeed.value = formatSpeed(avg);
  }
}

function toggleTest() {
  if (isRunning.value || isStarting.value) {
    stopTest();
  } else {
    startDownload();
  }
}

function updateChart() {
  if (!myChart || !chartOption) return;
  chartOption.series[0].data = chartData.map((v, i) => [i, v]);
  myChart.setOption(chartOption);
}

function createChartOption() {
  return {
    title: { text: "" },
    tooltip: {
      trigger: "axis",
      show: true,
      extraCssText: "border-radius: 18px;",
      backgroundColor: "#33559955",
      borderWidth: 0,
      axisPointer: {
        type: "line",
      },
      textStyle: {
        color: "#fff",
        fontSize: 12,
      },
      formatter: function (params) {
        return params.map((p) => `${p.dataIndex}: ${formatSpeed(p.data[1])}`).join("<br/>");
      },
    },

    grid: { left: 40, right: 16, bottom: 30, top: 10 },
    xAxis: {
      type: "value",
      name: "秒",
      min: 0,
      minInterval: 1,
      splitLine: { show: false },
      axisLine: { show: false },
      axisTick: { show: false },
      minorSplitLine: { show: false },
      axisLabel: { fontSize: 10, formatter: (v) => Math.round(v) },
    },

    yAxis: {
      type: "value",
      name: "速度",
      axisLine: { show: false },
      splitLine: {
        lineStyle: {
          color: "#cccccc40",
          type: "dotted",
        },
      },
      axisLabel: {
        fontSize: 10,
        formatter: (value) => {
          if (value >= 1024 * 1024) return (value / 1024 / 1024).toFixed(1) + "M";
          if (value >= 1024) return (value / 1024).toFixed(1) + "K";
          return value.toFixed(0) + "B";
        },
      },
    },
    animation: true,
    animationDuration: 300,
    animationEasing: "cubicOut",
    animationDurationUpdate: 300,
    animationEasingUpdate: "cubicOut",
    series: [
      {
        type: "line",
        data: [],
        smooth: true,
        lineStyle: { color: "#4962ae", width: 2 },
        areaStyle: { color: "rgba(73, 98, 174, 0.15)" },
        itemStyle: { opacity: 0 },
        showSymbol: false,
      },
    ],
  };
}

async function loadECharts() {
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

onMounted(() => {
  loadECharts().then(() => {
    chartOption = createChartOption();
    myChart = echarts.init(chartContainer.value);
    myChart.setOption(chartOption, true);

    watch(screenWidth, (newVal, oldVal) => {
      if (newVal !== oldVal && myChart) {
        myChart.dispose();
        myChart = echarts.init(chartContainer.value);
        myChart.setOption(chartOption, true);
      }
    });
  });
});

onBeforeUnmount(() => {
  running = false;
  clearInterval(calcInterval);
  clearInterval(pingInterval);
  abortControllers.forEach((c) => c.abort());
  if (myChart) {
    myChart.dispose();
    myChart = null;
  }
});
</script>

<style scoped>
.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #666;
  padding: 12px 16px 4px;
}
.live-data-panel {
  background: var(--van-cell-background, #fff);
  border-radius: 20px;
  margin: 0 16px 4px;
  padding: 4px 0;
}
.speed-stat {
  text-align: center;
  padding: 8px 0;
}
.stat-label {
  font-size: 12px;
  opacity: 0.6;
  margin-bottom: 4px;
}
.stat-value {
  font-size: 16px;
  font-weight: 600;
}
.text-info {
  color: #1989fa;
}
.text-success {
  color: #07c160;
}
.text-warning {
  color: #ff976a;
}
.text-primary {
  color: #4962ae;
}
.url-selected {
  background: rgba(73, 98, 174, 0.08);
}

.stats-row {
  display: flex;
  justify-content: space-around;
  padding: 6px 16px 12px;
  background: none;
}
.stats-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.stats-label {
  font-size: 11px;
  color: #999;
}
.stats-value {
  font-size: 11px;
  font-weight: 600;
  color: #333;
}
.url-item-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.url-item-row :deep(.van-cell__title) {
  overflow: visible;
  min-width: 0;
}
.url-item-title {
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}
.url-item-label {
  font-size: 11px;
  color: #999;
  display: block;
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 260px;
}
.url-delete-btn {
  height: 100%;
  min-height: 50px;
  border-radius: 0;
}
</style>
