export const REFLECTION_DECK_VERSION = "reflection-v1";
export const REFLECTION_MEANING_VERSION = "1.0.0";

export const REFLECTION_CATEGORIES = Object.freeze({
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

const makeCard = (card) => Object.freeze({
  ...card,
  deckVersion: REFLECTION_DECK_VERSION,
  meaningVersion: REFLECTION_MEANING_VERSION,
});

export const REFLECTION_DECK = Object.freeze([
  makeCard({
    id: "state-empty-chair",
    category: "state",
    imageNameZh: "空椅",
    imageNameEn: "Empty Chair",
    coreMeaningZh: "等待别人先行动，把决定权留在外部",
    coreMeaningEn: "Waiting for someone else to act while leaving the decision outside yourself",
    visibleLineZh: "你已经察觉自己在等待一个回应、许可或先例",
    visibleLineEn: "You already notice that you are waiting for a reply, permission, or precedent",
    hiddenLineZh: "等待也许正在替你推迟一次本可由自己完成的选择",
    hiddenLineEn: "The waiting may be postponing a choice you could make yourself",
    reflectionQuestionsZh: ["如果对方今天不行动，你仍能决定什么？", "你在等的是信息，还是被允许开始？"],
    reflectionQuestionsEn: [
      "If they do not act today, what can you still decide?",
      "Are you waiting for information, or permission to begin?",
    ],
    actionSeedsZh: ["写下一个不依赖他人回应也能完成的动作", "给等待设置一个明确截止时间"],
    actionSeedsEn: [
      "Write one action that does not depend on another person's reply",
      "Give the waiting a clear deadline",
    ],
    visualBrief: "一把旧木椅朝向半开的门，门帘被风吹进空房；构图仅含一个主要主体与一个异常关系，保留 65% 安静留白；采用蓝调夜幕手绘动画语言，暖色只用于关系节点",
    imageSrc: "./assets/cards/reflection-v1/state-empty-chair.webp",
    imageAltZh: "空房中一把朝向半开门的旧木椅",
    imageAltEn: "An old wooden chair facing a half-open door in an empty room",
    prohibitedClaims: ["对方一定会回来", "等待会带来好运"],
  }),
  makeCard({
    id: "state-bottled-rain",
    category: "state",
    imageNameZh: "瓶中雨",
    imageNameEn: "Rain in a Bottle",
    coreMeaningZh: "情绪持续发生，却没有流向可以承接它的地方",
    coreMeaningEn: "Emotion keeps happening without a place that can receive it",
    visibleLineZh: "你知道某种感受一直没有真正过去",
    visibleLineEn: "You know a feeling has not actually passed",
    hiddenLineZh: "问题也许不是感受太多，而是它从未被命名或安放",
    hiddenLineEn: "The issue may not be too much feeling, but that it has never been named or placed",
    reflectionQuestionsZh: ["这份感受最需要被谁听见？", "如果不用解释原因，你会怎样命名它？"],
    reflectionQuestionsEn: [
      "Who most needs to hear this feeling?",
      "Without explaining why, how would you name it?",
    ],
    actionSeedsZh: ["用一句不分析原因的话写下此刻的感受", "为这份情绪安排十分钟不被打断的空间"],
    actionSeedsEn: [
      "Write the feeling in one sentence without analysing its cause",
      "Give this emotion ten uninterrupted minutes",
    ],
    visualBrief: "透明玻璃瓶中悬着一小片下雨的灰云，瓶外桌面干燥；构图仅含一个主要主体与一个异常关系，保留 65% 安静留白；采用蓝调夜幕手绘动画语言，暖色只用于关系节点",
    imageSrc: "./assets/cards/reflection-v1/state-bottled-rain.webp",
    imageAltZh: "玻璃瓶中一小片正在下雨的云",
    imageAltEn: "A small rain cloud raining inside a glass bottle",
    prohibitedClaims: ["情绪预示坏事", "压抑一定来自童年"],
  }),
  makeCard({
    id: "state-full-cup",
    category: "state",
    imageNameZh: "满杯",
    imageNameEn: "Full Cup",
    coreMeaningZh: "容量接近边界，却仍在继续接收",
    coreMeaningEn: "Capacity is near its limit while more keeps arriving",
    visibleLineZh: "你已经感到疲惫、拥挤或难以继续吸收",
    visibleLineEn: "You already feel tired, crowded, or unable to take in more",
    hiddenLineZh: "真正缺少的也许不是能力，而是停止接收的许可",
    hiddenLineEn: "What may be missing is not ability, but permission to stop receiving",
    reflectionQuestionsZh: ["现在新增的哪一件事最不值得进入杯中？", "谁默认你还可以继续承接？"],
    reflectionQuestionsEn: [
      "What new thing least deserves room in the cup now?",
      "Who assumes you can keep carrying more?",
    ],
    actionSeedsZh: ["今天明确拒绝或延期一件新增事项", "列出一个必须保留的空白时段"],
    actionSeedsEn: ["Decline or defer one new request today", "Reserve one block of time that must stay empty"],
    visualBrief: "一只几乎溢出的陶杯仍接住上方最后一滴水；构图仅含一个主要主体与一个异常关系，保留 65% 安静留白；采用蓝调夜幕手绘动画语言，暖色只用于关系节点",
    imageSrc: "./assets/cards/reflection-v1/state-full-cup.webp",
    imageAltZh: "一只满到将要溢出的陶杯仍在接住水滴",
    imageAltEn: "A ceramic cup about to overflow while still receiving a drop",
    prohibitedClaims: ["你必然会崩溃", "继续坚持就一定成功"],
  }),
  makeCard({
    id: "state-fog-window",
    category: "state",
    imageNameZh: "雾窗",
    imageNameEn: "Fogged Window",
    coreMeaningZh: "并非没有答案，而是当前视角无法看清",
    coreMeaningEn: "The answer may exist, while the current viewpoint cannot see it clearly",
    visibleLineZh: "你已经知道自己缺少足够清楚的信息",
    visibleLineEn: "You already know that the information is not clear enough",
    hiddenLineZh: "你也许正把看不清误当成必须马上猜对",
    hiddenLineEn: "You may be treating uncertainty as a demand to guess correctly now",
    reflectionQuestionsZh: ["哪个事实一旦补齐，判断会明显改变？", "你可以换位置看，而不是继续擦同一块玻璃吗？"],
    reflectionQuestionsEn: [
      "Which missing fact would materially change the judgment?",
      "Can you change position instead of wiping the same patch of glass?",
    ],
    actionSeedsZh: ["只补一个最关键的信息再决定", "把事实、猜测和担心分成三列"],
    actionSeedsEn: ["Get one critical fact before deciding", "Separate facts, guesses, and worries into three columns"],
    visualBrief: "一扇起雾的窗只被擦开很小一角，窗外轮廓模糊；构图仅含一个主要主体与一个异常关系，保留 65% 安静留白；采用蓝调夜幕手绘动画语言，暖色只用于关系节点",
    imageSrc: "./assets/cards/reflection-v1/state-fog-window.webp",
    imageAltZh: "起雾的窗上只有一小块被擦清",
    imageAltEn: "A fogged window with only one small clear patch",
    prohibitedClaims: ["直觉一定正确", "答案会自动出现"],
  }),
  makeCard({
    id: "relation-reverse-shadow",
    category: "relation",
    imageNameZh: "逆影",
    imageNameEn: "Contrary Shadow",
    coreMeaningZh: "外在方向与内在意愿并不一致",
    coreMeaningEn: "The outward direction and inner intention do not align",
    visibleLineZh: "你察觉言语、动作或承诺之间存在不一致",
    visibleLineEn: "You notice a mismatch between words, actions, or commitments",
    hiddenLineZh: "不一致也可能发生在你自己身上，而不只在对方",
    hiddenLineEn: "The mismatch may also be yours, not only the other person's",
    reflectionQuestionsZh: ["哪个动作最能代表真实方向？", "你说想要的，和你正在保护的是同一件事吗？"],
    reflectionQuestionsEn: [
      "Which action best represents the real direction?",
      "Is what you say you want the same as what you are protecting?",
    ],
    actionSeedsZh: ["对照一句表态和一个真实动作", "把自己的希望与实际投入分别写下"],
    actionSeedsEn: ["Compare one statement with one real action", "Write your hope and your actual investment separately"],
    visualBrief: "一个站立人物朝左，地面影子却朝右；构图仅含一个主要主体与一个异常关系，保留 65% 安静留白；采用蓝调夜幕手绘动画语言，暖色只用于关系节点",
    imageSrc: "./assets/cards/reflection-v1/relation-reverse-shadow.webp",
    imageAltZh: "人物与影子朝向相反的空旷地面",
    imageAltEn: "A figure and shadow pointing in opposite directions on open ground",
    prohibitedClaims: ["对方在欺骗你", "影子代表真实人格"],
  }),
  makeCard({
    id: "relation-one-way-bridge",
    category: "relation",
    imageNameZh: "单向桥",
    imageNameEn: "One-way Bridge",
    coreMeaningZh: "有人不断靠近，但关系没有形成真正交汇",
    coreMeaningEn: "Someone keeps approaching, but the relationship does not form a true meeting",
    visibleLineZh: "你已经感到投入和回应并不对等",
    visibleLineEn: "You already feel that effort and response are not balanced",
    hiddenLineZh: "持续靠近也许正在代替一次关于边界的确认",
    hiddenLineEn: "Continued approach may be replacing a needed boundary check",
    reflectionQuestionsZh: ["什么才算一次真实的相向行动？", "如果你停一步，关系还会移动吗？"],
    reflectionQuestionsEn: [
      "What would count as a real movement toward each other?",
      "If you stop for one step, does the relationship still move?",
    ],
    actionSeedsZh: ["暂停一次主动推进，观察是否出现对等回应", "把你需要的最低回应说具体"],
    actionSeedsEn: [
      "Pause one proactive move and observe whether reciprocity appears",
      "State the minimum response you need in concrete terms",
    ],
    visualBrief: "一座窄桥从近岸伸向远岸，却在抵达前缺少最后一段；构图仅含一个主要主体与一个异常关系，保留 65% 安静留白；采用蓝调夜幕手绘动画语言，暖色只用于关系节点",
    imageSrc: "./assets/cards/reflection-v1/relation-one-way-bridge.webp",
    imageAltZh: "一座在抵达对岸前中断的窄桥",
    imageAltEn: "A narrow bridge that stops just before reaching the far bank",
    prohibitedClaims: ["对方不爱你", "停止联系就会得到答案"],
  }),
  makeCard({
    id: "relation-borrowed-umbrella",
    category: "relation",
    imageNameZh: "借来的伞",
    imageNameEn: "Borrowed Umbrella",
    coreMeaningZh: "依靠一种保护，同时接受它附带的条件",
    coreMeaningEn: "Relying on protection while accepting the conditions attached to it",
    visibleLineZh: "你知道这份帮助并非完全没有代价",
    visibleLineEn: "You know this help is not entirely without cost",
    hiddenLineZh: "保护也许正在让你回避建立自己的承受方式",
    hiddenLineEn: "The protection may be delaying your own way of coping",
    reflectionQuestionsZh: ["这把伞要求你交换什么？", "如果归还它，你最先需要准备什么？"],
    reflectionQuestionsEn: [
      "What does this umbrella ask in exchange?",
      "If you returned it, what would you need to prepare first?",
    ],
    actionSeedsZh: ["写清这份帮助的边界和交换条件", "独立完成其中最小的一部分"],
    actionSeedsEn: ["Write down the boundary and terms of this help", "Complete the smallest part independently"],
    visualBrief: "一个人撑着明显过大的旧伞，伞柄系着通向画外的细线；构图仅含一个主要主体与一个异常关系，保留 65% 安静留白；采用蓝调夜幕手绘动画语言，暖色只用于关系节点",
    imageSrc: "./assets/cards/reflection-v1/relation-borrowed-umbrella.webp",
    imageAltZh: "一把借来的大伞，伞柄上系着通向画外的线",
    imageAltEn: "A borrowed large umbrella with a line tied to its handle leading out of frame",
    prohibitedClaims: ["帮助者一定在控制你", "依赖本身是错误"],
  }),
  makeCard({
    id: "relation-wrong-key",
    category: "relation",
    imageNameZh: "错钥",
    imageNameEn: "Wrong Key",
    coreMeaningZh: "双方都在尝试打开关系，却使用了不同的理解方式",
    coreMeaningEn: "Both sides are trying to open the relationship with different understandings",
    visibleLineZh: "你已经发现努力并没有转化为被理解",
    visibleLineEn: "You already see that effort has not become understanding",
    hiddenLineZh: "问题也许不是不够努力，而是彼此用不同标准判断靠近",
    hiddenLineEn: "The issue may not be insufficient effort, but different standards for what closeness means",
    reflectionQuestionsZh: ["你以为的回应，在对方那里是什么？", "双方分别把什么当作门被打开的证据？"],
    reflectionQuestionsEn: [
      "What does your idea of response mean to the other person?",
      "What does each side count as evidence that the door is open?",
    ],
    actionSeedsZh: ["用一个具体例子确认双方对同一句话的理解", "停止重复同一种无效表达一次"],
    actionSeedsEn: [
      "Use one concrete example to compare what the same phrase means to both sides",
      "Stop repeating one ineffective form of expression once",
    ],
    visualBrief: "一把钥匙已插入锁孔却齿形不合，锁与钥匙之间留有微小偏差；构图仅含一个主要主体与一个异常关系，保留 65% 安静留白；采用蓝调夜幕手绘动画语言，暖色只用于关系节点",
    imageSrc: "./assets/cards/reflection-v1/relation-wrong-key.webp",
    imageAltZh: "插入锁孔但齿形不合的钥匙",
    imageAltEn: "A key inserted into a lock but cut for a different shape",
    prohibitedClaims: ["双方天生不合", "沟通一定能解决一切"],
  }),
  makeCard({
    id: "movement-unlit-lantern",
    category: "movement",
    imageNameZh: "未燃灯",
    imageNameEn: "Unlit Lantern",
    coreMeaningZh: "已经拥有资源或能力，但尚未主动使用",
    coreMeaningEn: "A resource or ability is available but not yet being used",
    visibleLineZh: "你知道自己并非完全没有办法",
    visibleLineEn: "You know you are not entirely without options",
    hiddenLineZh: "未行动也许来自对开始方式要求过高",
    hiddenLineEn: "Inaction may come from demanding too perfect a beginning",
    reflectionQuestionsZh: ["哪一种能力已经足够开始，而不必更完整？", "你在等火，还是不愿承认自己可以点灯？"],
    reflectionQuestionsEn: [
      "Which ability is already enough to begin?",
      "Are you waiting for fire, or avoiding admitting you can light the lamp?",
    ],
    actionSeedsZh: ["用现有资源完成一个五分钟版本", "列出你手边已经具备的三样东西"],
    actionSeedsEn: ["Make a five-minute version with what you already have", "List three resources already within reach"],
    visualBrief: "一盏未点燃的手提灯旁放着一根可用的火柴；构图仅含一个主要主体与一个异常关系，保留 65% 安静留白；采用蓝调夜幕手绘动画语言，暖色只用于关系节点",
    imageSrc: "./assets/cards/reflection-v1/movement-unlit-lantern.webp",
    imageAltZh: "未点燃的提灯旁放着一根火柴",
    imageAltEn: "An unlit lantern with a single match beside it",
    prohibitedClaims: ["机会马上到来", "你拥有尚未觉醒的神秘力量"],
  }),
  makeCard({
    id: "movement-loosened-knot",
    category: "movement",
    imageNameZh: "松结",
    imageNameEn: "Loosened Knot",
    coreMeaningZh: "改变不一定需要切断，也可以先降低束缚",
    coreMeaningEn: "Change may begin by reducing constraint rather than cutting everything off",
    visibleLineZh: "你已经觉得目前的连接太紧或太耗力",
    visibleLineEn: "You already feel the current connection is too tight or demanding",
    hiddenLineZh: "你也许把继续和离开误当成仅有的两个选项",
    hiddenLineEn: "You may be treating staying and leaving as the only two options",
    reflectionQuestionsZh: ["怎样调整能让关系先恢复呼吸？", "哪个约束可以减半，而不必归零？"],
    reflectionQuestionsEn: [
      "What adjustment would let the relationship breathe?",
      "Which constraint can be halved without becoming zero?",
    ],
    actionSeedsZh: ["把一个过紧的规则改成可协商范围", "减少一次不必要的解释或承诺"],
    actionSeedsEn: [
      "Turn one rigid rule into a negotiable range",
      "Reduce one unnecessary explanation or promise",
    ],
    visualBrief: "一根完整绳索上只有一个正在松开的结，绳结未断；构图仅含一个主要主体与一个异常关系，保留 65% 安静留白；采用蓝调夜幕手绘动画语言，暖色只用于关系节点",
    imageSrc: "./assets/cards/reflection-v1/movement-loosened-knot.webp",
    imageAltZh: "一根没有断裂、正在慢慢松开的绳结",
    imageAltEn: "An intact rope with a knot slowly loosening",
    prohibitedClaims: ["必须彻底切断", "放手后一切都会变好"],
  }),
  makeCard({
    id: "movement-side-door",
    category: "movement",
    imageNameZh: "侧门",
    imageNameEn: "Side Door",
    coreMeaningZh: "当前路径不是唯一入口",
    coreMeaningEn: "The current path is not the only entrance",
    visibleLineZh: "你已经发现正面推进反复受阻",
    visibleLineEn: "You already see that the direct route keeps meeting resistance",
    hiddenLineZh: "坚持正门也许是在维护一种体面，而不是目标本身",
    hiddenLineEn: "Insisting on the front entrance may protect an image rather than the goal",
    reflectionQuestionsZh: ["如果不证明自己，你会换哪一种进入方式？", "真正的目标允许哪些替代路径？"],
    reflectionQuestionsEn: [
      "If you did not need to prove yourself, which entrance would you try?",
      "What alternative routes does the real goal allow?",
    ],
    actionSeedsZh: ["为同一目标列出一个非正面的入口", "向一个不同角色询问可行路径"],
    actionSeedsEn: ["List one indirect entrance to the same goal", "Ask someone in a different role about a workable route"],
    visualBrief: "高墙上的正门紧闭，画面边缘却有一扇小侧门透出微光；构图仅含一个主要主体与一个异常关系，保留 65% 安静留白；采用蓝调夜幕手绘动画语言，暖色只用于关系节点",
    imageSrc: "./assets/cards/reflection-v1/movement-side-door.webp",
    imageAltZh: "紧闭正门旁一扇透出微光的小侧门",
    imageAltEn: "A small lit side door beside a closed main entrance",
    prohibitedClaims: ["替代路径必然成功", "有人会暗中帮助你"],
  }),
  makeCard({
    id: "movement-low-tide-steps",
    category: "movement",
    imageNameZh: "退潮阶",
    imageNameEn: "Low-tide Steps",
    coreMeaningZh: "暂停推进后，原本被覆盖的下一步才会出现",
    coreMeaningEn: "When forward pressure pauses, a previously covered next step can appear",
    visibleLineZh: "你已经感觉继续用力没有增加清晰度",
    visibleLineEn: "You already feel that more force is not creating more clarity",
    hiddenLineZh: "停下也许不是退步，而是在等待条件显露",
    hiddenLineEn: "Pausing may not be regression, but a way to let conditions become visible",
    reflectionQuestionsZh: ["什么只有在你不推进时才看得见？", "当前最小的等待周期应该多长？"],
    reflectionQuestionsEn: [
      "What becomes visible only when you stop pushing?",
      "What is the smallest useful waiting period now?",
    ],
    actionSeedsZh: ["为这个问题设置一次二十四小时不推进", "暂停后只记录新出现的事实"],
    actionSeedsEn: [
      "Give this issue a twenty-four-hour no-push period",
      "During the pause, record only newly visible facts",
    ],
    visualBrief: "潮水退去后露出三层石阶，原本覆盖的下一阶刚刚显现；构图仅含一个主要主体与一个异常关系，保留 65% 安静留白；采用蓝调夜幕手绘动画语言，暖色只用于关系节点",
    imageSrc: "./assets/cards/reflection-v1/movement-low-tide-steps.webp",
    imageAltZh: "退潮后从水下显露出的三层石阶",
    imageAltEn: "Three stone steps revealed as the tide recedes",
    prohibitedClaims: ["等待会自动解决问题", "潮汐预示未来变化"],
  }),
]);

export function cardsForCategory(category) {
  return REFLECTION_DECK.filter((card) => card.category === category);
}

export function reflectionSpreadPositions(type = "single", language = "zh") {
  if (type !== "reflection_triad") {
    return [{
      key: "single",
      category: null,
      label: language === "zh" ? "现在最值得看见的是什么" : "What is most worth noticing now?",
    }];
  }

  return language === "zh"
    ? [
        { key: "state", category: "state", label: "我现在怎样" },
        { key: "relation", category: "relation", label: "什么正在影响我" },
        { key: "movement", category: "movement", label: "可以尝试怎样变化" },
      ]
    : [
        { key: "state", category: "state", label: "How am I now?" },
        { key: "relation", category: "relation", label: "What is influencing me?" },
        { key: "movement", category: "movement", label: "What change can I try?" },
      ];
}

export function reflectionCardForSelection(selection) {
  const rawIndex = Number(selection?.cardIndex ?? selection?.index ?? 0);
  const index = Number.isFinite(rawIndex) ? Math.trunc(rawIndex) : 0;
  const requestedCategory = selection?.position?.category;
  const category = requestedCategory && REFLECTION_CATEGORIES[requestedCategory]
    ? requestedCategory
    : requestedCategory
      ? "state"
      : null;
  const pool = category ? cardsForCategory(category) : REFLECTION_DECK;
  return pool[((index % pool.length) + pool.length) % pool.length];
}

export function fallbackForCategory(category) {
  return REFLECTION_CATEGORIES[category]?.fallbackSrc || REFLECTION_CATEGORIES.state.fallbackSrc;
}
