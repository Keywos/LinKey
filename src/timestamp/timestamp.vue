<template>
  <div class="max-centered" id="tsclass">
    <h2>时间戳转换</h2>

    <van-cell-group v-if="timeselect" inset title="输入时间">
      <van-field v-model="seltotimestamp" type="textarea" rows="1" label="" :autosize="{ maxHeight: 50, minHeight: 10 }" placeholder="" id="keyfroms">
        <template #button>
          <van-button size="small" type="primary" @click="pasteFromClipboard()">粘贴</van-button>
          &nbsp;
          <van-button size="small" type="primary" @click="clears">清空</van-button>
        </template>
      </van-field>

      <van-field v-model="seltotimestamp" is-link readonly name="datePicker" label="选择时间" placeholder="点击选择时间" @click="showPicker = true" />

      <van-field v-model="istotimestamp" label="" readonly placeholder="">
        <template #button>
          <van-button size="small" type="primary" @click="copyText(istotimestamp)">&nbsp;复制&nbsp;</van-button>
        </template>
      </van-field>
    </van-cell-group>

    <van-cell-group v-if="!timeselect" inset title="输入时间戳">
      <van-field v-model="inputtimestamp" type="textarea" rows="1" label="" :autosize="{ maxHeight: 50, minHeight: 30 }" placeholder="">
        <template #button>
          <van-button size="small" type="primary" @click="pasteFromClipboards()">粘贴</van-button>
          &nbsp;
          <van-button size="small" type="primary" @click="clearsb">清空</van-button>
          <template v-if="needtimecopy">
            &nbsp;
            <van-button size="small" type="primary" @click="copyText(inputtimestamp)">复制</van-button>
          </template>
        </template>
      </van-field>
      <van-field name="slider" label="滑块选择时间">
        <template #input>
          <van-slider v-model="timehk" bar-height="24px" active- :step="1000" :min="0" :max="maxts" @update:model-value="onChange" />
        </template>
      </van-field>
      <van-field v-model="inputtotimestamp" label="" readonly placeholder="">
        <template #button>
          <van-button size="small" type="primary" @click="copyText(inputtotimestamp)">&nbsp;复制&nbsp;</van-button>
        </template>
      </van-field>
    </van-cell-group>

    <van-cell-group inset title="当前时间戳">
      <van-field v-model="nowtimestamp" label="" readonly placeholder="">
        <template #button>
          <van-button size="small" type="primary" @click="copyText(nowtimestamp)">&nbsp;复制&nbsp;</van-button>
        </template>
      </van-field>

      <van-cell center title="刷新时间毫秒">
        <van-stepper v-model="rems" button-size="22" disable-input :step="steps" :min="minbjq" />
      </van-cell>
      <van-cell center title="切换时间戳单位为秒">
        <template #right-icon>
          <van-switch v-model="needs" @click="isswitch(needs)" />
        </template>
      </van-cell>

      <van-cell center title="显示输入时间戳复制按钮">
        <template #right-icon>
          <van-switch v-model="needtimecopy" @click="isswitch2(needtimecopy)" />
        </template>
      </van-cell>

      <van-cell center title="输入精确时间">
        <template #right-icon>
          <van-switch v-model="timeselect" @click="isswitch3(timeselect)" />
        </template>
      </van-cell>
    </van-cell-group>

    <van-popup v-model:show="showPicker" position="bottom">
      <van-date-picker :min-date="minDate" :max-date="maxDate" @confirm="onConfirm" @cancel="showPicker = false" />
    </van-popup>

    <div class="infop">
      <p>
        <b>Unix 时间戳</b>
        （也称为Epoch时间或Unix时间）是从1970年1月1日00:00:00（UTC/GMT的午夜）开始所经过的秒数，不考虑闰秒。这个时间系统广泛用于计算机系统中，特别是在Unix和类Unix系统中。
        <b>例如：</b>
        事件记录和日志 数据版本控制 缓存控制 定时任务和调度 计时和性能测量 加密和安全 文件系统 协调分布式系统
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, onUnmounted, watch } from "vue";
import { showToast } from "vant";
import useV3Clipboard from "vue-clipboard3";
const { toClipboard } = useV3Clipboard();
const isS = "TimestampIsS";
const isStrue = localStorage.getItem(isS) == 1 || 0;
const needs = ref(isStrue);
const isCopy = "TimestampIsCopy";
const isCopytrue = localStorage.getItem(isCopy) == 1 || 0;
const needtimecopy = ref(isCopytrue);
const maxts = ref(11477900460000);
const isHtime = "TImestampIsHt";
const isHtimetrue = localStorage.getItem(isHtime) == 1 || 0;
const timeselect = ref(isHtimetrue);
const minDate = new Date(1999, 9, 9);
const maxDate = new Date(2400, 1, 1);
let timestamp = Date.now();
const rems = ref(2000);
const minbjq = ref(0);
const steps = ref(500);
const date = formatTimestamp(timestamp);
const timehk = ref(timestamp);
const nowtimestamp = ref(timestamp);
const istotimestamp = ref(timestamp);
const seltotimestamp = ref(formatTimestamp(timestamp, 1));
const inputtimestamp = ref(timestamp);
const inputtotimestamp = ref(date);
const showPicker = ref(false);

const isswitch = (i) => {
  if (i) {
    localStorage.setItem(isS, 1);
    maxts.value = 253392457260;
    inputtimestamp.value = Math.floor(timestamp / 1000);
    timehk.value = Math.floor(timestamp / 1000);
    console.log(timestamp / 1000);
  } else {
    localStorage.removeItem(isS);
    maxts.value = 253392457260000;
    inputtimestamp.value = Date.now();
  }
};
const isswitch2 = (i) => {
  if (i) {
    localStorage.setItem(isCopy, 1);
  } else localStorage.removeItem(isCopy);
};
const isswitch3 = (i) => {
  if (i) {
    localStorage.setItem(isHtime, 1);
  } else localStorage.removeItem(isHtime);
};
const onConfirm = ({ selectedValues }) => {
  const dateString = selectedValues.join("-");
  seltotimestamp.value = dateString + " 09:41:00";
};

const onChange = () => {
  inputtotimestamp.value = formatTimestamp(inputtimestamp.value);
  inputtimestamp.value = Math.floor(timehk.value); //输入时间戳
};
let intervalId;
watch([needs, seltotimestamp, inputtimestamp, rems], ([needsValue, seltotimestampValue, inputtimestampValue]) => {
  istotimestamp.value = needsValue ? Math.floor(new Date(seltotimestampValue).getTime() / 1000) : Math.floor(new Date(seltotimestampValue).getTime());
  inputtotimestamp.value = formatTimestamp(inputtimestampValue);

  clearInterval(intervalId);
  intervalId = setInterval(() => {
    console.log("定时执行的逻辑");
    nowtimestamp.value = needs.value ? Math.floor(Date.now() / 1000) : Date.now();
  }, rems.value);
});

onUnmounted(() => {
  console.log("在组件销毁时清除定时器");
  clearInterval(intervalId);
});
function formatTimestamp(timestampInSeconds, y) {
  const x = needs.value ? 1000 : 1;
  const dateo = new Date(timestampInSeconds * x);
  const year = dateo.getFullYear();
  const month = String(dateo.getMonth() + 1).padStart(2, "0");
  const day = String(dateo.getDate()).padStart(2, "0");
  const hours = String(dateo.getHours()).padStart(2, "0");
  const minutes = String(dateo.getMinutes()).padStart(2, "0");
  const seconds = String(dateo.getSeconds()).padStart(2, "0");
  const milliseconds = y ? "" : "." + String(dateo.getMilliseconds()).padStart(3, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}${milliseconds}`;
}

const clears = () => {
  seltotimestamp.value = "";
};
const clearsb = () => {
  inputtimestamp.value = "";
};

const pasteFromClipboards = async () => {
  try {
    const clipboardText = await navigator.clipboard.readText();
    if (clipboardText.length > 0) {
      inputtimestamp.value = clipboardText;
      showToast("已粘贴字符数: " + clipboardText.length);
    }
  } catch (e) {
    const textarea = document.querySelector("textarea");
    if (!textarea) return;
    textarea.focus();
    document.execCommand("paste", false);
    if (textarea.value.length > 0) {
      inputtimestamp.value = textarea.value;
      showToast("已粘贴字数 -- " + textarea.value.length);
    }
  }
};

const pasteFromClipboard = async () => {
  try {
    const clipboardText = await navigator.clipboard.readText();
    if (clipboardText.length > 0) {
      seltotimestamp.value = clipboardText;
      showToast("已粘贴字符数: " + clipboardText.length);
    }
  } catch (error) {
    const textarea = document.querySelector("textarea");
    if (!textarea) return;
    textarea.focus();
    document.execCommand("paste", false);
    if (textarea.value.length > 0) {
      seltotimestamp.value = textarea.value;
      showToast("已粘贴字符数 -- " + textarea.value.length);
    }
  }
};
const copyText = async (t) => {
  if (t.length > 0) {
    await toClipboard(t);
    showToast("已复制字符串数: " + t.length);
  }
};
</script>

<style>
@media (min-width: 601px) {
  .max-centered {
    min-width: 600px;
    margin-left: auto;
    margin-right: auto;
  }
}

.van-cell-group__title {
  padding: 20px 0 10px 24px;
}
.max-centered {
  margin-bottom: 100px;
}

.van-stepper {
  /* 步进 */
  padding: 2px 0 5.32px 0;
}
#tsclass .van-field__label {
  padding: 4px 0;
  /* 选择时间 */
}
.van-badge__wrapper {
  padding: 0px 0;
}
/* .van-slider__button {
} */
/* 滑块 */
.van-slider__button {
  margin-right: 20px;
  /* margin-left: 10px; */
  width: 40px;
  /* var(--van-slider-button-width); */
  height: 40px;
  /* var(--van-slider-button-height); */
  background: none;
  /* #80a8c9; */
  border-radius: 20px;
  box-shadow: none;
  /* var(--van-slider-button-radius); */
  /* box-shadow: var(--van-slider-button-shadow); */
}
/* .van-switch {
  margin: 10px;
} */
.van-slider__bar {
  min-width: 24px;
  /* padding: auto; */
}

/* :root { */
/* --van-cell-line-height:26px; */
/* --van-cell-vertical-padding: 0px;  */
/* 开关 */
/* --van-cell-group-inset-radius: 12px !important; */
/* 圆角 */
/* } */
</style>
