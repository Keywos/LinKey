<template>
  <main class="edit-code-loading"  role="status" aria-live="polite">
    <span class="edit-code-loading-spinner"></span>
    <span>正在加载脚本编辑器…</span>
  </main>
</template>

<!-- <script setup> :style="loadingStyle"
const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

const loadingStyle = {
  background: isDark ? "#141414" : "#f3f3f3",
  color: isDark ? "#e2e3ea" : "#313842",
};
</script> -->

<style scoped>
.edit-code-loading {
  /* background-color: red; */
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
