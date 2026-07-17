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

    <van-cell-group inset title="界面设置">
      <van-cell class="van-cell-sw" center title="隐藏顶部状态栏" label="隐藏标题，保留左上角返回按钮">
        <template #right-icon>
          <van-switch v-model="hideTopBarTitle" @change="setHideTopBarTitle" />
        </template>
      </van-cell>
    </van-cell-group>

    <van-cell-group inset title="编辑器主题">
      <van-field class="editor-theme-field" label="背景颜色">
        <template #input>
          <van-radio-group v-model="editorDarkBackground" class="editor-theme-options" @change="setEditorDarkBackground">
            <van-radio name="#282c34">深蓝</van-radio>
            <van-radio name="#141414">深灰</van-radio>
            <van-radio name="#000000">纯黑</van-radio>
          </van-radio-group>
        </template>
      </van-field>
    </van-cell-group>

    <van-cell-group inset title="Gist 相关设置" id="Gistsetting">
      <van-field v-model="username" type="textarea" rows="1" label="" :readonly="isreadonlysName" :autosize="{ maxHeight: 50, minHeight: 10 }" placeholder="请输入 Name" id="keyfroms">
        <template #button>
          <van-button v-if="!iseditsname" size="small" type="primary" @click="editisn">编辑</van-button>

          <div v-else>
            &nbsp;
            <van-button size="small" type="primary" @click="saveisn">保存</van-button>
          </div>
        </template>
      </van-field>

      <van-field v-model="gistid" type="textarea" rows="1" label="" :readonly="isreadonlys" :autosize="{ maxHeight: 50, minHeight: 10 }" placeholder="请输入 Token" id="keyfroms">
        <template #button>
          <van-button v-if="!isedits" size="small" type="primary" @click="editis">编辑</van-button>
          <div v-else>
            <van-button v-if="isclearbutton" size="small" type="primary" @click="cleartks()">清空</van-button>
            &nbsp;

            <van-button size="small" type="primary" @click="saveis">保存</van-button>
          </div>
        </template>
      </van-field>

      <van-cell title="清除 Gist 本地缓存" @click="cleargist()" is-link />
      <van-cell class="van-cell-sw" center title="拉取时缓存到本地" inset>
        <template #right-icon>
          <van-switch v-model="autoGistlocala" @change="setGistautolocala" />
        </template>
      </van-cell>

      <van-cell class="van-cell-sw" center title="进入页面后获取本地缓存" inset>
        <template #right-icon>
          <van-switch v-model="autoGistlocal" @change="setGistautolocal" />
        </template>
      </van-cell>

      <van-cell class="van-cell-sw" center title="进入页面后获取远程资源" inset>
        <template #right-icon>
          <van-switch v-model="autoGist" @change="setGistauto" />
        </template>
      </van-cell>

      <van-cell class="van-cell-sw" center title="深色模式背景" inset>
        <template #right-icon>
          <van-switch v-model="autoISBGC" @change="setBGC" />
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
import { computed, ref } from "vue";
import { sendReq } from "@/http/http.js";
import { showToast } from "vant";
import { useGistStore } from "@/store/gistStore";
import { codehubStorage, GIST_LIST_KEY } from "@/storage/codehubStorage.js";

const useGStore = useGistStore();
const beforeClose = () => {
  // showToast("");
};

const getStoredBoolean = (key, defaultValue = false) => {
  const value = localStorage.getItem(key);
  return value === null ? defaultValue : value !== "0";
};
const setStoredBoolean = (key, value) => {
  localStorage.setItem(key, value ? "1" : "0");
};
const hideTopBarTitle = ref(getStoredBoolean("HideTopBarTitle", true));
const setHideTopBarTitle = (value) => {
  setStoredBoolean("HideTopBarTitle", value);
  window.dispatchEvent(new CustomEvent("top-bar-visibility-change", { detail: { hidden: value } }));
};
const EDITOR_DARK_BACKGROUNDS = ["#282c34", "#141414", "#000000"];
const storedEditorBackground = localStorage.getItem("EditorDarkBackground");
const editorDarkBackground = ref(EDITOR_DARK_BACKGROUNDS.includes(storedEditorBackground) ? storedEditorBackground : "#282c34");
const setEditorDarkBackground = (value) => {
  localStorage.setItem("EditorDarkBackground", value);
  window.dispatchEvent(new Event("editor-theme-change"));
};
const getStoredToken = () => {
  try {
    return JSON.parse(localStorage.getItem("GistUserT") || "null");
  } catch {
    return null;
  }
};

const isedits = ref(false);
const iseditsname = ref(false);
const gistid = ref("");
const username = ref("");
const isreadonlys = ref(false);
const isreadonlysName = ref(false);
let LocalGetToken = getStoredToken();
const storedUserName = localStorage.getItem("GistUserN");
if (LocalGetToken?.n && LocalGetToken?.t) {
  isreadonlys.value = true;
  gistid.value = LocalGetToken.n;
} else {
  isedits.value = true;
}
if (storedUserName) {
  isreadonlysName.value = true;
  username.value = storedUserName;
} else {
  iseditsname.value = true;
}

const editisn = () => {
  iseditsname.value = true;
  isreadonlysName.value = false;
};
const saveisn = () => {
  localStorage.setItem("GistUserN", username.value);
  iseditsname.value = false;
  isreadonlysName.value = true;
  window.dispatchEvent(new Event("gist-credentials-change"));
};

const editis = () => {
  gistid.value = LocalGetToken?.t || "";
  isedits.value = true;
  isreadonlys.value = false;
};
const saveis = async () => {
  const tk = gistid.value;
  try {
    if (!username.value) {
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
      if (res.status === 200) {
        LocalGetToken = tkobj;
        localStorage.setItem("GistUserT", JSON.stringify(tkobj));
        isedits.value = false;
        isreadonlys.value = true;
        gistid.value = LocalGetToken.n || "";
        window.dispatchEvent(new Event("gist-credentials-change"));
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
const autoGist = ref(getStoredBoolean("AutoGistRe"));

const setGistauto = (value) => setStoredBoolean("AutoGistRe", value);

const setBGC = (value) => setStoredBoolean("ISBGC", value);

const autoGistlocal = ref(getStoredBoolean("LocalGistRe", true));
const setGistautolocal = (value) => {
  setStoredBoolean("LocalGistRe", value);
  window.dispatchEvent(new CustomEvent("gist-local-cache-setting-change", { detail: { enabled: value } }));
};

const autoISBGC = ref(getStoredBoolean("ISBGC"));
const autoGistlocala = ref(getStoredBoolean("LocalGistResTure", true));
const setGistautolocala = (value) => setStoredBoolean("LocalGistResTure", value);

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
  showToast("正在重置 PWA 缓存...");
  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }

    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }

    navigator.serviceWorker.controller?.postMessage({ type: "SKIP_WAITING" });

    showToast("重置完成");
    setTimeout(() => location.reload(), 300);
  } catch (error) {
    console.error("PWA 缓存重置失败", error);
    showToast("重置失败，请重试");
  }
};


const cleargist = async () => {
  await codehubStorage.removeItem(GIST_LIST_KEY);
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
  const selectedOption = selectedOptions[0];
  if (selectedOption?.value) {
    localStorage.setItem("DefaultHome", selectedOption.value);
    fieldValue.value = selectedOption.text;
  }
  showPicker.value = false;
};
const isclearbutton = computed(() => gistid.value.length > 0);
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

.editor-theme-field .van-field__label {
  align-self: flex-start;
  padding-top: 8px;
}

.editor-theme-options {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  width: 100%;
}

.editor-theme-options .van-radio {
  display: flex;
  justify-content: center;
  min-width: 0;
  margin: 0;
  padding: 7px 4px;
  border-radius: 10px;
  background: rgba(128, 128, 128, 0.08);
  font-size: 12px;
}

.editor-theme-options .van-radio__icon {
  margin-right: 4px;
}

.editor-theme-options .van-radio__label {
  margin-left: 0;
  white-space: nowrap;
}
</style>
