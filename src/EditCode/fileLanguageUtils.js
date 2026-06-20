// fileLanguageUtils.js
// 语言识别完全以内容检测（detectEditorLanguage）为准，文件名后缀不参与语言判断，
// 而是反过来：语言检测结果变化后，自动改写文件名后缀，让后缀始终"跟随"实际语言展示。
//
// 这里维护一张 语言 -> 后缀 的表，同时服务两个场景：
// 1. renameFileExtension：检测到新语言后，改写当前文件名的后缀
// 2. getExportExtensionByLanguage：导出文件时，按当前语言决定下载文件的后缀
// 两个场景用的是同一份映射，因此合并成一张表维护，避免出现不一致。

const LANGUAGE_TO_EXT = {
  javascript: "js",
  json: "js", // 按需求：json 内容仍按 json 语法高亮，但文件后缀 / 导出后缀统一用 .js
  json5: "js", // json5 同上
  yaml: "yaml",
  ini: "ini",
};

/**
 * 根据当前识别出的编辑器语言，得到对应的文件后缀（不含点号）。
 * 未匹配到的语言（plaintext / 未知语言等）统一返回 "txt"
 * @param {string} language
 * @returns {string} 不带点的后缀，例如 "js" / "yaml" / "ini" / "txt"
 */
export function getExportExtensionByLanguage(language) {
  return LANGUAGE_TO_EXT[language] || "txt";
}

/**
 * 根据"内容检测出的新语言"，改写文件名的后缀，让文件名始终展示与实际语言匹配的扩展名。
 *
 * 规则：语言对应到固定后缀（见 LANGUAGE_TO_EXT），plaintext / 未识别语言一律强制改写为 .txt，
 * 不保留原后缀——只要 applyLanguage 被调用，说明语言判定已经完成，文件名应如实反映这个结果。
 *
 * @param {string} fileName 当前文件名（可能带后缀也可能不带）
 * @param {string} language 内容检测出的语言
 * @returns {string} 改写后缀后的文件名
 */
export function renameFileExtension(fileName, language) {
  const name = fileName || "";
  const dotIndex = name.lastIndexOf(".");
  const base = dotIndex > 0 ? name.slice(0, dotIndex) : name;

  if (!base) return name; // 没有文件名可改写（极端兜底，理论上不会发生）

  const ext = getExportExtensionByLanguage(language);
  return `${base}.${ext}`;
}