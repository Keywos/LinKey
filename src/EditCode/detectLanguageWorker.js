// detectLanguageWorker.js
// 在独立线程中执行语言自动检测，避免 json5/yaml 动态 import 阻塞主线程。
// 主线程发送 { id, code }，worker 返回 { id, language }。

const SAMPLE_LIMIT = 4200;

// ── helper ──
const toSample = (code) => {
  const trimmed = (code || "").trim();
  if (trimmed.length <= SAMPLE_LIMIT) return trimmed;
  const sample = trimmed.slice(0, SAMPLE_LIMIT);
  const lastLineBreak = sample.lastIndexOf("\n");
  return lastLineBreak > SAMPLE_LIMIT * 0.6
    ? sample.slice(0, lastLineBreak).trimEnd()
    : sample;
};

const getSignificantLines = (text) =>
  text
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .filter((line) => !/^\s*[#!;]/.test(line));

const hasJsonContainerShape = (text) =>
  /^[\[{]/.test(text) && /[\]}]$/.test(text);

const getYamlSignalScore = (text) =>
  getSignificantLines(text).reduce((score, line) => {
    const trimmed = line.trim();
    let lineScore = 0;
    if (/^---(?:\s|$)/.test(trimmed)) lineScore += 2;
    if (/^\s*-\s+\S/.test(line)) lineScore += 2;
    if (/^\s{2,}\S.*:\s*(?:\S|$)/.test(line)) lineScore += 2;
    if (/^\s*(?:"[^"]+"|'[^']+'|[\w.-][\w .-]*)\s*:\s*(?:\S|$)/.test(line)) lineScore += 1;
    if (/(?:^|\s)<<:\s*\*\w/.test(line) || /[&*][A-Za-z0-9_-]+/.test(line)) lineScore += 2;
    if (/:\s*[\[{]/.test(line)) lineScore += 1;
    return score + Math.min(lineScore, 3);
  }, 0);

const hasYamlIndicators = (text) => getYamlSignalScore(text) > 0;
const hasStrongYamlShape = (text) => getYamlSignalScore(text) >= 3;

const isPlainRecord = (value) =>
  Object.prototype.toString.call(value) === "[object Object]";

const isStructuredValue = (value) =>
  Array.isArray(value) || isPlainRecord(value);

// ── dynamic loaders ──
const loadJson5 = async () => {
  const module = await import("json5");
  return module.parse ? module : module.default ?? module;
};

const loadYaml = async () => import("yaml");

// ── checkers ──
const isValidJson = (text) => {
  if (!text || !hasJsonContainerShape(text)) return false;
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
};

const isLikelyJson5 = async (text) => {
  if (!text || !hasJsonContainerShape(text)) return false;
  try {
    const JSON5 = await loadJson5();
    JSON5.parse(text);
    return true;
  } catch {
    return false;
  }
};

const getJavaScriptSignalScore = (text) => {
  let score = 0;
  if (/^\s*(?:async\s+)?function\s+[$A-Z_a-z][$\w]*\s*\(/m.test(text)) score += 4;
  if (/^\s*(?:const|let|var)\s+(?:[$A-Z_a-z][$\w]*|[{\[])/m.test(text)) score += 3;
  if (/^\s*(?:import|export)\s+/m.test(text)) score += 3;
  if (/(?:^|[^\w])=>/.test(text)) score += 3;
  if (/\$(?:server|options)\b/.test(text)) score += 3;
  if (/^\s*return(?:\s+|;|$)/m.test(text)) score += 2;
  if (/^\s*(?:if|for|while|switch)\s*\(/m.test(text)) score += 2;
  if (/^\s*(?:try|catch|finally)\b/m.test(text)) score += 2;
  if (/\bconsole\.[A-Za-z_$][\w$]*\s*\(/.test(text)) score += 2;
  if (/^\s*[$A-Z_a-z][$\w.[\]'"]*\s*=\s*.+/m.test(text)) score += 2;
  return score;
};

const isLikelyJavaScript = (text) => {
  if (!text) return false;
  return getJavaScriptSignalScore(text) >= 3;
};

const isLikelyYaml = async (text) => {
  if (!text || !hasYamlIndicators(text)) return false;
  try {
    const YAML = await loadYaml();
    const document = YAML.parseDocument(text, { prettyErrors: false });
    if (document.errors.length) return hasStrongYamlShape(text);
    return isStructuredValue(document.toJS());
  } catch {
    return hasStrongYamlShape(text);
  }
};

const isLikelyIni = (text) => {
  if (!text || /^\{/.test(text)) return false;
  const rawLines = getSignificantLines(text);
  const hasYamlOnlySyntax = rawLines.some(
    (line) =>
      /^\s+\S/.test(line) ||
      /^\s*-\s+\S/.test(line) ||
      /(?:^|\s)<<:\s*\*\w/.test(line) ||
      /[&*][A-Za-z0-9_-]+/.test(line) ||
      /:\s*[\[{]/.test(line),
  );
  if (hasYamlOnlySyntax) return false;
  const lines = rawLines.map((line) => line.trim());
  if (!lines.length) return false;
  const hasSection = lines.some((line) => /^\[[^\]]+\]$/.test(line));
  const equalKeyValueCount = lines.filter((line) => /^[A-Za-z0-9_.-]+\s*=\s*.+$/.test(line)).length;
  const colonKeyValueCount = lines.filter((line) => /^[A-Za-z0-9_.-]+\s*:\s*.+$/.test(line)).length;
  return hasSection ? equalKeyValueCount + colonKeyValueCount > 0 : equalKeyValueCount >= 2;
};

// ── main detection ──
const detect = async (code) => {
  const sample = toSample(code);
  if (!sample) return "plaintext";
  if (isValidJson(sample)) return "json";
  if (await isLikelyJson5(sample)) return "json5";
  if (isLikelyJavaScript(sample)) return "javascript";
  if (await isLikelyYaml(sample)) return "yaml";
  if (isLikelyIni(sample)) return "ini";
  return "plaintext";
};

// ── message handler ──
self.onmessage = async (e) => {
  const { id, code } = e.data || {};
  if (typeof id !== "number") return;
  try {
    const language = await detect(code || "");
    self.postMessage({ id, language });
  } catch (err) {
    self.postMessage({ id, language: "plaintext", error: err.message || String(err) });
  }
};
