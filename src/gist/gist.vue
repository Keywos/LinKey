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

      <van-collapse v-model="activeName" accordion>
        <van-collapse-item v-for="(i, index) in listpop.filesNames" :title="i" :name="index" :label="`Size: ${listpop.files[i]?.size} ${listpop.files[i]?.type}`">
          <div class="gicdeimg">
            <img :src="yjurl" @click="htmlyl(i)" />
            <img :src="copyimg" @click="imgcopy(i)" />
            <img :src="preview" @click="imgpreview(i)" />
            <img :src="edit" @click="imgedit(i)" />
            <img :src="del" @click="imgdel(i)" />
          </div>
        </van-collapse-item>

        <van-collapse-item v-if="listpop.filesNames.length < 1" :title="listpop.id" label="没有数据">
          <div class="gicdeimg">
            <img :src="preview" @click="imgpreview(i)" />
            <img :src="edit" @click="imgedit(i)" />
            <img :src="del" @click="imgdel(i)" />
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

      <div v-for="(element, index) in gistCard" :key="element.id" class="kcard-one" @click="showCenter(element)">
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
import { ref, watchEffect, onMounted } from "vue";
import { showToast } from "vant";
import { sendReq } from "@/http/http.js";
import github from "@/img/svg/github.svg";
import copyimg from "@/img/svg/copy.svg";
import yjurl from "@/img/svg/yjurl.svg";
import del from "@/img/svg/del.svg";
import edit from "@/img/svg/edit.svg";
import preview from "@/img/svg/preview.svg";
import { useRouter } from "vue-router";
import { useGistStore } from "@/store/gistStore";

import { showConfirmDialog } from "vant";
import useV3Clipboard from "vue-clipboard3";
const { toClipboard } = useV3Clipboard();

const useGS = useGistStore();
const activeName = ref(0);
const router = useRouter();
const showCentertf = ref(false);
const listpop = ref([]);

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
  showCentertf.value = true;
  listpop.value = i;
};

const htmlyl = async () => {
  console.log(activeName.value);
  const url = listpop.value.html_url;
  if (url?.length > 0) {
    window.open(url, "_blank");
    await toClipboard(url);
  }
};
const imgcopy = async (i) => {
  console.log(activeName.value);
  const url = listpop.value.files[i]?.raw_url.replace(/\/raw\/\w+?\//, "/raw/");
  if (url.length > 0) {
    await toClipboard(url);
    showToast("复制 URL 成功");
  }
};

const imgpreview = async (i) => {
  try {
    showToast("开始请求");
    const url = listpop.value.files[i]?.raw_url;
    const res = await sendReq("GET", url);
    console.log(res.status);
    console.log(res);
    if (res.status == "200") {
      console.log("11");
      useGS.setGistResPreview(res.data, "Gist Preview");
      console.log("22");
      router.push("/gist/gistEdit");
    }
  } catch (e) {
    showToast("预览失败 " + e.message);
  }
};

const imgedit = async (i) => {
  try {
    showToast("开始请求 Edit");
    const url = listpop.value.files[i]?.raw_url;
    const res = await sendReq("GET", url);
    console.log(i);
    if (res.status == "200") {
      console.log(res.status);
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
const beforeClose = (action) =>
  new Promise(async (resolve) => {
    if (action !== "confirm") {
      resolve(action !== "confirm");
    } else {
      showToast("开始请求 Del" + delnamei);
      const id = listpop.value.id;
      if (listpop.value.filesNames.length > 1) {
        let content = {
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
      resolve(action === "confirm");
    }
  });

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
const gistCard = ref(gistklist);
let xn = [],
  xtf = false;
const username = ref("");
let GetUserName = localStorage.getItem("GistUserN") || "";
if (GetUserName == "") {
  xtf = true;
  xn.push("未设置用户名");
} else {
  username.value = GetUserName;
}

const token = ref("");
let LocalGetToken;
try {
  LocalGetToken = JSON.parse(localStorage.getItem("GistUserT"));
} catch (error) {}
if (LocalGetToken && LocalGetToken?.n !== "" && LocalGetToken?.t != "") {
  token.value = LocalGetToken.t;
} else {
  xtf = true;
  xn.push("未设置 Token");
}
xtf && showToast(xn.join(", "));
const loading = ref(false);

const retxts = ref("刷新成功");
const onRefresh = () => {
  if (username.value != "" && token.value != "") {
    loading.value = true;
    rereq("1");
  } else {
    loading.value = false;
    retxts.value = "未设置 用户名 , Token";
    showToast("未设置 用户名 , Token");
  }
};

const rereq = async (i) => {
  if (username.value == "" && token.value == "") {
    showToast("未设置 用户名 , Token");
    return;
  }
  if (i != "1") isloding.value = true;
  let resdata = [];
  for (let i = 1; i < 10; i++) {
    console.log(i);
    const res = await sendReq("GET", `https://api.github.com/users/${username.value}/gists?per_page=60&page=${i}`, {
      Authorization: `token ${token.value}`,
      Accept: "application/vnd.github.v3+json",
    });
    console.log(res.status);
    if (res.status == "200" && res.data.length > 0) {
      const mapdata = res.data.map(({ id, html_url, files, public: publicProp, created_at, updated_at, description, owner }) => ({
        id,
        html_url,
        filesNames: Object.keys(files),
        files,
        public: publicProp,
        created: forTS(new Date(created_at).getTime()),
        updated: forTS(new Date(updated_at).getTime()),
        desc: description,
        user: owner.login,
      }));
      resdata = resdata.concat(mapdata);
      if (res.data.length < 60) break;
    } else {
      break;
    }
  }

  if (resdata.length > 0) {
    useGS.setGistRes(resdata);
    if (localStorage.getItem("LocalGistResTure") == 1) {
      localStorage.setItem("GistRes", JSON.stringify(resdata));
    }
    isloding.value = false;
    loading.value = false;
    i != "1" && showToast("刷新成功");
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

onMounted(() => {
  if (localStorage.getItem("LocalGistRe") == 1) {
    try {
      const gl = JSON.parse(localStorage.getItem("GistRes"));
      let io = 0;
      if (Array.isArray(gl) && gl.length != 0) {
        gl.forEach((i) => {
          if (typeof i != "object" && !i.filesNames) {
            io++;
            throw new Error("读取到数组元素不是对象");
          }
        });
        useGS.setGistRes(gl);
      }
      showToast("获取本地缓存成功");
      console.log("挂载成功", io);
    } catch (error) {
      localStorage.removeItem("GistRes");
      showToast("获取本地缓存失败, 移除缓存");
    }
  }
  if (localStorage.getItem("AutoGistRe") == 1) {
    showToast("正在拉取远程资源");
    rereq();
  }
});
watchEffect(() => {
  const getGistResn = useGS.getGistRes;
  console.log("变化");
  gistCard.value = gistklist.concat(getGistResn);
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
  justify-content: flex-end;
}
.gicdeimg > * {
  height: 16px;
  width: 16px;
  padding: 0 16px;
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
