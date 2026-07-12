<template>
  <div id="isexk">
    <van-popup v-model:show="showCentertf" round :style="{ padding: '20px 20px 40px 20px' }">
      <div class="gtittle">
        <div class="gtname">
          {{ listpop.filesNames[0] || "无数据 / 但未删除此路径" }}
        </div>
        <div class="gtwopop">
          <div>
            <b>User:&nbsp;</b>
            {{ listpop.user }}
          </div>
          <div>
            <b>Public:&nbsp;</b>
            {{ listpop.public }}
          </div>
          <div>
            <b>Create:&nbsp;</b>
            {{ listpop.created }}
          </div>
          <div>
            <b>Update:&nbsp;</b>
            {{ listpop.updated }}
          </div>
        </div>
        <div class="gtdesc">
          <b>Desc:&nbsp;</b>
          {{ listpop.desc }}
        </div>
      </div>

      <van-collapse v-model="activeName" accordion class="gist-file-list">
        <van-collapse-item v-for="(i, index) in listpop.filesNames" :name="index" :label="`Size: ${listpop.files[i]?.size} ${listpop.files[i]?.type}`">
          <template #title>
            <div class="gist-file-title">
              <span>{{ i }}</span>
              <button type="button" @click.stop="imgedit(i)">编辑</button>
            </div>
          </template>
          <div class="gicdeimg">
            <button type="button" @click="htmlyl(i)">GitHub</button>
            <button type="button" @click="imgcopy(i)">复制 URL</button>
            <!-- <button type="button" @click="imgpreview(i)">预览</button> -->
            <button type="button" class="gicdeimg-delete" @click="imgdel(i)">删除</button>
          </div>
        </van-collapse-item>

        <van-collapse-item v-if="listpop.filesNames.length < 1" :title="listpop.id" label="没有数据">
          <div class="gicdeimg">
            <!-- <button type="button" @click="imgpreview()">预览</button> -->
            <button type="button" @click="imgedit()">编辑</button>
            <button type="button" class="gicdeimg-delete" @click="imgdel()">删除</button>
          </div>
        </van-collapse-item>
      </van-collapse>
      <div style="padding: 6px" />
      <van-cell title="在当前路径新建" label="新建后 卡片显示的文件名将更改" style="opacity: 0.9" @click="patchnew(listpop.id)">
        <template #right-icon>
          <van-icon name="plus" style="opacity: 0.6" />
        </template>
      </van-cell>
    </van-popup>
  </div>
  <van-pull-refresh v-model="loading" :success-text="retxts" @refresh="onRefresh" style="min-height: 100vh; -webkit-user-select: none; user-select: none" head-height="60">
    <h1>Gist File</h1>

    <div class="girepaly">
      <van-button icon="replay" color="#00000000" round :loading="isloding" size="small" type="success" @click="rereq()">
        <p>Refresh requst</p>
      </van-button>
    </div>

    <div class="kcard-all">
      <div class="kcard-one" @click="pushCreate()">
        <div key="key" class="kcard-font_size kcard-ping_jd">
          <div class="kcard-font_size">
            <img class="kcard-imggit" :src="github" />
            <div class="kcardGN">
              <div class="kcardGNt">Create File</div>
              <div class="kcard-t">
                <div class="gdate">{{ forTS(Date.now()) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-for="element in gistCard" :key="element.id" class="kcard-one" @click="showCenter(element)">
        <div :key="element.id" class="kcard-font_size kcard-ping_jd">
          <div class="kcard-font_size">
            <img class="kcard-imggit" :src="github" />
            <div class="kcardGN">
              <div class="kcardGNt">
                {{ element.filesNames[0] || "无数据" }}
              </div>
              <div class="kcard-t">
                <div class="gdate">
                  {{ element.updated }}
                  {{ element.filesNames.length > 1 ? "Num: " + element.filesNames.length : "" }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div id="gistpush">
      <van-cell-group inset title="Gist 相关设置">
        <van-field is-link label="点击前往" @click="pushset()" />
      </van-cell-group>
    </div>
    <div class="infop">
      <p>
        <b>关于 Gist</b>
      </p>
      <p>感谢您使用 Gist 功能。 Gist 为个人分享代码服务，仅供个人使用，不适用于专业用途。如果遇到问题，反馈 @Key</p>
      <p>本服务绝不会窃取您的信息。为确保您的数据安全，如果发生任何问题，本服务概不负责，请您务必提前做好备份。</p>
      <p>Create File 为新建一个 POST 请求，前提是 设置好了 用户名和 Token， 五个快捷图标分别是</p>
      <p>1.打开 Html 原页面预览，2.复制永久 RAW 链接，3.请求返回的数据并预览，4.请求数据并编辑提交保存，5.删除</p>
    </div>
  </van-pull-refresh>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { showConfirmDialog, showToast } from "vant";
import { sendReq } from "@/http/http.js";
import github from "@/img/svg/github.svg";
import { useRouter } from "vue-router";
import { useGistStore } from "@/store/gistStore";
import { codehubStorage, GIST_LIST_KEY, syncGistFilesToCodeHub } from "@/storage/codehubStorage.js";

import useV3Clipboard from "vue-clipboard3";
const { toClipboard } = useV3Clipboard();

const useGS = useGistStore();
const activeName = ref(0);
const router = useRouter();
const showCentertf = ref(false);
const listpop = ref({ filesNames: [], files: {} });

const saveGistsToCodeHub = async (gists) => {
  try {
    await syncGistFilesToCodeHub(gists);
  } catch (error) {
    console.error("写入 Code Hub Gist 索引失败", error);
  }
};

const isloding = ref(false);

const pushCreate = () => {
  useGS.setGisto("Gist Create");
  const usernameEncoded = encodeURIComponent("Gist Create");
  router.push(`/gist/${usernameEncoded}`);
};
const pushset = () => {
  router.push("/settings");
};
const showCenter = (i) => {
  listpop.value = i;
  activeName.value = 0;
  showCentertf.value = true;
};

const htmlyl = async () => {
  const url = listpop.value.html_url;
  if (url?.length > 0) {
    window.open(url, "_blank");
    await toClipboard(url);
  }
};
const imgcopy = async (i) => {
  const url = listpop.value.files[i]?.raw_url?.replace(/\/raw\/\w+?\//, "/raw/");
  if (url) {
    await toClipboard(url);
    showToast("复制 URL 成功");
  }
};

// const imgpreview = async (i) => {
//   try {
//     showToast("开始请求");
//     const url = listpop.value.files[i]?.raw_url;
//     const res = await sendReq("GET", url);
//     console.log(res.status);
//     console.log(res);
//     if (res.status == "200") {
//       console.log("11");
//       useGS.setGistResPreview(res.data, "Gist Preview");
//       console.log("22");
//       router.push("/gist/gistEdit");
//     }
//   } catch (e) {
//     showToast("预览失败 " + e.message);
//   }
// };

const imgedit = async (i) => {
  try {
    showToast("开始请求 Edit");
    const url = listpop.value.files[i]?.raw_url;
    if (!url) {
      showToast("未找到文件地址");
      return;
    }
    const res = await sendReq("GET", url);
    if (res.status === 200) {
      useGS.setGistEdit(i, res.data, listpop.value.id, listpop.value.desc, "Gist Edit");

      router.push("/gist/gistEdit");
    }
  } catch (e) {
    showToast("请求编辑失败 " + e.message);
  }
};
//
//

let delnamei = "";
const beforeClose = async (action) => {
  if (action !== "confirm") return true;

  try {
      showToast("开始请求 Del" + delnamei);
      const id = listpop.value.id;
      if (listpop.value.filesNames.length > 1) {
        const content = {
          description: listpop.value.desc,
          public: listpop.value.public,
          files: { [delnamei]: { content: "" } },
        };
        const res = await sendReq(
          "PATCH",
          `https://api.github.com/gists/${id}`,
          {
            Authorization: `token ${token.value}`,
            Accept: "application/vnd.github.v3+json",
          },
          JSON.stringify(content)
        );
        console.log("删除 - PATCH", id, " - ", res.status);
        if (res.status) {
          useGS.delGistResptch(id, delnamei);
          showToast("请求删除成功 PATCH " + res.status + " " + delnamei);
        }
      } else {
        const res = await sendReq("DELETE", `https://api.github.com/gists/${id}`, {
          Authorization: `token ${token.value}`,
          Accept: "application/vnd.github.v3+json",
        });
        console.log("删除 - DELETE", id, " - ", res.status);
        if (res.status) {
          useGS.delGistResPost(id);
          showToast("请求删除成功 DELETE " + res.status + " " + delnamei);
          showCentertf.value = false;
        }
      }
    return true;
  } catch (error) {
    showToast("删除失败 " + error.message);
    return false;
  }
};

const imgdel = async (i) => {
  try {
    const id = listpop.value.id;
    const name = i || "空数据";
    delnamei = i;
    if (id === "ba4a213a609xxxxxefff7f0d7ads0aa") {
      showToast("这只是一个示例，不能删除");
      return;
    }
    showConfirmDialog({
      title: `确认删除 ${name} ?`,
      message: `谨慎操作，知道你在干什么再确认: ${listpop.value.id}`,
      beforeClose,
    });
  } catch (e) {
    console.log("请求删除失败121");
    showToast("请求删除失败 " + e.message);
  }
};

const patchnew = (i) => {
  useGS.setGistnewid(i, listpop.value.desc, "Create New");
  router.push("/gist/gistEdit");
};

const gistklist = [
  {
    id: "ba4a213a609xxxxxefff7f0d7ads0aa",
    html_url: "https://gist.github.com/",
    user: "Linkey",
    filesNames: ["Example", "Sub-Store"],
    updated: "24/01/10 12:00",
    created: "24/01/01 09:41",
    desc: "This is the desc description when it was uploaded",
    public: false,
    files: {
      Example: {
        filename: "Example",
        type: "text/plain",
        language: null,
        raw_url: "https://gist.githubusercontent.com/Userxxxx/xxxxxxx/raw/xxxxxx/Gist_544",
        size: 24,
      },
      "Sub-Store": {
        filename: "Sub-Store",
        type: "text/plain",
        language: null,
        raw_url: "https://gist.githubusercontent.com/Userxxxx/xxxxxxxx/raw/xxxxxxxx/Gist_544",
        size: 2048,
      },
    },
  },
];
const gistCard = computed(() => gistklist.concat(useGS.getGistRes));
const missingSettings = [];
const username = ref("");
const storedUsername = localStorage.getItem("GistUserN") || "";
if (!storedUsername) {
  missingSettings.push("未设置用户名");
} else {
  username.value = storedUsername;
}

const token = ref("");
let LocalGetToken;
try {
  LocalGetToken = JSON.parse(localStorage.getItem("GistUserT"));
} catch (error) {}
if (LocalGetToken && LocalGetToken?.n !== "" && LocalGetToken?.t != "") {
  token.value = LocalGetToken.t;
} else {
  missingSettings.push("未设置 Token");
}
missingSettings.length && showToast(missingSettings.join(", "));
const loading = ref(false);

const refreshGistCredentials = () => {
  username.value = localStorage.getItem("GistUserN") || "";
  try {
    LocalGetToken = JSON.parse(localStorage.getItem("GistUserT") || "null");
  } catch {
    LocalGetToken = null;
  }
  token.value = LocalGetToken?.t || "";
};

const retxts = ref("刷新成功");
const onRefresh = () => {
  if (username.value && token.value) {
    loading.value = true;
    rereq("1");
  } else {
    loading.value = false;
    retxts.value = "未设置 用户名 , Token";
    showToast("未设置 用户名 , Token");
  }
};

const rereq = async (isPullRefresh = false) => {
  if (!username.value || !token.value) {
    showToast("未设置 用户名 , Token");
    loading.value = false;
    return;
  }
  if (!isPullRefresh) isloding.value = true;

  try {
    const resdata = [];
    for (let page = 1; page < 10; page++) {
      const res = await sendReq("GET", `https://api.github.com/users/${username.value}/gists?per_page=60&page=${page}`, {
      Authorization: `token ${token.value}`,
      Accept: "application/vnd.github.v3+json",
    });
      if (res.status !== 200 || !Array.isArray(res.data) || res.data.length === 0) break;

      const mapdata = res.data.map(({ id, html_url, files, public: publicProp, created_at, updated_at, description, owner }) => ({
        id,
        html_url,
        filesNames: Object.keys(files),
        files,
        public: publicProp,
        created: forTS(new Date(created_at).getTime()),
        updated: forTS(new Date(updated_at).getTime()),
        updatedAt: new Date(updated_at).getTime(),
        desc: description,
        user: owner?.login || "",
      }));
      resdata.push(...mapdata);
      if (res.data.length < 60) break;
    }

    if (resdata.length > 0) {
      useGS.setGistRes(resdata);
      await saveGistsToCodeHub(resdata);
      if (localStorage.getItem("LocalGistResTure") !== "0") {
        await codehubStorage.setItem(GIST_LIST_KEY, resdata);
      }
      if (!isPullRefresh) showToast("刷新成功");
    }
  } catch (error) {
    showToast("刷新失败 " + error.message);
  } finally {
    isloding.value = false;
    loading.value = false;
  }
};

function forTS(timestampInSeconds) {
  const dateo = new Date(timestampInSeconds);
  const year = dateo.getFullYear();
  const month = String(dateo.getMonth() + 1).padStart(2, "0");
  const day = String(dateo.getDate()).padStart(2, "0");
  const hours = String(dateo.getHours()).padStart(2, "0");
  const minutes = String(dateo.getMinutes()).padStart(2, "0");
  return `${String(year).slice(2)}/${month}/${day} ${hours}:${minutes}`;
}

const shouldLoadLocalGists = () => localStorage.getItem("LocalGistRe") !== "0";

const loadLocalGistCache = async (showResult = true) => {
  if (!shouldLoadLocalGists()) return;
  try {
    const gl = await codehubStorage.getItem(GIST_LIST_KEY);
    if (!Array.isArray(gl) || gl.length === 0) {
      if (showResult) showToast("没有可用的 Gist 本地缓存");
      return;
    }
    const cachedGists = gl.map((item) => {
      if (!item || typeof item !== "object" || !item.id || !item.files || typeof item.files !== "object") {
        throw new Error("读取到无效缓存数据");
      }
      return {
        ...item,
        filesNames: Array.isArray(item.filesNames) ? item.filesNames : Object.keys(item.files),
      };
    });
    useGS.setGistRes(cachedGists);
    await codehubStorage.setItem(GIST_LIST_KEY, cachedGists);
    await saveGistsToCodeHub(cachedGists);
    if (showResult) showToast(`获取本地缓存成功：${cachedGists.length} 项`);
  } catch (error) {
    await codehubStorage.removeItem(GIST_LIST_KEY);
    showToast("获取本地缓存失败，已移除无效缓存");
  }
};

const handleLocalGistCacheSettingChange = (event) => {
  if (event.detail?.enabled) loadLocalGistCache(false);
};

onMounted(async () => {
  await loadLocalGistCache();
  window.addEventListener("gist-local-cache-setting-change", handleLocalGistCacheSettingChange);
  window.addEventListener("gist-credentials-change", refreshGistCredentials);
  if (localStorage.getItem("AutoGistRe") == 1) {
    showToast("正在拉取远程资源");
    rereq();
  }
});

onBeforeUnmount(() => {
  window.removeEventListener("gist-local-cache-setting-change", handleLocalGistCacheSettingChange);
  window.removeEventListener("gist-credentials-change", refreshGistCredentials);
});
</script>

<style lang="css">
.kcardGN {
  position: absolute;
  display: flex;
  flex-direction: column;
  flex-direction: column-reverse;
  top: 6px;
  left: 8px;
}
.gname {
  max-width: 100px;
  font-size: 12px;
  opacity: 0.7;
  padding: 10px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.kcard-t {
  overflow: hidden;
  height: 30px;
  padding-top: 7px;
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: flex-start;
}
.grshow {
  width: 60px;
  position: absolute;
  display: flex;
  left: 70px;
  top: 0px;
  flex-direction: column;
  flex-wrap: wrap;
}

.gdate {
  position: absolute;
  bottom: 16px;
  font-size: 10px;
  display: flex;
  opacity: 0.7;
  flex-direction: row-reverse;
  flex-wrap: wrap;
}

.kcardGNt {
  width: 136px;
  overflow: hidden;
  height: 50px;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.kcard-imggit {
  position: absolute;
  width: 20px;
  height: 20px;
  top: 8px;
  left: 6px;
}
#isexk > .van-popup--round {
  width: 80%;
  top: 50% !important;
}

.gtittle {
  align-items: flex-start;

  display: flex;
  flex-direction: column;
  flex-wrap: nowrap;
  padding: 16px 30px;
  max-height: 100%;
}

.gtname {
  padding: 6px 0 16px;
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  flex-direction: row;
  justify-content: center;
}

.gtwopop > div {
  align-items: baseline;
  padding-top: 10px;
  font-size: 11px;
  display: flex;
  opacity: 0.7;
  b {
    font-size: 12px;
  }
}

.gtdesc {
  align-items: baseline;
  padding: 10px 10px 0 0;
  font-size: 11px;
  display: flex;
  width: auto;
  opacity: 0.8;
  b {
    font-size: 12px;
  }
}
.gikeyvalue {
  display: flex !important;

  overflow: hidden !important;
  white-space: nowrap !important;

  text-overflow: ellipsis !important;
}
.van-cell__label {
  white-space: nowrap;
}

.girepaly {
  padding-left: 16px;
  position: relative;
  display: flex;
  align-items: center;
  opacity: 0.6;
  padding-right: 16px;
}

.parent-div .search-icon {
  font-size: 20px;
  padding: 0 10px;
}
.van-collapse-item__content {
  background: #00000000;
  color: #ffffff79;
}
.gicdeimg {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.gist-file-title {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.van-collapse-item .van-cell__title {
  position: relative;
}

.gist-file-list .van-cell__right-icon {
  display: none;
}

.gist-file-title span {
  min-width: 0;
  flex: 1;
  padding-right: 58px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gist-file-title button {
  position: absolute;
  top: 50%;
  right: 0;
  transform: translateY(-50%);
  flex: none;
  min-height: 26px;
  padding: 0 10px;
  border: 0;
  border-radius: 999px;
  background: rgba(128, 128, 128, 0.16);
  color: inherit;
  font-size: 12px;
  cursor: pointer;
}

.gicdeimg button {
  min-height: 30px;
  padding: 0 12px;
  border: 0;
  border-radius: 999px;
  background: rgba(128, 128, 128, 0.16);
  color: inherit;
  font-size: 12px;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  transition: background 0.15s, transform 0.15s;
}

.gicdeimg button:hover {
  background: rgba(128, 128, 128, 0.25);
}

.gicdeimg button:active {
  transform: scale(0.95);
}

.gicdeimg .gicdeimg-delete {
  color: #d65a5a;
}

[class*="van-hairline"]:after {
  right: -42% !important;
  left: -43% !important;
}
.van-dialog {
  top: 50% !important;
}

:root {
  --van-button-default-background: #00000000;
}
</style>
