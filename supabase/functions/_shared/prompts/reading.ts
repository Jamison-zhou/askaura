// Tarot "reading" mode prompt.
// Stable instructions stay before dynamic context for provider input-cache friendliness.
import type { ReadingRequest, SpreadCard } from "../types.ts";

function compact(value: string, max = 180): string {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, max);
}

function orientationLabel(value: string, language: ReadingRequest["language"]): string {
  return value === "reversed"
    ? (language === "zh" ? "逆位" : "reversed")
    : (language === "zh" ? "正位" : "upright");
}

function spreadLabel(type: string | undefined, language: ReadingRequest["language"]): string {
  const labels: Record<string, { zh: string; en: string }> = {
    single: { zh: "单牌", en: "single card" },
    three_current_resistance_next: { zh: "现状 / 阻力 / 下一步", en: "current / resistance / next step" },
    relationship_tension: { zh: "自己 / 对方表现 / 关系张力", en: "self / visible other / relationship tension" },
    choice_a_b_reminder: { zh: "选择 A / 选择 B / 提醒", en: "choice A / choice B / reminder" },
  };
  const found = labels[type || "single"] || labels.single;
  return language === "zh" ? found.zh : found.en;
}

function formatSpreadCards(cards: SpreadCard[] | undefined, language: ReadingRequest["language"]): string {
  const usable = Array.isArray(cards) ? cards.slice(0, 3) : [];
  return usable.map((card, index) => {
    const label = compact(card.label || card.position, 48);
    return `${index + 1}. ${label}: ${compact(card.name, 80)} (${orientationLabel(card.orientation, language)})`;
  }).join("\n");
}

function spreadBoundary(type: string | undefined, language: ReadingRequest["language"]): string {
  if (type === "relationship_tension") {
    return language === "zh"
      ? "- 关系牌阵只能描述可见互动和用户自己的边界，不能声称知道对方内心。"
      : "- Relationship spreads may describe visible interaction and the user's boundaries, but must not claim to know the other person's hidden mind.";
  }
  if (type === "choice_a_b_reminder") {
    return language === "zh"
      ? "- 选择牌阵只能比较代价、信号和提醒，不能替用户决定选 A 或 B。"
      : "- Choice spreads may compare costs, signals, and reminders, but must not decide A or B for the user.";
  }
  return "";
}

export function buildReadingPrompt(req: ReadingRequest): string {
  const orient = orientationLabel(req.orientation, req.language);
  const spreadType = req.spreadType || "single";
  const cards = formatSpreadCards(req.cards, req.language);
  const spreadName = spreadLabel(spreadType, req.language);
  const spreadSpecific = [
    cards ? (req.language === "zh"
      ? "- 如果是多牌阵，每张牌只写一句，不展开传统牌义。"
      : "- For multi-card spreads, write one sentence per card and avoid long traditional meanings.") : "",
    spreadBoundary(spreadType, req.language),
  ].filter(Boolean).join("\n");

  if (req.language === "zh") {
    return `任务：给出一次克制、具体、可验证的塔罗回应。

边界：
- 不预测未来，不替用户做决定，不使用宿命化语言。
- 每一段都要回应用户的问题，不写泛泛安慰。
- 可以结合牌面，但不要写成教材式牌义。
- “这次结果提醒你”只给方向，不下定论。
- “一件小行动”必须是今天或这周能做的具体动作。
- 全文保持短，像一张短笺。
${spreadSpecific}

格式必须严格遵守，每个 token 单独一行：

[CORE_QUESTION]
（把用户真正问的事压成一句，不超过 28 个中文字）

[TENSION]
（这张牌或这组牌照见的张力，不超过 42 个中文字）

[JUDGMENT]
（这次结果提醒你的方向，不超过 42 个中文字）

[ACTION]
（一件具体可执行的小行动，不超过 40 个中文字）

Dynamic context:
牌阵：${spreadName}
主牌：${req.cardName}（${orient}）
${cards ? `牌阵位置：\n${cards}\n` : ""}意图：${req.intent}
问题：${req.question}
${req.sessionHistory ? "上一轮上下文：" + req.sessionHistory : ""}`;
  }

  return `Task: Give a restrained, concrete, testable Tarot response.

Boundaries:
- Do not predict the future, decide for the user, or use fatalistic language.
- Every section must respond to the question.
- Use the card or spread, but do not write textbook card meanings.
- "This result reminds you" gives direction only, not a final decision.
- "Action" must be something the user can do today or this week.
- Keep the whole answer compact.
${spreadSpecific}

Strict format, each token on its own line:

[CORE_QUESTION]
(The real question in one sentence, under 110 chars)

[TENSION]
(The tension this card or spread reflects, under 150 chars)

[JUDGMENT]
(A grounded direction for today, under 150 chars)

[ACTION]
(One concrete actionable sentence, under 120 chars)

Dynamic context:
Spread: ${spreadName}
Main card: ${req.cardName} (${orient})
${cards ? `Spread cards:\n${cards}\n` : ""}Intent: ${req.intent}
Question: ${req.question}
${req.sessionHistory ? "Previous context: " + req.sessionHistory : ""}`;
}
