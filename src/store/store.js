import { defineStore } from "pinia";

export const useStore = defineStore({
  id: "scroll",
  state: () => ({
    scrollPositions: {},
    count: localStorage.getItem("count") || "",
    iscount: true,
  }),
  actions: {
    setScrollPosition(position) {
      this.scrollPositions = { ...this.scrollPositions, ...position };
    },
    setCount(i) {
      localStorage.setItem("count", i);
      this.count = i;
    },
    setIsCount() {
      this.iscount = false;
    },
  },
});
