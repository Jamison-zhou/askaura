import type { ClarifyRequest } from "../types.ts";

export function buildClarifyPrompt(req: ClarifyRequest): string {
  if (req.language === "zh") {
    return `用户原问题：
${req.question}

请把它整理成一个更适合塔罗回应的问题。不要预测未来，不要替用户下结论，不要使用“算命、玄学、转运、灵签、改运、命中注定”等词。

整理原则：
- 从“会不会发生”改成“我现在该如何看待或行动”
- 保留用户真正的纠结
- 具体、清楚，适合抽一张牌后给出行动建议
- 不超过 36 个中文字

格式必须严格遵守：

[CLARIFIED_QUESTION]
（整理后的问题）

[CLARIFY_NOTE]
（一句说明：你把问题整理到了哪个真实张力上，不超过 28 个中文字）`;
  }

  return `Original question:
${req.question}

Rewrite it into a clearer Tarot question. Do not predict the future, decide for the user, or use fatalistic language.

Rules:
- Turn "will it happen" into "how should I see or act now"
- Preserve the real tension
- Make it concrete and suitable for a one-card action reading
- Keep it under 120 characters

Strict format:

[CLARIFIED_QUESTION]
(rewritten question)

[CLARIFY_NOTE]
(one short note about the real tension, under 90 characters)`;
}
