<template>
  <main class="edit-code-loading" :style="loadingStyle" role="status" aria-live="polite">
    <span class="edit-code-loading-spinner"></span>
    <span>正在加载脚本编辑器…</span>
  </main>
</template>

<script setup>
const darkBackgrounds = new Set(["#282c34", "#141414", "#000000"]);
const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
const savedBackground = localStorage.getItem("EditorDarkBackground");
const background = isDark && darkBackgrounds.has(savedBackground) ? savedBackground : isDark ? "#282c34" : "#fff";

const loadingStyle = {
  background,
  color: isDark ? "#e2e3ea" : "#313842",
};
</script>

<style scoped>
.edit-code-loading {
  position: fixed;
  inset: 0;
  z-index: 99999;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  font-size: 14px;
}

.edit-code-loading-spinner {
  width: 28px;
  height: 28px;
  border: 3px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  opacity: 0.65;
  animation: edit-code-loading-spin 0.8s linear infinite;
}

@keyframes edit-code-loading-spin {
  to {
    transform: rotate(360deg);
  }
}

</style>
