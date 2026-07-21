import { REFLECTION_DECK_VERSION } from "./reflection-deck.js";
import { parseTaggedTokens } from "./result-renderer.js";

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function requestCard(card = {}) {
  return {
    id: card.id,
    category: card.category,
    name: card.name,
    label: card.label,
    position: card.position,
    coreMeaning: card.coreMeaning,
    visibleLine: card.visibleLine,
    hiddenLine: card.hiddenLine,
    reflectionQuestions: card.reflectionQuestions,
    actionSeeds: card.actionSeeds,
    prohibitedClaims: card.prohibitedClaims,
    meaningVersion: card.meaningVersion,
  };
}

export function buildReflectionReadingRequest({
  cards,
  question,
  language = "zh",
  entry = "tarot",
  sessionHistory = "",
} = {}) {
  if (!Array.isArray(cards) || cards.length === 0) {
    throw new Error("Reflection card selection missing");
  }

  const selectedCards = cards.slice(0, 3);
  return {
    mode: "reading",
    tier: "basic",
    entry,
    deckVersion: REFLECTION_DECK_VERSION,
    cardName: clean(selectedCards[0].name),
    spreadType: selectedCards.length === 3 ? "reflection_triad" : "single",
    cards: selectedCards.map(requestCard),
    intent: language === "zh" ? "看清" : "clarity",
    question: clean(question),
    round: 1,
    sessionHistory: clean(sessionHistory),
    language,
  };
}

export function parseReflectionReading(rawText) {
  const tokens = parseTaggedTokens(rawText);
  return {
    reflection: clean(tokens.REFLECTION),
    hidden: clean(tokens.HIDDEN),
    verify: clean(tokens.VERIFY),
    action: clean(tokens.ACTION),
  };
}

const DEFAULTS = {
  zh: {
    reflection: "先看见问题中已经确定的事实。",
    hidden: "也许还有一个尚未被验证的假设。",
    verify: "把事实和猜测分开写下。",
    action: "今天完成一个五分钟内能验证的小动作。",
  },
  en: {
    reflection: "First notice the facts that are already established in the question.",
    hidden: "There may also be an assumption that has not yet been verified.",
    verify: "Write down the facts and guesses separately.",
    action: "Complete one small action today that can be verified within five minutes.",
  },
};

export function completeReflectionReading(rawText, cards, language = "zh") {
  const parsed = parseReflectionReading(rawText);
  const primaryCard = Array.isArray(cards) ? cards[0] : null;
  const defaults = language === "zh" ? DEFAULTS.zh : DEFAULTS.en;

  return {
    reflection: parsed.reflection || clean(primaryCard?.visibleLine) || defaults.reflection,
    hidden: parsed.hidden || clean(primaryCard?.hiddenLine) || defaults.hidden,
    verify: parsed.verify || clean(primaryCard?.reflectionQuestions?.[0]) || defaults.verify,
    action: parsed.action || clean(primaryCard?.actionSeeds?.[0]) || defaults.action,
  };
}
