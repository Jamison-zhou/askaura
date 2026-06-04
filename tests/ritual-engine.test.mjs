import assert from "node:assert/strict";
import {
  TAROT_DECK,
  cardKeywords,
  primaryCardFromRecordCards,
  recordCardFromSelection,
  ritualCardLayout,
  ritualSpreadTypeForMode,
  spreadDisplayName,
  spreadPositions
} from "../assets/app/ritual-engine.js";

const labels = {
  spreadSingle: "Single",
  spreadThree: "Current / Resistance / Next",
  spreadRelationship: "Relationship tension",
  spreadChoice: "Choice A / B",
  spreadPositionCurrent: "Current",
  spreadPositionResistance: "Resistance",
  spreadPositionNext: "Next",
  spreadPositionSelf: "Self",
  spreadPositionOther: "Other",
  spreadPositionTension: "Tension",
  spreadPositionChoiceA: "Choice A",
  spreadPositionChoiceB: "Choice B",
  spreadPositionReminder: "Reminder"
};

assert.equal(TAROT_DECK.length, 22);
assert.ok(TAROT_DECK.every((card) => card.length === 3 && card.every(Boolean)));
assert.deepEqual(TAROT_DECK[0], ["The Fool", "愚者", "00-the-fool.jpg"]);

assert.deepEqual(spreadPositions("three_current_resistance_next", labels), [
  { key: "current", label: "Current" },
  { key: "resistance", label: "Resistance" },
  { key: "next", label: "Next" }
]);
assert.deepEqual(spreadPositions("missing", labels), [{ key: "single", label: "Single" }]);
assert.equal(spreadDisplayName("relationship_tension", labels), "Relationship tension");
assert.equal(spreadDisplayName("missing", labels), "Single");

assert.equal(ritualSpreadTypeForMode("tarot", "relationship_tension"), "relationship_tension");
assert.equal(ritualSpreadTypeForMode("dual", "relationship_tension"), "single");
assert.equal(ritualSpreadTypeForMode("meihua", "relationship_tension"), "single");

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

const selected = recordCardFromSelection({
  card: TAROT_DECK[2],
  position: { key: "current", label: "Current" }
}, {
  language: "en",
  singleLabel: "Single",
  random: () => 0.25
});
assert.deepEqual(selected, {
  name: "The High Priestess",
  label: "Current",
  position: "current",
  orientation: "reversed",
  imageSrc: "./assets/cards/02-the-high-priestess.jpg",
  imageAlt: "The High Priestess"
});

const zhSelected = recordCardFromSelection({
  card: TAROT_DECK[2]
}, {
  language: "zh",
  singleLabel: "单牌",
  random: () => 0.75
});
assert.equal(zhSelected.label, "单牌");
assert.equal(zhSelected.position, "single");
assert.equal(zhSelected.orientation, "upright");
assert.equal(zhSelected.imageAlt, "女祭司");

assert.equal(primaryCardFromRecordCards([selected, zhSelected]), selected);
assert.equal(primaryCardFromRecordCards([]), null);
assert.deepEqual(cardKeywords("女祭司", { language: "zh" }), ["直觉", "沉静", "未说出", "观察"]);
assert.deepEqual(cardKeywords("The High Priestess", { language: "en" }), ["Intuition", "Quiet", "Unspoken", "Observe"]);
assert.deepEqual(cardKeywords("", { language: "en" }), ["Observe", "Confirm", "Narrow", "Act"]);

console.log("ritual engine tests passed");
