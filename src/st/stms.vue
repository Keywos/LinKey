<template>
  <h2>性能测试</h2>
  <van-cell-group inset title="请求设置">
    <van-cell title="需要安装此模块辅助" @click="copyText()" is-link />
    <van-field label="并发请求" readonly placeholder="">
      <template #button>
        <van-button size="small" @click="GetMsPromise" type="primary">
          <van-loading v-if="islodingA" type="circular" size="17px" style="width: 27px" />
          <span v-else>Start</span>
        </van-button>
        &nbsp;
        <van-button size="small" @click="stops()" type="primary">Stop</van-button>
      </template>
    </van-field>

    <van-field name="slider" label="滑块选择">
      <template #input>
        <van-slider v-model="rems" bar-height="24px" :step="1" :min="1" max="100" />
      </template>
    </van-field>

    <van-cell center title="请求次数">
      <van-stepper v-model="rems" button-size="22" step="1" min="1" max="100" />
    </van-cell>

    <van-field v-if="!autobm" name="slider" label="滑块选择">
      <template #input>
        <van-slider v-model="yl" bar-height="24px" :step="1" :min="1" max="18" />
      </template>
    </van-field>

    <van-cell v-if="!autobm" center title="压力">
      <van-stepper v-model="yl" button-size="22" step="1" min="1" max="18" />
    </van-cell>

    <van-field label="依次请求" readonly placeholder="">
      <template #button>
        <van-button size="small" @click="GetMs" type="primary">
          <van-loading v-if="isloding" type="circular" size="17px" style="width: 27px" />
          <span v-else>Start</span>
        </van-button>
        &nbsp;
        <van-button size="small" @click="stops()" type="primary">Stop</van-button>
      </template>
    </van-field>
  </van-cell-group>
  <div style="height: 12px"></div>
  <van-cell-group inset title="">
    <van-cell class="van-cell-sw" center title="模拟真实二进制数据">
      <template #right-icon>
        <van-switch v-model="autobm" @change="setGistauto(autobm)" />
      </template>
    </van-cell>

    <van-cell v-if="autobm" class="van-cell-sw" center title="仅传输数据/不加解密">
      <template #right-icon>
        <van-switch v-model="autobms" @change="setGistautos(autobms)" />
      </template>
    </van-cell>

    <van-field v-if="autobm" name="slider" label="滑块选择">
      <template #input>
        <van-slider v-model="bmsize" bar-height="24px" :step="0.1" :min="0.1" max="99.9" />
      </template>
    </van-field>
    <van-cell v-if="autobm" center :title="sizemb">
      <van-stepper v-model="bmsize" button-size="22" step="0.1" min="0.1" max="99.9" />
    </van-cell>
    <van-field v-if="autobm" label="自动测试极限" readonly placeholder="从当前依次+100K">
      <template #button>
        <van-button size="small" @click="GetMsAuto" type="primary">
          <van-loading v-if="islodingAuto" type="circular" size="17px" style="width: 27px" />
          <span v-else>Start</span>
        </van-button>

        &nbsp;
        <van-button size="small" @click="GetMsAutono" type="primary">取消</van-button>
      </template>
    </van-field>
  </van-cell-group>

  <div style="height: 12px"></div>
  <van-cell-group id="netmstest" v-if="sliceUrl.length > 0" inset title="">
    <span v-if="app" style="opacity: 0.35; font-size: 12px; padding-bottom: 20px; margin-top: 12px; display: flex; justify-content: center; height: 10px">
      Web:{{ version }} &nbsp;{{ devices }}&nbsp; {{ app }}
    </span>
    <span v-if="overt" style="opacity: 0.35; font-size: 13px; padding-bottom: 20px; margin-top: 12px; display: flex; justify-content: center; height: 10px">
      {{ overt }}
    </span>

    <van-field
      v-for="(item, index) in islodingA ? sliceUrl : sliceUrl.slice().reverse()"
      :key="index"
      rows="1"
      :label="app"
      type="textarea"
      :placeholder="item"
      readonly
      show-word-limit
      autosize
    ></van-field>
  </van-cell-group>
  <br />
  <br />
  <div class="infop">
    <p>
      <b>关于 结果</b>
    </p>
    <p>
      第一位数值
      <b>浏览器发送请求</b>
      至各App响应并开始处理脚本的时间
    </p>

    <p v-if="!autobm">第二位数值 脚本处理加解密的时间</p>
    <div v-else>
      <p>
        {{ autobms ? "第二位数值 为请求 Body 大小" : "第二位数值 为解密耗时" }}
      </p>
      <p>
        {{ autobms ? "第三位数值 脚本处理完毕后 浏览器接收各 App 传回数据的响应时间" : "第三位数值 为加密耗时" }}
      </p>
    </div>
    <p v-if="!autobms">
      第{{ autobm ? "四" : "三" }}位数值 脚本处理完毕后
      <b>浏览器接收</b>
      各App传回数据的响应时间
    </p>

    <p v-if="!autobm">
      <b>压力选项</b>
      涉及到各种循环、对象方法、生成对象长度、赋值、加密解密等操作 是一个综合的测试
    </p>
    <p>- 步进选择器内数值可以点击输入</p>
  </div>

  <br />
  <br />
  <br />
</template>

<style>
#netmstest .van-field__label {
  width: 120px !important;
  opacity: 0.8;
}

.chartContainerMs {
  width: 97%;
  height: 500px;
  margin-top: 0px;
  padding-left: 3%;
}
</style>
<script setup>
import { ref, onBeforeUnmount, watchEffect } from "vue";

import { sendReq } from "@/http/http.js";
import { showToast } from "vant";
import { CryptoJS } from "./cpto.js";
import { devx } from "./dv.js";
import useV3Clipboard from "vue-clipboard3";
const { toClipboard } = useV3Clipboard();
const copyText = async () => {
  await toClipboard("https://github.com/Keywos/rule/tree/main/script/linkey");
  showToast("已拷贝模块地址");
};
const version = import.meta.env.PACKAGE_VERSION;
const isbm = localStorage.getItem("BM") == "true";
const isbms = localStorage.getItem("BMS") != "false";
const autobm = ref(isbm);
const autobms = ref(isbms);
const setGistauto = (i) => {
  localStorage.setItem("BM", i);
};

const setGistautos = (i) => {
  localStorage.setItem("BMS", i);
};
const rems = ref(localStorage.getItem("NTC") || 1);
const overt = ref("");
let over = [];
let b = "";

let bmsizes = localStorage.getItem("BMSIZE") || 2;
const bmsize = ref(bmsizes);
const sliceUrl = ref([]);
const app = ref("");
let io = 0;
let ios = 0;
let isapp = false;
const yl = ref(localStorage.getItem("NTY") || 4);
let isCancelled = false;
const isloding = ref(false);
const islodingA = ref(false);
const islodingAuto = ref(false);

watchEffect(() => {
  localStorage.setItem("NTC", rems.value);
  localStorage.setItem("NTY", yl.value);
});
const devices = ref("");

var tt1 = "";
const GetMsPromise = async () => {
  if (islodingA.value || isloding.value || islodingAuto.value) {
    return;
  }
  await getsjson();
  tt1 = Date.now();
  islodingA.value = true;
  isapp = false;

  b = "并发执行: ";
  io = 0;
  ios = 0;
  const arrayOfObjects = Array.from({ length: rems.value }, () => "--");

  sliceUrl.value = arrayOfObjects;
  over = [];
  isCancelled = false;
  for (let i = 0; i < rems.value; i++) {
    GetMsOne();
    if (isCancelled) break;
  }
};

const GetMs = async () => {
  if (isloding.value || islodingA.value || islodingAuto.value) {
    return;
  }
  await getsjson();
  tt1 = Date.now();
  isloding.value = true;
  isapp = false;
  b = "依次执行: ";
  io = 0;
  ios = 0;

  sliceUrl.value = [];

  over = [];
  isCancelled = false;
  for (let i = 0; i < rems.value; i++) {
    await GetMsOne();
    if (isCancelled) break;
  }
  stops();
};

const isstiop = ref(false);
const GetMsAutono = () => {
  isstiop.value = false;
  islodingAuto.value = false;

  isloding.value = false;
  islodingA.value = false;
  isCancelled = true;
};
const GetMsAuto = async () => {
  if (isloding.value || islodingA.value || islodingAuto.value) {
    return;
  }

  isstiop.value = true;
  tt1 = Date.now();
  islodingAuto.value = true;
  isapp = false;
  b = "数据大小: ";
  io = 0;
  ios = 0;

  sliceUrl.value = [];

  over = [];
  isCancelled = false;
  let i;

  for (i = bmsize.value * 10; i < 300; i++) {
    bmsize.value = i / 10;
    await getsjson();
    await GetMsOne();
    if (!isstiop.value) break;
  }
  stops();
};
const stops = () => {
  isloding.value = false;
  islodingA.value = false;
  isCancelled = true;
};

function zhTime(e) {
  e = e.toString();
  if (e < 1e3) {
    return `${e}ms`;
  } else if (e < 6e4) {
    return `${(e / 1e3).toFixed(2)}秒`;
  } else if (e < 36e5) {
    return `${(e / 6e4).toFixed(2)}分钟`;
  }
}

async function generateLargeJSON(size) {
  let targetBytes = 1048576;
  if (size < 1) {
    targetBytes = size * 1048576;
  } else if (size < 2) {
    targetBytes = size * 1025076;
  } else if (size < 8.1) {
    targetBytes = size * 1042076;
  } else {
    targetBytes = size * 1048076;
  }

  const chars = "eFhMckqF0mzZBN41O8i4KOFWQRxhyfLjAGmHZRBzVlgzUxAGmT667fjh7YO0RMpnR7RKUiLkfNxnx1Zf0gpUYLtKLtTFFWhCWtebQGjA1Odn2RKPmA19Tzk";

  let result = "";
  const chunkSize = 1024 * 100; // 每次生成 10KB 的块
  let chunk = "";

  while (chunk.length < chunkSize) {
    chunk += chars;
  }

  while (result.length < targetBytes) {
    result += chunk;
  }
  return JSON.stringify({
    KEY: result.slice(0, targetBytes),
  });
}
const eapiKey = {
  words: [1698181731, 1801809512, 946104675, 1751477816],
  sigBytes: 16,
};

function dataDecrypt(JDR) {
  try {
    JDR = CryptoJS.AES.decrypt({ ciphertext: CryptoJS.lib.WordArray.create(JDR) }, eapiKey, {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7,
    });
    return JSON.parse(CryptoJS.enc.Utf8.stringify(JDR));
  } catch (error) {
    console.log(error.message);
    return null;
  }
}

function resNewBody(byteArray) {
  byteArray = CryptoJS.AES.encrypt(JSON.stringify(byteArray), eapiKey, {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7,
  }).ciphertext;

  const uint8Array = new Uint8Array(byteArray.sigBytes);
  for (let i = 0; i < byteArray.sigBytes; i++) {
    uint8Array[i] = (byteArray.words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
  }
  return uint8Array;
}
let largeJSON = {};
const sizemb = ref("大小");

let bmsizevs = "";
async function getsjson() {
  console.log("调用");
  console.log(largeJSON.length);
  if (bmsizevs != bmsize.value) {
    console.log("生成");
    largeJSON = await generateLargeJSON(bmsize.value);
    console.log(largeJSON.length);
    bmsizevs = bmsize.value;
  }
}
watchEffect(() => {
  if (autobm.value) {
    if (bmsize.value > 99.9) {
      bmsize.value = 99.9;
    } else if (bmsize.value == 0) bmsize.value = 1;
    localStorage.setItem("BMSIZE", bmsize.value);
    console.log(bmsize.value);
    sizemb.value = "大小约: " + bmsize.value + "MB";
    if (bmsize.value > 99.9) dataDecrypt("");
  }
});

let all = 0;
const GetMsOne = async () => {
  all++;
  try {
    let t1 = Date.now();
    ios++;
    if (autobm.value) {
      if (!islodingA.value) sliceUrl.value.push("...");
      const binaryData = resNewBody(largeJSON);
      let resa,
        od = autobms.value ? "onlydata/_b" + bmsize.value : "";
      await fetch("https://surgetool.com/api/ping/binary/" + od + "_c" + ios + "?all=" + all + "_t" + Date.now(), {
        method: "POST",
        body: binaryData,
      })
        .then((response) => {
          if (response.status === 200) {
            resa = JSON.parse(response.headers.get("ntconfig"));
            getdev(resa);
            const gt = Date.now() - t1;
            if (rems.value > 1 || autobm.value) {
              over.push(gt);
              overt.value =
                b +
                `${autobm.value ? `${bmsize.value}MB` : over.length + "次"}` +
                " 平均: " +
                Math.floor(over.reduce((acc, curr) => acc + curr, 0) / over.length) +
                "ms 耗时: " +
                zhTime(Date.now() - tt1);
            } else overt.value = "";

            if (sliceUrl.value[io]) {
              sliceUrl.value[io] = `${zhTime(resa.t1 - t1)} ➟ ${autobms.value ? `${bmsize.value}MB` : `${resa.t2 - resa.t1}·${resa.t3 - resa.t2}`}  ➟ ${zhTime(Date.now() - resa.t3)}`;
            }
            io++;
            if (io == rems.value) stops();
          } else {
            stops();
            isstiop.value = false;
            showToast("请求失败");
          }
        })
        .catch((e) => {
          stops();
          isstiop.value = false;
          showToast("请求失败");
        });
    } else {
      if (!islodingA.value) sliceUrl.value.push("....");

      let res = await sendReq("GET", "https://surgetool.com/api/test/" + ios + "?all=" + all + "&num=" + yl.value);

      if (res?.data["耗时"]) {
        const t2 = Date.now() - res.data.TS || "--";
        const gms = res.data["耗时"];
        let tsend = "";
        if (res.data.STS) {
          tsend = res.data.STS - t1;
          t1 = res.data.STS;
        }

        const gt = parseInt(gms.slice(0, -2), 10);

        if (res?.data["设备"] && !isapp) {
          isapp = true;
          getdev(res.data);
        }

        if (rems.value > 1) {
          over.push(gt);
          overt.value = b + over.length + "次 平均: " + Math.floor(over.reduce((acc, curr) => acc + curr, 0) / over.length) + "ms 压力: " + yl.value + " 耗时: " + zhTime(Date.now() - tt1);
        } else overt.value = "";

        if (sliceUrl.value[io]) sliceUrl.value[io] = `${zhTime(tsend)} ➟ ${zhTime(gt)} ➟ ${zhTime(t2)}`;

        io++;
        if (io == rems.value) stops();
      } else {
        stops();
        isstiop.value = false;
        showToast("测试失败");
      }
    }
  } catch (error) {
    stops();
    isstiop.value = false;
    showToast("测试失败");
    console.log(error);
  }
};

function getdev(res) {
  if (res["设备"]?.app || res.device?.app) {
    const ga = res["设备"] ? res["设备"] : res.device;
    if (ga["device-model"]) {
      devices.value = devx[ga["device-model"]] || ga["device-model"];
    }
    if (ga["device"]) {
      devices.value = devx[ga["device"]] || ga["device"];
    }
    if (!ga["device"] && !ga["device-model"]) {
      devices.value = "";
    }
    if (ga.app) app.value = ga.app + " ";
    if (ga.app == "Egern") {
      app.value += ga["version"];
    } else if (ga.app == "Surge") {
      app.value += ga["surge-version"]; // + " " + ga["surge-build"];
    } else if (ga.app == "Stash") {
      app.value += ga["stash-version"]; // + " " + ga["stash-build"];
    } else if (ga.app == "Loon") {
      app.value += ga["version"].replace(/\(|\)/g, " ");
    } else if (ga.app == "Quantumult X") {
      app.value = "Quan X " + ga["version"].replace("-build", " ").replace("v", " ");
    }
  } else {
    app.value = res["设备"] || res.device;
  }
}

onBeforeUnmount(() => {
  b = "";
  isCancelled = true;
  sliceUrl.value = [];
  over = [];
});
</script>
