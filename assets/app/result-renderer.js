export function cleanResultText(value, fallback = "") {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!text || text === "undefined" || text === "null" || text === "NaN") return fallback;
  return text;
}

export function parseTaggedTokens(text) {
  const out = {};
  const lines = String(text || "").replace(/\r\n/g, "\n").split("\n");
  let current = null;
  for (const line of lines) {
    const match = line.match(/^\s*\[([A-Z0-9_]+)\]\s*(.*)$/);
    if (match) {
      current = match[1];
      out[current] = match[2] ? match[2].trim() : "";
    } else if (current) {
      out[current] = [out[current], line].filter(Boolean).join("\n").trim();
    }
  }
  return out;
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
  const tokens = parseTaggedTokens(record?.answer || "");
  return cleanResultText(record?.action || tokens.ACTION || record?.answer, "");
}

export function reportFromRecord(record, { language = "zh" } = {}) {
  if (record?.report) return { ...record.report, sourceMode: record.mode };
  const reading = record?.reading || parseTaggedTokens(record?.answer || "");
  const tarotText = cleanResultText(reading.tension || reading.TENSION || reading.coreQuestion || reading.CORE_QUESTION, "");
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
