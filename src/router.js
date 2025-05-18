import { createRouter, createWebHistory } from "vue-router";
import { useStore } from "@/store/store";
import { nextTick } from "vue";
import Home from "./home.vue";
import setting from "./setting/setting.vue";
import settingping from "./setting/setping.vue";
import st from "./st/st.vue";
import search from "./search/search.vue";
import timestamp from "./timestamp/timestamp.vue";
import base64 from "./base64/base64.vue";
import codeurl from "./codeurl/codeurl.vue";
import unicode from "./unicode/unicode.vue";
import punycode from "./codeurl/punycode.vue";
import gist from "./gist/gist.vue";
import gistEdit from "./gist/gistEdit.vue";
import count from "./count/count.vue";
import ping from "./ping/ping.vue";
import stms from "./st/stms.vue";
import ec from "./st/ec.vue";

const routes = [
  {
    path: "/",
    component: Home,
    name: "home",
    meta: {
      title: "Home",
      needTabBar: true,
      isNavBack: false,
      isNavTop: true,
    },
  },
  {
    path: "/home",
    component: Home,
    name: "homes",
    meta: {
      title: "Home",
      needTabBar: true,
      isNavBack: false,
      isNavTop: true,
    },
  },
  {
    path: "/search",
    component: search,
    name: "search",
    meta: {
      title: "",
      needTabBar: true,
      isNavBack: false,
      isNavTop: true,
    },
  },

  {
    path: "/EditCode",
    component: () => import("./EditCode/EditCode.vue"),
    name: "EditCode",
    meta: {
      title: "Edit Code",
      needTabBar: false,
      isNavBack: true,
      isNavTop: true,
    },
  },

  {
    path: "/EditCode_noNav",
    component: () => import("./EditCode/EditCode.vue"),
    name: "EditCode_noNav",
    meta: {
      title: "Edit Code",
      needTabBar: false,
      isNavBack: true,
      isNavTop: false,
    },
  },
  {
    path: "/s",
    component: search,
    name: "s",
    meta: {
      title: "",
      needTabBar: false,
      isNavBack: true,
      isNavTop: false,
    },
  },
  {
    path: "/timestamp",
    component: timestamp,
    name: "timestamp",
    meta: {
      title: "时间戳转换",
      needTabBar: false,
      isNavBack: true,
      isNavTop: true,
    },
  },
  {
    path: "/base64",
    component: base64,
    name: "base64",
    meta: {
      title: "BASE64 转换",
      needTabBar: false,
      isNavBack: true,
      isNavTop: true,
    },
  },
  {
    path: "/codeurl",
    component: codeurl,
    name: "codeurl",
    meta: {
      title: "URL 工具箱",
      needTabBar: false,
      isNavBack: true,
      isNavTop: true,
    },
  },
  {
    path: "/punycode",
    component: punycode,
    name: "punycode",
    meta: {
      title: "Punycode 转换",
      needTabBar: false,
      isNavBack: true,
      isNavTop: true,
    },
  },
  {
    path: "/unicode",
    component: unicode,
    name: "unicode",
    meta: {
      title: "Unicode 转换",
      needTabBar: false,
      isNavBack: true,
      isNavTop: true,
    },
  },
  {
    path: "/st",
    component: st,
    name: "st",
    meta: {
      title: "Troubleshoot",
      needTabBar: false,
      isNavBack: true,
      isNavTop: true,
    },
  },
  {
    path: "/netms",
    component: stms,
    name: "netms",
    meta: {
      title: "性能测试",
      needTabBar: false,
      isNavBack: true,
      isNavTop: true,
    },
  },
  {
    path: "/ec",
    component: ec,
    name: "ec",
    meta: {
      title: "Echarts",
      needTabBar: false,
      isNavBack: true,
      isNavTop: true,
    },
  },
  {
    path: "/gist",
    component: gist,
    name: "gist",
    meta: {
      title: "Gist Hub",
      needTabBar: false,
      isNavBack: true,
      isNavTop: true,
    },
  },
  {
    path: "/gist/gistEdit",
    component: gistEdit,
    name: "gistEdit",
    meta: {
      title: "Gist Edit",
      needTabBar: false,
      isNavBack: true,
      isNavTop: true,
    },
  },
  {
    path: "/gist/:username",
    component: gistEdit,
    name: "gistEdits",
    meta: {
      title: "Gist Edit",
      needTabBar: false,
      isNavBack: true,
      isNavTop: true,
    },
  },
  {
    path: "/ping",
    component: ping,
    name: "Ping",
    meta: {
      title: "Ping",
      needTabBar: false,
      isNavBack: true,
      isNavTop: true,
    },
  },
  {
    path: "/ping/setting",
    component: settingping,
    name: "setping",
    meta: {
      title: "设置",
      needTabBar: false,
      isNavBack: true, //back
      isNavTop: true,
    },
  },

  {
    path: "/count",
    component: count,

    name: "count",
    meta: {
      title: "Count",
      needTabBar: false,
      isNavBack: true,
      isNavTop: true,
    },
  },
  {
    path: "/setting",
    component: setting,
    name: "setting",
    meta: {
      title: "设置",
      needTabBar: true,
      isNavBack: false,
      isNavTop: true,
    },
  },
  {
    path: "/setting/ping",
    component: settingping,
    name: "settingping",
    meta: {
      title: "设置",
      needTabBar: false,
      isNavBack: true, //back
      isNavTop: true,
    },
  },
  {
    path: "/settings",
    component: setting,

    name: "settings",
    meta: {
      title: "设置",
      needTabBar: false,
      isNavBack: true,
      isNavTop: true,
    },
  },

  {
    path: "/:path(.*)",
    redirect: "/",
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// 全局前置守卫
router.afterEach(async (to, from) => {
  const storedPosition = useStore().scrollPositions[to.path] || 0;
  // console.log(`${to.path} 滚动到：${storedPosition}`)
  await nextTick();
  window.scrollTo({
    top: storedPosition,
    behavior: "instant",
  });
});

// 在首次打开应用时执行的导航守卫
let isFirstTime = true;
const ISF = sessionStorage.getItem("ISF");
if (ISF) {
  console.log("刷新页面");
  isFirstTime = false;
} else {
  sessionStorage.setItem("ISF", 1);
  console.log("新会话开始");
}

router.beforeEach((to, from, next) => {
  useStore().setScrollPosition({
    [from.path]: window.scrollY,
  });
  if (isFirstTime) {
    isFirstTime = false;
    const ish = to.path != "/";
    const selectedRoute = localStorage.getItem("DefaultHome");
    if (ish) {
      console.log("首次直接访问路由");
      next();
    } else if (selectedRoute) {
      console.log("导航到设置的路由: " + selectedRoute);
      next({ path: selectedRoute });
    } else {
      console.log("首次运行/无缓存");
      next();
      localStorage.setItem("DefaultHome", "/");
    }
  } else {
    next();
  }
});

export default router;
