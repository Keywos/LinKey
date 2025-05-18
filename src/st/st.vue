<template>
  <div id="STOOL">
    <div class="toptittle">
      <a class="title">
        <img class="topimg logo" :src="sg" />
        Surge Tool
      </a>
    </div>
    <div class="kpage has-image">
      <div class="container">
        <div class="main">
          <div class="sglogoh" @click="close4">
            <img :src="sg" />
            <div class="image-bg"></div>
          </div>
          <h1 class="name">
            <span class="titleh" @click="close5">Troubleshoot</span>
          </h1>
          <p class="tline">
            The parts marked in
            <span style="color: #ca2525">Red</span>
            do not necessarily indicate a problem, But rather serve as a noteworthy reminder
          </p>
          <div class="actions">
            <div class="action">
              <a class="ebutton mdi alt" @click="click1">MitM{{ mgn }} {{ mgtf }}</a>
            </div>
            <div class="action">
              <a class="ebutton mdi alt" @click="click2">Script{{ sgn }} {{ sgtf }}</a>
            </div>
            <div class="action">
              <a class="ebutton mdi alt" @click="click3">Rewrite{{ rgn }} {{ rgtf }}</a>
            </div>
          </div>
        </div>
        <div class="sglists">
          <div v-show="s1">
            <div class="pretit" @click="close1">
              Rule
              <van-rolling-text ref="rollingTextRef" :duration="durs" :start-num="startnum" :target-num="geting" :auto-start="false" />
            </div>
            <pre> 
            <p v-for="(value, key) in AROBJ" :key="key">
              {{ key }}: {{ value }}
            </p>
          </pre>
          </div>
          <div class="image-bgs" />
          <div v-show="s2">
            <div class="pretit" @click="close2">Rule List</div>
            <br />
            <pre>
            <p v-for="(v, k) in RULELISTALL" :key="k" >
             <a :href="k" target="_blank" > {{ v.n }}: {{ v.l }}</a>
            </p>
          </pre>
          </div>
          <div v-show="s3">
            <div class="pretit" @click="close3">Hostname</div>
            <br />
            <pre>
            <p v-for="(i, index) in HOSTNAME" :key="index">
                {{ i }}
              </p>
          </pre>
          </div>
        </div>
      </div>
    </div>
    <footer class="tƒooters">
      Made With By @key @xream {{ version }}
      <a href=" "></a>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { sendReq } from "@/http/http.js";
import sg from "/sg.png";
import { showToast } from "vant";
const version = import.meta.env.PACKAGE_VERSION;

const AROBJ = ref({});
const HOSTNAME = ref({});

const RULELISTALL = ref({});
const rollingTextRef = ref(null);
const mgtf = ref("");
const sgtf = ref("");
const rgtf = ref("");

const mgn = ref("");
const sgn = ref("");
const rgn = ref("");

const s1 = ref(true);
const s2 = ref(true);
const s3 = ref(true);
const close1 = () => {
  s1.value = false;
};
const close2 = () => {
  s2.value = false;
};
const close3 = () => {
  s3.value = false;
};

const close4 = () => {
  s1.value = true;
  s2.value = true;
  s3.value = true;
};
const durs = ref(2.5);
const geting = ref(0);

const startnum = ref(233);
const click1 = () => {
  showToast("点击窗口顶部可以关闭窗口");
};

const click2 = () => {
  showToast("点击上方Logo可以重新打开所有窗口");
};

const click3 = () => {
  showToast("点击 Troubleshoot 可以重新获取数据");
};
onMounted(async () => {
  fetchData();
  rollingTextRef.value.start();
});

const close5 = () => {
  durs.value = 1.5;
  rollingTextRef.value.reset();
  setTimeout(() => {
    rollingTextRef.value.start();
  }, 50);

  showToast("重新请求数据中...");
  fetchData();
};
const fetchData = async () => {
  try {
    let res = await sendReq("GET", "https://surgetool.com/getkey");
    if (res.data?.VERSION.toString()[0] > 4) {
      res = res.data;
      geting.value = res.ALL_NUM;
      startnum.value = res.ALL_NUM;
      AROBJ.value = Object.fromEntries(Object.entries(res.AROBJ).filter(([, value]) => value !== 0));
      HOSTNAME.value = res.HOSTNAME;
      RULELISTALL.value = res.RULELISTALL;

      mgtf.value = res.MI ? "✓" : "✗";
      sgtf.value = res.SC ? "✓" : "✗";
      rgtf.value = res.RE ? "✓" : "✗";
      mgn.value = res.HOSTNAMENUM || "";
      sgn.value = res.SCRIPTNUM || "";
      rgn.value = res.REWRITENUM || "";
      showToast("获取成功: V" + res.VERSION + " 耗时:" + (res.ETIMESTAMP - res.TIMESTAMP) + "ms");
    } else {
      geting.value = "00";
      showToast("请更新模块/外部资源");
    }
  } catch (error) {
    geting.value = "000";
    console.error("Error Request failed data:", error);
  }
};
</script>

<style lang="css">
.sglists {
  p {
    line-height: 3px;
  }
}
:root {
  --mono-font: Consolas, Menlo, Monaco, "Andale Mono", "Ubuntu Mono", monospace;

  --accent-bg: #89899c16;
  --text: #23242fc2;

  --code: #d81b60;

  --marked: #ffdd33;
  --disabled: #efefef;
  --preformatted: #444;
  --van-rolling-text-color: #23242fc2;

  --van-rolling-text-item-width: 10px;
  --van-rolling-text-font-size: 16px;
}
.tline {
  color: #191818a1;
}
.title {
  color: #272424d7;
}
.action {
  color: #212223d9;
}
.ebutton.brand {
  background-color: #bdc7e56a;
}
.ebutton.alt {
  background-color: #bdc7e53b;
}
/* .action a:active {
  background-color: #4164d766;
} */
/* .action a:hover {
  background-color: #4164d776;
} */
@media (prefers-color-scheme: dark) {
  /* .action a:active {
    background-color: #4164d7;
  } */
  /* .action a:hover {
    color: #ffffffc5;
    background-color: #4164d7;
  } */
  .ebutton.brand {
    background-color: #4164d7;
  }
  .ebutton.alt {
    background-color: #aab7c91d;
  }
  .action {
    color: #d1d5d9d9;
  }
  .tline {
    color: #f2f0ef9f;
  }
  .title {
    color: #ffffffb3;
  }
  ::backdrop,
  :root {
    --van-rolling-text-color: #e2e3eab8;
    color-scheme: dark;
    --bg: #17171a;
    --accent-bg: #0b0b0c51;
    --text: #e2e3eab8;
    /* --text-light: #ababab; */
    --accent: #8495b0;
    --code: #f06292;
    --preformatted: #97a4b8;
    --disabled: #111;
  }
  img,
  video {
    opacity: 0.8;
  }
}
#STOOL *,
::after,
::before {
  box-sizing: border-box;
}
/* html {
  font-family: var(--sans-font);
  scroll-behavior: smooth;
} */
/* body {
  color: var(--text);
  background-color: var(--bg);
  line-height: 1.5;
  display: grid;
  margin: 0;
} */
aside,
details,
pre,
progress {
  background-color: var(--accent-bg);
  border: 0px solid var(--border);
  border-radius: var(--standard-border-radius);
  margin-bottom: 1rem;
}
code,
kbd,
pre,
pre span,
samp {
  font-family: var(--mono-font);
  font-size: 14px;
  color: var(--code);
}

pre {
  padding: 20px 0 20px 25px;
  /* min-height: 300px; */
  overflow-x: hidden;
  overflow-y: auto;
  white-space: pre-line;
  max-width: 100%;
  color: var(--preformatted);
  border-radius: 18px; /* backdrop-filter:blur(50px);-webkit-backdrop-filter:blur(50px);*/
}
/* pre code {
  color: var(--preformatted);
  background: 0 0;
  margin: 0;
  padding: 0;
}  */
/* \/\*[\s\S\n]+?\*\/ */
.button:focus,
.button:hover {
  filter: brightness(1.4);
  cursor: pointer;
}
blockquote {
  margin-inline-start: 0;
  margin-inline-end: 0;
  margin-block: 0;
}
.kpage.has-image .container {
  text-align: center;
}
.image-src {
  max-width: 144px;
  max-height: 144px;
}
/* .name {
  color: var(--vp-home-hero-name-color);
} */
.name,
.text {
  letter-spacing: -0.4px;
  font-size: 42px;
  font-weight: 700;
  white-space: pre-wrap;
}
.kpage {
  margin-top: 80px;
}
.image-bg {
  position: absolute;
  top: 50%;
  left: 50%;
  border-radius: 50%;
  width: 192px;
  height: 192px;
  background-image: linear-gradient(25deg, #4d9ae06b 50%, #5448e95c 50%);
  filter: blur(56px);
  transform: translate(-50%, -50%);
  z-index: -10;
}
.image-bgs {
  position: absolute;
  left: 60%;
  /* top: 90%; */
  /* bottom: -300px; */
  width: 40%;
  height: 40%;
  background-image: linear-gradient(25deg, #4d99e050 50%, #5348e95a 50%);
  filter: blur(90px);
  transform: translate(-50%, -50%);
  z-index: -10;
}
.titleh {
  background: -webkit-linear-gradient(128deg, #a245ced9, #52c4ead7);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.kpage.has-image .actions {
  justify-content: center;
}
.ebutton.mdi {
  border-radius: 20px;
  padding: 0 20px;
  line-height: 38px;
  font-size: 14px;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  /* margin: -6px; */
  padding: 10px;
}
.ebutton {
  min-width: 121px;
  display: inline-block;
  text-align: center;
  font-weight: 600;
  white-space: nowrap;
}
.action {
  flex-shrink: 0;
  padding: 6px;
}
a {
  color: inherit;
  text-decoration: inherit;
}
.title {
  display: flex;
  align-items: center;
  /* width: 100%; */
  height: 10px;
  font-size: 14px;
  font-weight: 600;
}
.topimg.logo {
  margin-right: 8px;
  height: 20px;
  width: 20px;
}
.toptittle {
  padding-top: 20px;
  padding-left: 20px;
}
body {
  margin: 10;
  max-width: 100%;
}
.sglogoh {
  position: relative;
  margin: 0 auto;
  width: 144px;
  height: 144px;
}
.container {
  display: flex;
  flex-direction: column;
  margin: 0 auto;
  max-width: 1152px;
}
.image {
  margin: 0;
  min-height: 100%;
}
.main {
  max-height: 110vh;
  position: relative;
  z-index: 10;
  order: 2;
  flex-grow: 1;
  flex-shrink: 0;
}
.tline {
  padding-left: 40px;
  padding-right: 40px;
  line-height: 28px;
  font-size: 18px;
  font-weight: 400;
  white-space: pre-line;
}
.sglists {
  order: 2;
  padding: 10px 30px;
  text-align: start;
}
.tƒooters {
  opacity: 0.3;
  text-align: center;
  width: 100%;
  font-size: 12px;
  padding: 20px;
}
.pretit {
  color: var(--text);
  position: relative;
  border-top-left-radius: 14px;
  border-top-right-radius: 14px;
  padding: 10px 0 12px 100px;
  top: 59px;
  backdrop-filter: blur(40px);
  -webkit-backdrop-filter: blur(40px);
  background: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZlcnNpb249IjEuMSIgeD0iMHB4IiB5PSIwcHgiIHdpZHRoPSI0NTBweCIgaGVpZ2h0PSIxMzBweCI+CiAgICA8ZWxsaXBzZSBjeD0iNjUiIGN5PSI2NSIgcng9IjUwIiByeT0iNTIiIHN0cm9rZT0icmdiKDIyMCw2MCw1NCkiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0icmdiKDIzNywxMDgsOTYpIi8+CiAgICA8ZWxsaXBzZSBjeD0iMjI1IiBjeT0iNjUiIHJ4PSI1MCIgcnk9IjUyIiBzdHJva2U9InJnYigyMTgsMTUxLDMzKSIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSJyZ2IoMjQ3LDE5Myw4MSkiLz4KICAgIDxlbGxpcHNlIGN4PSIzODUiIGN5PSI2NSIgcng9IjUwIiByeT0iNTIiIHN0cm9rZT0icmdiKDI3LDE2MSwzNykiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0icmdiKDEwMCwyMDAsODYpIi8+Cjwvc3ZnPgo=");
  background-size: 70px;
  background-repeat: no-repeat;
  background-position: 10px;
}
a {
  text-decoration: none;
}
@media (min-width: 660px) {
  /* gist 弹窗 */
  #isexk > .van-popup--round {
    width: 45% !important;
  }

  .image-bgs {
    left: 80%;
    background-image: linear-gradient(25deg, #4d99e02f 50%, #5348e935 50%);
  }
}
@media (min-width: 960px) {
  .van-popup--round {
    width: 40% !important;
  }
  .main {
    min-height: 800px;
  }
  .kpage {
    margin-top: -70px;
  }
  .sglists {
    padding: 10px 60px;
    min-width: 592px;
    text-align: start;
  }
  .main {
    padding: 40px;
    display: flex;
    max-width: 521px;
    flex-direction: column;
    flex-wrap: wrap;
    justify-content: center;
  }
  .container {
    flex-direction: row;
  }
}
@media (min-width: 1160px) {
  .main {
    min-height: 800px;
  }
  .kpage {
    margin-top: -70px;
  }
  .sglists {
    padding: 10px 20px 10px 70px;
    min-width: 592px;
    max-width: 992px;
    text-align: start;
  }
  .main {
    padding: 40px;
    display: flex;
    max-width: 521px;
    flex-direction: column;
    flex-wrap: wrap;
    justify-content: center;
  }
  .container {
    flex-direction: row;
  }
}
img,
video {
  max-width: 100%;
}
</style>
