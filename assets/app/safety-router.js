const SUPPORT_TERMS = {
  "self-harm": ["自杀", "轻生", "伤害自己", "不想活", "结束生命", "suicide", "kill myself", "self harm", "hurt myself"],
  violence: ["杀了他", "杀了她", "杀人", "伤害别人", "暴力攻击", "kill them", "kill him", "kill her", "hurt someone"],
};

const PROFESSIONAL_TERMS = {
  medical: ["诊断", "症状", "药物", "停药", "手术", "怀孕", "癌症", "医生", "medical", "diagnosis", "medication", "surgery"],
  legal: ["合同", "诉讼", "起诉", "律师", "判刑", "违法", "法律", "legal", "lawsuit", "contract"],
  financial: ["投资", "股票", "基金", "贷款", "理财", "收益率", "financial", "investment", "stock", "loan"],
};

export function routeQuestionSafety(question) {
  const normalized = normalize(question);
  for (const [reason, terms] of Object.entries(SUPPORT_TERMS)) {
    if (terms.some((term) => normalized.includes(term))) return { route: "support", reason };
  }
  for (const [reason, terms] of Object.entries(PROFESSIONAL_TERMS)) {
    if (terms.some((term) => normalized.includes(term))) return { route: "professional-boundary", reason };
  }
  return { route: "observe", reason: "" };
}

function normalize(value) {
  return String(value ?? "").toLocaleLowerCase().replace(/\s+/g, " ").trim();
}
