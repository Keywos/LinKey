import { defineStore } from "pinia";

export const useCmStore = defineStore({
  id: "CmStore",
  state: () => ({
    CmCode: "",
    currentFileName: "", // 当前文件名（含后缀），用于 auto 模式下按后缀识别语言
    activeLanguage: "plaintext", // 编辑器当前实际生效的语言，用于导出时决定文件后缀
  }),
  actions: {
    setCmCode(i) {
      this.CmCode = i.toString();
    },
    setCurrentFileName(name) {
      this.currentFileName = name || "";
    },
    setActiveLanguage(lang) {
      this.activeLanguage = lang || "plaintext";
    },
  },
});