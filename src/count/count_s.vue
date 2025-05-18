<template>
  <van-cell-group inset :title="'isLandscape: ' + isLandscape + ' ' + screenHeight + ' ' + screenWidth">
    <pre>
      <code class="language-javascript  "  ref="codeBlock" >
import { x } from "xx";
{
  "isPWA": {{ isPWA }},
  "screenHeight": {{ screenHeights }},
  "screenWidth": {{ screenWidths }},
  "version": "{{ version }}",
  "tags": [
      "{{ theme }}",
  ],
}
const ua "{{ uas }}",
const c = () => {
  s.value = true;
};
// const a = ref(1);

      </code>
    </pre>
  </van-cell-group>
  <br />
  <br />
  <br />
  <br />
</template>

<script setup>
import { ref, onMounted, watchEffect } from "vue";

import Prism from "prismjs";
import { useTheme } from "@/hooks/theme";

import { onWidth } from "@/hooks/winWidth";

const { isLandscape, isPWA, screenHeight, screenWidth } = onWidth();
const uas = ref(navigator.userAgent.split(" ") || "");
const version = import.meta.env.PACKAGE_VERSION;
const { theme } = useTheme();
import "prismjs/themes/prism-tomorrow.css";
const screenHeights = screenHeight.value;
const screenWidths = screenWidth.value;

onMounted(() => {
  Prism.highlightAll();
});
watchEffect(() => {});
</script>

<style>
#croncheckbox .van-checkbox,
.van-checkbox-group--horizontal {
  justify-content: space-evenly;
}

:not(pre) > code[class*="language-"],
pre[class*="language-"] {
  background: none;
}
</style>
