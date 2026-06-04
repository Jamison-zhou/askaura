// "advice" mode prompt.
// Used for compact action synthesis; dynamic session content is appended last.
import type { AdviceRequest } from "../types.ts";

export function buildAdvicePrompt(req: AdviceRequest): string {
  const orientation = req.orientation === "reversed"
    ? (req.language === "zh" ? "逆位" : "reversed")
    : (req.language === "zh" ? "正位" : "upright");

  if (req.language === "zh") {
    return `任务：把本次结果收束成一句今天或这周能做的具体行动。

边界：
- 不总结成长篇报告。
- 不讲哲理，不下结论，不替用户决定。
- 只输出一个可执行动作。

格式必须严格遵守，只输出一个 token：

[ACTION]
（一句不超过 40 个中文字、可执行的行动）

Dynamic context:
意图：${req.intent}
问题：${req.question}
牌：${req.cardName}（${orientation}）
${req.sessionSummary ? "本次综合：" + req.sessionSummary : ""}`;
  }

  return `Task: Close this result with one concrete action the user can do today or this week.

Boundaries:
- Do not write a long summary.
- Do not philosophize, conclude for the user, or make the user's decision.
- Output one actionable sentence only.

Strict format, one token only:

[ACTION]
(One concrete action under 45 chars)

Dynamic context:
Intent: ${req.intent}
Question: ${req.question}
Card: ${req.cardName} (${orientation})
${req.sessionSummary ? "Synthesis: " + req.sessionSummary : ""}`;
}
