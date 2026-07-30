import ts from "@/img/svg/ts.svg";
import success from "@/img/svg/success.svg";
import carry from "@/img/svg/carry.svg";
import cny from "@/img/svg/cny.svg";
import sf from "@/img/svg/sf.svg";
import safa from "@/img/svg/safa.svg";
import hgithub from "@/img/svg/hgithub.svg";
import w from "@/img/svg/w.svg";

export const HOME_CARDS_KEY = "HomePageCards";
const ita = "itms-appss://itunes.apple.com/WebObjects/MZStore.woa/wa/resetAndRedirect?dsf=143441&mt=8&url=/WebObjects/MZStore.woa/wa/viewSoftware?mt=8&id=1108187390&cc=";
const itc = "&urlDesc=";

export const defaultHomeCards = [
  { id: "极简搜索", img: safa, r: "/s" },
  { id: "URL 工具箱", img: sf, r: "/codeurl" },
  { id: "Ping", img: carry, r: "/ping" },
  { id: "性能测试", img: safa, r: "/netms" },
  { id: "时间戳转换", img: ts, r: "/timestamp" },
  { id: "代码编辑器", img: w, r: "/EditCode" },
  { id: "极简代码编辑器", img: w, r: "/j" },
  { id: "Base64 转换", img: cny, r: "/base64" },
  { id: "Troubleshoot", img: safa, r: "/st" },
  { id: "Gist File", img: hgithub, r: "/gist" },
  { id: "Unicode ", img: sf, r: "/unicode" },
  { id: "Punycode 编解码", img: w, r: "/punycode" },
  { id: "Count", img: cny, r: "/count" },
  { id: "SONY", img: success, r: "/key" },
  { id: "切换 CN", img: "🇨🇳", r: `${ita}cn${itc}` },
  { id: "切换 US", img: "🇺🇸", r: `${ita}us${itc}` },
  { id: "切换 JP", img: "🇯🇵", r: `${ita}jp${itc}` },
  { id: "切换 KR", img: "🇰🇷", r: `${ita}kr${itc}` },
  { id: "切换 TR", img: "🇹🇷", r: `${ita}tr${itc}` },
  { id: "切换 TW", img: "🇨🇳", r: `${ita}tw${itc}` },
];

export function getHomeCards() {
  let cards;
  try {
    const savedCards = JSON.parse(localStorage.getItem(HOME_CARDS_KEY));
    if (Array.isArray(savedCards)) {
      cards = savedCards.map((card) => ({ ...card, enabled: card.enabled !== false }));
    }
  } catch {}
  if (!cards) cards = defaultHomeCards.map((card) => ({ ...card, enabled: true }));

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
