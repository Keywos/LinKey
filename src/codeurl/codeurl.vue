<template>
  <!-- <div>
    <pre>
      <code class="javascript">
        <span v-html="highlightedCode"></span>
      </code>
    </pre>
  </div> -->
  <div class="max-centered" id="keyfroms">
    <h2>URL 工具箱</h2>

    <van-cell-group inset title="输入需要处理的数据">
      <van-field v-model="inp" rows="1" label="" :error-message="errm" type="textarea" :placeholder="tit" show-word-limit :autosize="{ maxHeight: 400, minHeight: 40 }">
        <template #button>
          <span v-if="hasrawView">
            <van-button size="small" type="primary" @click="openisRaw">代码编辑器打开</van-button>
            &nbsp;
          </span>

          <van-button size="small" type="primary" @click="pasteFromClipboard">粘贴</van-button>
          &nbsp;
          <van-button size="small" type="primary" @click="clearsb">{{ inplength }} 清空</van-button>
        </template>
      </van-field>
    </van-cell-group>

    <van-radio-group v-model="isbase">
      <van-cell-group inset title="选择转换模式">
        <van-cell title="URL 编码" clickable @click="isbase = '1'">
          <template #right-icon>
            <van-radio name="1" />
          </template>
        </van-cell>

        <van-cell title="解码 URL" clickable @click="isbase = '2'">
          <template #right-icon>
            <van-radio name="2" />
          </template>
        </van-cell>

        <van-cell title="URL 添加正则" clickable @click="isbase = '3'">
          <template #right-icon>
            <van-radio name="3" />
          </template>
        </van-cell>

        <van-cell title="提取 URL" clickable @click="isbase = '4'">
          <template #right-icon>
            <van-radio name="4" />
          </template>
        </van-cell>

        <van-cell v-if="isbase == 3" center title="去掉 URL 携带的参数?">
          <template #right-icon>
            <van-switch v-model="needre" />
          </template>
        </van-cell>

        <van-cell v-if="isbase == 4" center title="显示跳转 Script-Hub 预览按钮">
          <template #right-icon>
            <van-switch v-model="needsh" @click="needshlc(needsh)" />
          </template>
        </van-cell>

        <van-cell v-if="isbase == 4" center title="显示跳转 Script-Hub 编辑按钮">
          <template #right-icon>
            <van-switch v-model="needshe" @click="needshlce(needshe)" />
          </template>
        </van-cell>

        <van-cell v-if="isbase == 4" center title="显示代码编辑器 预览按钮">
          <template #right-icon>
            <van-switch v-model="needvc" @click="needsvc(needvc)" />
          </template>
        </van-cell>
      </van-cell-group>
    </van-radio-group>

    <!-- <van-cell-group inset title="URL 相关">
      <van-cell v-if="isbase == 3" center title="去掉 URL 携带的参数?">
        <template #right-icon>
          <van-switch v-model="needre"  />
        </template>
      </van-cell>
    </van-cell-group> -->

    <van-cell-group v-if="isbase != 4" inset title="结果: 按键左侧值字符总数">
      <van-field v-model="outp" rows="2" label="" readonly type="textarea" :placeholder="tito" show-word-limit :autosize="{ maxHeight: 200, minHeight: 100 }">
        <template #button>
          <van-button size="small" type="primary" @click="copyText(outp)">{{ outplength }} 复制</van-button>
        </template>
      </van-field>
    </van-cell-group>
    <!--  id="urlcopys"  一行-->
    <van-cell-group id="keyfroms" v-if="isbase == 4" inset title="提取解析后的 URL 列表">
      <van-field v-for="(item, index) in sliceUrl" v-model="item.url" rows="1" label="" type="textarea" placeholder="" readonly show-word-limit autosize>
        <!-- urlname -->

        <template #button>
          <van-button v-if="needvc" size="small" type="primary" @click="openUrlVC(item.url)">代码编辑器预览</van-button>

          {{ needvc ? "&nbsp;" : "" }}

          <van-button v-if="needshe" size="small" type="primary" @click="openUrlSHe(item.url)">SH 编辑</van-button>

          {{ needshe ? "&nbsp;" : "" }}

          <van-button v-if="needsh" size="small" type="primary" @click="openUrlSH(item.url)">SH 预览</van-button>

          {{ needsh ? "&nbsp;" : "" }}
          <van-button size="small" type="primary" @click="openUrlInNewTab(item.url)">{{ index + 1 }} 打开</van-button>
          &nbsp;
          <van-button size="small" type="primary" @click="copyText(item.url)">复制</van-button>
        </template>
      </van-field>
    </van-cell-group>
    <!-- <van-cell-group inset>
      <van-field
        rows="2"
        label=""
        show-word-limit
        :autosize="{ maxHeight: 1000, minHeight: 100 }"
      ></van-field>
    </van-cell-group> -->

    <van-cell-group inset title="解析 URL 查询字符串，并获取其中的键值对">
      <van-cell center title="是否启用 URL 键值对查询">
        <template #right-icon>
          <van-switch v-model="needjsona" @click="setls('KeyUrl', needjsona)" />
        </template>
      </van-cell>
      <van-cell center title=" 解析输出为JSON 格式">
        <template #right-icon>
          <van-switch v-model="needjson" @click="setls('JsonURL', needjson)" />
        </template>
      </van-cell>
      <!-- </van-cell-group>
              <van-cell-group inset title="解析 URL 查询字符串，并获取其中的键值对"> -->
      <!-- <div>
                  <pre>
          <code class="javascript" style="max-width: 200px !important;">
          <span v-html="highlightedCode"></span>
          </code>
          </pre>
                </div> -->
      <!--  readonly -->
      <van-field v-if="needjsona" v-model="urlparams" rows="2" label="" type="textarea" :placeholder="tito" show-word-limit :autosize="{ maxHeight: 500, minHeight: 100 }">
        <template #button>
          <van-button size="small" type="primary" @click="copyText(urlparams)">
            <!-- {{ outplength }} -->
            复制
          </van-button>
        </template>
      </van-field>
    </van-cell-group>

    <div class="infop">
      <!-- <h4>关于 Unix 时间戳</h4> -->
      <p></p>
      <b>关于 Url 编码</b>
      <p>▸ URL 编码是一种将 URL 中的非ASCII字符和特殊字符转换为一种特殊格式的过程，以便在网络中传输。URL 编码也称为百分比编码，因为它使用 "%" 符号紧跟着两个表示字符 ASCII 值的十六进制数字。</p>

      <p>▸ 字母和数字：保持不变。</p>
      <p>▸ 保留字符：保持不变。例如，-、_、.、~。</p>
      <p>▸ 非保留字符：转换为 % 后跟两个字符的 ASCII 值的十六进制表示。例如，空格（ASCII 值为 32）会被转换为 %20。</p>

      <b></b>
    </div>
    <van-cell-group inset title="跳转中文、表情包域名转换 Punycode 编解码">
      <van-cell title="Punycode 编解码" is-link to="/punycode" />
    </van-cell-group>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from "vue";
import { showToast } from "vant";
import { useRouter } from "vue-router";
const router = useRouter();
import useV3Clipboard from "vue-clipboard3";
const { toClipboard } = useV3Clipboard();

const needre = ref(false);
const isshe = localStorage.getItem("SHEURL") == "true";
const issh = localStorage.getItem("SHURL") == "true";
const isj = localStorage.getItem("JsonURL") == "true";
const isa = localStorage.getItem("KeyUrl") == "true";

const isvc = localStorage.getItem("VCURL") == "true";
const needshe = ref(isshe);
const needsh = ref(issh);
const needvc = ref(isvc);

const needjson = ref(isj);
const needjsona = ref(isa);

const setls = (i, o) => {
  localStorage.setItem(i, o);
};
const errm = ref("");
const inp = ref("");

onMounted(() => {
  inp.value = sessionStorage.getItem("URLSS");
});
const outp = ref("");
const urlparams = ref("");
const outpref = ref(null);
const inplength = ref("");
const outplength = ref("");
const isU = localStorage.getItem("URL") || "2";
const isbase = ref(isU);
const tit = ref("请输入 URL");
const tito = ref("转换后的字符串");
const clearsb = () => {
  inp.value = "";
  urlparams.value = "";
  outpref.value = "";
  inplength.value = "";
  outplength.value = "";
  outp.value = "";
};

const hasrawView = ref(false);
const openisRaw = () => {
  let u = inp.value;
  if (!/%2F/.test(u)) {
    u = encodeURIComponent(inp.value);
  }
  router.push("/EditCode?" + u);
};
const openUrlVC = (url) => {
  let u = url;
  if (!/%2F/.test(u)) {
    u = encodeURIComponent(url);
  }
  router.push("/EditCode?" + u);
};
const sliceUrl = ref([]);

const needshlc = (i) => localStorage.setItem("SHURL", i);

const needshlce = (i) => localStorage.setItem("SHEURL", i);
const needsvc = (i) => localStorage.setItem("VCURL", i);

const openUrlSHe = (url) => window.open(`https://script.hub/edit/_start_/${url}/_end_/plain.txt?type=plain-text&target=plain-text`, "_blank");
const openUrlSH = (url) => window.open(`https://script.hub/convert/_start_/${url}/_end_/plain.txt?type=plain-text&target=plain-text`, "_blank");
const openUrlInNewTab = (url) => window.open(url, "_blank");

const pasteFromClipboard = async () => {
  try {
    const clipboardText = await navigator.clipboard.readText();
    if (clipboardText.length > 0) {
      inp.value = clipboardText;
      showToast("已粘贴字数: " + clipboardText.length);
    }
  } catch (e) {
    const textarea = document.querySelector("textarea");
    if (!textarea) return;
    textarea.focus();
    document.execCommand("paste", false);
    if (textarea.value.length > 0) {
      inp.value = textarea.value;
      showToast("已粘贴字数 -- " + textarea.value.length);
    }
  }
};

const copyText = async (t) => {
  if (t.length > 0) {
    await toClipboard(t);
    showToast("已复制字符串数: " + t.length);
  }
};

watch([inp, isbase, needre, needjson, needjsona], ([newValue, tf, nr, nj, needjsonatf]) => {
  localStorage.setItem("URL", tf);
  sessionStorage.setItem("URLSS", newValue);
  inplength.value = newValue.length == 0 ? "" : newValue.length;
  if (newValue.length > 0) {
    if (/^https:\/\/\w+/.test(newValue)) {
      hasrawView.value = true;
    } else if (/%2F/.test(newValue)) {
      if (/^https:\/\/\w+/.test(decodeURIComponent(newValue))) {
        hasrawView.value = true;
      } else {
        hasrawView.value = false;
      }
    } else {
      hasrawView.value = false;
    }

    if (needjsonatf) {
      try {
        const params = new URLSearchParams(decodeURIComponent(newValue));
        let xo;
        if (nj) {
          xo = {};
          params.forEach((value, key) => {
            xo[key] = value;
          });
          try {
            for (var key in xo) {
              if (xo.hasOwnProperty(key)) {
                if (typeof xo[key] === "string") {
                  xo[key] = JSON.parse(xo[key]);
                }
              }
            }
          } catch (error) {}
          xo = JSON.stringify(xo, "", 5);
        } else {
          xo = "";
          params.forEach((value, key) => {
            key = key.replace(/^https?:\/\/.+?\?/, "");
            if (value.length > 40) {
              xo += "\n";
              xo += `[${key}]\x20:\x20\x20 ${value}\n\n`;
            } else {
              xo += `[${key}]\x20:\x20\x20 ${value}\n`;
            }
          });
        }

        urlparams.value = xo;
      } catch (error) {
        console.log(error);
      }
    }

    if (tf == 1) {
      tit.value = "请输入 URL";
      tito.value = "转换后的 字符串";
      try {
        errm.value = "";
        outp.value = encodeURIComponent(newValue);
      } catch (error) {
        errm.value = "错误1: 无效的 URL 编码";
        outp.value = "";
      }
    } else if (tf == 2) {
      tit.value = "请输入 字符串";
      tito.value = "转换后的 URL";
      try {
        errm.value = "";
        outp.value = decodeURIComponent(newValue);
      } catch (error) {
        errm.value = "错误2 ";
      }
    } else if (tf == 3) {
      tit.value = "请输入 URL";
      tito.value = "转换后的 URL";
      try {
        if (nr) {
          newValue = decodeURIComponent(newValue).replace(/\?.*/g, "?");
        }
        outp.value = "^" + decodeURIComponent(newValue).replace(/[.*+?^${}()/|[\]\\]/g, "\\$&") + "$";
      } catch (error) {
        errm.value = "错误3 ";
      }
    } else if (tf == 4) {
      try {
        const spliturl = decodeURIComponent(newValue)
          .split(/,|{|}|;|"|'|\[|\]|\n|，|\)|。|、|\s\/\/|\/\/\s|#| /)
          .filter((i) => /^(https?:\/\/)?(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}|[a-zA-Z0-9\.\-]+?\.[^/]{2,})/.test(i));
        console.log(spliturl);
        const urllist = [];
        if (spliturl.length > 0) {
          spliturl.forEach((i) => {
            const urlname = i.split("/").pop().replace(/\?.+/, "");
            const name = Math.random().toString().slice(2, 5) + "-" + urlname;
            urllist.push({ url: i });
          });
        }
        if (urllist.length > 0) {
          sliceUrl.value = urllist;
        }
      } catch (error) {}
    }
    outplength.value = outp.value.length;
  }
});
</script>

<style>
code {
  /* display: block; */
  max-width: 100px !important;
  font-family: monospace;
}

.van-highlight {
  /* background: #403131; */
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  flex-wrap: wrap;
}
#urlcopys .van-field__body {
  flex-wrap: nowrap !important;
}
</style>
