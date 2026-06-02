// Tarot "reading" mode prompt.
// Output contract: four short tokens for a compact, action-oriented reading.
import type { ReadingRequest } from "../types.ts";

export function buildReadingPrompt(req: ReadingRequest): string {
  const orient = req.orientation === "reversed"
    ? (req.language === "zh" ? "逆位" : "reversed")
    : (req.language === "zh" ? "正位" : "upright");

  if (req.language === "zh") {
    return `牌：${req.cardName}（${orient}）
意图：${req.intent}
来问：${req.question}
${req.sessionHistory ? "之前的牌：" + req.sessionHistory : ""}

请给出一次克制、具体、可验证的塔罗回应。不要预测未来，不要替用户做决定，不要使用“算命、玄学、转运、灵签、改运、命中注定”等词。

写作要求：
- 每段都要回应来问，不要泛泛安慰
- 结合牌面，但不要解释成教材牌义
- “今天的判断”只能给方向，不下定论
- “一件小行动”必须是今天或这周能做的具体动作
- 全文保持短，像一张短笺

格式必须严格遵守，每个 token 单独一行：

[CORE_QUESTION]
（把用户真正问的事压成一句，不超过 28 个中文字）

[TENSION]
（这张牌照见的张力，不超过 42 个中文字）

[JUDGMENT]
（今天的判断方向，不超过 42 个中文字）

[ACTION]
（一件具体可执行的小行动，不超过 40 个中文字）`;
  }

  return `Card: ${req.cardName} (${orient})
Intent: ${req.intent}
Question: ${req.question}
${req.sessionHistory ? "Previous cards: " + req.sessionHistory : ""}

Give a restrained, concrete, testable Tarot response. Do not predict the future, decide for the user, or use fatalistic language.

Rules:
- Every section must respond to the question
- Use the card, but do not write textbook card meanings
- "Judgment" gives direction only, not a final decision
- "Action" must be something the user can do today or this week
- Keep the whole answer compact

Strict format, each token on its own line:

[CORE_QUESTION]
(The real question in one sentence, under 110 chars)

[TENSION]
(The tension this card reflects, under 150 chars)

[JUDGMENT]
(A grounded direction for today, under 150 chars)

[ACTION]
(One concrete actionable sentence, under 120 chars)`;
}
