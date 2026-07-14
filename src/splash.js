const splash = document.getElementById("boot-splash");
const isVisible = () => splash?.classList.contains("boot-splash--visible");

if (isVisible()) {
  requestAnimationFrame(() => splash.classList.add("boot-splash--loading"));
}

import("./main").then(({ initializeApp }) => {
  initializeApp();
  window.clearTimeout(window.linkeyBootSplashTimer);

  if (!isVisible()) return;

  requestAnimationFrame(() => {
    splash.classList.add("boot-splash--complete");
    localStorage.setItem("linkey:app-ready", "1");

    window.setTimeout(() => {
      splash.classList.add("boot-splash--done");
      window.setTimeout(() => splash.remove(), 233);
    }, 20);
  });
});
