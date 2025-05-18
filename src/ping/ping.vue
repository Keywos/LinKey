<template>
  <div style="overflow-x: hidden; -webkit-user-select: none; user-select: none">
    <h2>Network Ping</h2>

    <div class="homept girepaly" style="justify-content: space-between; padding-right: 24px">
      <p class="plengclass">Ping V:{{ version }}</p>
      <van-button icon="replay" color="#cccccc36" round :loading="isloding" size="small" type="success" @touchstart="startContinuousRefresh" @touchend="stopContinuousRefresh">Ping</van-button>
    </div>

    <div class="kcard-all">
      <div
        v-for="(element, index) in PingCard"
        :key="element.name"
        class="kcard-one"
        :class="{ active: activeIndex === index }"
        @touchstart="handleTouchStart($event, index)"
        @touchend="handleTouchEnd($event, element, index)"
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
                  <van-progress :percentage="gb(element.ms)" stroke-width="16" pivot-text="" color="linear-gradient(to right, #be99ff, #7232dd)" />
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
        <van-cell class="van-cell-sw" title="图0" :label="TuA[0]">
          <template #title>
            <van-button size="small" color="#4962ae" @touchend="showPopover[0] = true">
              <div style="min-width: 82px">{{ dev[0] }}: {{ checked[0] }}</div>
            </van-button>
            <van-button size="small" color="#00000000">
              <van-field v-model="intag[0]" placeholder="输入标签" style="width: 70px; padding: 0px" />
            </van-button>

            <van-button
              icon="replay"
              color="#cccccc36"
              :loading="isGet[0]"
              size="small"
              type="primary"
              @touchend="Ping1(checked[0], 0)"
              style="position: absolute; top: 14px; right: 76px"
            ></van-button>

            <van-button size="small" type="primary" @touchend="clearEc(0)" style="position: absolute; top: 14px; right: 14px">清空</van-button>
            <van-popover v-model:show="showPopover[0]" placement="top" overlay :offset="[-134, 20]">
              <van-grid square clickable :border="false" column-num="3" style="width: 100px; height: 486px; padding: 6px 42px 30px 6px">
                <div style="width: 130px; text-align: center">
                  <van-radio-group v-model="checked[0]">
                    <van-radio v-for="(item, index) in listys" :key="index" :name="item" style="padding: 8px 16px 8px 18px">
                      {{ item }}
                    </van-radio>
                  </van-radio-group>
                </div>
              </van-grid>
            </van-popover>
          </template>

          <!--  -->
          <!--  -->
          <!--  -->
        </van-cell>

        <van-cell class="van-cell-sw" title="图1" :label="TuA[1]">
          <template #title>
            <van-button size="small" color="#8cc370" @touchend="showPopover[1] = true">
              <div style="min-width: 82px">{{ dev[1] }}: {{ checked[1] }}</div>
            </van-button>
            <van-button size="small" color="#00000000">
              <van-field placeholder="" v-model="intag[1]" style="width: 70px; padding: 0px" />
            </van-button>

            <van-button
              icon="replay"
              color="#cccccc36"
              :loading="isGet[1]"
              size="small"
              type="primary"
              @touchend="Ping1(checked[1], 1)"
              style="position: absolute; top: 14px; right: 76px"
            ></van-button>

            <van-button size="small" type="primary" @touchend="clearEc(1)" style="position: absolute; top: 14px; right: 14px">清空</van-button>
            <van-popover v-model:show="showPopover[1]" placement="top" overlay :offset="[-134, 20]">
              <van-grid square clickable :border="false" column-num="3" style="width: 100px; height: 486px; padding: 8px 42px 30px 6px">
                <div style="width: 130px; text-align: center">
                  <van-radio-group v-model="checked[1]">
                    <van-radio v-for="(item, index) in listys" :key="index" :name="item" style="padding: 8px 16px 8px 18px">
                      {{ item }}
                    </van-radio>
                  </van-radio-group>
                </div>
              </van-grid>
            </van-popover>
          </template>

          <!--  -->
          <!--  -->
          <!--  -->
        </van-cell>

        <van-cell class="van-cell-sw" title="图2" :label="TuA[2]">
          <template #title>
            <van-button size="small" color="#ee6666" @touchend="showPopover[2] = true">
              <div style="min-width: 82px">{{ dev[2] }}: {{ checked[2] }}</div>
            </van-button>

            <van-button size="small" color="#00000000">
              <van-field placeholder="" v-model="intag[2]" style="width: 70px; padding: 0px" />
            </van-button>

            <van-button
              icon="replay"
              color="#cccccc36"
              :loading="isGet[2]"
              size="small"
              type="primary"
              @touchend="Ping1(checked[2], 2)"
              style="position: absolute; top: 14px; right: 76px"
            ></van-button>

            <van-button size="small" type="primary" @touchend="clearEc(2)" style="position: absolute; top: 14px; right: 14px">清空</van-button>
            <van-popover v-model:show="showPopover[2]" placement="top" overlay :offset="[-134, 20]">
              <van-grid square clickable :border="false" column-num="3" style="width: 100px; height: 486px; padding: 8px 42px 30px 6px">
                <div style="width: 130px; text-align: center">
                  <van-radio-group v-model="checked[2]">
                    <van-radio v-for="(item, index) in listys" :key="index" :name="item" style="padding: 8px 16px 8px 18px">
                      {{ item }}
                    </van-radio>
                  </van-radio-group>
                </div>
              </van-grid>
            </van-popover>
          </template>

          <!--  -->
          <!--  -->
          <!--  -->
        </van-cell>

        <van-cell class="van-cell-sw" title="图3" :label="TuA[3]">
          <template #title>
            <van-button size="small" color="#b56bdb" @touchend="showPopover[3] = true">
              <div style="min-width: 82px">{{ dev[3] }}: {{ checked[3] }}</div>
            </van-button>

            <van-button size="small" color="#00000000">
              <van-field placeholder="" v-model="intag[3]" style="width: 70px; padding: 0px" />
            </van-button>

            <van-button icon="replay" color="#8c5fd4" :loading="isGet[3]" size="small" type="primary" @touchend="Ping1(checked[3], 3)" style="position: absolute; top: 14px; right: 76px"></van-button>

            <van-button size="small" type="primary" @touchend="clearEc(3)" style="position: absolute; top: 14px; right: 14px">清空</van-button>
            <van-popover v-model:show="showPopover[3]" placement="top" overlay :offset="[-134, 20]">
              <van-grid square clickable :border="false" column-num="3" style="width: 100px; height: 486px; padding: 8px 42px 30px 6px">
                <div style="width: 130px; text-align: center">
                  <van-radio-group v-model="checked[3]">
                    <van-radio v-for="(item, index) in listys" :key="index" :name="item" style="padding: 8px 16px 8px 18px">
                      {{ item }}
                    </van-radio>
                  </van-radio-group>
                </div>
              </van-grid>
            </van-popover>
          </template>

          <!--  -->
          <!--  -->
          <!--  -->
        </van-cell>
      </van-cell-group>
    </div>
  </div>
  <van-cell-group inset title="Ping 设置">
    <van-cell title="模块地址" @click="copyText()" is-link />

    <van-cell class="van-cell-sw" center title="使用辅助 API Ping" inset label="需要安装上面的辅助模块">
      <template #right-icon>
        <van-switch v-model="apiPing" @change="setAPI(apiPing)" />
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
      <van-cell v-for="(item, index) in listSet" clickable :key="item" :title="item" @click="toggle(index)">
        <template #right-icon>
          <van-checkbox :name="item" :ref="(el) => (checkboxRefs[index] = el)" @touchend.stop />
        </template>
      </van-cell>
    </van-cell-group>
  </van-checkbox-group>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, watchEffect } from "vue";
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
// const router = useRouter();
const version = import.meta.env.PACKAGE_VERSION;

// const setP = () => {
//   router.push("/ping/setting");
// };
const copyText = async () => {
  await toClipboard("https://github.com/Keywos/rule/tree/main/script/linkey");
  showToast("已拷贝模块地址");
};

const hasEcharts = ref(false);
const isloding = ref(false);
const is_body = ref(false);
let first = ["", "", "", ""];
let after = ["", "", "", ""];
const isGet = ref([false, false, false, false]);
const TuA = ref(["", "", "", ""]);
const chartData = ref([[], [], [], []]);
const checked = ref(["WeChat", "YouTube", "VIVO", "TEST"]);
const dev = ref([0, 1, 2, 3]);
const showPopover = ref([false, false, false, false]);
const intag = ref(["", "", "", ""]);

const MAX = ref("--");
const apiPing = ref(localStorage.getItem("setApiPing") == 1 || false);

const AVG = ref("--");
const MIN = ref("--");
const Namec = ref("--");
const Nlength = ref(1);

let startX = ref(0);
let startY = ref(0);

const activeIndex = ref(null);
const handleTouchStart = (e, index) => {
  activeIndex.value = index;
  const touch = e.touches[0];
  startX.value = touch.pageX;
  startY.value = touch.pageY;
};
const handleTouchEnd = (e, element, index) => {
  if (!e) {
    return;
  }
  const touch = e.changedTouches[0];
  const distanceX = Math.abs(touch.pageX - startX.value);
  const distanceY = Math.abs(touch.pageY - startY.value);
  if (distanceX < 10 || distanceY < 10) {
    Pingis_s(element, index);
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
const toggle = (index) => {
  checkboxRefs.value[index].toggle();
};

const Pcs = ref(localStorage.getItem("getc") || 50);

const Timeouts = ref(localStorage.getItem("timeouts") || 1000);

const card = listy.filter((i) => lg.includes(i.name));
const PingCard = ref(card);
const chartContainer = ref(null);

let continuousRefreshInterval = null;

let x = 0;
const startContinuousRefresh = () => {
  x = 0;
  clearInterval(continuousRefreshInterval);
  isloding.value = true;
  updateMsValues();
  continuousRefreshInterval = setInterval(() => {
    x++;
    if (x > 50) {
      showToast("本次测试次数超限" + lg.length * 50);
      clearInterval(continuousRefreshInterval);
      isloding.value = false;
      x = 0;
    }
    updateMsValues();
  }, 200);
};

const stopContinuousRefresh = () => {
  if (x > 5) showToast("本次请求次数" + lg.length * x);
  isloding.value = false;
  clearInterval(continuousRefreshInterval);
  x = 0;
};

let option = {
  title: {
    text: "",
  },
  xAxis: {
    type: "category",
    data: "",
    show: false,
  },
  yAxis: {
    type: "value",
    max: 60,

    splitLine: {
      lineStyle: {
        color: "#cccccc40",
        type: "dotted",
      },
    },
  },

  series: [
    {
      animation: false, // 禁用过渡效果
      name: "1111",
      type: "line",
      data: chartData.value[0],
      // smooth: true,
      lineStyle: {
        width: 1,
        color: "#4962ae", // 曲线颜色
      },
      itemStyle: {
        opacity: 0,
      },
    },

    {
      animation: false, // 禁用过渡效果
      name: "22",
      type: "line",
      data: chartData.value[1],
      lineStyle: {
        width: 1,
        color: "#8cc370",
      },
      itemStyle: {
        opacity: 0,
      },
    },

    {
      animation: false,
      name: "",
      type: "line",
      data: chartData.value[2],
      lineStyle: {
        width: 1,
        color: "#ee6666",
      },
      itemStyle: {
        opacity: 0,
      },
    },
    {
      animation: false,
      name: "",
      type: "line",
      data: chartData.value[3],
      lineStyle: {
        width: 1,
        color: "#b56bdb",
      },
      itemStyle: {
        opacity: 0,
      },
    },
    {
      animation: false,
      name: "",
      type: "line",
      data: [1],
      itemStyle: {
        opacity: 0,
      },
    },
  ],
};
let isRunning = false;
let myChart;
onMounted(() => {
  if (localStorage.getItem("setApiPing") == 1) {
    apiPing.value = true;
    setAPI(apiPing);
  }
  loadECharts().then(() => {
    myChart = echarts.init(chartContainer.value);
    myChart.setOption(option, true);

    watch(screenWidth, (newScreenWidth, oldScreenWidth) => {
      if (newScreenWidth !== oldScreenWidth) {
        myChart.dispose();
        myChart = echarts.init(chartContainer.value);
        myChart.setOption(option, true);
      }
    });

    watch(
      () => chartData.value[0],
      (newData) => {
        option.series[0].data = newData;
        myChart.setOption(option, true);
      }
    );
    watch(
      () => chartData.value[1],
      (newData1) => {
        option.series[1].data = newData1;
        myChart.setOption(option, true);
      }
    );
    watch(
      () => chartData.value[2],
      (newData2) => {
        option.series[2].data = newData2;
        myChart.setOption(option, true);
      }
    );
    watch(
      () => chartData.value[3],
      (newData3) => {
        option.series[3].data = newData3;
        myChart.setOption(option, true);
      }
    );

    watch(
      () => [...checked.value],
      (newVal, oldVal) => {
        newVal.forEach((val, index) => {
          if (val !== oldVal[index]) {
            clearEc(index);
            localStorage.setItem(`checkedValue${index}`, val);
          }
        });
      },
      { deep: true }
    );

    watch(
      () => [...intag.value],
      (newVal, oldVal) => {
        newVal.forEach((val, index) => {
          if (val !== oldVal[index]) {
            localStorage.setItem(`intag${index}`, val);
          }
        });
      },
      { deep: true }
    );

    //
  });

  checked.value[0] = localStorage.getItem("checkedValue0") || "WeChat";
  checked.value[1] = localStorage.getItem("checkedValue1") || "WeChat";
  checked.value[2] = localStorage.getItem("checkedValue2") || "WeChat";
  checked.value[3] = localStorage.getItem("checkedValue3") || "WeChat";

  intag.value[0] = localStorage.getItem("intag0") || "";
  intag.value[1] = localStorage.getItem("intag1") || "";
  intag.value[2] = localStorage.getItem("intag2") || "";
  intag.value[3] = localStorage.getItem("intag3") || "";
  setTimeout(() => {
    let counta = 0;
    const interval = setInterval(() => {
      updateMsValues();
      counta++;
      if (counta > 2) {
        clearInterval(interval);
      }
    }, 100);
  }, 100);
});

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

const clearEc = (n) => {
  isRunning = false;
  chartData.value[n] = [];
  TuA.value[n] = "";
  after[n] = "";
  dev.value[n] = n;
  MAX.value = Math.floor(Math.max(...[...chartData.value[0], ...chartData.value[1], ...chartData.value[2], ...chartData.value[3]]));
  option.yAxis.max = Math.ceil(MAX.value / 30) * 30;
};

const listArr = {
  WeChat: "https://res.wx.qq.com/a/wx_fed/assets/res/NTI4MWU5.ico",
  Ali: "https://www.taobao.com/favicon.ico",
  BiliBili: "https://www.bilibili.com/favicon.ico",
  Baidu: "https://apps.bdimg.com/favicon.ico",
  Netease: "https://s1.music.126.net/style/favicon.ico",
  GitHub: "https://github.githubassets.com/favicon.ico",
  Google: "https://www.google.com/images/errors/robot.png",
  Cloudflare: "https://www.cloudflare.com/favicon.ico",
  YouTube: "https://www.youtube.com/favicon.ico",
  Openai: "https://chat.openai.com/favicon.ico",
  HOK: "https://pvp.qq.com/favicon.ico",
  DouYin: "https://www.douyin.com/favicon.ico",
  VIVO: "https://www.vivo.com.cn//favicon.ico",
  HUAWEI: "https://www.huawei.com/favicon.ico",
  Apple: "https://www.apple.com/favicon.ico",
  TEST: "test",
};

const Ping1 = async (io, n) => {
  if (io === "TEST" && apiPing.value == false) {
    showToast("❌ 未开启 [使用辅助 API Ping] 无法测试 'TEST'");
    isRunning = false;
    return;
  }

  if (isRunning) {
    isRunning = false;
    return;
  }
  hasEcharts.value = false;
  const i = listArr[io];
  let ts = Date.now();
  isRunning = true;
  let x;
  isGet.value[n] = true;
  if (first[n] == "" && first[n] != i) {
    first[n] = i;
  } else {
    ts = Date.now() - after[n];
  }
  try {
    let c = 1;
    while (c <= Pcs.value) {
      c++;
      if (!isRunning) break;
      try {
        const tns = Date.now();
        x = await Getimg(i, io, n);
        if (!isRunning) return;
        if (checked.value[n] == "TEST") {
          x = Date.now() - tns;
        }
        chartData.value[n] = [...chartData.value[n], x];
        const data = chartData.value[n],
          length = data.length,
          sum = data.reduce((acc, curr) => acc + curr, 0),
          avg = Math.floor(sum / length),
          min = Math.floor(Math.min(...data)),
          max = Math.floor(Math.max(...data));
        MAX.value = max;
        after[n] = Date.now() - ts;
        TuA.value[n] = `Avg: ${avg}\u3000Min/Max: ${min}/${max}\u3000${length}次 [${zhTime(after[n])}/${(after[n] / length).toFixed(1)}ms]`;
        if (x > option.yAxis.max) {
          option.yAxis.max = Math.ceil(MAX.value / 30) * 30;
        }
      } catch (error) {
        console.log(error);
        break;
      }
    }
  } finally {
    isGet.value = [false, false, false];
    isRunning = false;
    console.log("循环结束");
  }
};
function zhTime(e) {
  e = e.toString();
  if (e < 1e3) {
    return `${e}ms`;
  } else if (e < 6e4) {
    return `${(e / 1e3).toFixed(2)}S`;
  } else if (e < 36e5) {
    return `${(e / 6e4).toFixed(2)}分钟`;
  }
}

const Pingis_s = async (i, n) => {
  hasEcharts.value = true;
  if (isRunning) {
    isRunning = false;
    activeIndex.value = null;
    return;
  }
  isRunning = true;
  try {
    for (let c = 1; c <= Pcs.value && isRunning; c++) {
      try {
        activeIndex.value = n;
        const x = await Getimg(i.url, i.name);
        PingCard.value[n].ms = x;
        if (Namec.value == "") {
          Nlength.value++;
          Namec.value = i.name;
          chartData.value[0] = [x];
        } else if (Namec.value != i.name) {
          Nlength.value = 1;
          Namec.value = i.name;
          chartData.value[0] = [x];
          option.yAxis.max = 100;
        } else {
          Nlength.value++;
          chartData.value[0] = [...chartData.value[0], x];
          const data = chartData.value[0];
          MIN.value = Math.floor(Math.min(...data));
          MAX.value = Math.floor(Math.max(...data));
          if (x > option.yAxis.max) {
            option.yAxis.max = Math.ceil(MAX.value / 100) * 100;
          }
          AVG.value = Math.floor(data.reduce((acc, curr) => acc + curr, 0) / data.length);
        }
      } catch (error) {
        console.log(error);
        break;
      }
    }
  } finally {
    isRunning = false;
    activeIndex.value = null;
    console.log("结束Pingis_s");
  }
};

const gb = (x) => {
  if (typeof x != "number") return 10;
  const range = x < 200 ? 70 : 100;
  return x > 900 ? 96 : Math.floor((x / Math.ceil(x / 100)) * (range / 100));
};
async function updateMsValues() {
  const promises = [];
  for (const card of PingCard.value) {
    promises.push(
      Getimg(card.url, card.name).then((x) => {
        card.ms = x;
      })
    );
  }
  await Promise.all(promises);
}

const setAPI = async (i) => {
  if (i) {
    try {
      let res = await Promise.race([sendReq("GET", "https://surgetool.com/api/ping?url=test"), new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 500))]);
      if (res?.data["sp"]) {
        showToast("检测到 SPing 模块, 当前为代理APP请求");
        localStorage.setItem("setApiPing", 1);
        apiPing.value = true;
      } else {
        errs();
      }
    } catch (error) {
      errs();
    }
  } else {
    localStorage.removeItem("setApiPing");
  }
};

function errs() {
  showToast("❌ 未检测到 SPing 模块, 当前为浏览器发起请求");
  localStorage.removeItem("setApiPing");
  apiPing.value = false;
}
const Getimg = async (url, name, n) => {
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

        if (dev) {
          if (dev.value[n] != "A" || dev.value[n] != devs) {
            dev.value[n] = res.data["app"];
          } else {
            dev.value[n] = n;
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
watchEffect(() => {
  localStorage.setItem("getc", Pcs.value);
  localStorage.setItem("timeouts", Timeouts.value);
  localStorage.setItem("PingList", JSON.stringify(checkedSet.value));
  PingCard.value = listy.filter((i) => checkedSet.value.includes(i.name));
});
onBeforeUnmount(() => {
  isRunning = false;
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
