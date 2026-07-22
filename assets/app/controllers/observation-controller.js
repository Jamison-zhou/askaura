import { routeQuestionSafety } from "../safety-router.js";

export function prepareObservation(question) {
  const normalized = text(question);
  const safety = routeQuestionSafety(normalized);
  if (safety.route === "support") return { status: "support", reason: safety.reason };
  if (safety.route === "professional-boundary") {
    return { status: "professional-boundary", reason: safety.reason };
  }
  return { status: "ready", question: normalized };
}

export function buildDualReadingRequest({ question, cards, guaName, language = "zh", intent = "看清" }) {
  return {
    mode: "dual-reading",
    tier: "basic",
    entry: "dual",
    question: text(question),
    cards: Array.isArray(cards) ? cards : [],
    guaName: text(guaName),
    intent: text(intent) || (language === "zh" ? "看清" : "clarity"),
    language,
  };
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}
