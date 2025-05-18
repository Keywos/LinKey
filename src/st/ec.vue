<template>
  <div style="overflow-x: hidden; -webkit-user-select: none; user-select: none">
    <div>
      <h2>Echarts</h2>
      <div style="padding: 6px; opacity: 0.3; padding-left: 24px; font-size: 10px; line-height: 10px; position: relative; /* position: fixed; */ z-index: 10">
        {{ newLog }}
      </div>
    </div>

    <van-cell-group v-if="iserr" inset title="错误信息">
      <van-field v-model="errra" rows="1" label="" error-message="" type="textarea" placeholder="error" show-word-limit :autosize="{ maxHeight: 900, minHeight: 40 }"></van-field>

      <van-field v-model="errr" rows="1" label="" error-message="" type="textarea" placeholder="error" show-word-limit :autosize="{ maxHeight: 9000, minHeight: 40 }"></van-field>
    </van-cell-group>

    <div ref="chartContainer" style="min-height: 360px; margin-top: -40px; padding-bottom: 24px; z-index: 1" />

    <van-cell-group inset>
      <van-collapse v-model="showPopover" accordion :border="false">
        <van-collapse-item title="历史记录" name="12" label="">
          <van-checkbox-group v-model="checkedSet" style="padding-bottom: 10px; max-height: 300px; overflow: auto; padding-top: 10px; padding-bottom: 20px; border-radius: 14px; margin: -14px">
            <van-cell-group inset title="">
              <van-swipe-cell v-for="(item, index) in ecList" :key="item">
                <template #left>
                  <van-button square type="primary" text="选择" @click="toggle(index)" />
                </template>

                <van-cell clickable :title="item" @click="toggle(index)" :border="false">
                  <template #right-icon>
                    <van-checkbox :name="item" :ref="(el) => (checkboxRefs[index] = el)" @touchend.stop />
                  </template>
                </van-cell>

                <template #right>
                  <van-button square type="danger" text="删除" @click="clearCache(index)" />
                </template>
              </van-swipe-cell>
            </van-cell-group>
            <br />

            <van-cell-group inset>
              <van-cell title="清除选中的数据" @click="clearCacheAll"></van-cell>
            </van-cell-group>

            <div style="opacity: 0.9; padding-top: 8px; padding-left: 25px; padding-bottom: 8px; font-size: 11px">
              <strong>Ver:{{ version }} 温馨提示：</strong>

              <br />
              右滑列表可以单独删除某行数据
              <br />
              右边的对号点了没反应，要点击列表
              <br />
              清除当前传入的数据 刷新后任然会重新加载
            </div>
          </van-checkbox-group>
        </van-collapse-item>
      </van-collapse>
    </van-cell-group>

    <br />

    <van-cell-group v-if="!iserr" id="netmstest" inset title="">
      <van-cell style="opacity: 0.9" v-for="(item, index) in points" :title="item.x" :value="`${item.y}MB  ${item.d}`" />
    </van-cell-group>
    <br />
    <br />
    <br />
    <br />
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from "vue";
import { showToast } from "vant";
import { onWidth } from "@/hooks/winWidth";
const { screenWidth } = onWidth();
const version = import.meta.env.PACKAGE_VERSION;

import { reactive } from "vue";
const iserr = ref(false);
const showPopover = ref(false);
const newLog = ref("...");
const ecList = ref([]);

const errr = ref("");
const errra = ref(`正确示例:
https://xn--ji8h.eu.org/ec?d=[{"x":"1999","y":"6","d":"desc"},{"x":"2048","y":"4.88","d":"启动"},{"x":"1974","y":"40.33","d":"警告"},{"x":"4090","y":"8","d":"检查"}]&t=文件名`);

const points = reactive([
  {
    x: 111010100,
    y: 22,
    d: "q",
  },
  {
    x: "112121122",
    y: 222,
    d: "qa",
  },
]);
const checkboxRefs = ref([]);

const params = new URLSearchParams(window.location.search);
try {
  const d = params.get("d");
  let ds = Date.now();
  newLog.value = params.get("t") || `旧版本捷径 / 未传入文件名 ${ds}`;

  iserr.value = false;
  const arr = JSON.parse(d);
  if (!Array.isArray(arr) || arr.length === 0) {
    throw new Error("解析后的数组为空");
  }

  points.splice(0, points.length, ...arr);

  ecList.value = JSON.parse(localStorage.getItem("EcList") || "[]");

  if (!ecList.value.includes(newLog.value)) {
    ecList.value.push(newLog.value);
  }

  ecList.value.sort((a, b) => {
    const toSortableNumber = (str) => parseInt(str.replace(".log", "").replace(/-/g, ""));
    return toSortableNumber(b) - toSortableNumber(a);
  });
  localStorage.setItem("EcList", JSON.stringify(ecList.value));

  localStorage.setItem(newLog.value, JSON.stringify(points));
} catch (e) {
  iserr.value = true;
  if (window.location.search != "") {
    errr.value = "当前参数 解析错误 / 空数组:\n" + window.location.search + "\n\nURL 解码后:\n" + decodeURIComponent(window.location.search);
  } else {
    errr.value = "未解析到参数";
  }
}

const clearCache = (is) => {
  let na = ecList.value[is];
  ecList.value = ecList.value.filter((i) => i !== na);
  localStorage.setItem("EcList", JSON.stringify(ecList.value));

  checkedSet.value = checkedSet.value.filter((i) => i !== na);
  localStorage.removeItem(na);

  showToast("清除成功：" + na);
};

const clearCacheAll = () => {
  if (checkedSet.value.length == 0) {
    showToast("至少选择一个");
    return;
  }

  let xxx = checkedSet.value;
  let i = 0;
  xxx.forEach((item) => {
    i++;
    ecList.value = ecList.value.filter((i) => i !== item);
    checkedSet.value = checkedSet.value.filter((i) => i !== item);
    localStorage.removeItem(item);
  });
  localStorage.setItem("EcList", JSON.stringify(ecList.value));
  if (i > 0) {
    showToast("清除成功" + i + "个");
  }
};

const toggle = (index) => {
  checkboxRefs.value[index].toggle();
  // console.log("1", checkedSet.value);
  // console.log("2", checkboxRefs.value);
  let xx = checkedSet.value;

  xx.sort((a, b) => {
    const toNum = (str) => parseInt(str.replace(".log", "").replace(/-/g, ""));
    return toNum(a) - toNum(b);
  });
  let arr = [];
  for (const item of xx) {
    let a = JSON.parse(localStorage.getItem(item) || "[]");
    arr = [...arr, ...a];
  }

  const unique = Array.from(new Set(arr.map((item) => item.x))).map((x) => arr.find((item) => item.x === x));
  points.splice(0, points.length, ...unique);
};

const checkedSet = ref([newLog.value]);
const chartData = ref([]);

const chartContainer = ref(null);
const xData = iserr.value ? ["04-24 14:20:56", "04-24 14:20:56"] : points.map((item) => item.x);
console.log(xData);
chartData.value = points.map((item) => item.y);

let option = {
  title: {
    text: "",
  },
  xAxis: {
    // offset: 20,
    type: "category",
    data: points.map((item) => String(item.x).slice(0, 11)),
    // xData,
    // show: false,
    axisLabel: {
      // margin: 10,
      rotate: 60,
      //   interval: "1", // 每隔一个显示，0 表示全显示，'auto' 自动判断
    },
  },

  tooltip: {
    trigger: "axis",
    show: true,
    extraCssText: "border-radius: 18px;",
    backgroundColor: "#33559955", // 背景
    borderWidth: 0,
    axisPointer: {
      type: "line",
    },
    textStyle: {
      color: "#fff",
      fontSize: 12,
    },
    formatter: function (params) {
      return params.map((p) => `${p.axisValue}: ${p.data} MB`).join("<br/>");
    },
  },
  grid: {
    bottom: 130,
  },

  dataZoom: [
    {
      type: "slider",
      show: true,
      xAxisIndex: 0,
      start: 0,
      end: 100, // 初始显示百分比

      backgroundColor: "rgba(0,0,0,0.05)", // 背景色
      dataBackground: {
        lineStyle: {
          color: "#4962ae33", // 背景折线颜色
        },
        areaStyle: {
          color: "rgba(150,150,150,0.2)", // 背景阴影区域
        },
      },
      fillerColor: "#4962ae66", // 选中区域颜色
      borderColor: "#00000000", // 边框色

      handleStyle: {
        color: "#4962ae33", // 手柄颜色
        borderColor: "#ffffff44", // 手柄边框
        borderWidth: 1,
        shadowColor: "#4962ae",
        shadowBlur: 3,
        // shadowBlur: 10 // 阴影模糊
      },
      //   fillerColor: 'rgba(255, 87, 34, 0.3)',  // 手柄填充区域颜色
      // textStyle: {
      //   // color: "#333", // 拖动条两边文字颜色
      // },
    },
  ],
  yAxis: {
    type: "value",
    max: 50,

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
      data: points.map((item) => item.y),
      smooth: true,
      lineStyle: {
        color: "#4962ae", // 曲线颜色
      },
      itemStyle: {
        opacity: 0,
      },
    },
  ],
};

let myChart;
onMounted(() => {
  loadECharts().then(() => {
    if (!iserr.value) {
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
        () => points,
        (newData) => {
          const xData = newData.map((item) => String(item.x).slice(0, 11));
          option.xAxis.data = xData;
          let y = newData.map((item) => item.y);
          option.series[0].data = y;
          myChart.setOption(option, true);
        },
        { deep: true }
      );
    }
  });
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
</script>

<style>
#netmstest .van-cell__value {
  padding: 2px 10px 2px 0px;
  text-align: left;
}
</style>
