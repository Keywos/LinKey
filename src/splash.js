const splash = document.getElementById("boot-splash");
const isVisible = () => splash?.classList.contains("boot-splash--visible");

// 与 CSS boot-sweep-fill 时长一致
const SWEEP_MS = 2400;
const HOLD_MS = 160;
const FADE_MS = 300;
const FAST_SKIP_MS = 233; // 在此时间内加载完成则不显示开屏

let appReady = false;
let sweepDone = false;
let finishing = false;
let sweepScheduled = false;

const ensureLoading = () => {
  if (!splash) return;
  if (!splash.classList.contains("boot-splash--visible")) {
    splash.classList.add("boot-splash--visible");
  }
  if (!splash.classList.contains("boot-splash--loading")) {
    void splash.offsetWidth;
    splash.classList.add("boot-splash--loading");
    window.linkeyBootSweepAt = performance.now();
  } else if (!window.linkeyBootSweepAt) {
    window.linkeyBootSweepAt = performance.now();
  }
};

const tryFinish = () => {
  if (finishing || !appReady || !sweepDone || !isVisible()) return;
  finishing = true;

  requestAnimationFrame(() => {
    splash.classList.add("boot-splash--complete");
    try {
      localStorage.setItem("linkey:app-ready", "1");
    } catch (_) { /* ignore */ }

    window.setTimeout(() => {
      splash.classList.add("boot-splash--done");
      window.setTimeout(() => splash.remove(), FADE_MS);
    }, HOLD_MS);
  });
};

const scheduleSweepDone = () => {
  if (sweepScheduled) return;
  sweepScheduled = true;

  const tick = () => {
    if (!window.linkeyBootSweepAt) ensureLoading();
    const startedAt = window.linkeyBootSweepAt || performance.now();
    const wait = Math.max(0, SWEEP_MS - (performance.now() - startedAt));
    window.setTimeout(() => {
      sweepDone = true;
      tryFinish();
    }, wait);
  };

  requestAnimationFrame(() => requestAnimationFrame(tick));
};

import("./main").then(({ initializeApp }) => {
  initializeApp();

  const elapsed = performance.now() - (window.linkeyBootStartedAt || performance.now());

  if (elapsed < FAST_SKIP_MS) {
    // 233ms 内加载完成 — 不创建动画状态，直接移除未显示的 splash。
    splash?.remove();
    return;
  }

  // 超过 233ms 才开始显示并执行开屏动画。
  ensureLoading();
  scheduleSweepDone();

  // 等两帧确保 Vue 首帧渲染完成后再淡化 splash
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      appReady = true;
      tryFinish();
    });
  });
});
