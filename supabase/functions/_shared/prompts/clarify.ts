import type { ClarifyRequest } from "../types.ts";

export function buildClarifyPrompt(req: ClarifyRequest): string {
  if (req.language === "zh") {
    return `任务：把用户原问题整理成一个更适合 AskAura 回应的问题。

边界：
- 不预测未来，不替用户下结论，不使用宿命化语言。
- 把“会不会发生”改成“我现在该如何看待或行动”。
- 保留用户真正的纠结。
- 问题要具体、清楚，适合抽一张牌后给出行动建议。
- 整理后的问题不超过 36 个中文字。

格式必须严格遵守：

[CLARIFIED_QUESTION]
（整理后的问题）

[CLARIFY_NOTE]
（一句说明：你把问题整理到了哪个真实张力上，不超过 28 个中文字）

Dynamic context:
用户原问题：
${req.question}`;
  }

  return `Task: Rewrite the user's original question into a clearer AskAura question.

Boundaries:
- Do not predict the future, decide for the user, or use fatalistic language.
- Turn "will it happen" into "how should I see or act now."
- Preserve the real tension.
- Make it concrete and suitable for a one-card action reading.
- Keep the rewritten question under 120 characters.

Strict format:

[CLARIFIED_QUESTION]
(rewritten question)

[CLARIFY_NOTE]
(one short note about the real tension, under 90 characters)

Dynamic context:
Original question:
${req.question}`;
}
