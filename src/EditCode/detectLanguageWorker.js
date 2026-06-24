// detectLanguageWorker.js
const SAMPLE_LIMIT = 4200;

// ── helpers ──
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
  text.split(/\r?\n/).filter((line) => line.trim() && !/^\s*[#!;]/.test(line));

// ── Markdown 检测 ──
const getMarkdownSignalScore = (text) => {
  let score = 0;
  const trimmed = text.trim();

  if (/^#{1,6}\s/.test(trimmed)) score += 6;
  if (/^\s*[-*+]\s/.test(trimmed)) score += 4;
  if (/^\s*\d+\.\s/.test(trimmed)) score += 3;
  if (/^\s*```/m.test(trimmed)) score += 8;
  if (/\[.*?\]\(.*?\)/.test(trimmed)) score += 4;
  if (/^>\s/.test(trimmed)) score += 4;
  if (/^\|.*\|.*\|/m.test(trimmed)) score += 6;
  if (/\*\*.*?\*\*|__.*?__/.test(trimmed)) score += 3;
  if (/^---+\s*$|^===+\s*$/m.test(trimmed)) score += 3;
  if (/^!\[.*?\]\(.*?\)/m.test(trimmed)) score += 3;

  return score;
};

const isLikelyMarkdown = (text) => getMarkdownSignalScore(text) >= 6;

// ── JavaScript 检测 ──
const getJavaScriptSignalScore = (text) => {
  let score = 0;
  if (/^\s*(?:async\s+)?function\s+[$A-Z_a-z][$\w]*\s*\(/m.test(text)) score += 5;
  if (/^\s*(?:export|import)\s+/m.test(text)) score += 5;
  if (/^\s*(?:const|let|var)\s+[$A-Z_a-z][$\w]*\s*=/m.test(text)) score += 4;
  if (/(?:^|\s|\(|\[|\{)(?:async\s+)?\w+\s*=>\s*/m.test(text)) score += 4;
  if (/^\s*(?:if|for|while|switch|try|catch)\b/m.test(text)) score += 2;
  if (/\bconsole\.[A-Za-z]/.test(text)) score += 2;
  if (/^\s*return(?:\s|;|$)/m.test(text)) score += 2;

  if (getMarkdownSignalScore(text) >= 6) {
    score = Math.max(0, score - 12);
  }
  return score;
};

const isLikelyJavaScript = (text) => getJavaScriptSignalScore(text) >= 4;

// ── JSON / Json5 ──
const hasJsonContainerShape = (text) => /^[\[{]/.test(text) && /[\]}]$/.test(text);

const isValidJson = (text) => {
  if (!text || !hasJsonContainerShape(text)) return false;
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
};

const loadJson5 = async () => {
  const module = await import("json5");
  return module.parse ? module : (module.default ?? module);
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

// ── YAML ──
const loadYaml = async () => import("yaml");

const getYamlSignalScore = (text) => {
  return getSignificantLines(text).reduce((score, line) => {
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
};

const isLikelyYaml = async (text) => {
  if (!text || !getYamlSignalScore(text)) return false;
  try {
    const YAML = await loadYaml();
    const document = YAML.parseDocument(text, { prettyErrors: false });
    if (document.errors?.length) return getYamlSignalScore(text) >= 3;
    return true;
  } catch {
    return getYamlSignalScore(text) >= 3;
  }
};

// ── INI ──
const isLikelyIni = (text) => {
  if (!text || /^\{/.test(text)) return false;
  const rawLines = getSignificantLines(text);
  const hasYamlOnlySyntax = rawLines.some((line) =>
    /^\s+\S/.test(line) || /^\s*-\s+\S/.test(line) ||
    /(?:^|\s)<<:\s*\*\w/.test(line) || /[&*][A-Za-z0-9_-]+/.test(line) ||
    /:\s*[\[{]/.test(line)
  );
  if (hasYamlOnlySyntax) return false;

  const lines = rawLines.map((line) => line.trim());
  if (!lines.length) return false;

  const hasSection = lines.some((line) => /^\[[^\]]+\]$/.test(line));
  const equalKeyValueCount = lines.filter((line) => /^[A-Za-z0-9_.-]+\s*=\s*.+$/.test(line)).length;
  const colonKeyValueCount = lines.filter((line) => /^[A-Za-z0-9_.-]+\s*:\s*.+$/.test(line)).length;

  return hasSection 
    ? equalKeyValueCount + colonKeyValueCount > 0 
    : equalKeyValueCount >= 2;
};

// ── 主检测 ──
const detect = async (code, filename = "") => {
  const sample = toSample(code);
  if (!sample) return "plaintext";

  const lowerFile = filename.toLowerCase();

  // 文件名优先
  if (/\.(md|markdown)$/i.test(lowerFile)) return "markdown";
  if (/\.(js|jsx)$/i.test(lowerFile)) return "javascript";
  if (/\.(ts|tsx)$/i.test(lowerFile)) return "javascript";
  if (/\.json$/i.test(lowerFile)) return "json";
  if (/\.(yaml|yml)$/i.test(lowerFile)) return "yaml";

  // Markdown 强检测
  if (isLikelyMarkdown(sample)) return "markdown";

  // 结构化数据
  if (isValidJson(sample)) return "json";
  if (await isLikelyJson5(sample)) return "json5";

  // 编程语言
  if (isLikelyJavaScript(sample)) return "javascript";
  if (await isLikelyYaml(sample)) return "yaml";
  if (isLikelyIni(sample)) return "ini";

  return "plaintext";
};

// ── Worker 入口 ──
self.onmessage = async (e) => {
  const { id, code, filename = "" } = e.data || {};
  if (typeof id !== "number") return;

  try {
    const language = await detect(code || "", filename);
    self.postMessage({ id, language });
  } catch (err) {
    console.error("[LanguageWorker] Error:", err);
    self.postMessage({ id, language: "plaintext", error: err.message });
  }
};