import { cleanResultText, cleanTaggedOutputText } from "./result-renderer.js";

export function cleanFollowupText(value, fallback = "") {
  return cleanResultText(value, fallback);
}

export function followupQuestionText(kind, customText = "", labels = {}) {
  const custom = cleanFollowupText(customText, "");
  if (custom) return custom;
  const questions = {
    push: labels.push,
    avoid: labels.avoid,
    blocker: labels.blocker,
    review: labels.review
  };
  return questions[kind] || labels.fallback || "";
}

export function followupResultSummary(context = {}) {
  return [
    context.summary,
    context.tarotText,
    context.guaText,
    context.dualText,
    context.actionText,
    context.doText,
    context.dontText,
    context.watchText
  ].map((item) => cleanTaggedOutputText(item, "", { joinWith: "\n" })).filter(Boolean).join("\n");
}

export function createFollowupEntry({
  question,
  answer,
  sourceResultId,
  now = () => new Date().toISOString(),
  idFactory = () => globalThis.crypto?.randomUUID?.() || `askaura-followup-${Date.now()}`
} = {}) {
  const createdAt = now();
  return {
    id: idFactory(),
    question,
    answer,
    sourceResultId,
    createdAt
  };
}

export function appendFollowupToRecord(record, followup) {
  if (!record) return null;
  return {
    ...record,
    followups: [...(Array.isArray(record.followups) ? record.followups : []), followup],
    updatedAt: followup.createdAt
  };
}

export function formatStoredFollowups(record) {
  const followups = Array.isArray(record?.followups) ? record.followups : [];
  return followups
    .map((item) => [
      cleanFollowupText(item.question, ""),
      cleanTaggedOutputText(item.answer, "", { joinWith: "\n" }),
    ].filter(Boolean).join("\n"))
    .filter(Boolean)
    .join("\n\n");
}

export function createClarificationContext({
  lastRecord,
  lastQuestion,
  fallbackQuestion,
  previousCard,
  resultSummary
} = {}) {
  return {
    sourceResultId: lastRecord?.id || "",
    originalQuestion: cleanFollowupText(lastQuestion, fallbackQuestion),
    previousCard: cleanFollowupText(previousCard, ""),
    resultSummary: cleanFollowupText(resultSummary, "")
  };
}

export function clarificationLinkText(context, { language = "zh" } = {}) {
  if (!context) return "";
  const card = cleanFollowupText(context.previousCard, "");
  const question = cleanFollowupText(context.originalQuestion, "");
  return language === "zh"
    ? `这是一张澄清牌，回应上一轮${card ? `「${card}」` : "结果"}：${question}`
    : `This is a clarification card for the previous ${card ? `"${card}" result` : "result"}: ${question}`;
}

export function clarificationHistoryText(context) {
  if (!context) return "";
  return [
    `Clarification of result id: ${context.sourceResultId || ""}`,
    `Previous card: ${context.previousCard || ""}`,
    `Original question: ${context.originalQuestion || ""}`,
    `Previous result summary: ${context.resultSummary || ""}`,
  ].filter(Boolean).join("\n");
}

export function clarificationPromptText({ lastQuestion, fallbackQuestion, language = "zh" } = {}) {
  const question = cleanFollowupText(lastQuestion, fallbackQuestion);
  return language === "zh"
    ? `围绕这次结果，抽一张澄清牌：${question}`
    : `Draw a clarification card for this result: ${question}`;
}
