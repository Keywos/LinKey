<template>
  <h2 style="-webkit-user-select: none; user-select: none; display: flex; justify-content: space-between; width: 90%">
    <span @click="goFunction()">Code Hub</span>
    <span @click="rePwa()" style="margin-left: auto; font-size: 14px; padding: 6px 20px; opacity: 0.1">⟳</span>
  </h2>
  <cmView :isReadOnly="false" />
  <div v-if="showlog" style="padding: 0 2%; position: fixed; bottom: 0; left: 0; width: 96%; z-index: 999">
    <div style="display: flex; justify-content: space-between">
      <div class="pretitcode" @click="showlogs" />
      <div @click="goFunction()" style="position: relative; top: 40px; position: relative; height: 25px; right: 0; width: 40%" />
    </div>
    <pre @click="copyText(logAll)" class="prem-code"> {{ logAll.replace(/ /g, "&nbsp;") }}</pre>
  </div>
</template>

<script setup>
import cmView from "./cmView.vue";
import { ref, watchEffect, onMounted, onBeforeUnmount } from "vue";
import { showToast } from "vant";
import { useTheme } from "@/hooks/theme";
import { useCmStore } from "@/store/cmCodeStore.js";
import useV3Clipboard from "vue-clipboard3";
import { useRoute } from "vue-router";
import { sendReq } from "@/http/http.js";
import localforage from "localforage";

const route = useRoute();
const israw = ref(false);
const grc = ref("");

const { toClipboard } = useV3Clipboard();
const cmStore = useCmStore();
const showlog = ref(false);
const showlogs = () => {
  showlog.value = false;
};

const { isDarkModeEnabled } = useTheme();
const logAll = ref("");
const props = defineProps(["isReadOnly"]);
const rePwa = async () => {
  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (let registration of registrations) {
      await registration.unregister();
    }
  }
  if ("caches" in window) {
    const cacheNames = await caches.keys();
    for (let cacheName of cacheNames) {
      await caches.delete(cacheName);
    }
  }
  showToast("重置 PWA 成功，即将刷新页面");
  setTimeout(() => {
    location.reload();
  }, 100);
};

let xc = `/* 快捷方式
- 高亮
- 撤销
- 反向撤销
- 格式化 [Js / Json / 换行]
- 搜索 [查找替换/大小写匹配/全匹配/正则匹配]
- 复制
- 清空
- 粘贴
*/

// 链接快捷预览
// http://localhost:5173/EditCode

// 代码折叠
function a(i) {
  return [...new Set(i)].join('')
}

const arr = [1, 2, 3, 4, 2, 5, 6, 3]
console.log(a(arr))

console.log(new Date().toLocaleString('zh-CN'))

const x = 'Hello '
console.log( x + Date.now() )
// console.error(x)

const i = {
  username: 'Key',
  autoTheme: true,
  o: {
    a: 1,
    c: [ "1", "a", "2"]
  }
}
console.log(i.o.c[2])


// console.log(JSON.stringify(i,null,2))


// This is an example




















// end`;

const code = ref("");

onMounted(async () => {
  const blurNavdiv = document.querySelector(".blurNavdiv");
  blurNavdiv?.classList.add("blurNavdiv_code");
  try {
    let currentURL = Object.keys(route.query)[0] || "";
    let bloburl = "";
    if (currentURL !== "" && /^https:\/\/\w+/.test(currentURL)) {
      if (/^https:\/\/github\.com\/.+?\/(blob|raw)\/.+/.test(currentURL)) {
        console.log(currentURL);
        if (/^https:\/\/github\.com\/.+?\/raw\/.+/.test(currentURL)) {
          bloburl = currentURL.replace(/\/raw/, "/blob");
        } else {
          bloburl = currentURL;
        }
        currentURL = currentURL.replace(/\/(blob|raw)/, "").replace("github.com", "raw.githubusercontent.com");
        console.log(currentURL);
      } else if (/^https:\/\/raw\.githubusercontent\.com\/.+/.test(currentURL)) {
        bloburl = extractAndFormatUrl(currentURL);
      }
      showToast("请求链接：" + currentURL);
      let res = await sendReq("GET", currentURL);
      if (res.data) {
        let rd = res.data,
          jsonpa = "";

        if (typeof rd === "object") {
          try {
            rd = JSON.stringify(rd, null, 2);
            jsonpa = "[解析为]: JSON";
          } catch (error) {}
        } else {
          const jsRegex = /(?:function|var|let|const|if|else|return|try|catch|finally|typeof|delete|async|await)\s/;
          if (jsRegex.test(rd.slice(0, 4000))) {
            jsonpa = "[解析为]: JavsScript";
          }
        }
        showToast("请求成功：" + currentURL);
        israw.value = true;
        grc.value =
          `/* CH ${jsonpa}

由 Code Hub 预览: ${new Date().toLocaleString("zh-CN")}
        
原链接: 
${bloburl}

RAW链接:
${currentURL}

CH */

` + rd;
      } else {
        console.log(res);
        showToast(`请求失败:${res.status} ${res.message}: ${currentURL}`);
      }
    }
  } catch (error) {}

  const cc = cmStore.CmCode;
  if (israw.value) {
    code.value = grc.value;
  } else if (cc != "") {
    console.log("2");
    code.value = cc;
  } else {
    const storedUsername = await localforage.getItem("codehub");
    if (storedUsername) {
      code.value = storedUsername;
      console.log("0 读取到数据");
    } else code.value = xc;
  }
  cmStore.setCmCode(code.value);
});

function extractAndFormatUrl(rawUrl) {
  const regex = /https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)/;
  const match = rawUrl.match(regex);
  if (match) {
    const formattedUrl = `https://github.com/${match[1]}/${match[2]}/blob/${match[3]}/${match[4]}`;
    return formattedUrl;
  } else return "Invalid URL";
}

const goFunction = async () => {
  try {
    const logs = [];
    const Consoles = {
      log: function (...args) {
        logs.push(args.map((arg) => String(arg)).join(" "));
      },
      error: function (...args) {
        logs.push("[Error] " + args.map((arg) => String(arg)).join(" "));
      },
    };
    try {
      const myFunction = new Function("console", cmStore.CmCode);
      await myFunction(Consoles);
    } catch (error) {
      logs.push(`[Err]: ${error.message}`);
    }
    showlog.value = true;
    logAll.value = "· " + logs.join("\n· ");
  } catch (error) {
    showlog.value = true;
    logAll.value = error.message;
  }
};

const copyText = async (i) => {
  if (i.length > 0) {
    await toClipboard(i);
    showToast("已复制字符串数: " + i.length);
  }
};

watchEffect(() => {
  if (isDarkModeEnabled.value) {
    document.body.style.backgroundColor = "#282c34";
  } else document.body.style.backgroundColor = "#f3f3f3";
});

onBeforeUnmount(() => {
  document.body.style.backgroundColor = "";
  const blurNavdiv = document.querySelector(".blurNavdiv");
  blurNavdiv?.classList.remove("blurNavdiv_code");
});
</script>
