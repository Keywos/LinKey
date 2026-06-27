// formatWorker.js
// 在独立线程中处理 js-beautify (格式化) 和 terser (压缩)，
// 避免在主线程中加载大库导致卡顿。

self.addEventListener("message", async (e) => {
  const { type, payload } = e.data;

  try {
    if (type === "beautify") {
      const { code, lang, options } = payload;
      const beautify = await import("js-beautify");
      let beautifyFn;
      if (lang === "css") {
        beautifyFn = beautify.css_beautify;
      } else if (lang === "html" || lang === "xml" || lang === "svg") {
        beautifyFn = beautify.html_beautify;
      } else {
        beautifyFn = beautify.js_beautify;
      }
      let result = beautifyFn(code, options || { indent_size: 2 });
      result = result.replace(/\n{3,}/g, "\n\n");
      self.postMessage({ type: "result", id: payload.id, result });
    } else if (type === "compress") {
      const { code, options } = payload;
      const { minify } = await import("terser");
      const result = await minify(code, options);
      self.postMessage({ type: "result", id: payload.id, result });
    }
  } catch (err) {
    self.postMessage({ type: "error", id: payload.id, error: err.message || String(err) });
  }
});
