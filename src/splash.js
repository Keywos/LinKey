const splash = document.getElementById("boot-splash");
const isVisible = () => splash?.classList.contains("boot-splash--visible");

const FAST_SKIP_MS = 233;
const HOLD_MS = 160;
const FADE_MS = 300;

let appReady = false;
let finishing = false;

const BOOT_RECOVERY_KEY = "linkey:boot-recovery-attempted";

const recoverFromStaleScripts = async () => {
  try {
    if (sessionStorage.getItem(BOOT_RECOVERY_KEY)) return false;
    sessionStorage.setItem(BOOT_RECOVERY_KEY, "1");

    if ("caches" in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.filter((name) => name.startsWith("js-cache")).map((name) => caches.delete(name)));
    }

    window.location.reload();
    return true;
  } catch (_) {
    return false;
  }
};

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
  if (finishing || !appReady || !isVisible()) return;
  finishing = true;

  requestAnimationFrame(() => {
    splash.classList.add("boot-splash--complete");
    try {
      localStorage.setItem("linkey:app-ready", "1");
    } catch (_) {}

    window.setTimeout(() => {
      splash.classList.add("boot-splash--done");
      window.setTimeout(() => splash.remove(), FADE_MS);
    }, HOLD_MS);
  });
};

import("./main")
  .then(({ initializeApp }) => {
    initializeApp();
    const elapsed = performance.now() - (window.linkeyBootStartedAt || performance.now());
    if (elapsed <= FAST_SKIP_MS) {
      window.clearTimeout(window.linkeyBootSplashTimer);
      splash?.remove();
      return;
    }
    ensureLoading();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        appReady = true;
        tryFinish();
      });
    });
  })
  .catch(async () => {
    if (!(await recoverFromStaleScripts())) splash?.remove();
  });
