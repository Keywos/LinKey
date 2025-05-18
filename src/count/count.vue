<template>
  <van-cell-group inset :title="'isLandscape: ' + isLandscape + ' ' + screenHeight + ' ' + screenWidth">
    <EditCode :isReadOnly="false" />
  </van-cell-group>

  <br />
  <br />
  <br />
  <br />
</template>

<script setup>
import { ref, onMounted, defineAsyncComponent } from "vue";

import { useTheme } from "@/hooks/theme";

import { onWidth } from "@/hooks/winWidth";
import { useCmStore } from "@/store/cmCodeStore.js";

const cmStore = useCmStore();

const { isLandscape, isPWA, screenHeight, screenWidth } = onWidth();
const uas = ref(navigator.userAgent.split(" ") || "");
const version = import.meta.env.PACKAGE_VERSION;
const { theme } = useTheme();
const screenHeights = screenHeight.value;
const screenWidths = screenWidth.value;
const EditCode = defineAsyncComponent(() => import("@/EditCode/cmView.vue"));

onMounted(() => {
  cmStore.setCmCode(`
import { x } from "xx";
{
  "isPWA": ${isPWA.value},
  "screenHeight": ${screenHeights},
  "screenWidth": ${screenWidths},
  "version": "${version}",
  "tags": [
      "${theme.value}",
  ],
}
const ua "${uas.value}",
const c = () => {
  s.value = true;
};

//const a = ref(1);






























const karr = [
    "Why do you have to be ready to go?",
    "You can never be 100% ready.",
    "You know what?",
    "You have to dive in first",
    "And then it's refined.",
    "If you plan more and think more",
    "You will fall into the trap of perfectionism",
    "That will make you very painful",
    "So you have to remember",
    "Don't do it when you see hope",
    "It's about doing it to see hope",
    "In the process",
    "You will encounter a lot of unhappy things",
    "But remember",
    "If you are not happy, go to the supermarket",
    "You will also encounter things that make you very angry",
    "But remember",
    "If you are right",
    "You don't have to be angry.",
    "If you are wrong",
    "You have no right to be angry",
    "Do you understand？",
  ];




  
`);
});
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
