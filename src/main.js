import "./style.scss";
import "./EditCode/css/cm.scss";
import { createApp } from "vue";
import App from "./App.vue";
import { createPinia } from "pinia";
import router from "./router.js";
import "./touch/index.js";
import { Lazyload } from "vant";

const isStandalonePwa = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
document.documentElement.classList.toggle("pwa-standalone", isStandalonePwa);

export const initializeApp = () => {
  const app = createApp(App);
  const pinia = createPinia();
  app.use(router);
  app.use(pinia);
  app.use(Lazyload, {
    lazyComponent: true,
  });
  app.mount("#app");
};
