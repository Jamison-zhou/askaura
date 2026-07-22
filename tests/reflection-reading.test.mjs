import assert from "node:assert/strict";

import {
  REFLECTION_DECK,
  REFLECTION_DECK_VERSION,
} from "../assets/app/reflection-deck.js";
import {
  buildReflectionReadingRequest,
  completeReflectionReading,
  parseReflectionReading,
} from "../assets/app/reflection-reading.js";

const card = (overrides = {}) => ({
  id: "state-fog-window",
  category: "state",
  name: "雾窗",
  label: "我现在怎样",
  position: "state",
  coreMeaning: "当前视角还看不清",
  visibleLine: " 已经确定的\n事实 ",
  hiddenLine: "也许还有一个 未验证的假设",
  reflectionQuestions: [" 哪个事实能改变判断？ ", "还有什么需要确认？"],
  actionSeeds: [" 把事实和猜测 分开写下。 ", "补一个信息"],
  prohibitedClaims: ["答案一定会出现"],
  meaningVersion: "1.0.0",
  orientation: "reversed",
  ...overrides,
});

const singleRequest = buildReflectionReadingRequest({
  cards: [card()],
  question: "  我该\n 怎么判断？ ",
  sessionHistory: " 上一轮   内容 ",
});
assert.deepEqual(singleRequest, {
  mode: "reading",
  tier: "basic",
  entry: "tarot",
  deckVersion: REFLECTION_DECK_VERSION,
  cardName: "雾窗",
  spreadType: "single",
  cards: [{
    id: "state-fog-window",
    category: "state",
    name: "雾窗",
    label: "我现在怎样",
    position: "single",
    coreMeaning: "当前视角还看不清",
    visibleLine: " 已经确定的\n事实 ",
    hiddenLine: "也许还有一个 未验证的假设",
    reflectionQuestions: [" 哪个事实能改变判断？ ", "还有什么需要确认？"],
    actionSeeds: [" 把事实和猜测 分开写下。 ", "补一个信息"],
    prohibitedClaims: ["答案一定会出现"],
    meaningVersion: "1.0.0",
  }],
  intent: "看清",
  question: "我该 怎么判断？",
  round: 1,
  sessionHistory: "上一轮 内容",
  language: "zh",
});

const triadRequest = buildReflectionReadingRequest({
  cards: [
    card({ id: "one", name: " One " }),
    card({ id: "two", name: "Two" }),
    card({ id: "three", name: "Three" }),
    card({ id: "four", name: "Four" }),
  ],
  question: 42,
  language: "en",
  entry: "dual",
  sessionHistory: null,
});
assert.equal(triadRequest.cards.length, 3);
assert.deepEqual(triadRequest.cards.map(({ id }) => id), ["one", "two", "three"]);
assert.deepEqual(triadRequest.cards.map(({ position }) => position), ["state", "relation", "movement"]);
assert.equal(triadRequest.spreadType, "reflection_triad");
assert.equal(triadRequest.cardName, "One");
assert.equal(triadRequest.intent, "clarity");
assert.equal(triadRequest.question, "42");
assert.equal(triadRequest.sessionHistory, "");
assert.equal(triadRequest.entry, "dual");
assert.equal(triadRequest.cards[0].meaningVersion, "1.0.0");

function assertNoOrientation(value) {
  if (!value || typeof value !== "object") return;
  assert.equal(Object.prototype.hasOwnProperty.call(value, "orientation"), false);
  for (const child of Object.values(value)) assertNoOrientation(child);
}
assertNoOrientation(singleRequest);
assertNoOrientation(triadRequest);
assert.doesNotMatch(JSON.stringify(triadRequest), /orientation/);

assert.throws(
  () => buildReflectionReadingRequest({ cards: [], question: "test" }),
  new Error("Reflection card selection missing"),
);
assert.throws(
  () => buildReflectionReadingRequest({ cards: null, question: "test" }),
  new Error("Reflection card selection missing"),
);
assert.throws(
  () => buildReflectionReadingRequest({ cards: [card(), card()], question: "test" }),
  new Error("Reflection spread requires one or three cards"),
);
assert.throws(
  () => buildReflectionReadingRequest({ cards: [null], question: "test" }),
  new Error("Reflection card selection missing"),
);
assert.throws(
  () => buildReflectionReadingRequest({ cards: new Array(1), question: "test" }),
  new Error("Reflection card selection missing"),
);
assert.throws(
  () => buildReflectionReadingRequest({ cards: [{}], question: "test" }),
  new Error("Reflection card selection missing"),
);
assert.throws(
  () => buildReflectionReadingRequest({ cards: ["not-a-card"], question: "test" }),
  new Error("Reflection card selection missing"),
);

const zhCnRequest = buildReflectionReadingRequest({
  cards: [card()],
  question: "test",
  language: "zh-CN",
});
assert.equal(zhCnRequest.language, "zh");
assert.equal(zhCnRequest.intent, "看清");

const emptyLanguageRequest = buildReflectionReadingRequest({
  cards: [card()],
  question: "test",
  language: "",
});
assert.equal(emptyLanguageRequest.language, "zh");
assert.equal(emptyLanguageRequest.intent, "看清");

const regionalEnglishRequest = buildReflectionReadingRequest({
  cards: [card()],
  question: "test",
  language: "en-US",
});
assert.equal(regionalEnglishRequest.language, "en");
assert.equal(regionalEnglishRequest.intent, "clarity");

assert.deepEqual(
  parseReflectionReading(`
    [REFLECTION]  What is already clear
      from the facts?
    [HIDDEN]  One untested   assumption
    [VERIFY]
      Separate facts from guesses.
    [ACTION]  Check one detail   today.
  `),
  {
    reflection: "What is already clear from the facts?",
    hidden: "One untested assumption",
    verify: "Separate facts from guesses.",
    action: "Check one detail today.",
  },
);
assert.deepEqual(parseReflectionReading("[REFLECTION] 只保留 已知事实"), {
  reflection: "只保留 已知事实",
  hidden: "",
  verify: "",
  action: "",
});

const inlineLowercase = parseReflectionReading(
  "[reflection] First fact [hidden] Untested idea [verify] Check the source [action] Ask one question",
);
assert.deepEqual(inlineLowercase, {
  reflection: "First fact",
  hidden: "Untested idea",
  verify: "Check the source",
  action: "Ask one question",
});
assert.doesNotMatch(Object.values(inlineLowercase).join(" "), /\[(reflection|hidden|verify|action)\]/i);

const cardCompleted = completeReflectionReading(
  "[REFLECTION] AI 已写的观察\n[ACTION] AI 已写的动作",
  [card()],
);
assert.deepEqual(cardCompleted, {
  reflection: "AI 已写的观察",
  hidden: "也许还有一个 未验证的假设",
  verify: "哪个事实能改变判断？",
  action: "AI 已写的动作",
});

const preserved = completeReflectionReading(
  "[REFLECTION] Keep reflection.\n[HIDDEN] Keep hidden.\n[VERIFY] Keep verify.\n[ACTION] Keep action.",
  [card()],
  "en",
);
assert.deepEqual(preserved, {
  reflection: "Keep reflection.",
  hidden: "Keep hidden.",
  verify: "Keep verify.",
  action: "Keep action.",
});

const zhDefault = completeReflectionReading("", [], "zh");
assert.deepEqual(zhDefault, {
  reflection: "先看见问题中已经确定的事实。",
  hidden: "也许还有一个尚未被验证的假设。",
  verify: "把事实和猜测分开写下。",
  action: "今天完成一个五分钟内能验证的小动作。",
});
assert.ok(Object.values(zhDefault).every(Boolean));

const enDefault = completeReflectionReading("", null, "en");
assert.deepEqual(enDefault, {
  reflection: "First notice the facts that are already established in the question.",
  hidden: "There may also be an assumption that has not yet been verified.",
  verify: "Write down the facts and guesses separately.",
  action: "Complete one small action today that can be verified within five minutes.",
});
assert.ok(Object.values(enDefault).every(Boolean));
assert.match(enDefault.action, /today|five minutes/i);
assert.doesNotMatch(
  [...Object.values(zhDefault), ...Object.values(enDefault)].join(" "),
  /算命|玄学|转运|灵签|改运|命中注定|will definitely|guaranteed|destiny/i,
);

const zhLocalizedCard = completeReflectionReading("", [{
  ...card(),
  visibleLineZh: "明确的中文观察",
  hiddenLineZh: "明确的中文假设",
  reflectionQuestionsZh: ["明确的中文核验"],
  actionSeedsZh: ["明确的中文动作"],
}], "zh-CN");
assert.deepEqual(zhLocalizedCard, {
  reflection: "明确的中文观察",
  hidden: "明确的中文假设",
  verify: "明确的中文核验",
  action: "明确的中文动作",
});

assert.deepEqual(completeReflectionReading("", null, ""), zhDefault);

const enFromGenericZhCard = completeReflectionReading(
  "[REFLECTION] Keep this AI observation.",
  [card()],
  "en-US",
);
assert.deepEqual(enFromGenericZhCard, {
  reflection: "Keep this AI observation.",
  hidden: enDefault.hidden,
  verify: enDefault.verify,
  action: enDefault.action,
});
assert.doesNotMatch(Object.values(enFromGenericZhCard).join(" "), /[\u3400-\u9fff]/);

for (const deckCard of REFLECTION_DECK) {
  const deckCardEnglish = completeReflectionReading("", [deckCard], "en-GB");
  assert.deepEqual(deckCardEnglish, {
    reflection: deckCard.visibleLineEn,
    hidden: deckCard.hiddenLineEn,
    verify: deckCard.reflectionQuestionsEn[0],
    action: deckCard.actionSeedsEn[0],
  }, `${deckCard.id} should use explicit English fallback fields`);
}

const emptyCardAction = completeReflectionReading(
  "[REFLECTION] Existing",
  [card({ visibleLine: "", hiddenLine: "", reflectionQuestions: [], actionSeeds: [] })],
  "en",
);
assert.ok(emptyCardAction.action);
assert.equal(emptyCardAction.reflection, "Existing");

console.log("reflection reading tests passed");
