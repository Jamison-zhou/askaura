const GROUPS = {
  dual: ["两个角度", "两方面", "一起看", "综合看", "情绪和时机", "感受和趋势", "both", "together", "two perspectives"],
  meihua: ["时机", "趋势", "推进", "等待", "什么时候", "接下来", "走向", "该不该", "timing", "trend", "when", "wait", "move forward"],
  tarot: ["情绪", "关系", "感受", "为什么", "内心", "边界", "表达", "在意", "emotion", "relationship", "feeling", "boundary"],
};

export function recommendMode(question) {
  const normalized = normalize(question);
  if (matches(normalized, GROUPS.dual)) {
    return { mode: "dual", reasonKey: "recommendDual", confidence: 0.78 };
  }

  const meihuaScore = score(normalized, GROUPS.meihua);
  const tarotScore = score(normalized, GROUPS.tarot);
  if (meihuaScore > tarotScore) {
    return { mode: "meihua", reasonKey: "recommendMeihua", confidence: 0.68 };
  }
  if (tarotScore > 0) {
    return { mode: "tarot", reasonKey: "recommendTarot", confidence: 0.68 };
  }
  return { mode: "tarot", reasonKey: "recommendDefault", confidence: 0.5 };
}

function normalize(value) {
  return String(value ?? "").toLocaleLowerCase().replace(/\s+/g, " ").trim();
}

function matches(value, terms) {
  return terms.some((term) => value.includes(term));
}

function score(value, terms) {
  return terms.reduce((total, term) => total + Number(value.includes(term)), 0);
}
