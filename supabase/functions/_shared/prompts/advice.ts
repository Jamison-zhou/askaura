// "advice" mode — 综合行动建议，最后一张牌完成后调用。
// 输出契约（极简版）：仅 [ACTION] 一个 token + 一句可执行行动建议。

import type { AdviceRequest } from "../types.ts";

export function buildAdvicePrompt(req: AdviceRequest): string {
  if (req.language === "zh") {
    return `本次会话：${req.intent} · ${req.question}
抽到的牌：${req.cardName}（${req.orientation === "reversed" ? "逆位" : "正位"}）
${req.sessionSummary ? "本次综合：" + req.sessionSummary : ""}

请只给一句**今天或这周可以做的具体行动**作为收尾。不总结 / 不哲学 / 不下结论。

格式（必须严格遵守，仅一个 token）：

[ACTION]
（一句 ≤30 中文字、可执行的行动）`;
  }

  return `Session: ${req.intent} · ${req.question}
Card: ${req.cardName} (${req.orientation === "reversed" ? "reversed" : "upright"})
${req.sessionSummary ? "Synthesis: " + req.sessionSummary : ""}

Give ONE concrete action the user can do today or this week. No summary / no philosophy / no conclusion.

Strict format (one token only):

[ACTION]
(One concrete action ≤ 45 chars)`;
}
