// 编辑器默认配置与本地存储工具
export const CM_SETTINGS_KEYS = {
  HIGHLIGHT_THRESHOLD: "cm_threshold_highlight", // 小于设定值启用高亮 (MB)
  LINEWRAP_THRESHOLD: "cm_threshold_linewrap", // 小于设定值启用换行 (MB)
  FOLD_INDENT_THRESHOLD: "cm_threshold_fold_indent", // 小于设定值启用折叠槽/缩进标记 (MB)
  ENABLE_HYPERLINK: "cm_enable_hyperlink", // 启用链接装饰
  ENABLE_AUTOCOMPLETE: "cm_enable_autocomplete", // 启用自动补全
  ENABLE_BRACKET_MATCHING: "cm_enable_bracket_matching", // 启用括号匹配
  ENABLE_CLOSE_BRACKETS: "cm_enable_close_brackets", // 启用自动闭合
};

export const CM_SETTINGS_DEFAULTS = {
  [CM_SETTINGS_KEYS.HIGHLIGHT_THRESHOLD]: 3, 
  [CM_SETTINGS_KEYS.LINEWRAP_THRESHOLD]: 3, 
  [CM_SETTINGS_KEYS.FOLD_INDENT_THRESHOLD]: 3, 
  [CM_SETTINGS_KEYS.ENABLE_HYPERLINK]: false,
  [CM_SETTINGS_KEYS.ENABLE_AUTOCOMPLETE]: true,
  [CM_SETTINGS_KEYS.ENABLE_BRACKET_MATCHING]: true,
  [CM_SETTINGS_KEYS.ENABLE_CLOSE_BRACKETS]: true,
};

export const CM_SETTINGS_EVENT = "cm-settings-change";

/** 读取所有编辑器设置 */
export function getCmSettings() {
  const getItem = (key, def) => {
    const val = localStorage.getItem(key);
    if (val === null || val === undefined || val === "") return def;
    return val;
  };

  const getNum = (key, def) => {
    const v = parseFloat(getItem(key, def));
    return isNaN(v) || v <= 0 ? def : v;
  };

  const getBool = (key, def) => {
    const v = getItem(key, def);
    if (typeof v === "boolean") return v;
    return v === "true" || v === true;
  };

  return {
    highlightThreshold: getNum(CM_SETTINGS_KEYS.HIGHLIGHT_THRESHOLD, CM_SETTINGS_DEFAULTS[CM_SETTINGS_KEYS.HIGHLIGHT_THRESHOLD]),
    linewrapThreshold: getNum(CM_SETTINGS_KEYS.LINEWRAP_THRESHOLD, CM_SETTINGS_DEFAULTS[CM_SETTINGS_KEYS.LINEWRAP_THRESHOLD]),
    foldIndentThreshold: getNum(CM_SETTINGS_KEYS.FOLD_INDENT_THRESHOLD, CM_SETTINGS_DEFAULTS[CM_SETTINGS_KEYS.FOLD_INDENT_THRESHOLD]),
    enableHyperlink: getBool(CM_SETTINGS_KEYS.ENABLE_HYPERLINK, CM_SETTINGS_DEFAULTS[CM_SETTINGS_KEYS.ENABLE_HYPERLINK]),
    enableAutocomplete: getBool(CM_SETTINGS_KEYS.ENABLE_AUTOCOMPLETE, CM_SETTINGS_DEFAULTS[CM_SETTINGS_KEYS.ENABLE_AUTOCOMPLETE]),
    enableBracketMatching: getBool(CM_SETTINGS_KEYS.ENABLE_BRACKET_MATCHING, CM_SETTINGS_DEFAULTS[CM_SETTINGS_KEYS.ENABLE_BRACKET_MATCHING]),
    enableCloseBrackets: getBool(CM_SETTINGS_KEYS.ENABLE_CLOSE_BRACKETS, CM_SETTINGS_DEFAULTS[CM_SETTINGS_KEYS.ENABLE_CLOSE_BRACKETS]),
  };
}

/** 保存单个设置并分发事件 */
export function setCmSetting(key, value) {
  localStorage.setItem(key, String(value));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(CM_SETTINGS_EVENT, { detail: { key, value } }));
  }
}
