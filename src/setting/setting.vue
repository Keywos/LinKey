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

    <van-cell-group inset title="主页卡片">
      <van-cell title="整理主页卡片" label="关闭后将不会显示在主页" />
      <van-cell
        v-for="card in homeCards"
        :key="card.id"
        class="home-card-cell"
        :class="{ 'home-card-cell--editable': isCustomCard(card) }"
        :title="card.id"
        :label="getCardDescription(card)"
        center
        @click="editShortcut(card)"
      >
        <template #right-icon>
          <div class="home-card-cell__actions">
            <van-button v-if="isCustomCard(card)" size="small" plain type="danger" aria-label="删除快捷方式" @click.stop="removeShortcut(card)">删除</van-button>
            <van-switch v-model="card.enabled" @click.stop @change="saveCardSettings" />
          </div>
        </template>
      </van-cell>
      <van-cell title="添加快捷方式" is-link @click="openAddShortcut" />
    </van-cell-group>

    <van-popup v-model:show="showShortcutPopup" round position="bottom" :lock-scroll="false" class="shortcut-popup">
      <div class="shortcut-popup__content">
        <h2>{{ editingShortcut ? "编辑快捷方式" : "添加快捷方式" }}</h2>
        <van-field v-model.trim="shortcutName" label="名称" placeholder="例如：Bing" />
        <van-field v-model.trim="shortcutUrl" label="跳转地址" placeholder="https://bing.com/ 或 /search" />
        <van-field label="图标">
          <template #input>
            <van-radio-group v-model="shortcutIconType" direction="horizontal">
              <van-radio name="emoji">Emoji</van-radio>
              <van-radio name="url">网址</van-radio>
              <van-radio name="builtin">内置</van-radio>
            </van-radio-group>
          </template>
        </van-field>
        <van-field v-if="shortcutIconType === 'emoji'" v-model.trim="shortcutIcon" label="Emoji" placeholder="例如：🔎" />
        <template v-else-if="shortcutIconType === 'url'">
          <van-field v-model.trim="shortcutIcon" label="图标网址" placeholder="https://example.com/icon.png" type="url" />
          <van-field v-model="shortcutIconSize" label="图标大小" is-link readonly @click="showIconSizePicker = true" />
        </template>
        <van-field v-else v-model="shortcutBuiltInIcon" label="内置图标" is-link readonly @click="showBuiltInIconPicker = true" />
        <div class="shortcut-popup__actions">
          <van-button block type="primary" round position="bottom" @click="showShortcutPopup = false">取消</van-button>
          <van-button block type="primary" round position="bottom" @click="saveShortcut">{{ editingShortcut ? "保存" : "添加" }}</van-button>
        </div>
      </div>
    </van-popup>

    <van-popup v-model:show="showIconSizePicker" round position="bottom" :lock-scroll="false">
      <van-picker :columns="iconSizeOptions" @cancel="showIconSizePicker = false" @confirm="onIconSizeConfirm" />
    </van-popup>

    <van-popup v-model:show="showBuiltInIconPicker" round position="bottom" :lock-scroll="false">
      <van-picker :columns="builtInIconOptions" @cancel="showBuiltInIconPicker = false" @confirm="onBuiltInIconConfirm" />
    </van-popup>

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
    <br />
    <br />
    <br />
    <br />
    <br />
  </div>
</template>

<script setup>
import { computed, ref } from "vue";
import { sendReq } from "@/http/http.js";
import { showConfirmDialog, showToast } from "vant";
import { useGistStore } from "@/store/gistStore";
import { codehubStorage, GIST_LIST_KEY } from "@/storage/codehubStorage.js";
import { defaultHomeCards, getHomeCards, saveHomeCards } from "@/homeCards.js";
import ts from "@/img/svg/ts.svg";
import success from "@/img/svg/success.svg";
import carry from "@/img/svg/carry.svg";
import cny from "@/img/svg/cny.svg";
import sf from "@/img/svg/sf.svg";
import safa from "@/img/svg/safa.svg";
import hgithub from "@/img/svg/hgithub.svg";
import w from "@/img/svg/w.svg";

const useGStore = useGistStore();
const homeCards = ref(getHomeCards());
const showShortcutPopup = ref(false);
const shortcutName = ref("");
const shortcutUrl = ref("");
const shortcutIconType = ref("emoji");
const shortcutIcon = ref("");
const editingShortcut = ref(null);
const shortcutIconSize = ref("默认（20px）");
const showIconSizePicker = ref(false);
const showBuiltInIconPicker = ref(false);
const iconSizeOptions = [
  { text: "小（24px）", value: 24 },
  { text: "默认（34px）", value: 34 },
  { text: "大（45px）", value: 45 },
];
const builtInIconOptions = [
  { text: "Time", value: ts },
  { text: "Success", value: success },
  { text: "Ping", value: carry },
  { text: "CNY", value: cny },
  { text: "SF", value: sf },
  { text: "Search", value: safa },
  { text: "GitHub", value: hgithub },
  { text: "Code", value: w },
];
const selectedIconSize = ref(20);
const shortcutBuiltInIcon = ref("");
const onIconSizeConfirm = ({ selectedOptions }) => {
  const option = selectedOptions[0];
  if (option) {
    selectedIconSize.value = option.value;
    shortcutIconSize.value = option.text;
  }
  showIconSizePicker.value = false;
};
const onBuiltInIconConfirm = ({ selectedOptions }) => {
  const option = selectedOptions[0];
  if (option) {
    shortcutIcon.value = option.value;
    shortcutBuiltInIcon.value = option.text;
  }
  showBuiltInIconPicker.value = false;
};
const saveCardSettings = () => saveHomeCards(homeCards.value);
const getCardDescription = (card) => {
  if (card.r.startsWith("itms-appss://")) return "App Store 地区切换";
  if (/^https?:\/\//.test(card.r)) return "外部快捷方式";
  return card.r;
};
const isCustomCard = (card) => !defaultHomeCards.some((defaultCard) => defaultCard.id === card.id && defaultCard.r === card.r);
const removeShortcut = async (card) => {
  const scrollY = window.scrollY;
  try {
    await showConfirmDialog({ title: "确认删除", message: `确定删除「${card.id}」快捷方式吗？`, lockScroll: false });
    homeCards.value = homeCards.value.filter((currentCard) => currentCard !== card);
    saveCardSettings();
    showToast("快捷方式已删除");
  } catch {
    // 用户取消
  }
  window.scrollTo(0, scrollY);
};
const resetShortcutForm = () => {
  editingShortcut.value = null;
  shortcutName.value = "";
  shortcutUrl.value = "";
  shortcutIconType.value = "emoji";
  shortcutIcon.value = "";
  shortcutBuiltInIcon.value = "";
  selectedIconSize.value = 20;
  shortcutIconSize.value = "默认（20px）";
};
const editShortcut = (card) => {
  if (!isCustomCard(card)) return;
  editingShortcut.value = card;
  shortcutName.value = card.id;
  shortcutUrl.value = card.r;
  shortcutIcon.value = card.img;
  const builtInIcon = builtInIconOptions.find((option) => option.value === card.img);
  shortcutIconType.value = builtInIcon ? "builtin" : /^https?:\/\//.test(card.img) ? "url" : "emoji";
  shortcutBuiltInIcon.value = builtInIcon?.text || "";
  selectedIconSize.value = card.iconSize || 20;
  shortcutIconSize.value = iconSizeOptions.find((option) => option.value === selectedIconSize.value)?.text || "默认（20px）";
  showShortcutPopup.value = true;
};
const openAddShortcut = () => {
  resetShortcutForm();
  showShortcutPopup.value = true;
};
const addShortcut = () => {
  try {
    if (!shortcutName.value || !shortcutUrl.value || !shortcutIcon.value) {
      throw new Error("请填写名称、跳转地址和图标");
    }
    if (shortcutIconType.value === "url" && !["http:", "https:"].includes(new URL(shortcutIcon.value).protocol)) {
      throw new Error("请填写有效的图标网址");
    }
    if (homeCards.value.some((card) => card !== editingShortcut.value && card.id === shortcutName.value)) {
      throw new Error("快捷方式名称已存在");
    }
    const shortcut = {
      id: shortcutName.value,
      img: shortcutIcon.value,
      r: shortcutUrl.value,
      enabled: editingShortcut.value?.enabled ?? true,
      ...(shortcutIconType.value === "url" ? { iconSize: selectedIconSize.value } : {}),
    };
    const isEditing = Boolean(editingShortcut.value);
    if (isEditing) {
      Object.assign(editingShortcut.value, shortcut);
    } else {
      homeCards.value.push(shortcut);
    }
    saveCardSettings();
    showShortcutPopup.value = false;
    resetShortcutForm();
    showToast(isEditing ? "快捷方式已保存" : "快捷方式已添加");
  } catch (error) {
    showToast(error.message);
  }
};
const saveShortcut = () => addShortcut();
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
    localStorage.setItem("linkey:app-ready", "0");
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

.shortcut-popup__content {
  padding: 8px 16px 20px;
}

.shortcut-popup__content h2 {
  margin: 12px 0;
  font-size: 18px;
}

.shortcut-popup__actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.home-card-cell .van-cell__title {
  min-width: 0;
}

.home-card-cell .van-cell__label {
  overflow: hidden;
  text-overflow: ellipsis;
}

.home-card-cell .van-cell__right-icon {
  flex: 0 0 auto;
}

.home-card-cell__actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.home-card-cell--editable {
  cursor: pointer;
}
</style>
