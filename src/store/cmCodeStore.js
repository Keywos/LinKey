import { defineStore } from "pinia";

export const useCmStore = defineStore({
  id: "CmStore",
  state: () => ({
    CmCode: "",
  }),
  actions: {
    setCmCode(i) {
      this.CmCode = i.toString(); 
    },
  },
});
