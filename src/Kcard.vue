<template>
  <van-image radius="9px" :src="imageSrc" />
  <van-switch v-model="checked" size="22px" />
</template>

<style></style>

<script setup>
import { ref, defineProps } from "vue";
const checked = ref(false);
const props = defineProps(["imageSrc"]);
</script>
