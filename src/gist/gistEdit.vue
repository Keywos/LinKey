<template>
  <h1>{{ tname }}</h1>

  <div v-if="num === 1" style="padding-bottom: 160px">
    <div id="keyfroms">
      <van-form @submit="onSubmit">
        <van-cell-group inset title="输入数据">
          <van-field v-model="filename" name="filename" label="文件名" placeholder="FileName" />
          <van-field v-model="token" type="password" name="Token" label="Token" placeholder="Token" />
          <van-field v-model="Desc" type="Desc" name="Desc" label="Desc" placeholder="Desc" />
          <van-field name="radio" label="Public">
            <template #input>
              <van-radio-group v-model="PublicM" direction="horizontal">
                <van-radio name="1">私库</van-radio>
                <van-radio name="2">公开</van-radio>
              </van-radio-group>
            </template>
          </van-field>
        </van-cell-group>

        <div class="gistsubmit">
          <van-button block type="primary" :loading="isloding" native-type="submit">提交</van-button>
        </div>
      </van-form>
      <van-cell-group inset title="创建">
        <EditCode :isReadOnly="false" />
      </van-cell-group>
    </div>

    <van-cell-group v-if="rawURL != ''" inset title="结果: Forever 为的永久 Raw URL">
      <van-field v-model="rawURL" label="Raw URL" placeholder="">
        <template #button>
          <van-button size="small" type="primary" @click="openUrl(rawURL)">&nbsp;打开&nbsp;</van-button>
          &nbsp;
          <van-button size="small" type="primary" @click="copyText(rawURL)">&nbsp;复制&nbsp;</van-button>
        </template>
      </van-field>

      <van-field v-model="rawurlForever" label="Forever URL" placeholder="">
        <template #button>
          <van-button size="small" type="primary" @click="openUrl(rawURL)">&nbsp;打开&nbsp;</van-button>
          &nbsp;
          <van-button size="small" type="primary" @click="copyText(rawurlForever)">&nbsp;复制&nbsp;</van-button>
        </template>
      </van-field>
    </van-cell-group>
  </div>

  <div v-if="num === 2" id="keyfroms">
    <van-cell-group inset title="预览">
      <EditCode :isReadOnly="true" />
    </van-cell-group>
  </div>

  <div v-if="num === 3" style="padding-bottom: 160px">
    <div id="keyfroms">
      <van-form @submit="onSubmit">
        <van-cell-group inset title="输入数据">
          <van-field v-model="filename" name="filename" label="文件名" readonly placeholder="FileName" />

          <van-field v-model="Desc" type="Desc" name="Desc" label="Desc" placeholder="Desc" />
        </van-cell-group>

        <div class="gistsubmit">
          <van-button block type="primary" :loading="isloding" native-type="submit">提交</van-button>
        </div>
      </van-form>
      <van-cell-group inset title="编辑">
        <EditCode :isReadOnly="false" />
      </van-cell-group>
    </div>

    <van-cell-group v-if="rawURL != ''" inset title="结果: Forever 为的永久 Raw URL">
      <van-field v-model="rawURL" label="Raw URL" placeholder="">
        <template #button>
          <van-button size="small" type="primary" @click="openUrl(rawURL)">&nbsp;打开&nbsp;</van-button>
          &nbsp;
          <van-button size="small" type="primary" @click="copyText(rawURL)">&nbsp;复制&nbsp;</van-button>
        </template>
      </van-field>

      <van-field v-model="rawurlForever" label="Forever URL" placeholder="">
        <template #button>
          <van-button size="small" type="primary" @click="openUrl(rawURL)">&nbsp;打开&nbsp;</van-button>
          &nbsp;
          <van-button size="small" type="primary" @click="copyText(rawurlForever)">&nbsp;复制&nbsp;</van-button>
        </template>
      </van-field>
    </van-cell-group>
  </div>
</template>

<script setup>
import { useGistStore } from "@/store/gistStore.js";
import { ref, watchEffect, onMounted, defineAsyncComponent, watch, onBeforeUnmount } from "vue";
import { showToast } from "vant";
import { sendReq } from "@/http/http.js";
import useV3Clipboard from "vue-clipboard3";
import { useCmStore } from "@/store/cmCodeStore.js";
const cmStore = useCmStore();

const EditCode = defineAsyncComponent(() => import("@/EditCode/cmView.vue"));

const { toClipboard } = useV3Clipboard();
const isloding = ref(false);
const PublicM = ref("1");
const rawURL = ref("");
const rawurlForever = ref("");
const num = ref(0);
const edid = ref("");
const inp = ref("");
function getRName() {
  return "Gist_" + Math.floor(100 + Math.random() * 900);
}
const filename = ref("");

const token = ref("");

onBeforeUnmount(() => {
  cmStore.setCmCode("");
});
onMounted(() => {
  let LocalGetToken;
  try {
    LocalGetToken = JSON.parse(localStorage.getItem("GistUserT"));
  } catch (error) {}
  if (LocalGetToken && LocalGetToken?.n !== "" && LocalGetToken?.t != "") {
    token.value = LocalGetToken.t;
  } else {
    showToast("未设置 Token");
  }
});

const Desc = ref("");
const useGStore = useGistStore();
const isnew = ref(false);

const tname = useGStore.tname || "无参数, 请返回";
if (tname == "Gist Create") {
  num.value = 1;
} else if (tname == "Gist Preview") {
  num.value = 2;
  const pres = useGStore.getGistResPreview;
  if (typeof pres === "object") {
    inp.value = JSON.stringify(pres, null, 3);
    console.log("1");
  } else {
    inp.value = pres;
    console.log("2");
  }
} else if (tname == "Gist Edit") {
  num.value = 3;
  let GistEditfile = useGStore.GistEdit;
  if (typeof GistEditfile === "object") {
    console.log("🍉");
    GistEditfile = JSON.stringify(useGStore.GistEdit, null, 3);
  }
  filename.value = useGStore.GistFN;
  inp.value = GistEditfile;
  edid.value = useGStore.geid;
  Desc.value = useGStore.gidesc;
  console.log(filename.value);
} else if (tname == "Create New") {
  //patch
  num.value = 1;
  edid.value = useGStore.geid;
  Desc.value = useGStore.gidesc;
  isnew.value = true;
}

let content = {};

const onSubmit = async (values) => {
  isloding.value = true;
  if (values.filename == "") {
    filename.value = getRName();
  }
  if (values.Desc == "") {
    Desc.value = "Descs";
  }
  content.description = Desc.value;
  content.public = PublicM.value != "1";

  const _filename = filename.value;
  const _id = edid.value;
  content.files = {
    [_filename]: {
      content: cmStore.CmCode.toString(),
    },
  };
  let post = "POST",
    url = "https://api.github.com/gists";
  const isEdit_Patch_new = num.value == 3 || isnew.value;
  if (isEdit_Patch_new) {
    //num.value == 3 //edit
    //isnew patch
    post = "PATCH";
    url = `https://api.github.com/gists/${_id}`;
  }
  const res = await sendReq(
    post,
    url,
    {
      Authorization: `token ${token.value}`,
      Accept: "application/vnd.github.v3+json",
    },
    JSON.stringify(content)
  );
  console.log(res.status);
  console.log(res);
  if (res.status == "201" || res.status == "200") {
    showToast("请求成功" + res.status);
    isloding.value = false;
    if (res.data?.files[_filename]?.raw_url) {
      const rawurl = res.data.files[_filename].raw_url;
      rawurlForever.value = rawurl.replace(/\/raw\/\w+?\//, "/raw/");
      rawURL.value = res.data.files[_filename].raw_url;
      if (isEdit_Patch_new) {
        console.log(_id);
        console.log(_filename);
        console.log(res.data.files[_filename]);
        useGStore.addGistRespatch(_id, _filename, res.data.files[_filename]); //id new res
      } else {
        const { id, html_url, files, public: publicProp, created_at, updated_at, description, owner } = res.data;
        const newRes = {
          id,
          html_url,
          filesNames: Object.keys(files),
          files,
          public: publicProp,
          created: forTS(new Date(created_at).getTime()),
          updated: forTS(new Date(updated_at).getTime()),
          desc: description,
          user: owner.login,
        };

        useGStore.addGistResposh(newRes);
      }
    }
  }
};

const copyText = async (t) => {
  if (t.length > 0) {
    await toClipboard(t);
    showToast("已复制字符串数: " + t.length);
  }
};
const openUrl = (url) => window.open(url);

function forTS(timestampInSeconds) {
  const dateo = new Date(timestampInSeconds);
  const year = dateo.getFullYear();
  const month = String(dateo.getMonth() + 1).padStart(2, "0");
  const day = String(dateo.getDate()).padStart(2, "0");
  const hours = String(dateo.getHours()).padStart(2, "0");
  const minutes = String(dateo.getMinutes()).padStart(2, "0");

  return `${String(year).slice(2)}/${month}/${day} ${hours}:${minutes}`;
}
watchEffect(() => {
  cmStore.setCmCode(inp.value);
});
</script>

<style lang="css">
.gistsubmit {
  padding-left: 20%;
  padding-right: 20%;
  position: fixed;
  display: flex;
  bottom: 30px;
  width: 60%;
  z-index: 2000;
}
</style>
