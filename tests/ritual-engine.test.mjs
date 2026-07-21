import assert from "node:assert/strict";

import {
  REFLECTION_DECK,
  reflectionCardForSelection,
} from "../assets/app/reflection-deck.js";
import * as ritualEngine from "../assets/app/ritual-engine.js";

const {
  SPREAD_TYPES,
  primaryCardFromRecordCards,
  recordCardFromSelection,
  ritualCardLayout,
  ritualSpreadTypeForMode,
  spreadDisplayName,
  spreadPositions,
} = ritualEngine;

assert.deepEqual(SPREAD_TYPES, ["single", "reflection_triad"]);
assert.equal("TAROT_DECK" in ritualEngine, false);
assert.equal("cardKeywords" in ritualEngine, false);

assert.deepEqual(spreadPositions("single", {}, "zh"), [
  { key: "single", category: null, label: "现在最值得看见的是什么" },
]);
assert.deepEqual(spreadPositions("single", {}, "en"), [
  { key: "single", category: null, label: "What is most worth noticing now?" },
]);
assert.deepEqual(spreadPositions("reflection_triad", { relation: "关系如何作用" }, "zh"), [
  { key: "state", category: "state", label: "我现在怎样" },
  { key: "relation", category: "relation", label: "关系如何作用" },
  { key: "movement", category: "movement", label: "可以尝试怎样变化" },
]);
assert.deepEqual(spreadPositions("missing", { single: "此刻观察" }, "zh"), [
  { key: "single", category: null, label: "此刻观察" },
]);

assert.equal(spreadDisplayName("reflection_triad", {}, "zh"), "状态 / 关系 / 动势");
assert.equal(spreadDisplayName("reflection_triad", {}, "en"), "State / Relation / Movement");
assert.equal(spreadDisplayName("single", {}, "zh"), "单牌");
assert.equal(spreadDisplayName("single", {}, "en"), "Single card");
assert.equal(
  spreadDisplayName("reflection_triad", { reflectionTriad: "三面观察" }, "zh"),
  "三面观察",
);
assert.equal(spreadDisplayName("missing", { single: "One card" }, "en"), "One card");

assert.equal(ritualSpreadTypeForMode("tarot", "reflection_triad"), "reflection_triad");
assert.equal(ritualSpreadTypeForMode("tarot"), "single");
assert.equal(ritualSpreadTypeForMode("dual", "reflection_triad"), "single");
assert.equal(ritualSpreadTypeForMode("meihua", "reflection_triad"), "single");

const firstLayout = ritualCardLayout(0, 22);
const middleLayout = ritualCardLayout(10.5, 22);
const lastLayout = ritualCardLayout(21, 22);
assert.equal(firstLayout.cardIndex, 0);
assert.equal(firstLayout.cardX, "-672px");
assert.equal(firstLayout.cardAngle, "-40.00deg");
assert.equal(firstLayout.cardOpacity, "0.860");
assert.equal(middleLayout.cardX, "0px");
assert.equal(middleLayout.cardScale, "1.000");
assert.equal(lastLayout.cardX, "672px");
assert.equal(lastLayout.cardAngle, "40.00deg");
assert.deepEqual(ritualCardLayout(0), ritualCardLayout(0, REFLECTION_DECK.length));

const zhSelection = {
  cardIndex: 5,
  position: { key: "state", category: "state", label: "我的状态" },
};
const zhCard = reflectionCardForSelection(zhSelection);
assert.equal(zhCard.id, "state-bottled-rain");
const zhRecord = recordCardFromSelection(zhSelection);
assert.deepEqual(zhRecord, {
  id: zhCard.id,
  name: zhCard.imageNameZh,
  imageNameZh: zhCard.imageNameZh,
  imageNameEn: zhCard.imageNameEn,
  category: zhCard.category,
  coreMeaning: zhCard.coreMeaningZh,
  visibleLine: zhCard.visibleLineZh,
  hiddenLine: zhCard.hiddenLineZh,
  reflectionQuestions: zhCard.reflectionQuestionsZh,
  actionSeeds: zhCard.actionSeedsZh,
  prohibitedClaims: zhCard.prohibitedClaimsZh,
  label: "我的状态",
  position: "state",
  imageSrc: zhCard.imageSrc,
  imageFallbackSrc: "./assets/cards/reflection-v1/fallback-state.svg",
  imageAlt: zhCard.imageAltZh,
  deckVersion: zhCard.deckVersion,
  meaningVersion: zhCard.meaningVersion,
});
assert.equal("orientation" in zhRecord, false);

const enSelection = {
  index: 5,
  position: { key: "relation", category: "relation", label: "Relation" },
};
const enCard = reflectionCardForSelection(enSelection);
assert.equal(enCard.id, "relation-one-way-bridge");
const enRecord = recordCardFromSelection(enSelection, { language: "en", singleLabel: "Single card" });
assert.deepEqual(enRecord, {
  id: enCard.id,
  name: enCard.imageNameEn,
  imageNameZh: enCard.imageNameZh,
  imageNameEn: enCard.imageNameEn,
  category: enCard.category,
  coreMeaning: enCard.coreMeaningEn,
  visibleLine: enCard.visibleLineEn,
  hiddenLine: enCard.hiddenLineEn,
  reflectionQuestions: enCard.reflectionQuestionsEn,
  actionSeeds: enCard.actionSeedsEn,
  prohibitedClaims: enCard.prohibitedClaimsEn,
  label: "Relation",
  position: "relation",
  imageSrc: enCard.imageSrc,
  imageFallbackSrc: "./assets/cards/reflection-v1/fallback-relation.svg",
  imageAlt: enCard.imageAltEn,
  deckVersion: enCard.deckVersion,
  meaningVersion: enCard.meaningVersion,
});
assert.strictEqual(enRecord.prohibitedClaims, enCard.prohibitedClaimsEn);
assert.notStrictEqual(enRecord.prohibitedClaims, enCard.prohibitedClaimsZh);
assert.equal("orientation" in enRecord, false);

const singleRecord = recordCardFromSelection({ cardIndex: 0 });
assert.equal(singleRecord.label, "单牌");
assert.equal(singleRecord.position, "single");
assert.equal(singleRecord.imageFallbackSrc, "./assets/cards/reflection-v1/fallback-state.svg");

assert.equal(primaryCardFromRecordCards([zhRecord, enRecord]), zhRecord);
assert.equal(primaryCardFromRecordCards([]), null);
assert.equal(primaryCardFromRecordCards(null), null);
assert.equal(primaryCardFromRecordCards({ 0: zhRecord, length: 1 }), null);

console.log("ritual engine tests passed");
