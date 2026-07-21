import assert from "node:assert/strict";

import {
  REFLECTION_CATEGORIES,
  REFLECTION_DECK,
  REFLECTION_DECK_VERSION,
  REFLECTION_MEANING_VERSION,
  cardsForCategory,
  fallbackForCategory,
  reflectionCardForSelection,
  reflectionSpreadPositions,
} from "../assets/app/reflection-deck.js";

assert.equal(REFLECTION_DECK_VERSION, "reflection-v1");
assert.equal(REFLECTION_MEANING_VERSION, "1.0.0");
assert.equal(REFLECTION_DECK.length, 12);
assert.ok(Object.isFrozen(REFLECTION_DECK));

assert.deepEqual(Object.keys(REFLECTION_CATEGORIES), ["state", "relation", "movement"]);
assert.deepEqual(REFLECTION_CATEGORIES, {
  state: {
    zh: "状态象",
    en: "State",
    fallbackSrc: "./assets/cards/reflection-v1/fallback-state.svg",
  },
  relation: {
    zh: "关系象",
    en: "Relation",
    fallbackSrc: "./assets/cards/reflection-v1/fallback-relation.svg",
  },
  movement: {
    zh: "动势象",
    en: "Movement",
    fallbackSrc: "./assets/cards/reflection-v1/fallback-movement.svg",
  },
});

for (const category of Object.values(REFLECTION_CATEGORIES)) {
  assert.ok(Object.isFrozen(category), `${category.en} category should be frozen`);
}
const originalStateFallback = REFLECTION_CATEGORIES.state.fallbackSrc;
assert.throws(() => {
  REFLECTION_CATEGORIES.state.fallbackSrc = "./mutated.svg";
}, TypeError);
assert.equal(REFLECTION_CATEGORIES.state.fallbackSrc, originalStateFallback);

const expectedCards = [
  ["state-empty-chair", "空椅", "Empty Chair", "等待别人先行动，把决定权留在外部"],
  ["state-bottled-rain", "瓶中雨", "Rain in a Bottle", "情绪持续发生，却没有流向可以承接它的地方"],
  ["state-full-cup", "满杯", "Full Cup", "容量接近边界，却仍在继续接收"],
  ["state-fog-window", "雾窗", "Fogged Window", "并非没有答案，而是当前视角无法看清"],
  ["relation-reverse-shadow", "逆影", "Contrary Shadow", "外在方向与内在意愿并不一致"],
  ["relation-one-way-bridge", "单向桥", "One-way Bridge", "有人不断靠近，但关系没有形成真正交汇"],
  ["relation-borrowed-umbrella", "借来的伞", "Borrowed Umbrella", "依靠一种保护，同时接受它附带的条件"],
  ["relation-wrong-key", "错钥", "Wrong Key", "双方都在尝试打开关系，却使用了不同的理解方式"],
  ["movement-unlit-lantern", "未燃灯", "Unlit Lantern", "已经拥有资源或能力，但尚未主动使用"],
  ["movement-loosened-knot", "松结", "Loosened Knot", "改变不一定需要切断，也可以先降低束缚"],
  ["movement-side-door", "侧门", "Side Door", "当前路径不是唯一入口"],
  ["movement-low-tide-steps", "退潮阶", "Low-tide Steps", "暂停推进后，原本被覆盖的下一步才会出现"],
];

assert.deepEqual(
  REFLECTION_DECK.map(({ id, imageNameZh, imageNameEn, coreMeaningZh }) => [
    id,
    imageNameZh,
    imageNameEn,
    coreMeaningZh,
  ]),
  expectedCards,
);

const requiredStrings = [
  "id",
  "category",
  "imageNameZh",
  "imageNameEn",
  "coreMeaningZh",
  "coreMeaningEn",
  "visibleLineZh",
  "visibleLineEn",
  "hiddenLineZh",
  "hiddenLineEn",
  "visualBrief",
  "visualBriefZh",
  "visualBriefEn",
  "imageSrc",
  "imageAltZh",
  "imageAltEn",
  "deckVersion",
  "meaningVersion",
];

const requiredFrozenArrays = [
  "reflectionQuestionsZh",
  "reflectionQuestionsEn",
  "actionSeedsZh",
  "actionSeedsEn",
  "prohibitedClaimsZh",
  "prohibitedClaimsEn",
];

for (const card of REFLECTION_DECK) {
  assert.ok(Object.isFrozen(card), `${card.id} should be frozen`);
  for (const key of requiredStrings) {
    assert.ok(String(card[key] || "").trim(), `${card.id}.${key}`);
  }

  assert.equal(card.deckVersion, REFLECTION_DECK_VERSION, `${card.id}.deckVersion`);
  assert.equal(card.meaningVersion, REFLECTION_MEANING_VERSION, `${card.id}.meaningVersion`);
  assert.equal(card.reflectionQuestionsZh.length, 2, `${card.id}.reflectionQuestionsZh`);
  assert.equal(card.reflectionQuestionsEn.length, 2, `${card.id}.reflectionQuestionsEn`);
  assert.equal(card.actionSeedsZh.length, 2, `${card.id}.actionSeedsZh`);
  assert.equal(card.actionSeedsEn.length, 2, `${card.id}.actionSeedsEn`);
  assert.ok(card.prohibitedClaimsZh.length >= 2, `${card.id}.prohibitedClaimsZh`);
  assert.ok(card.prohibitedClaimsEn.length >= 2, `${card.id}.prohibitedClaimsEn`);
  assert.strictEqual(card.prohibitedClaims, card.prohibitedClaimsZh, `${card.id}.prohibitedClaims compatibility alias`);

  for (const key of requiredFrozenArrays) {
    const originalValues = [...card[key]];
    assert.ok(Object.isFrozen(card[key]), `${card.id}.${key} should be frozen`);
    assert.throws(() => card[key].push("mutation"), TypeError, `${card.id}.${key} should reject push`);
    assert.deepEqual(card[key], originalValues, `${card.id}.${key} should remain unchanged`);
  }

  for (const key of [
    "reflectionQuestionsZh",
    "reflectionQuestionsEn",
    "actionSeedsZh",
    "actionSeedsEn",
    "prohibitedClaimsZh",
    "prohibitedClaimsEn",
  ]) {
    assert.ok(card[key].every((value) => String(value).trim()), `${card.id}.${key} contains no blanks`);
  }

  assert.match(card.hiddenLineZh, /也许|可能/, `${card.id}.hiddenLineZh stays tentative`);
}

const serializedDeck = JSON.stringify(REFLECTION_DECK);
assert.doesNotMatch(
  serializedDeck,
  /算命|玄学|转运|灵签|改运|命中注定|亲爱的|宝贝|正位|逆位|upright|reversed/iu,
  "deck contains prohibited language",
);
assert.doesNotMatch(
  serializedDeck,
  /[\u{1F1E6}-\u{1F1FF}\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u,
  "deck contains emoji",
);

assert.equal(new Set(REFLECTION_DECK.map((card) => card.id)).size, 12);
assert.equal(new Set(REFLECTION_DECK.map((card) => card.imageNameZh)).size, 12);
assert.equal(new Set(REFLECTION_DECK.map((card) => card.coreMeaningZh)).size, 12);

assert.deepEqual(
  cardsForCategory("state").map((card) => card.id),
  ["state-empty-chair", "state-bottled-rain", "state-full-cup", "state-fog-window"],
);
assert.equal(cardsForCategory("relation").length, 4);
assert.equal(cardsForCategory("movement").length, 4);

assert.deepEqual(reflectionSpreadPositions("single", "zh"), [
  { key: "single", category: null, label: "现在最值得看见的是什么" },
]);
assert.deepEqual(reflectionSpreadPositions("single", "en"), [
  { key: "single", category: null, label: "What is most worth noticing now?" },
]);
assert.deepEqual(reflectionSpreadPositions("reflection_triad", "zh"), [
  { key: "state", category: "state", label: "我现在怎样" },
  { key: "relation", category: "relation", label: "什么正在影响我" },
  { key: "movement", category: "movement", label: "可以尝试怎样变化" },
]);
assert.deepEqual(reflectionSpreadPositions("reflection_triad", "en"), [
  { key: "state", category: "state", label: "How am I now?" },
  { key: "relation", category: "relation", label: "What is influencing me?" },
  { key: "movement", category: "movement", label: "What change can I try?" },
]);

assert.equal(
  reflectionCardForSelection({ cardIndex: 5, position: { key: "single" } }).id,
  REFLECTION_DECK[5].id,
);
assert.equal(reflectionCardForSelection({ index: 6 }).id, REFLECTION_DECK[6].id);
assert.equal(
  reflectionCardForSelection({ cardIndex: 5, position: { key: "state", category: "state" } }).id,
  "state-bottled-rain",
);
assert.equal(
  reflectionCardForSelection({ cardIndex: 5, position: { key: "relation", category: "relation" } }).id,
  "relation-one-way-bridge",
);
assert.equal(
  reflectionCardForSelection({ cardIndex: 5, position: { key: "movement", category: "movement" } }).id,
  "movement-loosened-knot",
);
assert.equal(reflectionCardForSelection({ cardIndex: -1 }).id, "movement-low-tide-steps");
assert.equal(
  reflectionCardForSelection({ cardIndex: -1, position: { category: "state" } }).id,
  "state-fog-window",
);

assert.equal(
  fallbackForCategory("relation"),
  "./assets/cards/reflection-v1/fallback-relation.svg",
);
assert.equal(
  fallbackForCategory("unknown"),
  "./assets/cards/reflection-v1/fallback-state.svg",
);

console.log("reflection deck tests passed");
