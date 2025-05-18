import { defineStore } from "pinia";

export const useGistStore = defineStore({
  id: "GistStore",
  state: () => ({
    tname: "",
    getGistRes: [],
    getGistResPreview: "",
    GistFN: "",
    GistEdit: "",
    geid: "",
    gidesc: "",
  }),
  actions: {
    setGisto(tn) {
      this.tname = tn;
    },
    setGistRes(res) {
      this.getGistRes = res;
    },
    delGistResptch(id, name) {
      console.log("开始删除 PATCH");
      this.getGistRes.forEach((i) => {
        if (i.id == id) {
          if (i.files[name]) {
            console.log("开始删除 PATCH", id, name);
            delete i.files[name];
            i.filesNames = i.filesNames.filter((i) => i != name);
          }
        }
      });
      console.log(this.getGistRes);
    },
    delGistResPost(_id) {
      console.log("开始删除 POST");
      this.getGistRes = this.getGistRes.filter((i) => i.id != _id);
    },
    addGistRespatch(id, name, newobj) {
      this.getGistRes.forEach((i) => {
        if (i.id == id) {
          i.files[name] = newobj;
          i.filesNames.unshift(name);
          console.log("添加资源 PATCH", name, newobj);
        }
      });
    },
    addGistResposh(newRes) {
      console.log("添加资源 POSH");
      this.getGistRes.unshift(newRes);
    },
    setGistResPreview(res, tn) {
      this.getGistResPreview = res;
      this.tname = tn;
    },
    setGistEdit(name, res, i, d, tn) {
      this.GistFN = name;
      this.GistEdit = res;
      this.geid = i;
      this.gidesc = d;
      this.tname = tn;
    },
    setGistnewid(i, d, tn) {
      this.geid = i;
      this.gidesc = d;
      this.tname = tn;
    },
  },
});
