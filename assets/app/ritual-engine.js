import {
  REFLECTION_DECK,
  fallbackForCategory,
  reflectionCardForSelection,
  reflectionSpreadPositions,
} from "./reflection-deck.js";

export const SPREAD_TYPES = ["single", "reflection_triad"];

export function spreadPositions(type = "single", labels = {}, language = "zh") {
  return reflectionSpreadPositions(type, language).map((position) => ({
    ...position,
    label: labels[position.key] ?? position.label,
  }));
}

export function spreadDisplayName(type = "single", labels = {}, language = "zh") {
  if (type === "reflection_triad") {
    return labels.reflectionTriad ?? (language === "zh" ? "状态 / 关系 / 动势" : "State / Relation / Movement");
  }
  return labels.single ?? (language === "zh" ? "单牌" : "Single card");
}

export function ritualSpreadTypeForMode(mode, selectedSpreadType = "single") {
  return mode === "tarot" ? selectedSpreadType : "single";
}

export function ritualCardLayout(index, deckLength = REFLECTION_DECK.length) {
  const center = (deckLength - 1) / 2;
  const offset = index - center;
  const normalized = offset / center;
  const arcX = Math.round(offset * 64);
  const arcY = Math.round(Math.abs(normalized) * 106 - 46);
  const arcAngle = normalized * 40;
  const arcDepth = Math.round((1 - Math.abs(normalized)) * 84);
  const arcScale = Math.max(0.92, 1 - Math.abs(normalized) * 0.06);
  const arcOpacity = Math.max(0.76, 1 - Math.abs(normalized) * 0.14);
  const pullDistance = 30;
  const selectDistance = 74;
  const pullAngle = arcAngle * Math.PI / 180;
  const pullX = Math.round(Math.sin(pullAngle) * pullDistance);
  const pullY = Math.round(-Math.cos(pullAngle) * pullDistance);
  const selectX = Math.round(Math.sin(pullAngle) * selectDistance * 0.46);
  const selectY = Math.round(-196 + Math.abs(normalized) * 24);
  const layerBase = Math.abs(normalized) < 0.34 ? 160 : Math.abs(normalized) < 0.72 ? 112 : 74;
  const layerOffset = Math.round((1 - Math.abs(normalized)) * 26);

  return {
    cardIndex: index,
    cardMid: offset.toFixed(2),
    cardX: `${arcX}px`,
    cardY: `${arcY}px`,
    cardAngle: `${arcAngle.toFixed(2)}deg`,
    cardDepth: `${arcDepth}px`,
    cardScale: arcScale.toFixed(3),
    cardOpacity: arcOpacity.toFixed(3),
    cardPullX: `${pullX}px`,
    cardPullY: `${pullY}px`,
    cardSelectX: `${selectX}px`,
    cardSelectY: `${selectY}px`,
    shuffleX: `${((index % 7) - 3) * 8}px`,
    shuffleY: `${((index % 5) - 2) * 3}px`,
    cutX: `${index < center ? -54 + index * 1.5 : 54 - (index - center) * 1.5}px`,
    cutY: `${index < center ? -7 : 8}px`,
    spreadZ: layerBase + layerOffset,
    delay: `${index * 16}ms`,
  };
}

export function recordCardFromSelection(selection, {
  language = "zh",
  singleLabel = "单牌",
} = {}) {
  const card = reflectionCardForSelection({
    cardIndex: selection.cardIndex ?? selection.index,
    position: selection.position,
  });
  const isZh = language === "zh";

  return {
    id: card.id,
    name: isZh ? card.imageNameZh : card.imageNameEn,
    imageNameZh: card.imageNameZh,
    imageNameEn: card.imageNameEn,
    category: card.category,
    coreMeaning: isZh ? card.coreMeaningZh : card.coreMeaningEn,
    visibleLine: isZh ? card.visibleLineZh : card.visibleLineEn,
    hiddenLine: isZh ? card.hiddenLineZh : card.hiddenLineEn,
    reflectionQuestions: isZh ? card.reflectionQuestionsZh : card.reflectionQuestionsEn,
    actionSeeds: isZh ? card.actionSeedsZh : card.actionSeedsEn,
    prohibitedClaims: isZh ? card.prohibitedClaimsZh : card.prohibitedClaimsEn,
    label: selection.position?.label || singleLabel,
    position: selection.position?.key || "single",
    imageSrc: card.imageSrc,
    imageFallbackSrc: fallbackForCategory(card.category),
    imageAlt: isZh ? card.imageAltZh : card.imageAltEn,
    deckVersion: card.deckVersion,
    meaningVersion: card.meaningVersion,
  };
}

export function primaryCardFromRecordCards(cards = []) {
  return Array.isArray(cards) && cards.length ? cards[0] : null;
}
