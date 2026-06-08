const TAG_LINE_REGEX = /^\s*\[([A-Z0-9_]+)\]\s*(.*)$/;

function normalizeResultText(value, fallback = "", { collapseWhitespace = true } = {}) {
  const source = String(value ?? "").replace(/\r\n/g, "\n").trim();
  const text = collapseWhitespace
    ? source.replace(/\s+/g, " ").trim()
    : source.split("\n").map((line) => line.trim()).filter(Boolean).join("\n");
  if (!text || text === "undefined" || text === "null" || text === "NaN") return fallback;
  return text;
}

export function cleanResultText(value, fallback = "") {
  return normalizeResultText(value, fallback);
}

export function parseTaggedTokens(text) {
  const out = {};
  const lines = String(text || "").replace(/\r\n/g, "\n").split("\n");
  let current = null;
  for (const line of lines) {
    const match = line.match(TAG_LINE_REGEX);
    if (match) {
      current = match[1];
      out[current] = match[2] ? match[2].trim() : "";
    } else if (current) {
      out[current] = [out[current], line].filter(Boolean).join("\n").trim();
    }
  }
  return out;
}

export function cleanTaggedOutputText(
  value,
  fallback = "",
  { preferredOrder = [], joinWith = "\n" } = {},
) {
  const source = String(value ?? "").replace(/\r\n/g, "\n").trim();
  const tokens = parseTaggedTokens(source);
  const names = Object.keys(tokens);
  if (names.length) {
    const seen = new Set();
    const ordered = [...preferredOrder, ...names].filter((name) => {
      if (!name || seen.has(name)) return false;
      seen.add(name);
      return true;
    });
    const parts = ordered
      .map((name) => normalizeResultText(tokens[name], "", { collapseWhitespace: joinWith !== "\n" }))
      .filter(Boolean);
    return normalizeResultText(parts.join(joinWith), fallback, { collapseWhitespace: joinWith !== "\n" });
  }
  return normalizeResultText(
    source.replace(/^\s*\[[A-Z0-9_]+\]\s*/gm, ""),
    fallback,
    { collapseWhitespace: joinWith !== "\n" },
  );
}

export function meihuaReportFromText(text) {
  const tokens = parseTaggedTokens(text);
  return {
    signal: cleanTaggedOutputText(tokens.GUA_SIGNAL, ""),
    trend: cleanTaggedOutputText(tokens.GUA_TREND, ""),
    action: cleanTaggedOutputText(tokens.ACTION, ""),
  };
}

export function buildActionAdvice(actionText, { language = "zh" } = {}) {
  const action = cleanResultText(actionText, "");
  return {
    doText: action || (language === "zh"
      ? "用三句话写下已知事实、你的猜测、今天能做的一个小动作。"
      : "Write three lines: known facts, your guess, and one small action for today."),
    dontText: language === "zh"
      ? "先不要发长消息、追问承诺，或在情绪最满的时候要求对方立刻表态。"
      : "Do not send a long message, ask for a promise, or demand an immediate answer while emotion is high.",
    watchText: language === "zh"
      ? "接下来三天只观察两件事：对方是否给出更清楚的信息，以及你自己的消耗有没有下降。"
      : "For three days, watch two things: whether clearer information appears, and whether your own friction goes down."
  };
}

export function describeGua(gua, { language = "zh" } = {}) {
  if (!gua) return "";
  const name = cleanResultText(language === "zh" ? gua.name : gua.en, "");
  const image = cleanResultText(gua.image, "");
  const essence = cleanResultText(gua.essence, "");
  if (!name) return "";
  return language === "zh"
    ? [name, [image, essence].filter(Boolean).join("，")].filter(Boolean).join("：") + "。"
    : [name, [image, essence].filter(Boolean).join(", ")].filter(Boolean).join(": ") + ".";
}

export function actionFromRecord(record) {
  const meihua = meihuaReportFromText(record?.answer || "");
  if (meihua.action) return meihua.action;
  const tokens = parseTaggedTokens(record?.answer || "");
  return cleanTaggedOutputText(record?.action || tokens.ACTION || record?.answer, "");
}

export function reportFromRecord(record, { language = "zh" } = {}) {
  if (record?.report) return { ...record.report, sourceMode: record.mode };
  const meihua = meihuaReportFromText(record?.answer || "");
  if (record?.mode === "meihua" && (meihua.signal || meihua.trend || meihua.action)) {
    return {
      summary: meihua.trend || meihua.signal || meihua.action,
      tarotText: meihua.signal,
      guaText: meihua.trend,
      dualText: "",
      actionText: meihua.action,
      sourceMode: record.mode,
    };
  }
  const reading = record?.reading || parseTaggedTokens(record?.answer || "");
  const coreText = cleanTaggedOutputText(reading.coreQuestion || reading.CORE_QUESTION, "");
  const tensionText = cleanTaggedOutputText(reading.tension || reading.TENSION, "");
  const tarotText = [coreText, tensionText].filter(Boolean).join("\n");
  const summary = cleanResultText(
    reading.judgment || reading.JUDGMENT || record?.action || record?.answer,
    ""
  );
  const guaText = record?.gua ? describeGua(record.gua, { language }) : "";
  const dualText = record?.mode === "dual" && (tarotText || guaText)
    ? (language === "zh"
      ? "牌象和卦象共同提醒你：先把情绪信号与推进节奏分开看，再决定下一步。"
      : "Card and gua signals suggest separating emotion from timing before choosing the next step.")
    : "";
  if (!summary && !tarotText && !guaText && !dualText) return null;
  return {
    summary,
    tarotText,
    guaText,
    dualText,
    actionText: actionFromRecord(record),
    sourceMode: record?.mode
  };
}
