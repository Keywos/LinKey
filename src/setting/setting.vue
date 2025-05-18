<template>
  <div style="margin-bottom: 200px; height: 100vh">
    <h1>Setting Page</h1>

    <van-cell-group inset title="重置排序顺序">
      <van-cell title="清除主页拖动排序缓存" @click="clearh()" is-link />
      <van-cell title="清除搜索页拖动排序缓存" @click="clearhs()" is-link />
      <van-cell title="重置 PWA 缓存" @click="rePwa()" is-link />
    </van-cell-group>

    <van-cell-group inset title="启动页设置">
      <van-field v-model="fieldValue" is-link readonly label="首页" placeholder="选择启动页" @click="showPicker = true" />
      <van-popup v-model:show="showPicker" round position="bottom">
        <van-picker :columns="columns" @cancel="showPicker = false" @confirm="onConfirm" />
      </van-popup>
    </van-cell-group>

    <van-cell-group inset title="Gist 相关设置" id="Gistsetting">
      <van-field v-model="username" type="textarea" rows="1" label="" :readonly="isreadonlysName" :autosize="{ maxHeight: 50, minHeight: 10 }" placeholder="请输入 Name" id="keyfroms">
        <template #button>
          <van-button v-if="!iseditsname" size="small" type="primary" @click="editisn(username)">编辑</van-button>

          <div v-else>
            &nbsp;
            <van-button size="small" type="primary" @click="saveisn(username)">保存</van-button>
          </div>
        </template>
      </van-field>

      <van-field v-model="gistid" type="textarea" rows="1" label="" :readonly="isreadonlys" :autosize="{ maxHeight: 50, minHeight: 10 }" placeholder="请输入 Token" id="keyfroms">
        <template #button>
          <van-button v-if="!isedits" size="small" type="primary" @click="editis(gistid)">编辑</van-button>
          <div v-else>
            <van-button v-if="isclearbutton" size="small" type="primary" @click="cleartks()">清空</van-button>
            &nbsp;

            <van-button size="small" type="primary" @click="saveis(gistid)">保存</van-button>
          </div>
        </template>
      </van-field>

      <van-cell title="清除 Gist 本地缓存" @click="cleargist()" is-link />
      <van-cell class="van-cell-sw" center title="拉取时缓存到本地" inset>
        <template #right-icon>
          <van-switch v-model="autoGistlocala" @change="setGistautolocala(autoGistlocala)" />
        </template>
      </van-cell>

      <van-cell class="van-cell-sw" center title="进入页面后获取本地缓存" inset>
        <template #right-icon>
          <van-switch v-model="autoGistlocal" @change="setGistautolocal(autoGistlocal)" />
        </template>
      </van-cell>

      <van-cell class="van-cell-sw" center title="进入页面后获取远程资源" inset>
        <template #right-icon>
          <van-switch v-model="autoGist" @change="setGistauto(autoGist)" />
        </template>
      </van-cell>

      <van-cell class="van-cell-sw" center title="深色模式背景" inset>
        <template #right-icon>
          <van-switch v-model="autoISBGC" @change="setBGC(autoISBGC)" />
        </template>
      </van-cell>
    </van-cell-group>

    <van-cell-group inset title="Swipe">
      <van-swipe-cell>
        <template #left>
          <van-button square type="primary" text="选择" />
        </template>
        <van-cell :border="false" title="滑动" value="待定" />
        <template #right>
          <van-button square type="danger" text="删除" />
          <van-button square type="primary" text="收藏" />
        </template>
      </van-swipe-cell>

      <van-swipe-cell :before-close="beforeClose">
        <template #left>
          <van-button square type="primary" text="选择" />
        </template>
        <van-cell :border="false" title="左右滑动" value="待定" />
        <template #right>
          <van-button square type="danger" text="删除" />
        </template>
      </van-swipe-cell>
    </van-cell-group>
  </div>
</template>

<script setup>
import { ref, watchEffect, onMounted } from "vue";
import { sendReq } from "@/http/http.js";
import { showToast } from "vant";
import { useGistStore } from "@/store/gistStore";

const useGStore = useGistStore();
const beforeClose = () => {
  // showToast("");
};

// const as = ref(false);

const isedits = ref(false);
const iseditsname = ref(false);
const gistid = ref("");
const username = ref("");
const isreadonlys = ref(false);
const isreadonlysName = ref(false);
let LocalGetToken;
try {
  LocalGetToken = JSON.parse(localStorage.getItem("GistUserT"));
} catch (error) {}
const GetUserName = localStorage.getItem("GistUserN");
console.log(LocalGetToken);
if (LocalGetToken && LocalGetToken?.n != "" && LocalGetToken?.t != "") {
  isreadonlys.value = true;
  gistid.value = LocalGetToken.n;
} else {
  isedits.value = true;
}
if (GetUserName) {
  isreadonlysName.value = true;
  username.value = GetUserName;
} else {
  iseditsname.value = true;
}

const editisn = (n) => {
  iseditsname.value = true;
  isreadonlysName.value = false;
};
const saveisn = (n) => {
  localStorage.setItem("GistUserN", n);
  iseditsname.value = false;
  isreadonlysName.value = true;
};

const editis = () => {
  gistid.value = LocalGetToken?.t || "";
  isedits.value = true;
  isreadonlys.value = false;
};
const saveis = async (tk) => {
  try {
    if (username.value == "") {
      throw new Error("未填写/保存 用户名");
    }
    if (tk.length > 30) {
      const tkobj = {
        n: tk.substring(0, 6) + "∗∗∗∗∗∗",
        t: tk,
      };
      showToast("请求验证中...");
      const res = await sendReq("GET", `https://api.github.com/users/${username.value}/gists`, {
        Authorization: `token ${tk}`,
        Accept: "application/vnd.github.v3+json",
      });
      if (res.status == "200") {
        LocalGetToken = tkobj;
        localStorage.setItem("GistUserT", JSON.stringify(tkobj));
        isedits.value = false;
        isreadonlys.value = true;
        gistid.value = LocalGetToken.n || "";
        showToast("保存成功");
      } else {
        showToast("验证失败, 用户名 或 Token 错误; 服务器返回状态码" + res.status);
      }
    } else {
      localStorage.removeItem("GistUserT");
      isedits.value = false;
      isreadonlys.value = true;
      throw new Error("无效 Token, 已删除本地保存数据");
    }
  } catch (error) {
    showToast(error.message);
  }
};

const cleartks = () => {
  LocalGetToken = {
    n: "",
    t: "",
  };
  gistid.value = "";
};
const autoGist = ref(false);

const setGistauto = (i) => {
  if (i) {
    localStorage.setItem("AutoGistRe", 1);
  } else {
    localStorage.removeItem("AutoGistRe");
  }
};

const setBGC = (i) => {
  if (i) {
    localStorage.setItem("ISBGC", 1);
  } else {
    localStorage.removeItem("ISBGC");
  }
};

const autoGistlocal = ref(false);
const setGistautolocal = (i) => {
  if (i) {
    localStorage.setItem("LocalGistRe", 1);
  } else {
    localStorage.removeItem("LocalGistRe");
  }
};

const autoISBGC = ref(localStorage.getItem("ISBGC") == "1" || false);
const autoGistlocala = ref(false);
const setGistautolocala = (i) => {
  if (i) {
    localStorage.setItem("LocalGistResTure", 1);
  } else {
    localStorage.removeItem("LocalGistResTure");
  }
};

const clearh = () => {
  localStorage.removeItem("HomePageSort");
  showToast("清除主页排序缓存成功");
};

const clearhs = () => {
  localStorage.removeItem("SearchTabSort");
  localStorage.removeItem("SearchTabKey");
  showToast("清除搜索页排序缓存成功");
};

const rePwa = async () => {
  showToast("正在重置 PWA缓存... 请稍等");
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
  }, 500);
};

const cleargist = () => {
  localStorage.removeItem("LocalGistResTure");
  useGStore.setGistRes([]);
  showToast("清除 Gist 本地缓存成功");
};

const columns = ref([
  { text: "默认主页", value: "/" },
  { text: "极简搜索", value: "/search" },
  { text: "无底部 Tab 搜索页", value: "/s" },
  { text: "时间戳转换", value: "/timestamp" },
  { text: "Url 编解码", value: "/codeurl" },
  { text: "Unicode 编解码", value: "/unicode" },
  { text: "Base64 编解码", value: "/base64" },
  { text: "Ping", value: "/ping" },
  { text: "极简代码编辑器", value: "/EditCode_noNav" },
  { text: "代码编辑器", value: "/EditCode" },
  { text: "Gist 编辑", value: "/gist" },
]);
function findTextByValue(targetValue) {
  const column = columns.value.find((item) => item.value === targetValue);
  return column ? column.text : "默认主页";
}
const reh = findTextByValue(localStorage.getItem("DefaultHome"));
const fieldValue = ref(reh);

const showPicker = ref(false);

const onConfirm = ({ selectedOptions }) => {
  if (selectedOptions[0].value) {
    localStorage.setItem("DefaultHome", selectedOptions[0].value);
  }

  console.log(selectedOptions[0].value);
  showPicker.value = false;
  fieldValue.value = selectedOptions[0].text;
};
onMounted(() => {
  if (localStorage.getItem("AutoGistRe") == 1) {
    autoGist.value = true;
  }
  if (localStorage.getItem("LocalGistRe") == 1) {
    autoGistlocal.value = true;
  }
  if (localStorage.getItem("LocalGistResTure") == 1) {
    autoGistlocala.value = true;
  }
  if (localStorage.getItem("ISBGC") == 1) {
    autoISBGC.value = true;
  }
});
const isclearbutton = ref(false);
watchEffect(() => {
  if (gistid.value.length > 0) {
    isclearbutton.value = true;
  } else {
    isclearbutton.value = false;
  }
});
</script>

<style>
:root {
  /* --van-cell-line-height:26px; */
  /* --van-cell-vertical-padding: 0px;  */
  /* 开关 */
  --van-cell-group-inset-radius: 12px !important;
  /* 圆角 */
}

#Gistsetting .van-contact-list__bottom {
  position: static;
  background-color: transparent;
}

#Gistsetting .van-contact-list {
  padding: 16px 8px 20px;
}
</style>
