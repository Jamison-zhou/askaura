export const TAROT_DECK = [
  ["The Fool", "愚者", "00-the-fool.jpg"],
  ["The Magician", "魔术师", "01-the-magician.jpg"],
  ["The High Priestess", "女祭司", "02-the-high-priestess.jpg"],
  ["The Empress", "皇后", "03-the-empress.jpg"],
  ["The Emperor", "皇帝", "04-the-emperor.jpg"],
  ["The Hierophant", "教皇", "05-the-hierophant.jpg"],
  ["The Lovers", "恋人", "06-the-lovers.jpg"],
  ["The Chariot", "战车", "07-the-chariot.jpg"],
  ["Strength", "力量", "08-strength.jpg"],
  ["The Hermit", "隐士", "09-the-hermit.jpg"],
  ["Wheel of Fortune", "命运之轮", "10-wheel-of-fortune.jpg"],
  ["Justice", "正义", "11-justice.jpg"],
  ["The Hanged Man", "倒吊人", "12-the-hanged-man.jpg"],
  ["Death", "死神", "13-death.jpg"],
  ["Temperance", "节制", "14-temperance.jpg"],
  ["The Devil", "恶魔", "15-the-devil.jpg"],
  ["The Tower", "高塔", "16-the-tower.jpg"],
  ["The Star", "星星", "17-the-star.jpg"],
  ["The Moon", "月亮", "18-the-moon.jpg"],
  ["The Sun", "太阳", "19-the-sun.jpg"],
  ["Judgement", "审判", "20-judgement.jpg"],
  ["The World", "世界", "21-the-world.jpg"]
];

export const SPREAD_TYPES = [
  "single",
  "three_current_resistance_next",
  "relationship_tension",
  "choice_a_b_reminder"
];

export function spreadPositions(type = "single", labels = {}) {
  const map = {
    single: [{ key: "single", label: labels.spreadSingle || "Single" }],
    three_current_resistance_next: [
      { key: "current", label: labels.spreadPositionCurrent || "Current" },
      { key: "resistance", label: labels.spreadPositionResistance || "Resistance" },
      { key: "next", label: labels.spreadPositionNext || "Next" },
    ],
    relationship_tension: [
      { key: "self", label: labels.spreadPositionSelf || "Self" },
      { key: "other", label: labels.spreadPositionOther || "Other" },
      { key: "tension", label: labels.spreadPositionTension || "Tension" },
    ],
    choice_a_b_reminder: [
      { key: "choice_a", label: labels.spreadPositionChoiceA || "Choice A" },
      { key: "choice_b", label: labels.spreadPositionChoiceB || "Choice B" },
      { key: "reminder", label: labels.spreadPositionReminder || "Reminder" },
    ],
  };
  return map[type] || map.single;
}

export function spreadDisplayName(type = "single", labels = {}) {
  const names = {
    single: labels.spreadSingle || "Single",
    three_current_resistance_next: labels.spreadThree || "Current / Resistance / Next",
    relationship_tension: labels.spreadRelationship || "Relationship tension",
    choice_a_b_reminder: labels.spreadChoice || "Choice A / B",
  };
  return names[type] || names.single;
}

export function ritualSpreadTypeForMode(mode, selectedSpreadType = "single") {
  return mode === "tarot" ? selectedSpreadType : "single";
}

export function ritualCardLayout(index, deckLength = TAROT_DECK.length) {
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
  random = Math.random
} = {}) {
  const card = selection.card;
  const orientation = random() > 0.5 ? "upright" : "reversed";
  return {
    name: card[0],
    label: selection.position?.label || singleLabel,
    position: selection.position?.key || "single",
    orientation,
    imageSrc: "./assets/cards/" + card[2],
    imageAlt: language === "zh" ? card[1] : card[0],
  };
}

export function primaryCardFromRecordCards(cards = []) {
  return Array.isArray(cards) && cards.length ? cards[0] : null;
}

export function cardKeywords(cardName, { language = "zh" } = {}) {
  const name = cleanText(cardName, "");
  const zh = {
    "愚者": ["未知", "出发", "信任", "轻盈"],
    "魔术师": ["开始", "资源", "表达", "行动"],
    "女祭司": ["直觉", "沉静", "未说出", "观察"],
    "皇后": ["滋养", "感受", "关系", "生长"],
    "皇帝": ["边界", "秩序", "责任", "掌控"],
    "教皇": ["规则", "经验", "确认", "传统"],
    "恋人": ["选择", "连接", "诚实", "对齐"],
    "战车": ["推进", "意志", "方向", "控制"],
    "力量": ["克制", "耐心", "柔和", "稳定"],
    "隐士": ["独处", "审视", "答案", "慢下来"],
    "命运之轮": ["变化", "节奏", "转折", "顺势"],
    "正义": ["事实", "权衡", "边界", "负责"],
    "倒吊人": ["暂停", "换角度", "等待", "松手"],
    "死神": ["结束", "清理", "更新", "放下"],
    "节制": ["调和", "节奏", "修复", "中间路"],
    "恶魔": ["执念", "消耗", "诱因", "看清"],
    "高塔": ["冲击", "真相", "拆除", "重建"],
    "星星": ["恢复", "希望", "远方", "信念"],
    "月亮": ["不确定", "投射", "梦境", "辨认"],
    "太阳": ["明朗", "能量", "坦诚", "看见"],
    "审判": ["回应", "复盘", "决定", "醒来"],
    "世界": ["完成", "整合", "闭环", "下一段"]
  };
  const en = {
    "The Fool": ["Unknown", "Start", "Trust", "Lightness"],
    "The Magician": ["Start", "Resource", "Expression", "Action"],
    "The High Priestess": ["Intuition", "Quiet", "Unspoken", "Observe"],
    "The Empress": ["Nurture", "Feeling", "Relation", "Growth"],
    "The Emperor": ["Boundary", "Order", "Duty", "Control"],
    "The Hierophant": ["Rule", "Experience", "Confirm", "Tradition"],
    "The Lovers": ["Choice", "Bond", "Honesty", "Alignment"],
    "The Chariot": ["Move", "Will", "Direction", "Control"],
    "Strength": ["Restraint", "Patience", "Softness", "Steady"],
    "The Hermit": ["Alone", "Review", "Answer", "Slow down"],
    "Wheel of Fortune": ["Change", "Rhythm", "Turn", "Flow"],
    "Justice": ["Fact", "Weighing", "Boundary", "Account"],
    "The Hanged Man": ["Pause", "Angle", "Wait", "Release"],
    "Death": ["End", "Clear", "Renew", "Let go"],
    "Temperance": ["Blend", "Rhythm", "Repair", "Middle path"],
    "The Devil": ["Fixation", "Drain", "Trigger", "See clearly"],
    "The Tower": ["Impact", "Truth", "Dismantle", "Rebuild"],
    "The Star": ["Recover", "Hope", "Distance", "Faith"],
    "The Moon": ["Unclear", "Projection", "Dream", "Discern"],
    "The Sun": ["Clear", "Energy", "Open", "Visible"],
    "Judgement": ["Respond", "Review", "Decide", "Wake"],
    "The World": ["Complete", "Integrate", "Close", "Next"]
  };
  return (language === "zh" ? zh[name] : en[name]) || (language === "zh"
    ? ["观察", "确认", "收束", "行动"]
    : ["Observe", "Confirm", "Narrow", "Act"]);
}

function cleanText(value, fallback = "") {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!text || text === "undefined" || text === "null" || text === "NaN") return fallback;
  return text;
}
