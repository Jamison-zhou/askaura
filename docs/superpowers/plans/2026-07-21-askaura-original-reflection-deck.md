# AskAura 原创反思牌组 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有传统塔罗抽牌链路替换为 AskAura 原创反思牌组，首轮交付 12 张可扩展验证牌、单牌与三象牌阵、四段式 AI 解读、失败降级和旧历史兼容。

**Architecture:** 新增独立的牌组数据模块和反思解读模块，让 `index.html` 只负责界面编排；现有内部 `mode: "tarot"` 与旧牌阵值继续作为兼容标识保留，不在本轮做高风险的全链路改名。新记录通过 `deckVersion: "reflection-v1"` 和 `meaningVersion: "1.0.0"` 与旧记录区分，旧塔罗图片和历史记录不删除。

**Tech Stack:** 静态 HTML、CSS、原生 JavaScript ES modules、Node.js `node:test` 风格断言脚本、Supabase Edge Functions（Deno/TypeScript）、SSE。

---

## 文件结构与职责

### 新增

- `assets/app/reflection-deck.js`：12 张原创牌的唯一前端语义来源、分类、牌阵位置、选牌解析和本地降级。
- `assets/app/reflection-reading.js`：构造 AI 请求、解析四段输出、用本地牌义补齐缺段。
- `assets/cards/reflection-v1/fallback-state.svg`：状态象缺图占位。
- `assets/cards/reflection-v1/fallback-relation.svg`：关系象缺图占位。
- `assets/cards/reflection-v1/fallback-movement.svg`：动势象缺图占位。
- `docs/design/reflection-deck-v1/image2-prompts.md`：交给 ChatGPT Image 2 的统一母提示词、12 张分镜和验收规则。
- `tests/reflection-deck.test.mjs`：牌组字段、唯一性、分类数量、牌阵映射和禁止项测试。
- `tests/reflection-reading.test.mjs`：请求、解析和降级测试。
- `tests/reflection-deck-index-contract.test.mjs`：页面接线、旧契约退出和新标签存在性测试。
- `tests/reflection-reading-prompt-contract.test.mjs`：Edge Function 类型、token 和提示词契约测试。

### 修改

- `assets/app/ritual-engine.js`：保留纯布局算法，改用原创牌组位置和无正逆位记录。
- `assets/app/result-renderer.js`：识别新四段 token，同时继续解析旧记录。
- `assets/app/history-store.js`：保存新牌字段和版本信息，继续接受旧 `orientation`。
- `index.html`：只做薄接线；展示原创牌面、发送新请求、保存版本化记录。
- `assets/styles/reflection-deck.css`：卡背、牌面叠加层、三类标识色、减少动态和缺图状态；独立于现有主题文件，便于未来扩展牌组模块。
- `supabase/functions/_shared/types.ts`：新增原创牌请求类型，保留 advice/anchor 的旧 orientation 类型。
- `supabase/functions/_shared/prompts/reading.ts`：改为原创反思牌四段式提示词。
- `supabase/functions/_shared/token-validator.ts`：新 token 契约。
- `supabase/functions/reading/index.ts`：校验原创牌请求，不再要求 reading 模式提供正逆位。
- `tests/ritual-engine.test.mjs`、`tests/result-renderer.test.mjs`、`tests/history-store.test.mjs`、`tests/clarify-contract.test.mjs`、`tests/phase4-spreads-gua-contract.test.mjs`、`tests/phase1-5-prompt-cache.test.mjs`：更新契约并补旧历史回归。

### 明确保留

- `assets/cards/*.jpg`：旧历史仍可能引用，首版迁移不能删除。
- 旧历史中的 `orientation` 与旧牌阵值：只读兼容。
- 内部 `mode: "tarot"`、`entry: "tarot"`：本轮不做路由和计费模型改名。
- 梅花、双象、每日记录、追问、复盘、分享：只适配新牌记录，不重写业务流程。

---

### Task 1: 建立可重复的基线

**Files:**
- Test: `tests/index-syntax.test.mjs`
- Test: `tests/ritual-engine.test.mjs`
- Test: `tests/result-renderer.test.mjs`
- Test: `tests/history-store.test.mjs`

- [ ] **Step 1: 运行现有核心测试并记录基线**

Run:

```powershell
node --experimental-vm-modules tests/index-syntax.test.mjs
node tests/ritual-engine.test.mjs
node tests/result-renderer.test.mjs
node tests/history-store.test.mjs
node tests/clarify-contract.test.mjs
node tests/phase4-spreads-gua-contract.test.mjs
```

Expected: 全部退出码为 `0`。如果当前工作区已有失败，只记录失败文件和断言，不先修改与本牌组无关的代码。

- [ ] **Step 2: 确认现有未提交文件边界**

Run:

```powershell
git status --short
```

Expected: 能看到用户现有的 `admin.html`、`index.html`、素材、原型和主题文件变化；后续每次提交只暂存本任务列出的文件。

---

### Task 2: 新增原创牌组数据模型

**Files:**
- Create: `assets/app/reflection-deck.js`
- Create: `tests/reflection-deck.test.mjs`

- [ ] **Step 1: 先写牌组契约测试**

Create `tests/reflection-deck.test.mjs`:

```js
import assert from "node:assert/strict";
import {
  REFLECTION_CATEGORIES,
  REFLECTION_DECK,
  REFLECTION_DECK_VERSION,
  REFLECTION_MEANING_VERSION,
  cardsForCategory,
  reflectionCardForSelection,
  reflectionSpreadPositions
} from "../assets/app/reflection-deck.js";

assert.equal(REFLECTION_DECK_VERSION, "reflection-v1");
assert.equal(REFLECTION_MEANING_VERSION, "1.0.0");
assert.equal(REFLECTION_DECK.length, 12);
assert.deepEqual(Object.keys(REFLECTION_CATEGORIES), ["state", "relation", "movement"]);

const requiredStrings = [
  "id", "category", "imageNameZh", "imageNameEn", "coreMeaningZh", "coreMeaningEn",
  "visibleLineZh", "visibleLineEn", "hiddenLineZh", "hiddenLineEn", "visualBrief",
  "imageSrc", "imageAltZh", "imageAltEn"
];

for (const card of REFLECTION_DECK) {
  for (const key of requiredStrings) assert.ok(String(card[key] || "").trim(), `${card.id}.${key}`);
  assert.equal(card.reflectionQuestionsZh.length, 2, `${card.id}.reflectionQuestionsZh`);
  assert.equal(card.reflectionQuestionsEn.length, 2, `${card.id}.reflectionQuestionsEn`);
  assert.equal(card.actionSeedsZh.length, 2, `${card.id}.actionSeedsZh`);
  assert.equal(card.actionSeedsEn.length, 2, `${card.id}.actionSeedsEn`);
  assert.ok(card.prohibitedClaims.length >= 2, `${card.id}.prohibitedClaims`);
  assert.doesNotMatch(JSON.stringify(card), /正位|逆位|upright|reversed|命中注定|转运|算命|玄学/);
}

assert.equal(new Set(REFLECTION_DECK.map((card) => card.id)).size, 12);
assert.equal(new Set(REFLECTION_DECK.map((card) => card.imageNameZh)).size, 12);
assert.equal(new Set(REFLECTION_DECK.map((card) => card.coreMeaningZh)).size, 12);
assert.deepEqual(cardsForCategory("state").map((card) => card.id), [
  "state-empty-chair", "state-bottled-rain", "state-full-cup", "state-fog-window"
]);
assert.equal(cardsForCategory("relation").length, 4);
assert.equal(cardsForCategory("movement").length, 4);

assert.deepEqual(reflectionSpreadPositions("single", "zh"), [
  { key: "single", category: null, label: "现在最值得看见的是什么" }
]);
assert.deepEqual(reflectionSpreadPositions("reflection_triad", "zh"), [
  { key: "state", category: "state", label: "我现在怎样" },
  { key: "relation", category: "relation", label: "什么正在影响我" },
  { key: "movement", category: "movement", label: "可以尝试怎样变化" }
]);

assert.equal(reflectionCardForSelection({ cardIndex: 5, position: { key: "single" } }).id, REFLECTION_DECK[5].id);
assert.equal(reflectionCardForSelection({ cardIndex: 5, position: { key: "state", category: "state" } }).category, "state");
assert.equal(reflectionCardForSelection({ cardIndex: 5, position: { key: "relation", category: "relation" } }).category, "relation");
assert.equal(reflectionCardForSelection({ cardIndex: 5, position: { key: "movement", category: "movement" } }).category, "movement");

console.log("reflection deck tests passed");
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```powershell
node tests/reflection-deck.test.mjs
```

Expected: FAIL，错误包含 `ERR_MODULE_NOT_FOUND`，因为 `assets/app/reflection-deck.js` 尚不存在。

- [ ] **Step 3: 实现牌组模块和 12 张完整语义**

Create `assets/app/reflection-deck.js` with these exports and exactly these stable IDs:

```js
export const REFLECTION_DECK_VERSION = "reflection-v1";
export const REFLECTION_MEANING_VERSION = "1.0.0";

export const REFLECTION_CATEGORIES = Object.freeze({
  state: { zh: "状态象", en: "State", fallbackSrc: "./assets/cards/reflection-v1/fallback-state.svg" },
  relation: { zh: "关系象", en: "Relation", fallbackSrc: "./assets/cards/reflection-v1/fallback-relation.svg" },
  movement: { zh: "动势象", en: "Movement", fallbackSrc: "./assets/cards/reflection-v1/fallback-movement.svg" }
});

const makeCard = (card) => Object.freeze({
  ...card,
  deckVersion: REFLECTION_DECK_VERSION,
  meaningVersion: REFLECTION_MEANING_VERSION
});

export const REFLECTION_DECK = Object.freeze([
  makeCard({
    id: "state-empty-chair", category: "state", imageNameZh: "空椅", imageNameEn: "Empty Chair",
    coreMeaningZh: "等待别人先行动，把决定权留在外部", coreMeaningEn: "Waiting for someone else to act while leaving the decision outside yourself",
    visibleLineZh: "你已经察觉自己在等待一个回应、许可或先例", visibleLineEn: "You already notice that you are waiting for a reply, permission, or precedent",
    hiddenLineZh: "等待也许正在替你推迟一次本可由自己完成的选择", hiddenLineEn: "The waiting may be postponing a choice you could make yourself",
    reflectionQuestionsZh: ["如果对方今天不行动，你仍能决定什么？", "你在等的是信息，还是被允许开始？"],
    reflectionQuestionsEn: ["If they do not act today, what can you still decide?", "Are you waiting for information, or permission to begin?"],
    actionSeedsZh: ["写下一个不依赖他人回应也能完成的动作", "给等待设置一个明确截止时间"],
    actionSeedsEn: ["Write one action that does not depend on another person's reply", "Give the waiting a clear deadline"],
    visualBrief: "一把旧木椅朝向半开的门，门帘被风吹进空房，主体只有椅与门的关系，大面积浅灰蓝留白",
    imageSrc: "./assets/cards/reflection-v1/state-empty-chair.webp", imageAltZh: "空房中一把朝向半开门的旧木椅", imageAltEn: "An old wooden chair facing a half-open door in an empty room",
    prohibitedClaims: ["对方一定会回来", "等待会带来好运"]
  }),
  makeCard({
    id: "state-bottled-rain", category: "state", imageNameZh: "瓶中雨", imageNameEn: "Rain in a Bottle",
    coreMeaningZh: "情绪持续发生，却没有流向可以承接它的地方", coreMeaningEn: "Emotion keeps happening without a place that can receive it",
    visibleLineZh: "你知道某种感受一直没有真正过去", visibleLineEn: "You know a feeling has not actually passed",
    hiddenLineZh: "问题也许不是感受太多，而是它从未被命名或安放", hiddenLineEn: "The issue may not be too much feeling, but that it has never been named or placed",
    reflectionQuestionsZh: ["这份感受最需要被谁听见？", "如果不用解释原因，你会怎样命名它？"],
    reflectionQuestionsEn: ["Who most needs to hear this feeling?", "Without explaining why, how would you name it?"],
    actionSeedsZh: ["用一句不分析原因的话写下此刻的感受", "为这份情绪安排十分钟不被打断的空间"],
    actionSeedsEn: ["Write the feeling in one sentence without analysing its cause", "Give this emotion ten uninterrupted minutes"],
    visualBrief: "透明玻璃瓶中悬着一小片下雨的灰云，瓶外桌面干燥，暖色只落在一片沉底的叶子上",
    imageSrc: "./assets/cards/reflection-v1/state-bottled-rain.webp", imageAltZh: "玻璃瓶中一小片正在下雨的云", imageAltEn: "A small rain cloud raining inside a glass bottle",
    prohibitedClaims: ["情绪预示坏事", "压抑一定来自童年"]
  }),
  makeCard({
    id: "state-full-cup", category: "state", imageNameZh: "满杯", imageNameEn: "Full Cup",
    coreMeaningZh: "容量接近边界，却仍在继续接收", coreMeaningEn: "Capacity is near its limit while more keeps arriving",
    visibleLineZh: "你已经感到疲惫、拥挤或难以继续吸收", visibleLineEn: "You already feel tired, crowded, or unable to take in more",
    hiddenLineZh: "真正缺少的也许不是能力，而是停止接收的许可", hiddenLineEn: "What may be missing is not ability, but permission to stop receiving",
    reflectionQuestionsZh: ["现在新增的哪一件事最不值得进入杯中？", "谁默认你还可以继续承接？"],
    reflectionQuestionsEn: ["What new thing least deserves room in the cup now?", "Who assumes you can keep carrying more?"],
    actionSeedsZh: ["今天明确拒绝或延期一件新增事项", "列出一个必须保留的空白时段"],
    actionSeedsEn: ["Decline or defer one new request today", "Reserve one block of time that must stay empty"],
    visualBrief: "一只几乎溢出的陶杯仍接住上方最后一滴水，桌面和背景极简，水滴为唯一暖色关系点",
    imageSrc: "./assets/cards/reflection-v1/state-full-cup.webp", imageAltZh: "一只满到将要溢出的陶杯仍在接住水滴", imageAltEn: "A ceramic cup about to overflow while still receiving a drop",
    prohibitedClaims: ["你注定会崩溃", "继续坚持就一定成功"]
  }),
  makeCard({
    id: "state-fog-window", category: "state", imageNameZh: "雾窗", imageNameEn: "Fogged Window",
    coreMeaningZh: "并非没有答案，而是当前视角无法看清", coreMeaningEn: "The answer may exist, while the current viewpoint cannot see it clearly",
    visibleLineZh: "你已经知道自己缺少足够清楚的信息", visibleLineEn: "You already know that the information is not clear enough",
    hiddenLineZh: "你也许正把看不清误当成必须马上猜对", hiddenLineEn: "You may be treating uncertainty as a demand to guess correctly now",
    reflectionQuestionsZh: ["哪个事实一旦补齐，判断会明显改变？", "你可以换位置看，而不是继续擦同一块玻璃吗？"],
    reflectionQuestionsEn: ["Which missing fact would materially change the judgment?", "Can you change position instead of wiping the same patch of glass?"],
    actionSeedsZh: ["只补一个最关键的信息再决定", "把事实、猜测和担心分成三列"],
    actionSeedsEn: ["Get one critical fact before deciding", "Separate facts, guesses, and worries into three columns"],
    visualBrief: "一扇起雾的窗只被擦开很小一角，窗外轮廓模糊，暖光只从清晰的小角落进入",
    imageSrc: "./assets/cards/reflection-v1/state-fog-window.webp", imageAltZh: "起雾的窗上只有一小块被擦清", imageAltEn: "A fogged window with only one small clear patch",
    prohibitedClaims: ["直觉一定正确", "答案会自动出现"]
  }),
  makeCard({
    id: "relation-reverse-shadow", category: "relation", imageNameZh: "逆影", imageNameEn: "Contrary Shadow",
    coreMeaningZh: "外在方向与内在意愿并不一致", coreMeaningEn: "The outward direction and inner intention do not align",
    visibleLineZh: "你察觉言语、动作或承诺之间存在不一致", visibleLineEn: "You notice a mismatch between words, actions, or commitments",
    hiddenLineZh: "不一致也可能发生在你自己身上，而不只在对方", hiddenLineEn: "The mismatch may also be yours, not only the other person's",
    reflectionQuestionsZh: ["哪个动作最能代表真实方向？", "你说想要的，和你正在保护的是同一件事吗？"],
    reflectionQuestionsEn: ["Which action best represents the real direction?", "Is what you say you want the same as what you are protecting?"],
    actionSeedsZh: ["对照一句表态和一个真实动作", "把自己的希望与实际投入分别写下"],
    actionSeedsEn: ["Compare one statement with one real action", "Write your hope and your actual investment separately"],
    visualBrief: "一个站立人物朝左，地面影子却朝右，人物极小，影子是唯一异常关系，节点用低饱和珊瑚色",
    imageSrc: "./assets/cards/reflection-v1/relation-reverse-shadow.webp", imageAltZh: "人物与影子朝向相反的空旷地面", imageAltEn: "A figure and shadow pointing in opposite directions on open ground",
    prohibitedClaims: ["对方在欺骗你", "影子代表真实人格"]
  }),
  makeCard({
    id: "relation-one-way-bridge", category: "relation", imageNameZh: "单向桥", imageNameEn: "One-way Bridge",
    coreMeaningZh: "有人不断靠近，但关系没有形成真正交汇", coreMeaningEn: "Someone keeps approaching, but the relationship does not form a true meeting",
    visibleLineZh: "你已经感到投入和回应并不对等", visibleLineEn: "You already feel that effort and response are not balanced",
    hiddenLineZh: "持续靠近也许正在代替一次关于边界的确认", hiddenLineEn: "Continued approach may be replacing a needed boundary check",
    reflectionQuestionsZh: ["什么才算一次真实的相向行动？", "如果你停一步，关系还会移动吗？"],
    reflectionQuestionsEn: ["What would count as a real movement toward each other?", "If you stop for one step, does the relationship still move?"],
    actionSeedsZh: ["暂停一次主动推进，观察是否出现对等回应", "把你需要的最低回应说具体"],
    actionSeedsEn: ["Pause one proactive move and observe whether reciprocity appears", "State the minimum response you need in concrete terms"],
    visualBrief: "一座窄桥从近岸伸向远岸，却在抵达前缺少最后一段，桥上只有一个靠近的人，缺口是关系焦点",
    imageSrc: "./assets/cards/reflection-v1/relation-one-way-bridge.webp", imageAltZh: "一座在抵达对岸前中断的窄桥", imageAltEn: "A narrow bridge that stops just before reaching the far bank",
    prohibitedClaims: ["对方不爱你", "停止联系就会得到答案"]
  }),
  makeCard({
    id: "relation-borrowed-umbrella", category: "relation", imageNameZh: "借来的伞", imageNameEn: "Borrowed Umbrella",
    coreMeaningZh: "依靠一种保护，同时接受它附带的条件", coreMeaningEn: "Relying on protection while accepting the conditions attached to it",
    visibleLineZh: "你知道这份帮助并非完全没有代价", visibleLineEn: "You know this help is not entirely without cost",
    hiddenLineZh: "保护也许正在让你回避建立自己的承受方式", hiddenLineEn: "The protection may be delaying your own way of coping",
    reflectionQuestionsZh: ["这把伞要求你交换什么？", "如果归还它，你最先需要准备什么？"],
    reflectionQuestionsEn: ["What does this umbrella ask in exchange?", "If you returned it, what would you need to prepare first?"],
    actionSeedsZh: ["写清这份帮助的边界和交换条件", "独立完成其中最小的一部分"],
    actionSeedsEn: ["Write down the boundary and terms of this help", "Complete the smallest part independently"],
    visualBrief: "一个人撑着明显过大的旧伞，伞柄系着通向画外的细线，雨景简洁，线结为暖色焦点",
    imageSrc: "./assets/cards/reflection-v1/relation-borrowed-umbrella.webp", imageAltZh: "一把借来的大伞，伞柄上系着通向画外的线", imageAltEn: "A borrowed large umbrella with a line tied to its handle leading out of frame",
    prohibitedClaims: ["帮助者一定在控制你", "依赖本身是错误"]
  }),
  makeCard({
    id: "relation-wrong-key", category: "relation", imageNameZh: "错钥", imageNameEn: "Wrong Key",
    coreMeaningZh: "双方都在尝试打开关系，却使用了不同的理解方式", coreMeaningEn: "Both sides are trying to open the relationship with different understandings",
    visibleLineZh: "你已经发现努力并没有转化为被理解", visibleLineEn: "You already see that effort has not become understanding",
    hiddenLineZh: "问题也许不是不够努力，而是彼此用不同标准判断靠近", hiddenLineEn: "The issue may not be insufficient effort, but different standards for what closeness means",
    reflectionQuestionsZh: ["你以为的回应，在对方那里是什么？", "双方分别把什么当作门被打开的证据？"],
    reflectionQuestionsEn: ["What does your idea of response mean to the other person?", "What does each side count as evidence that the door is open?"],
    actionSeedsZh: ["用一个具体例子确认双方对同一句话的理解", "停止重复同一种无效表达一次"],
    actionSeedsEn: ["Use one concrete example to compare what the same phrase means to both sides", "Stop repeating one ineffective form of expression once"],
    visualBrief: "一把钥匙已插入锁孔却齿形不合，门与手都不出现，只保留锁、钥匙和微小偏差",
    imageSrc: "./assets/cards/reflection-v1/relation-wrong-key.webp", imageAltZh: "插入锁孔但齿形不合的钥匙", imageAltEn: "A key inserted into a lock but cut for a different shape",
    prohibitedClaims: ["双方天生不合", "沟通一定能解决一切"]
  }),
  makeCard({
    id: "movement-unlit-lantern", category: "movement", imageNameZh: "未燃灯", imageNameEn: "Unlit Lantern",
    coreMeaningZh: "已经拥有资源或能力，但尚未主动使用", coreMeaningEn: "A resource or ability is available but not yet being used",
    visibleLineZh: "你知道自己并非完全没有办法", visibleLineEn: "You know you are not entirely without options",
    hiddenLineZh: "未行动也许来自对开始方式要求过高", hiddenLineEn: "Inaction may come from demanding too perfect a beginning",
    reflectionQuestionsZh: ["哪一种能力已经足够开始，而不必更完整？", "你在等火，还是不愿承认自己可以点灯？"],
    reflectionQuestionsEn: ["Which ability is already enough to begin?", "Are you waiting for fire, or avoiding admitting you can light the lamp?"],
    actionSeedsZh: ["用现有资源完成一个五分钟版本", "列出你手边已经具备的三样东西"],
    actionSeedsEn: ["Make a five-minute version with what you already have", "List three resources already within reach"],
    visualBrief: "一盏未点燃的手提灯放在晨昏交界，旁边已有一根火柴，火柴头是唯一暖色",
    imageSrc: "./assets/cards/reflection-v1/movement-unlit-lantern.webp", imageAltZh: "未点燃的提灯旁放着一根火柴", imageAltEn: "An unlit lantern with a single match beside it",
    prohibitedClaims: ["机会马上到来", "你拥有尚未觉醒的神秘力量"]
  }),
  makeCard({
    id: "movement-loosened-knot", category: "movement", imageNameZh: "松结", imageNameEn: "Loosened Knot",
    coreMeaningZh: "改变不一定需要切断，也可以先降低束缚", coreMeaningEn: "Change may begin by reducing constraint rather than cutting everything off",
    visibleLineZh: "你已经觉得目前的连接太紧或太耗力", visibleLineEn: "You already feel the current connection is too tight or demanding",
    hiddenLineZh: "你也许把继续和离开误当成仅有的两个选项", hiddenLineEn: "You may be treating staying and leaving as the only two options",
    reflectionQuestionsZh: ["怎样调整能让关系先恢复呼吸？", "哪个约束可以减半，而不必归零？"],
    reflectionQuestionsEn: ["What adjustment would let the relationship breathe?", "Which constraint can be halved without becoming zero?"],
    actionSeedsZh: ["把一个过紧的规则改成可协商范围", "减少一次不必要的解释或承诺"],
    actionSeedsEn: ["Turn one rigid rule into a negotiable range", "Reduce one unnecessary explanation or promise"],
    visualBrief: "一根绳上只有一个正在松开的结，绳未断，结心露出少量暖光，大面积深蓝背景",
    imageSrc: "./assets/cards/reflection-v1/movement-loosened-knot.webp", imageAltZh: "一根没有断裂、正在慢慢松开的绳结", imageAltEn: "An intact rope with a knot slowly loosening",
    prohibitedClaims: ["必须断舍离", "放手后一切都会变好"]
  }),
  makeCard({
    id: "movement-side-door", category: "movement", imageNameZh: "侧门", imageNameEn: "Side Door",
    coreMeaningZh: "当前路径不是唯一入口", coreMeaningEn: "The current path is not the only entrance",
    visibleLineZh: "你已经发现正面推进反复受阻", visibleLineEn: "You already see that the direct route keeps meeting resistance",
    hiddenLineZh: "坚持正门也许是在维护一种体面，而不是目标本身", hiddenLineEn: "Insisting on the front entrance may protect an image rather than the goal",
    reflectionQuestionsZh: ["如果不证明自己，你会换哪一种进入方式？", "真正的目标允许哪些替代路径？"],
    reflectionQuestionsEn: ["If you did not need to prove yourself, which entrance would you try?", "What alternative routes does the real goal allow?"],
    actionSeedsZh: ["为同一目标列出一个非正面的入口", "向一个不同角色询问可行路径"],
    actionSeedsEn: ["List one indirect entrance to the same goal", "Ask someone in a different role about a workable route"],
    visualBrief: "高墙上的正门紧闭，画面边缘有一扇小侧门透出微光，人物不出现，空间极简",
    imageSrc: "./assets/cards/reflection-v1/movement-side-door.webp", imageAltZh: "紧闭正门旁一扇透出微光的小侧门", imageAltEn: "A small lit side door beside a closed main entrance",
    prohibitedClaims: ["捷径必然成功", "有人会暗中帮助你"]
  }),
  makeCard({
    id: "movement-low-tide-steps", category: "movement", imageNameZh: "退潮阶", imageNameEn: "Low-tide Steps",
    coreMeaningZh: "暂停推进后，原本被覆盖的下一步才会出现", coreMeaningEn: "When forward pressure pauses, a previously covered next step can appear",
    visibleLineZh: "你已经感觉继续用力没有增加清晰度", visibleLineEn: "You already feel that more force is not creating more clarity",
    hiddenLineZh: "停下也许不是退步，而是在等待条件显露", hiddenLineEn: "Pausing may not be regression, but a way to let conditions become visible",
    reflectionQuestionsZh: ["什么只有在你不推进时才看得见？", "当前最小的等待周期应该多长？"],
    reflectionQuestionsEn: ["What becomes visible only when you stop pushing?", "What is the smallest useful waiting period now?"],
    actionSeedsZh: ["为这个问题设置一次二十四小时不推进", "暂停后只记录新出现的事实"],
    actionSeedsEn: ["Give this issue a twenty-four-hour no-push period", "During the pause, record only newly visible facts"],
    visualBrief: "潮水退去后露出三层石阶，最上层仍湿，最下一阶有一点暖色反光，无人物和建筑",
    imageSrc: "./assets/cards/reflection-v1/movement-low-tide-steps.webp", imageAltZh: "退潮后从水下显露出的三层石阶", imageAltEn: "Three stone steps revealed as the tide recedes",
    prohibitedClaims: ["等待会自动解决问题", "潮汐预示未来变化"]
  })
]);

export function cardsForCategory(category) {
  return REFLECTION_DECK.filter((card) => card.category === category);
}

export function reflectionSpreadPositions(type = "single", language = "zh") {
  if (type !== "reflection_triad") {
    return [{ key: "single", category: null, label: language === "zh" ? "现在最值得看见的是什么" : "What is most worth noticing now?" }];
  }
  return language === "zh"
    ? [
        { key: "state", category: "state", label: "我现在怎样" },
        { key: "relation", category: "relation", label: "什么正在影响我" },
        { key: "movement", category: "movement", label: "可以尝试怎样变化" }
      ]
    : [
        { key: "state", category: "state", label: "How am I now?" },
        { key: "relation", category: "relation", label: "What is influencing me?" },
        { key: "movement", category: "movement", label: "What change can I try?" }
      ];
}

export function reflectionCardForSelection(selection) {
  const index = Number(selection?.cardIndex ?? selection?.index ?? 0);
  const category = selection?.position?.category;
  const pool = category ? cardsForCategory(category) : REFLECTION_DECK;
  return pool[((index % pool.length) + pool.length) % pool.length];
}

export function fallbackForCategory(category) {
  return REFLECTION_CATEGORIES[category]?.fallbackSrc || REFLECTION_CATEGORIES.state.fallbackSrc;
}
```

- [ ] **Step 4: 运行牌组测试**

Run:

```powershell
node tests/reflection-deck.test.mjs
```

Expected: 输出 `reflection deck tests passed`。

- [ ] **Step 5: 提交牌组模型**

```powershell
git add assets/app/reflection-deck.js tests/reflection-deck.test.mjs
git commit -m "feat: add original reflection deck model"
```

---

### Task 3: 将抽牌引擎改成无正逆位的单牌与三象牌阵

**Files:**
- Modify: `assets/app/ritual-engine.js:1-67,69,111-185`
- Modify: `tests/ritual-engine.test.mjs`

- [ ] **Step 1: 将仪式测试改成新牌阵契约**

Replace the old spread and orientation assertions with:

```js
import assert from "node:assert/strict";
import {
  primaryCardFromRecordCards,
  recordCardFromSelection,
  ritualCardLayout,
  ritualSpreadTypeForMode,
  spreadDisplayName,
  spreadPositions
} from "../assets/app/ritual-engine.js";
import { REFLECTION_DECK } from "../assets/app/reflection-deck.js";

assert.deepEqual(spreadPositions("single", {}, "zh"), [
  { key: "single", category: null, label: "现在最值得看见的是什么" }
]);
assert.deepEqual(spreadPositions("reflection_triad", {}, "zh"), [
  { key: "state", category: "state", label: "我现在怎样" },
  { key: "relation", category: "relation", label: "什么正在影响我" },
  { key: "movement", category: "movement", label: "可以尝试怎样变化" }
]);
assert.equal(spreadDisplayName("reflection_triad", {}, "zh"), "状态 / 关系 / 动势");
assert.equal(ritualSpreadTypeForMode("tarot", "reflection_triad"), "reflection_triad");
assert.equal(ritualSpreadTypeForMode("dual", "reflection_triad"), "single");

const layout = ritualCardLayout(5, REFLECTION_DECK.length);
assert.equal(layout.cardIndex, 5);
assert.match(layout.cardX, /px$/);

const stateRecord = recordCardFromSelection({
  cardIndex: 5,
  position: { key: "state", category: "state", label: "我现在怎样" }
}, { language: "zh" });
assert.equal(stateRecord.category, "state");
assert.equal(stateRecord.position, "state");
assert.equal(stateRecord.label, "我现在怎样");
assert.equal(stateRecord.deckVersion, "reflection-v1");
assert.equal(stateRecord.meaningVersion, "1.0.0");
assert.equal("orientation" in stateRecord, false);
assert.equal(primaryCardFromRecordCards([stateRecord]), stateRecord);

console.log("ritual engine tests passed");
```

- [ ] **Step 2: 运行测试确认旧实现失败**

Run:

```powershell
node tests/ritual-engine.test.mjs
```

Expected: FAIL，至少包含 `reflection_triad` 或 `orientation` 相关断言失败。

- [ ] **Step 3: 让仪式引擎只保留布局和选择职责**

At the top of `assets/app/ritual-engine.js`, import the deck helpers, replace spread definitions, and replace `recordCardFromSelection`:

```js
import {
  REFLECTION_DECK,
  fallbackForCategory,
  reflectionCardForSelection,
  reflectionSpreadPositions
} from "./reflection-deck.js";

export const SPREAD_TYPES = ["single", "reflection_triad"];

export function spreadPositions(type = "single", labels = {}, language = "zh") {
  const positions = reflectionSpreadPositions(type, language);
  return positions.map((position) => ({
    ...position,
    label: labels[position.key] || position.label
  }));
}

export function spreadDisplayName(type = "single", labels = {}, language = "zh") {
  if (type === "reflection_triad") return labels.reflectionTriad || (language === "zh" ? "状态 / 关系 / 动势" : "State / Relation / Movement");
  return labels.single || (language === "zh" ? "单牌" : "Single card");
}

export function ritualSpreadTypeForMode(mode, selectedSpreadType = "single") {
  return mode === "tarot" ? selectedSpreadType : "single";
}

Change only the declaration from `export function ritualCardLayout(index, deckLength = TAROT_DECK.length)` to:

```js
export function ritualCardLayout(index, deckLength = REFLECTION_DECK.length) {
```

Keep the existing statements from `const center = ...` through the returned layout object and closing brace unchanged.

export function recordCardFromSelection(selection, { language = "zh", singleLabel = "单牌" } = {}) {
  const card = reflectionCardForSelection({
    cardIndex: selection.cardIndex ?? selection.index,
    position: selection.position
  });
  return {
    id: card.id,
    name: language === "zh" ? card.imageNameZh : card.imageNameEn,
    imageNameZh: card.imageNameZh,
    imageNameEn: card.imageNameEn,
    category: card.category,
    coreMeaning: language === "zh" ? card.coreMeaningZh : card.coreMeaningEn,
    visibleLine: language === "zh" ? card.visibleLineZh : card.visibleLineEn,
    hiddenLine: language === "zh" ? card.hiddenLineZh : card.hiddenLineEn,
    reflectionQuestions: language === "zh" ? card.reflectionQuestionsZh : card.reflectionQuestionsEn,
    actionSeeds: language === "zh" ? card.actionSeedsZh : card.actionSeedsEn,
    prohibitedClaims: card.prohibitedClaims,
    label: selection.position?.label || singleLabel,
    position: selection.position?.key || "single",
    imageSrc: card.imageSrc,
    imageFallbackSrc: fallbackForCategory(card.category),
    imageAlt: language === "zh" ? card.imageAltZh : card.imageAltEn,
    deckVersion: card.deckVersion,
    meaningVersion: card.meaningVersion
  };
}

export function primaryCardFromRecordCards(cards = []) {
  return Array.isArray(cards) && cards.length ? cards[0] : null;
}
```

Delete `TAROT_DECK` and `cardKeywords`; the old history does not need them because it already stores its own names and image paths. Keep the current `ritualCardLayout` body byte-for-byte except for its default deck length.

- [ ] **Step 4: 运行抽牌测试和语法测试**

Run:

```powershell
node tests/ritual-engine.test.mjs
node --experimental-vm-modules tests/index-syntax.test.mjs
```

Expected: ritual test passes; index syntax temporarily fails only if it still imports `TAROT_DECK` or `cardKeywords`. Do not hide that failure; Task 7 removes those imports.

- [ ] **Step 5: 提交抽牌引擎**

```powershell
git add assets/app/ritual-engine.js tests/ritual-engine.test.mjs
git commit -m "refactor: use reflection cards in ritual engine"
```

---

### Task 4: 新增四段式反思解析和本地降级

**Files:**
- Create: `assets/app/reflection-reading.js`
- Create: `tests/reflection-reading.test.mjs`

- [ ] **Step 1: 写失败测试**

Create `tests/reflection-reading.test.mjs`:

```js
import assert from "node:assert/strict";
import { REFLECTION_DECK } from "../assets/app/reflection-deck.js";
import {
  buildReflectionReadingRequest,
  completeReflectionReading,
  parseReflectionReading
} from "../assets/app/reflection-reading.js";

const card = {
  ...REFLECTION_DECK[0],
  name: REFLECTION_DECK[0].imageNameZh,
  coreMeaning: REFLECTION_DECK[0].coreMeaningZh,
  visibleLine: REFLECTION_DECK[0].visibleLineZh,
  hiddenLine: REFLECTION_DECK[0].hiddenLineZh,
  reflectionQuestions: REFLECTION_DECK[0].reflectionQuestionsZh,
  actionSeeds: REFLECTION_DECK[0].actionSeedsZh,
  label: "现在最值得看见的是什么",
  position: "single"
};

const request = buildReflectionReadingRequest({ cards: [card], question: "我该不该继续等回复？", language: "zh", entry: "tarot" });
assert.equal(request.mode, "reading");
assert.equal(request.deckVersion, "reflection-v1");
assert.equal(request.cards[0].id, "state-empty-chair");
assert.equal("orientation" in request, false);
assert.equal(request.cardName, "空椅");

assert.deepEqual(parseReflectionReading(
  "[REFLECTION]\n你正在等待回应。\n[HIDDEN]\n也许决定权被留在外部。\n[VERIFY]\n观察不主动时关系是否仍移动。\n[ACTION]\n给等待设一个今晚九点的截止时间。"
), {
  reflection: "你正在等待回应。",
  hidden: "也许决定权被留在外部。",
  verify: "观察不主动时关系是否仍移动。",
  action: "给等待设一个今晚九点的截止时间。"
});

const fallback = completeReflectionReading("[REFLECTION]\n你正在等待回应。", [card], "zh");
assert.equal(fallback.reflection, "你正在等待回应。");
assert.equal(fallback.hidden, card.hiddenLine);
assert.equal(fallback.verify, card.reflectionQuestions[0]);
assert.equal(fallback.action, card.actionSeeds[0]);

console.log("reflection reading tests passed");
```

- [ ] **Step 2: 运行测试确认模块缺失**

Run:

```powershell
node tests/reflection-reading.test.mjs
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: 实现请求、解析和降级**

Create `assets/app/reflection-reading.js`:

```js
import { REFLECTION_DECK_VERSION } from "./reflection-deck.js";
import { parseTaggedTokens } from "./result-renderer.js";

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export function buildReflectionReadingRequest({ cards, question, language = "zh", entry = "tarot", sessionHistory = "" }) {
  const usable = Array.isArray(cards) ? cards.slice(0, 3) : [];
  if (!usable.length) throw new Error("Reflection card selection missing");
  const primary = usable[0];
  return {
    mode: "reading",
    tier: "basic",
    entry,
    deckVersion: REFLECTION_DECK_VERSION,
    cardName: primary.name,
    spreadType: usable.length === 3 ? "reflection_triad" : "single",
    cards: usable.map((card) => ({
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
      meaningVersion: card.meaningVersion
    })),
    intent: language === "zh" ? "看清" : "clarity",
    question: clean(question),
    round: 1,
    sessionHistory: clean(sessionHistory),
    language
  };
}

export function parseReflectionReading(rawText) {
  const tokens = parseTaggedTokens(rawText);
  return {
    reflection: clean(tokens.REFLECTION),
    hidden: clean(tokens.HIDDEN),
    verify: clean(tokens.VERIFY),
    action: clean(tokens.ACTION)
  };
}

export function completeReflectionReading(rawText, cards, language = "zh") {
  const parsed = parseReflectionReading(rawText);
  const primary = Array.isArray(cards) ? cards[0] : null;
  return {
    reflection: parsed.reflection || primary?.visibleLine || (language === "zh" ? "先看见问题中已经确定的事实。" : "Start with what is already known."),
    hidden: parsed.hidden || primary?.hiddenLine || (language === "zh" ? "也许还有一个尚未被验证的假设。" : "There may be an assumption that has not been tested."),
    verify: parsed.verify || primary?.reflectionQuestions?.[0] || (language === "zh" ? "把事实和猜测分开写下。" : "Write facts and guesses separately."),
    action: parsed.action || primary?.actionSeeds?.[0] || (language === "zh" ? "今天完成一个五分钟内能验证的小动作。" : "Do one five-minute test today.")
  };
}
```

- [ ] **Step 4: 运行解析测试**

Run:

```powershell
node tests/reflection-reading.test.mjs
node tests/result-renderer.test.mjs
```

Expected: both pass.

- [ ] **Step 5: 提交反思解析模块**

```powershell
git add assets/app/reflection-reading.js tests/reflection-reading.test.mjs
git commit -m "feat: add reflection reading contract and fallback"
```

---

### Task 5: 更新 Edge Function 的原创牌请求和四段 token

**Files:**
- Modify: `supabase/functions/_shared/types.ts:3-42`
- Modify: `supabase/functions/_shared/prompts/reading.ts`
- Modify: `supabase/functions/_shared/token-validator.ts:1-12`
- Modify: `supabase/functions/reading/index.ts:43-66`
- Create: `tests/reflection-reading-prompt-contract.test.mjs`
- Modify: `tests/clarify-contract.test.mjs`
- Modify: `tests/phase1-5-prompt-cache.test.mjs`
- Modify: `tests/phase4-spreads-gua-contract.test.mjs`

- [ ] **Step 1: 写新后端契约测试**

Create `tests/reflection-reading-prompt-contract.test.mjs`:

```js
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const types = readFileSync(new URL("../supabase/functions/_shared/types.ts", import.meta.url), "utf8");
const prompt = readFileSync(new URL("../supabase/functions/_shared/prompts/reading.ts", import.meta.url), "utf8");
const validator = readFileSync(new URL("../supabase/functions/_shared/token-validator.ts", import.meta.url), "utf8");
const edge = readFileSync(new URL("../supabase/functions/reading/index.ts", import.meta.url), "utf8");

assert.match(types, /deckVersion: "reflection-v1"/);
assert.match(types, /category: ReflectionCategory/);
assert.match(types, /coreMeaning: string/);
assert.doesNotMatch(types.match(/export interface ReadingRequest[\s\S]*?\n}/)?.[0] || "", /orientation:/);
assert.match(prompt, /\[REFLECTION\]/);
assert.match(prompt, /\[HIDDEN\]/);
assert.match(prompt, /\[VERIFY\]/);
assert.match(prompt, /\[ACTION\]/);
assert.doesNotMatch(prompt, /塔罗回应|传统牌义|正位|逆位/);
assert.match(validator, /reading: \["REFLECTION", "HIDDEN", "VERIFY", "ACTION"\]/);
assert.match(edge, /o\.deckVersion !== "reflection-v1"/);
assert.doesNotMatch(edge.match(/function isReadingRequest[\s\S]*?\n}/)?.[0] || "", /o\.orientation !==/);

console.log("reflection reading prompt contract tests passed");
```

- [ ] **Step 2: 运行测试确认旧契约失败**

Run:

```powershell
node tests/reflection-reading-prompt-contract.test.mjs
```

Expected: FAIL on missing `deckVersion` and `[REFLECTION]`.

- [ ] **Step 3: 修改 TypeScript 请求类型**

Keep `Orientation` for `AdviceRequest`, `AnchorRequest`, and legacy draw events. Replace only reading spread types with:

```ts
export type ReflectionCategory = "state" | "relation" | "movement";
export type SpreadType = "single" | "reflection_triad";

export interface SpreadCard {
  id: string;
  category: ReflectionCategory;
  name: string;
  label: string;
  position: "single" | ReflectionCategory;
  coreMeaning: string;
  visibleLine: string;
  hiddenLine: string;
  reflectionQuestions: string[];
  actionSeeds: string[];
  prohibitedClaims: string[];
  meaningVersion: string;
}

export interface ReadingRequest {
  mode: "reading";
  deckVersion: "reflection-v1";
  cardName: string;
  spreadType?: SpreadType;
  cards: SpreadCard[];
  intent: string;
  question: string;
  round: number;
  sessionHistory: string;
  language: Language;
}
```

- [ ] **Step 4: 修改 reading 请求校验**

In `supabase/functions/reading/index.ts`, put a dedicated branch before advice/anchor validation:

```ts
  if (o.mode === "reading") {
    if (o.deckVersion !== "reflection-v1") return false;
    if (typeof o.cardName !== "string" || !o.cardName.trim()) return false;
    if (o.spreadType !== "single" && o.spreadType !== "reflection_triad") return false;
    if (!Array.isArray(o.cards) || ![1, 3].includes(o.cards.length)) return false;
    return o.cards.every((card) => {
      if (!card || typeof card !== "object") return false;
      const item = card as Record<string, unknown>;
      return typeof item.id === "string" && item.id.length <= 64 &&
        ["state", "relation", "movement"].includes(String(item.category)) &&
        typeof item.name === "string" && item.name.length <= 80 &&
        typeof item.coreMeaning === "string" && item.coreMeaning.length <= 240 &&
        typeof item.visibleLine === "string" && item.visibleLine.length <= 240 &&
        typeof item.hiddenLine === "string" && item.hiddenLine.length <= 240 &&
        Array.isArray(item.reflectionQuestions) && item.reflectionQuestions.length <= 3 &&
        Array.isArray(item.actionSeeds) && item.actionSeeds.length <= 3;
    });
  }
```

After this branch, keep existing `advice` and `anchor` orientation validation unchanged.

- [ ] **Step 5: 用原创反思提示词替换 reading prompt**

`supabase/functions/_shared/prompts/reading.ts` must:

1. format at most three structured cards;
2. delimit every dynamic value;
3. tell the model that card semantics are hypotheses, not facts;
4. require exactly four tokens;
5. keep dynamic context at the end for cache stability.

The Chinese instruction block must contain exactly:

```ts
格式必须严格遵守，每个 token 单独一行：

[REFLECTION]
（这张牌照见了什么：只连接用户已经表达的事实，不超过 55 个中文字）

[HIDDEN]
（可能被忽略的部分：使用“可能、也许、值得观察”，不替用户或他人定性，不超过 55 个中文字）

[VERIFY]
（可以怎样验证：给出一个观察问题或小实验，不超过 45 个中文字）

[ACTION]
（今天能做的一步：具体、可执行、可在今天或本周完成，不超过 40 个中文字）
```

The English block uses the same tokens with limits `180 / 180 / 150 / 120` characters. Remove all orientation formatting and the words “Tarot”, “正位”, “逆位”, “传统牌义”. Keep the existing concrete-topic boundary for food, sleep, work, and study.

- [ ] **Step 6: 更新 token validator 和旧契约测试**

Change:

```ts
reading: ["REFLECTION", "HIDDEN", "VERIFY", "ACTION"],
```

Update `tests/clarify-contract.test.mjs` and `tests/phase1-5-prompt-cache.test.mjs` to assert the four new tokens. Update `tests/phase4-spreads-gua-contract.test.mjs` to assert `single | reflection_triad` and two front-end spread choices while retaining old spread values only in history tests.

- [ ] **Step 7: 运行后端静态契约**

Run:

```powershell
node tests/reflection-reading-prompt-contract.test.mjs
node tests/clarify-contract.test.mjs
node tests/phase1-5-prompt-cache.test.mjs
node tests/phase4-spreads-gua-contract.test.mjs
```

Expected: all pass.

- [ ] **Step 8: 提交后端契约**

```powershell
git add supabase/functions/_shared/types.ts supabase/functions/_shared/prompts/reading.ts supabase/functions/_shared/token-validator.ts supabase/functions/reading/index.ts tests/reflection-reading-prompt-contract.test.mjs tests/clarify-contract.test.mjs tests/phase1-5-prompt-cache.test.mjs tests/phase4-spreads-gua-contract.test.mjs
git commit -m "feat: add reflection reading api contract"
```

---

### Task 6: 让历史记录同时保存新牌义快照和旧塔罗记录

**Files:**
- Modify: `assets/app/history-store.js:31-65,148-175`
- Modify: `tests/history-store.test.mjs`
- Modify: `tests/storage.test.mjs`
- Modify: `tests/sync.test.mjs`

- [ ] **Step 1: 为新旧记录各写一个回归用例**

Append to `tests/history-store.test.mjs`:

```js
const reflectionRecord = normalizeHistoryRecord({
  id: "reflection-1",
  mode: "tarot",
  title: "空椅｜等待别人先行动",
  question: "我还要继续等吗？",
  deckVersion: "reflection-v1",
  meaningVersion: "1.0.0",
  cards: [{
    id: "state-empty-chair",
    name: "空椅",
    category: "state",
    coreMeaning: "等待别人先行动，把决定权留在外部",
    visibleLine: "你已经察觉自己在等待一个回应、许可或先例",
    hiddenLine: "等待也许正在替你推迟一次本可由自己完成的选择",
    reflectionQuestions: ["如果对方今天不行动，你仍能决定什么？"],
    actionSeeds: ["给等待设置一个明确截止时间"],
    label: "现在最值得看见的是什么",
    position: "single",
    imageSrc: "./assets/cards/reflection-v1/state-empty-chair.webp",
    imageFallbackSrc: "./assets/cards/reflection-v1/fallback-state.svg",
    imageAlt: "空房中一把朝向半开门的旧木椅",
    deckVersion: "reflection-v1",
    meaningVersion: "1.0.0"
  }],
  answer: "[REFLECTION] 看见等待。",
  createdAt: "2026-07-21T00:00:00.000Z"
});
assert.equal(reflectionRecord.deckVersion, "reflection-v1");
assert.equal(reflectionRecord.meaningVersion, "1.0.0");
assert.equal(reflectionRecord.cards[0].id, "state-empty-chair");
assert.equal("orientation" in reflectionRecord.cards[0], false);

const legacyRecord = normalizeHistoryRecord({
  id: "legacy-1",
  mode: "tarot",
  cards: [{ name: "The Star", label: "Self", position: "self", orientation: "reversed", imageSrc: "./assets/cards/17-the-star.jpg" }],
  createdAt: "2026-07-20T00:00:00.000Z"
});
assert.equal(legacyRecord.cards[0].orientation, "reversed");
assert.equal(legacyRecord.cards[0].imageSrc, "./assets/cards/17-the-star.jpg");
```

- [ ] **Step 2: 运行测试确认新字段丢失**

Run:

```powershell
node tests/history-store.test.mjs
```

Expected: FAIL because `deckVersion`, `meaningVersion`, and `id` are not preserved.

- [ ] **Step 3: 扩展记录和卡片规范化**

In `normalizeHistoryRecord`, add:

```js
deckVersion: stringValue(record.deckVersion),
meaningVersion: stringValue(record.meaningVersion),
```

Replace `normalizeCards` return body with a branch:

```js
    const id = stringValue(item.id);
    if (id) {
      return {
        id,
        name: stringValue(item.name),
        category: ["state", "relation", "movement"].includes(item.category) ? item.category : "state",
        coreMeaning: stringValue(item.coreMeaning),
        visibleLine: stringValue(item.visibleLine),
        hiddenLine: stringValue(item.hiddenLine),
        reflectionQuestions: stringArray(item.reflectionQuestions),
        actionSeeds: stringArray(item.actionSeeds),
        label: stringValue(item.label),
        position: stringValue(item.position),
        imageSrc: stringValue(item.imageSrc),
        imageFallbackSrc: stringValue(item.imageFallbackSrc),
        imageAlt: stringValue(item.imageAlt),
        deckVersion: stringValue(item.deckVersion),
        meaningVersion: stringValue(item.meaningVersion)
      };
    }
    return {
      name: stringValue(item.name),
      label: stringValue(item.label),
      position: stringValue(item.position),
      orientation: item.orientation === "reversed" ? "reversed" : "upright",
      imageSrc: stringValue(item.imageSrc),
      imageAlt: stringValue(item.imageAlt)
    };
```

Add:

```js
function stringArray(value) {
  return Array.isArray(value) ? value.map((item) => stringValue(item)).filter(Boolean).slice(0, 3) : [];
}
```

Add `reflection_triad` to `normalizeSpreadType` while retaining all four old values. Do not add database columns in this phase. `historyRecordToRow` already sends the full card snapshot through the `cards` JSON; in `historyRecordFromRow`, derive record-level versions from that snapshot:

```js
deckVersion: row.cards?.[0]?.deckVersion || "",
meaningVersion: row.cards?.[0]?.meaningVersion || "",
```

- [ ] **Step 4: 运行历史、存储和同步测试**

Run:

```powershell
node tests/history-store.test.mjs
node tests/storage.test.mjs
node tests/sync.test.mjs
```

Expected: new reflection assertions pass and all old orientation assertions still pass.

- [ ] **Step 5: 提交兼容层**

```powershell
git add assets/app/history-store.js tests/history-store.test.mjs tests/storage.test.mjs tests/sync.test.mjs
git commit -m "feat: preserve reflection card meaning snapshots"
```

---

### Task 7: 将首页接到原创牌组，同时保持 index.html 为薄编排层

**Files:**
- Modify: `index.html:199-204,579-612,1307,1999-2046,3154-3360,3434-3450`
- Create: `tests/reflection-deck-index-contract.test.mjs`
- Modify: `assets/app/result-renderer.js:143-203`
- Modify: `tests/result-renderer.test.mjs`

- [ ] **Step 1: 写页面静态接线测试**

Create `tests/reflection-deck-index-contract.test.mjs`:

```js
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
assert.match(html, /REFLECTION_DECK/);
assert.match(html, /buildReflectionReadingRequest/);
assert.match(html, /completeReflectionReading/);
assert.match(html, /data-spread-type="reflection_triad"/);
assert.equal((html.match(/data-spread-type=/g) || []).length, 2);
assert.doesNotMatch(html, /TAROT_DECK/);
assert.doesNotMatch(html, /primaryCard\.orientation/);
assert.match(html, /imageFallbackSrc/);
assert.match(html, /meaningVersion/);

console.log("reflection deck index contract tests passed");
```

- [ ] **Step 2: 运行测试确认当前页面失败**

Run:

```powershell
node tests/reflection-deck-index-contract.test.mjs
```

Expected: FAIL on `REFLECTION_DECK` and `reflection_triad`.

- [ ] **Step 3: 把四个旧牌阵入口收敛为两个**

Replace the spread buttons with:

```html
<div class="spread-selector" id="spread-selector">
  <button type="button" class="is-selected" data-spread-type="single" data-i18n="spreadSingle">单牌</button>
  <button type="button" data-spread-type="reflection_triad" data-i18n="spreadReflectionTriad">三象</button>
</div>
```

Add translations:

```js
spreadReflectionTriad: "三象",
spreadPositionState: "我现在怎样",
spreadPositionRelation: "什么正在影响我",
spreadPositionMovement: "可以尝试怎样变化",
reflectionSeenLabel: "这张牌照见了什么",
reflectionHiddenLabel: "可能被忽略的部分",
reflectionVerifyLabel: "可以怎样验证",
reflectionActionLabel: "今天能做的一步"
```

and English equivalents:

```js
spreadReflectionTriad: "Three lenses",
spreadPositionState: "How am I now?",
spreadPositionRelation: "What is influencing me?",
spreadPositionMovement: "What change can I try?",
reflectionSeenLabel: "What this card reflects",
reflectionHiddenLabel: "What may be overlooked",
reflectionVerifyLabel: "How to test it",
reflectionActionLabel: "One step for today"
```

- [ ] **Step 4: 替换模块导入和牌组常量**

Remove `TAROT_DECK` and `cardKeywords` imports. Add:

```js
import { REFLECTION_CATEGORIES, REFLECTION_DECK } from "./assets/app/reflection-deck.js";
import {
  buildReflectionReadingRequest,
  completeReflectionReading
} from "./assets/app/reflection-reading.js";
```

Replace `const tarotDeck = TAROT_DECK;` with:

```js
const reflectionDeck = REFLECTION_DECK;
```

Update `buildRitualDeck` and `updateRitualCardLabels` to iterate over `reflectionDeck`.

Change `waitForCardChoice(positionLabel = "", excludedIndexes = [])` to accept the full position:

```js
async function waitForCardChoice(position = { key: "single", category: null, label: "" }, excludedIndexes = []) {
  const positionLabel = position.label || "";
```

In `playRitual`, call it with the same position object that will be saved:

```js
const selection = await waitForCardChoice(position, excludedIndexes);
excludedIndexes.push(selection.index);
selectedCards.push({ ...selection, position });
```

Inside `choose`, replace the old array access and JPG path with the exact position-aware card:

```js
const index = Number(selectedCard.dataset.cardIndex);
const selected = reflectionCardForSelection({ index, position });
const selectedFace = selectedCard.querySelector(".ritual-card-face");
if (selected && selectedFace) {
  selectedFace.style.backgroundImage = `url("${selected.imageSrc}")`;
}
```

Inside `confirmChoice`, resolve the selected index only; the semantic card is resolved once by `recordCardFromSelection` using the same position:

```js
const index = Number(selectedCard.dataset.cardIndex);
if (!Number.isInteger(index) || index < 0 || index >= reflectionDeck.length) {
  clearListeners();
  reject(new Error("Missing selected reflection card"));
  return;
}
clearListeners();
els.ritualPreviewActions.hidden = true;
selectedCard.disabled = true;
resolve({ index });
```

Import `reflectionCardForSelection` from `reflection-deck.js`. This guarantees that the card preview, final result, and saved record use the same category-aware card.

- [ ] **Step 5: 给牌面图片增加可靠降级**

Add one helper next to result image rendering:

```js
function showReflectionCardImage(card) {
  els.cardImage.onerror = () => {
    if (els.cardImage.dataset.fallbackApplied === "true") return;
    els.cardImage.dataset.fallbackApplied = "true";
    els.cardImage.src = card.imageFallbackSrc;
  };
  els.cardImage.dataset.fallbackApplied = "false";
  els.cardImage.src = card.imageSrc;
  els.cardImage.alt = card.imageAlt;
  els.symbolCard.dataset.cardCategory = card.category;
}
```

Use it in both tarot and dual branches.

- [ ] **Step 6: 用请求模块替换 index.html 内联 payload**

In tarot mode:

```js
const selectedCards = ritualResult.cards.map((selection) => recordCardFromSelection(selection));
const primaryCard = primaryCardFromRecordCards(selectedCards);
showReflectionCardImage(primaryCard);
els.answerKicker.textContent = `${t("modeTarot")} · ${spreadDisplayName(ritualResult.spreadType)} · ${primaryCard.name}`;
const request = buildReflectionReadingRequest({
  cards: selectedCards,
  question,
  language: lang,
  entry: "tarot",
  sessionHistory: clarificationHistoryText(pendingClarificationContext)
});
const full = await streamReading(request, renderAction);
const readingParts = completeReflectionReading(full, selectedCards, lang);
```

In dual mode, call the same builder with `entry: "dual"` and one card. Do not send `orientation`.

- [ ] **Step 7: 将四段结果映射到现有结果结构**

Use the existing three-card grid plus action block; do not create a second result page. Replace `renderTarotReading` with:

```js
function renderReflectionReading(parts) {
  showTarotReading({
    cardMessage: parts.reflection,
    stuckText: parts.hidden,
    judgment: parts.verify
  });
  lastAction = parts.action;
  els.action.textContent = parts.action;
  return parts;
}
```

For a reflection record, build:

```js
const report = {
  summary: readingParts.reflection,
  tarotText: readingParts.hidden,
  dualText: readingParts.verify,
  actionText: readingParts.action,
  questionText: question,
  sourceMode: "tarot"
};
```

Save `deckVersion`, `meaningVersion`, the structured `cards`, and the full AI text. For legacy records, `reportFromRecord` must retain the existing `CORE_QUESTION/TENSION/JUDGMENT/ACTION/AVOID/WATCH` branch. Add a new branch when `record.deckVersion === "reflection-v1"` that reads `REFLECTION/HIDDEN/VERIFY/ACTION` and falls back to the saved card snapshot.

- [ ] **Step 8: 更新结果标签而不改动梅花和旧历史标签**

When the current record has `deckVersion === "reflection-v1"`, set the three reading grid labels to `reflectionSeenLabel`, `reflectionHiddenLabel`, `reflectionVerifyLabel`, and the action heading to `reflectionActionLabel`. When showing a legacy record, keep current tarot labels. This condition prevents old journey pages from acquiring misleading new labels.

- [ ] **Step 9: 运行接线、渲染和语法测试**

Run:

```powershell
node tests/reflection-deck-index-contract.test.mjs
node tests/result-renderer.test.mjs
node --experimental-vm-modules tests/index-syntax.test.mjs
node tests/index-display-contract.test.mjs
```

Expected: all pass; `index.html` no longer imports `TAROT_DECK` and no new reading payload contains `orientation`.

- [ ] **Step 10: 提交页面接线**

```powershell
git add index.html assets/app/result-renderer.js tests/reflection-deck-index-contract.test.mjs tests/result-renderer.test.mjs
git commit -m "feat: connect original reflection deck to reading flow"
```

---

### Task 8: 实现独立卡背样式、三类标识和缺图占位

**Files:**
- Create: `assets/cards/reflection-v1/fallback-state.svg`
- Create: `assets/cards/reflection-v1/fallback-relation.svg`
- Create: `assets/cards/reflection-v1/fallback-movement.svg`
- Create: `assets/styles/reflection-deck.css`
- Modify: `index.html:34-36`
- Modify: `tests/observation-theme-contract.test.mjs`

- [ ] **Step 1: 先写主题契约**

Read `assets/styles/reflection-deck.css` in the test and add:

```js
assert.match(css, /--reflection-state:/);
assert.match(css, /--reflection-relation:/);
assert.match(css, /--reflection-movement:/);
assert.match(css, /\.ritual-card-back::before/);
assert.match(css, /\.ritual-card-back::after/);
assert.match(css, /data-card-category="state"/);
assert.match(css, /prefers-reduced-motion: reduce/);
```

- [ ] **Step 2: 运行测试确认新标记缺失**

Run:

```powershell
node tests/observation-theme-contract.test.mjs
```

Expected: FAIL on `--reflection-state`.

- [ ] **Step 3: 创建三个确定性的 SVG 占位**

Create `assets/cards/reflection-v1/fallback-state.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 800" role="img" aria-label="State reflection card fallback">
  <rect width="500" height="800" rx="28" fill="#101923"/>
  <rect x="22" y="22" width="456" height="756" rx="20" fill="none" stroke="#9aa8b6" stroke-opacity=".34"/>
  <path d="M155 246 245 206v330l-90 46zM285 284l68-30v250l-68 34z" fill="#71869a" fill-opacity=".38" stroke="#9aa8b6" stroke-opacity=".7"/>
  <circle cx="265" cy="404" r="6" fill="#71869a"/>
</svg>
```

Create `assets/cards/reflection-v1/fallback-relation.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 800" role="img" aria-label="Relation reflection card fallback">
  <rect width="500" height="800" rx="28" fill="#101923"/>
  <rect x="22" y="22" width="456" height="756" rx="20" fill="none" stroke="#9aa8b6" stroke-opacity=".34"/>
  <path d="M155 246 245 206v330l-90 46zM285 284l68-30v250l-68 34z" fill="#9aa8b6" fill-opacity=".22" stroke="#9aa8b6" stroke-opacity=".7"/>
  <circle cx="265" cy="404" r="6" fill="#c85a50"/>
</svg>
```

Create `assets/cards/reflection-v1/fallback-movement.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 800" role="img" aria-label="Movement reflection card fallback">
  <rect width="500" height="800" rx="28" fill="#101923"/>
  <rect x="22" y="22" width="456" height="756" rx="20" fill="none" stroke="#9aa8b6" stroke-opacity=".34"/>
  <path d="M155 246 245 206v330l-90 46zM285 284l68-30v250l-68 34z" fill="#6f998d" fill-opacity=".38" stroke="#9aa8b6" stroke-opacity=".7"/>
  <circle cx="265" cy="404" r="6" fill="#6f998d"/>
</svg>
```

- [ ] **Step 4: 添加主题 token 和卡背**

Create `assets/styles/reflection-deck.css` with:

```css
:root {
  --reflection-state: #71869a;
  --reflection-relation: #c85a50;
  --reflection-movement: #6f998d;
}

.ritual-card-back {
  background:
    linear-gradient(135deg, rgba(255,255,255,.025), transparent 42%),
    #0e1722;
  border: 1px solid rgba(154, 168, 182, .28);
  box-shadow: inset 0 0 0 5px #0e1722, inset 0 0 0 6px rgba(154, 168, 182, .12);
}

.ritual-card-back::before,
.ritual-card-back::after {
  content: "";
  position: absolute;
  top: 34%;
  width: 22%;
  height: 32%;
  border: 1px solid rgba(233, 227, 215, .36);
}

.ritual-card-back::before { left: 24%; transform: skewY(-8deg); }
.ritual-card-back::after { right: 24%; transform: skewY(8deg); }

.ritual-card-3d::after {
  content: "";
  position: absolute;
  left: 50%;
  top: 50%;
  width: 5px;
  height: 5px;
  background: #c85a50;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 0 rgba(200, 90, 80, 0);
  transition: box-shadow 180ms ease, background-color 180ms ease;
}

.ritual-card:is(:hover, :focus-visible, .is-selected) .ritual-card-3d::after {
  box-shadow: 0 0 16px rgba(200, 90, 80, .36);
}

.symbol-card[data-card-category="state"] { --card-category: var(--reflection-state); }
.symbol-card[data-card-category="relation"] { --card-category: var(--reflection-relation); }
.symbol-card[data-card-category="movement"] { --card-category: var(--reflection-movement); }

@media (prefers-reduced-motion: reduce) {
  .ritual-card,
  .ritual-card-3d,
  .tarot-reading-grid section { transition: opacity 80ms linear !important; transform: none !important; }
}
```

Link it after the active theme so this module owns only its card-specific selectors:

```html
<link rel="stylesheet" href="./styles.css?v=20260605-low-light-redesign-2" />
<link rel="stylesheet" href="./theme-observation.css?v=20260716-cardback-v2" />
<link rel="stylesheet" href="./assets/styles/reflection-deck.css?v=20260721-reflection-v1" />
```

- [ ] **Step 5: 运行主题和移动端测试**

Run:

```powershell
node tests/observation-theme-contract.test.mjs
node tests/phase1-mobile-css.test.mjs
```

Expected: both pass.

- [ ] **Step 6: 提交视觉壳层**

```powershell
git add assets/cards/reflection-v1/fallback-state.svg assets/cards/reflection-v1/fallback-relation.svg assets/cards/reflection-v1/fallback-movement.svg assets/styles/reflection-deck.css tests/observation-theme-contract.test.mjs
git add -p index.html
git commit -m "feat: add reflection card visual shell"
```

---

### Task 9: 准备 ChatGPT Image 2 正式原画生产包

**Files:**
- Create: `docs/design/reflection-deck-v1/image2-prompts.md`
- Add after approval: `assets/cards/reflection-v1/*.webp`

- [ ] **Step 1: 写统一母提示词**

The document must start with this reusable prompt:

```text
为 AskAura 原创 AI 反思牌组绘制一张竖版 5:8 原画。成熟、原创的日系手绘动画视觉语言，自然简洁线条，柔和水粉与透明水彩叠色，轻微纸张肌理。基础色为深靛蓝、灰蓝、旧木色、象牙灰；暗部保留蓝色层次，不压成纯黑。画面严格只有一个主要主体、一个与主体发生关系的次要元素，60%—70% 安静留白；第一眼识别主体，第二眼发现关系中的异常。暖色只允许出现在真正承载含义的关系节点。画内不要文字、标题、编号、Logo、边框或 UI。

禁止：模仿任何具体导演、工作室、动画、游戏或画师；照片写实、3D、厚重油画、手游宣传图；传统塔罗符号、宗教神像、魔法阵、星座；黑雾、发光粒子、巨大门扉、红色方块；多人群像、建筑群、复杂叙事、多重动作、装饰性神秘元素。

请先保证 64px 缩略图仍能看清主体关系，再处理细节。
```

- [ ] **Step 2: 为 12 张牌写独立追加段**

Use each card's `visualBrief` verbatim, then append one composition instruction:

```text
构图要求：主体占画面高度 25%—38%，异常关系位于视觉中心附近但不完全居中；上方和侧面保留可用于网页叠加类别与牌名的安静区域。只生成一张原画，不生成对比板、卡片样机或排版页。
```

The output filenames are fixed:

```text
state-empty-chair.webp
state-bottled-rain.webp
state-full-cup.webp
state-fog-window.webp
relation-reverse-shadow.webp
relation-one-way-bridge.webp
relation-borrowed-umbrella.webp
relation-wrong-key.webp
movement-unlit-lantern.webp
movement-loosened-knot.webp
movement-side-door.webp
movement-low-tide-steps.webp
```

- [ ] **Step 3: 进行 4 张风格校准，不先批量生成 12 张**

Generate only `空椅`, `逆影`, `未燃灯`, `雾窗`. Accept a direction only when all four satisfy:

- 64px 能辨认主体关系；
- 没有第二主角或背景剧情；
- 暖色面积低于画面 3%；
- 四张像同一套牌但不靠同一种构图；
- 不含任何文字、边框、Logo、魔法符号；
- 用户书面确认风格方向。

- [ ] **Step 4: 生成余下 8 张并统一导出**

After the four-card review, generate the remaining eight with the exact same mother prompt. Crop only to 5:8; do not repaint content during export. Export WebP at `1000 x 1600`, quality `82–88`, each target file under `450 KB`.

- [ ] **Step 5: 检查文件尺寸和命名**

Run:

```powershell
Get-ChildItem assets/cards/reflection-v1/*.webp | Select-Object Name, Length
```

Expected: exactly 12 WebP files, all names match the list, each length is below `460800` bytes.

- [ ] **Step 6: 提交提示词与已确认原画**

```powershell
git add docs/design/reflection-deck-v1/image2-prompts.md assets/cards/reflection-v1/*.webp
git commit -m "assets: add reflection deck v1 artwork"
```

---

### Task 10: 全流程验收与性能回归

**Files:**
- Test: `tests/*.test.mjs`
- Verify: `index.html`
- Verify: `theme-observation.css`

- [ ] **Step 1: 运行项目规定的全部本地测试**

Run:

```powershell
node --experimental-vm-modules tests/index-syntax.test.mjs
node tests/askaura-migration-static.test.mjs
node tests/clarify-contract.test.mjs
node tests/meihua.test.mjs
node tests/phase1-mobile-css.test.mjs
node tests/storage.test.mjs
node tests/sync.test.mjs
node tests/reflection-deck.test.mjs
node tests/reflection-reading.test.mjs
node tests/reflection-deck-index-contract.test.mjs
node tests/reflection-reading-prompt-contract.test.mjs
node tests/ritual-engine.test.mjs
node tests/result-renderer.test.mjs
node tests/history-store.test.mjs
node tests/observation-theme-contract.test.mjs
```

Expected: every command exits `0`.

- [ ] **Step 2: 启动本地站点**

Run:

```powershell
python -m http.server 5174 --directory D:\CursorAgentChats\askaura
```

Open: `http://127.0.0.1:5174/index.html`.

- [ ] **Step 3: 验收单牌路径**

At desktop width `1440px`:

1. 输入“我该不该继续等回复？”；
2. 选择“单牌”；
3. 完成抽牌；
4. 确认无正逆位文字；
5. 确认显示意象名和分类；
6. 确认结果完整显示“照见 / 忽略 / 验证 / 一步”；
7. 断网重试，确认本地牌义补齐四段而不是出现空白按钮。

- [ ] **Step 4: 验收三象路径**

1. 选择“三象”；
2. 确认依次得到状态、关系、动势三类且无重复 ID；
3. 确认结果页列出三张牌和各自位置；
4. 确认 AI 不宣称知道他人内心；
5. 确认最后一步可在今天或本周完成。

- [ ] **Step 5: 验收兼容路径**

1. 从旅程打开一条旧塔罗记录；
2. 确认旧 JPG、正逆位和旧标签仍可显示；
3. 打开一条新原创牌记录；
4. 确认使用保存时的 `meaningVersion` 语义快照；
5. 检查梅花、双象、每日记录、追问、复盘、分享仍可操作。

- [ ] **Step 6: 验收移动端和减少动态**

At `390 x 844` and with `prefers-reduced-motion: reduce`:

- 卡牌不横向溢出；
- 结果四段不用横向滚动；
- 翻牌改为淡入，无大幅 3D 运动；
- 所有按钮都可点击、关闭面板按钮可用；
- 深夜、浅色、单色三主题下文字对比可读。

- [ ] **Step 7: 检查资源和运行性能**

In browser Network/Performance:

- 首屏不预载 12 张大图；
- 牌图只在选中或结果展示时加载；
- 无连续大面积 blur/filter 动画；
- 一次抽牌过程中无持续超过 100ms 的主线程长任务；
- 图片失败只请求一次 fallback，不产生循环请求。

- [ ] **Step 8: 最终提交**

```powershell
git status --short
git add assets/app/reflection-deck.js assets/app/reflection-reading.js assets/app/ritual-engine.js assets/app/result-renderer.js assets/app/history-store.js assets/styles/reflection-deck.css assets/cards/reflection-v1 docs/design/reflection-deck-v1/image2-prompts.md tests/reflection-deck.test.mjs tests/reflection-reading.test.mjs tests/reflection-deck-index-contract.test.mjs tests/reflection-reading-prompt-contract.test.mjs tests/ritual-engine.test.mjs tests/result-renderer.test.mjs tests/history-store.test.mjs tests/storage.test.mjs tests/sync.test.mjs tests/clarify-contract.test.mjs tests/phase4-spreads-gua-contract.test.mjs tests/phase1-5-prompt-cache.test.mjs tests/observation-theme-contract.test.mjs supabase/functions/_shared/types.ts supabase/functions/_shared/prompts/reading.ts supabase/functions/_shared/token-validator.ts supabase/functions/reading/index.ts
git add -p index.html
git commit -m "feat: ship AskAura original reflection deck"
```

Expected: `git status --short` after commit still shows only the user's pre-existing unrelated changes, if any.

---

## 完成标准

- 新用户路径中不再出现传统塔罗牌名、编号或正逆位。
- 单牌与三象牌阵均使用 12 张原创牌数据。
- 每次 AI 解读都有四段；缺段和断网时由本地已审核语义补齐。
- 新历史保存牌 ID、牌组版本、牌义版本和牌义快照。
- 旧历史、旧图片和旧牌阵值继续可读。
- 牌图缺失时显示有设计的分类占位，不出现空白卡。
- 卡背和交互符合深靛蓝、双界细框、微小关系节点和减少动态规则。
- 12 张 Image 2 原画通过 4 张风格校准后再批量完成。
- 全部本地测试、桌面、移动端、三主题、断网和旧历史路径通过。
