import ts from "@/img/svg/ts.svg";
import success from "@/img/svg/success.svg";
import carry from "@/img/svg/carry.svg";
import cny from "@/img/svg/cny.svg";
import sf from "@/img/svg/sf.svg";
import safa from "@/img/svg/safa.svg";
import hgithub from "@/img/svg/hgithub.svg";
import w from "@/img/svg/w.svg";

export const HOME_CARDS_KEY = "HomePageCards";

export const defaultHomeCards = [
  { id: "极简搜索", img: safa, r: "/s" },
  { id: "URL 工具箱", img: sf, r: "/codeurl" },
  { id: "Ping", img: carry, r: "/ping" },
  { id: "性能测试", img: safa, r: "/netms" },
  { id: "时间戳转换", img: ts, r: "/timestamp" },
  { id: "代码编辑器", img: w, r: "/EditCode" },
  { id: "Code Hub", img: w, r: "/j" },
  { id: "Base64", img: cny, r: "/base64" },
  { id: "Troubleshoot", img: safa, r: "/st" },
  { id: "Gist File", img: hgithub, r: "/gist" },
  { id: "Unicode ", img: sf, r: "/unicode" },
  { id: "Punycode", img: w, r: "/punycode" },
  { id: "Speedtest", img: carry, r: "/sp" },
  { id: "Count", img: cny, r: "/count" },
  { id: "SONY", img: success, r: "/key" },
  { id: "切换 CN", img: "🇨🇳", r: "https://itunes.apple.com/WebObjects/MZStore.woa/wa/resetAndRedirect?dsf=143465&mt=8&url=/WebObjects/MZStore.woa/wa/viewSoftware?mt=8&id=1108187390&cc=cn&urlDesc=" },
  { id: "切换 US", img: "🇺🇸", r: "https://itunes.apple.com/WebObjects/MZStore.woa/wa/resetAndRedirect?dsf=143441&mt=8&url=/WebObjects/MZStore.woa/wa/viewSoftware?mt=8&id=1108187390&cc=us&urlDesc=" },
  { id: "切换 JP", img: "🇯🇵", r: "https://itunes.apple.com/WebObjects/MZStore.woa/wa/resetAndRedirect?dsf=143462&mt=8&url=/WebObjects/MZStore.woa/wa/viewSoftware?mt=8&id=1108187390&cc=jp&urlDesc=" },
  { id: "切换 KR", img: "🇰🇷", r: "https://itunes.apple.com/WebObjects/MZStore.woa/wa/resetAndRedirect?dsf=143466&mt=8&url=/WebObjects/MZStore.woa/wa/viewSoftware?mt=8&id=1108187390&cc=kr&urlDesc=" },
  { id: "切换 TW", img: "🇨🇳", r: "https://itunes.apple.com/WebObjects/MZStore.woa/wa/resetAndRedirect?dsf=143470&mt=8&url=/WebObjects/MZStore.woa/wa/viewSoftware?mt=8&id=1108187390&cc=tw&urlDesc=" },
  { id: "切换 TR", img: "🇹🇷", r: "https://itunes.apple.com/WebObjects/MZStore.woa/wa/resetAndRedirect?dsf=143480&mt=8&url=/WebObjects/MZStore.woa/wa/viewSoftware?mt=8&id=1108187390&cc=tr&urlDesc=" },
];

export function getHomeCards() {
  // 读取保存的卡片数据
  const savedMap = new Map();
  const savedCards = [];
  try {
    const parsed = JSON.parse(localStorage.getItem(HOME_CARDS_KEY));
    if (Array.isArray(parsed)) {
      savedCards.push(...parsed);
      for (const card of parsed) {
        savedMap.set(card.id, card);
      }
    }
  } catch {}

  // 以 defaultHomeCards 为基准，从缓存继承 enabled 状态
  const cards = defaultHomeCards.map((defaultCard) => {
    const saved = savedMap.get(defaultCard.id);
    return {
      ...defaultCard,
      enabled: saved ? saved.enabled !== false : true,
    };
  });

  // 添加自定义卡片（不在 defaultHomeCards 中的）
  for (const saved of savedCards) {
    const isDefault = defaultHomeCards.some((dc) => dc.id === saved.id && dc.r === saved.r);
    if (!isDefault) {
      cards.push({ ...saved });
    }
  }

  // 应用排序
  try {
    const sort = JSON.parse(localStorage.getItem("HomePageSort"));
    if (sort && typeof sort === "object") {
      cards.sort((first, second) => (sort[first.id] ?? Number.MAX_SAFE_INTEGER) - (sort[second.id] ?? Number.MAX_SAFE_INTEGER));
    }
  } catch {}
  return cards;
}

export function saveHomeCards(cards) {
  localStorage.setItem(HOME_CARDS_KEY, JSON.stringify(cards));
  window.dispatchEvent(new Event("home-cards-change"));
}
