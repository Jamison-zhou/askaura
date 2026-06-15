const TAG_LINE_REGEX = /^\s*\[([A-Z0-9_]+)\]\s*(.*)$/;
const FOOD_QUESTION_REGEX = /(吃什么|吃啥|晚饭|晚餐|午饭|午餐|早饭|早餐|夜宵|外卖|点什么|做什么菜|喝什么|餐|菜|饭|汤|面|粥|食物|food|eat|dinner|lunch|breakfast|meal|takeout)/i;
const RELATIONSHIP_CONTEXT_REGEX = /(对方|关系|恋|喜欢|男友|女友|伴侣|前任|暧昧|分手|复合|表白|承诺|表态|回复|消息|联系|沟通|追问|partner|relationship|romance|reply|message|promise|commitment)/i;

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

function questionTopic(questionText) {
  const question = cleanResultText(questionText, "");
  if (FOOD_QUESTION_REGEX.test(question)) return "food";
  return "";
}

function relationshipGuidanceLeaks(text, questionText) {
  if (!text || RELATIONSHIP_CONTEXT_REGEX.test(cleanResultText(questionText, ""))) return false;
  return RELATIONSHIP_CONTEXT_REGEX.test(text);
}

function contextualFallback(slot, topic, language) {
  if (topic === "food") {
    if (language === "zh") {
      return {
        doText: "在三分钟内选一个热乎、有蛋白、不会太撑的餐食。",
        dontText: "先不要反复刷菜单，也别一次点太多。",
        watchText: "吃第一口时，观察身体是放松还是更腻。"
      }[slot] || "";
    }
    return {
      doText: "Pick one warm, filling meal with some protein within three minutes.",
      dontText: "Do not keep scrolling menus or order too many options at once.",
      watchText: "Notice whether the first bite feels settling or too heavy."
    }[slot] || "";
  }
  return "";
}

function contextualGuidanceText(text, { slot, language, questionText }) {
  const cleaned = cleanResultText(text, "");
  const topic = questionTopic(questionText);
  if (!topic) return cleaned;
  if (!cleaned || relationshipGuidanceLeaks(cleaned, questionText)) {
    return contextualFallback(slot, topic, language);
  }
  return cleaned;
}

export function hasContextualActionAdvice(questionText) {
  return Boolean(questionTopic(questionText));
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
    avoid: cleanTaggedOutputText(tokens.AVOID, ""),
    watch: cleanTaggedOutputText(tokens.WATCH, ""),
  };
}

export function buildActionAdvice(actionText, { language = "zh", dontText = "", watchText = "", questionText = "" } = {}) {
  const action = contextualGuidanceText(actionText, { slot: "doText", language, questionText });
  const avoid = contextualGuidanceText(dontText, { slot: "dontText", language, questionText });
  const watch = contextualGuidanceText(watchText, { slot: "watchText", language, questionText });
  return {
    doText: action || (language === "zh"
      ? "用三句话写下已知事实、你的猜测、今天能做的一个小动作。"
      : "Write three lines: known facts, your guess, and one small action for today."),
    dontText: avoid || (language === "zh"
      ? "先不要把这个问题扩大成必须马上解决的大决定，也不要在情绪最满的时候加码。"
      : "Do not turn this into a bigger decision that must be solved immediately, or escalate while emotion is high."),
    watchText: watch || (language === "zh"
      ? "接下来只观察两件事：这一步做完后有没有更轻松，以及新的信息有没有变清楚。"
      : "Next, watch two things: whether this step makes things feel lighter, and whether the next signal becomes clearer.")
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
  const questionText = cleanResultText(record?.question, "");
  if (record?.report) {
    const tokens = parseTaggedTokens(record?.answer || "");
    const dontText = record.report.dontText || cleanTaggedOutputText(tokens.AVOID, "");
    const watchText = record.report.watchText || cleanTaggedOutputText(tokens.WATCH, "");
    const report = {
      ...record.report,
      sourceMode: record.mode
    };
    if (questionText) report.questionText = questionText;
    if (dontText) report.dontText = dontText;
    if (watchText) report.watchText = watchText;
    return report;
  }
  const meihua = meihuaReportFromText(record?.answer || "");
  if (record?.mode === "meihua" && (meihua.signal || meihua.trend || meihua.action)) {
    return {
      summary: meihua.trend || meihua.signal || meihua.action,
      tarotText: meihua.signal,
      guaText: meihua.trend,
      dualText: "",
      actionText: meihua.action,
      dontText: meihua.avoid,
      watchText: meihua.watch,
      ...(questionText ? { questionText } : {}),
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
  const dontText = cleanTaggedOutputText(reading.avoid || reading.AVOID || record?.report?.dontText, "");
  const watchText = cleanTaggedOutputText(reading.watch || reading.WATCH || record?.report?.watchText, "");
  const guaText = record?.gua ? describeGua(record.gua, { language }) : "";
  const dualText = record?.mode === "dual" && (summary || tarotText)
    ? [summary, tarotText].filter(Boolean).join("\n")
    : "";
  if (!summary && !tarotText && !guaText && !dualText) return null;
  return {
    summary,
    tarotText,
    guaText,
    dualText,
    actionText: actionFromRecord(record),
    dontText,
    watchText,
    ...(questionText ? { questionText } : {}),
    sourceMode: record?.mode
  };
}
