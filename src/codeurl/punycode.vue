<template>
  <div class="max-centered" id="keyfroms">
    <h2>Punycode 编解码</h2>
    <van-cell-group inset title="输入区域">
      <van-field v-model="inp" rows="2" label="" :error-message="errm" type="textarea" :placeholder="tit" show-word-limit :autosize="{ maxHeight: 200, minHeight: 40 }">
        <template #button>
          <van-button size="small" type="primary" @click="pasteFromClipboard">粘贴</van-button>
          &nbsp;
          <van-button size="small" type="primary" @click="clearsb">{{ inplength }} 清空</van-button>
        </template>
      </van-field>
    </van-cell-group>
    <van-radio-group v-model="isbase">
      <van-cell-group inset title="选择转换模式">
        <van-cell title="Emoji 转 Punycode 编码" clickable @click="isbase = '1'">
          <template #right-icon>
            <van-radio name="1" />
          </template>
        </van-cell>

        <van-cell title="中文 转 Punycode 编码" clickable @click="isbase = '3'">
          <template #right-icon>
            <van-radio name="3" />
          </template>
        </van-cell>

        <van-cell title="Punycode 解码" clickable @click="isbase = '2'">
          <template #right-icon>
            <van-radio name="2" />
          </template>
        </van-cell>
      </van-cell-group>
    </van-radio-group>

    <van-cell-group inset title="结果: 按钮左侧数字代表字符串总数">
      <van-field v-model="outp" rows="2" label="" readonly="" type="textarea" placeholder="处理后的数据" show-word-limit :autosize="{ maxHeight: 200, minHeight: 80 }">
        <template #button>
          <van-button size="small" type="primary" @click="copyText(outp)">{{ outplength }} 复制</van-button>
        </template>
      </van-field>
    </van-cell-group>

    <div class="infop">
      <b>关于 Punycode 编码</b>
      <p>▸ 举个栗子，中文域名 "例子.com" 在 Punycode 编码后变为 "xn--fsqu00a.com"</p>
      <p>▸ Punycode 主要用于国际化域名（Internationalized Domain Names，IDN）中，以便将包含非 ASCII 字符的域名转换为 ASCII 字符，使其在互联网中可用。这是因为域名系统（DNS）只能处理 ASCII 字符。</p>
      <p>▸ Punycode 是一种特定的编码方式，可以将包含非 ASCII 字符的域名转换为 ASCII 字符，从而符合DNS标准。这个编码方案使用了一种基于 Base62 的算法，通过 ASCII 字符集来表示 Unicode 字符。</p>

      <p>▸ 在浏览器等应用中，通常是由系统或应用自动处理 Punycode 编码和解码，使用户无需直接感知 Punycode 的存在，能够直接使用中文、阿拉伯文等语言的域名。</p>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from "vue";
import { showToast } from "vant";
import punycode from "punycode";
import useV3Clipboard from "vue-clipboard3";
const { toClipboard } = useV3Clipboard();
const errm = ref("");
const inp = ref("");
const outp = ref("");

const inplength = ref("");
const outplength = ref("");
const isbtop = localStorage.getItem("Punycode") || "1";
const isbase = ref(isbtop);
const ti = {
  1: "请输入 Punycode Emoji 表情，非 Emoji 字符将不会转换",
  2: "请输入 字符串 例如 xn--ji8h",
  3: "请输入非 ASCII 字符的字符串（例如中文、特殊字符等）转换为 ASCII 字符串。",
};
const tit = ref(ti[isbtop]);
const clearsb = () => {
  inp.value = "";
};

const pasteFromClipboard = async () => {
  try {
    const clipboardText = await navigator.clipboard.readText();
    if (clipboardText.length > 0) {
      inp.value = clipboardText;
      showToast("已粘贴字数: " + clipboardText.length);
    }
  } catch (e) {
    const textarea = document.querySelector("textarea");
    if (!textarea) return;
    textarea.focus();
    document.execCommand("paste", false);
    if (textarea.value.length > 0) {
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
const emojiRegex =
  /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
const punycodeRegex = /xn--[a-z0-9-]+/gi;

watch([inp, isbase], ([newValue, tf]) => {
  localStorage.setItem("Punycode", tf);
  inplength.value = newValue.length == 0 ? "" : newValue.length;
  if (tf == 2) {
    tit.value = ti[2];
    try {
      errm.value = "";

      const punycodesSet = new Set();
      let match;
      while ((match = punycodeRegex.exec(newValue)) !== null) {
        punycodesSet.add(match[0]);
      }
      const punycodesArray = Array.from(punycodesSet);

      const toemoji = punycodesArray.map((i) => {
        newValue = newValue.replace(new RegExp(i, "g"), punycode.toUnicode(i));
        return;
      });

      outp.value = newValue;
    } catch (error) {
      errm.value = "错误2: ";
    }
  } else if (tf == 1) {
    tit.value = ti[1];
    try {
      errm.value = "";
      const emojis = Array.from(newValue);
      console.log(emojis);
      const emojipuny = emojis
        .map((emoji) => {
          if (emoji.match(emojiRegex)) {
            return "xn--" + punycode.encode(emoji);
          } else {
            return emoji;
          }
        })
        .join("");
      if (emojipuny != "") {
        outp.value = emojipuny;
      } else {
        outp.value = "";
      }
    } catch (error) {
      errm.value = "错误1: 无效的 Punycode 编码";
      outp.value = "";
    }
  } else {
    tit.value = ti[3];
    try {
      const punycodeEncoded = punycode.toASCII(newValue);
      outp.value = punycodeEncoded;
      console.log(punycodeEncoded);
    } catch (error) {}
  }
  outplength.value = outp.value.length == 0 ? "" : outp.value.length;
});
</script>
