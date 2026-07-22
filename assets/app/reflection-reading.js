import { REFLECTION_DECK_VERSION } from "./reflection-deck.js";
import { parseTaggedTokens } from "./result-renderer.js";

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeLanguage(language) {
  return /^en(?:-|$)/i.test(clean(language)) ? "en" : "zh";
}

function isValidCard(card) {
  return Boolean(card && typeof card === "object" && !Array.isArray(card) && clean(card.name));
}

function requestCard(card = {}, position = card.position) {
  return {
    id: card.id,
    category: card.category,
    name: card.name,
    label: card.label,
    position,
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

  const selectedCards = Array.from(cards.slice(0, 3));
  if (selectedCards.some((card) => !isValidCard(card))) {
    throw new Error("Reflection card selection missing");
  }
  if (selectedCards.length === 2) {
    throw new Error("Reflection spread requires one or three cards");
  }

  const normalizedLanguage = normalizeLanguage(language);
  const positions = selectedCards.length === 3
    ? ["state", "relation", "movement"]
    : ["single"];
  return {
    mode: "reading",
    tier: "basic",
    entry,
    deckVersion: REFLECTION_DECK_VERSION,
    cardName: clean(selectedCards[0].name),
    spreadType: selectedCards.length === 3 ? "reflection_triad" : "single",
    cards: selectedCards.map((card, index) => requestCard(card, positions[index])),
    intent: normalizedLanguage === "zh" ? "看清" : "clarity",
    question: clean(question),
    round: 1,
    sessionHistory: clean(sessionHistory),
    language: normalizedLanguage,
  };
}

export function parseReflectionReading(rawText) {
  const normalizedText = String(rawText ?? "").replace(
    /\[(REFLECTION|HIDDEN|VERIFY|ACTION)\]/gi,
    (_, tag) => `\n[${tag.toUpperCase()}] `,
  );
  const tokens = parseTaggedTokens(normalizedText);
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

function cardFallback(card, field, language, { list = false } = {}) {
  const localizedField = `${field}${language === "zh" ? "Zh" : "En"}`;
  const localizedValue = list ? card?.[localizedField]?.[0] : card?.[localizedField];
  if (clean(localizedValue)) return clean(localizedValue);
  if (language !== "zh") return "";
  const genericValue = list ? card?.[field]?.[0] : card?.[field];
  return clean(genericValue);
}

export function completeReflectionReading(rawText, cards, language = "zh") {
  const parsed = parseReflectionReading(rawText);
  const primaryCard = Array.isArray(cards) ? cards[0] : null;
  const normalizedLanguage = normalizeLanguage(language);
  const defaults = DEFAULTS[normalizedLanguage];

  return {
    reflection: parsed.reflection
      || cardFallback(primaryCard, "visibleLine", normalizedLanguage)
      || defaults.reflection,
    hidden: parsed.hidden
      || cardFallback(primaryCard, "hiddenLine", normalizedLanguage)
      || defaults.hidden,
    verify: parsed.verify
      || cardFallback(primaryCard, "reflectionQuestions", normalizedLanguage, { list: true })
      || defaults.verify,
    action: parsed.action
      || cardFallback(primaryCard, "actionSeeds", normalizedLanguage, { list: true })
      || defaults.action,
  };
}
