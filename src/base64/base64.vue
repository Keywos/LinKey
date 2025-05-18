<template>
  <div class="max-centered" id="keyfroms">
    <h2>Base64 转换</h2>
    <van-cell-group inset title="输入区域">
      <van-field v-model="inp" rows="1" label="" :error-message="errm" type="textarea" :placeholder="tit" show-word-limit :autosize="{ maxHeight: 400, minHeight: 40 }">
        <template #button>
          <van-button size="small" type="primary" @click="pasteFromClipboard">粘贴</van-button>
          &nbsp;
          <van-button size="small" type="primary" @click="clearsb">{{ inplength }} 清空</van-button>
        </template>
      </van-field>
    </van-cell-group>
    <van-radio-group v-model="isbase">
      <van-cell-group inset title="选择转换模式">
        <van-cell title="Base64 转字符串" clickable @click="isbase = '1'">
          <template #right-icon>
            <van-radio name="1" />
          </template>
        </van-cell>
        <van-cell title="字符串转 Base64" clickable @click="isbase = '2'">
          <template #right-icon>
            <van-radio name="2" />
          </template>
        </van-cell>
      </van-cell-group>
    </van-radio-group>

    <van-cell-group inset title="结果: 按钮左侧数字代表字符串总数">
      <van-field v-model="outp" rows="2" label="" readonly type="textarea" :placeholder="tito" show-word-limit :autosize="{ maxHeight: 400, minHeight: 130 }">
        <template #button>
          <van-button size="small" type="primary" @click="copyText(outp)">{{ outplength }} 复制</van-button>
        </template>
      </van-field>
    </van-cell-group>

    <div class="infop">
      <p>
        <b>关于</b>
        按钮左侧的数字是字符串总数
        <b></b>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from "vue";
import { showToast } from "vant";
import useV3Clipboard from "vue-clipboard3";
const { toClipboard } = useV3Clipboard();

const errm = ref("");
const inp = ref("");
const outp = ref("");
const inplength = ref("");
const outplength = ref("");

const isbtos = localStorage.getItem("Base64") ?? "1";

const ti = {
  1: "请输入 Base64",
  2: "请输入 字符串",
};

const isbase = ref(isbtos);
const tit = ref(ti[isbtos]);
const tito = ref("转换后的数据");

const clearsb = () => (inp.value = "");
const pasteFromClipboard = async () => {
  try {
    const clipboardText = await navigator.clipboard.readText();
    if (clipboardText?.length > 0) {
      inp.value = clipboardText;
      showToast("已粘贴字数: " + clipboardText.length);
    }
  } catch (e) {
    const textarea = document.querySelector("textarea");
    if (!textarea) return;
    textarea.focus();
    document.execCommand("paste", false);
    if (textarea?.value.length > 0) {
      inp.value = textarea.value;
      showToast("已粘贴字数 -- " + textarea.value.length);
    }
  }
};

const copyText = async (t) => {
  if (t.length > 0) {
    await toClipboard(t);
    showToast("已复制字符串数: " + t.length);
  }
};

watch([inp, isbase], ([newValue, tf]) => {
  inplength.value = newValue.length;
  localStorage.setItem("Base64", tf);
  if (tf == 2) {
    tit.value = ti[2];
    tito.value = "转换后的 Base64";
    try {
      errm.value = "";
      const uint8Array = new TextEncoder().encode(newValue);
      outp.value = btoa(String.fromCharCode.apply(null, uint8Array));
    } catch (error) {
      errm.value = "错误2: ";
      console.log(error);
      console.log("错误2");
    }
  } else {
    tit.value = ti[1];
    tito.value = "转换后的 字符串";
    try {
      errm.value = "";
      const uint8Array = new Uint8Array(Array.from(atob(newValue), (c) => c.charCodeAt(0)));
      outp.value = new TextDecoder().decode(uint8Array);
    } catch (error) {
      errm.value = "错误1: 无效的 Base64 编码";
      outp.value = "";
      console.log(error);
      console.log("错误1");
    }
  }
  outplength.value = outp.value.length;
});
</script>
