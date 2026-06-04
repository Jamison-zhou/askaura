import type { FollowupRequest } from "../types.ts";

function compact(value: string, max = 1200): string {
  return value.trim().replace(/\s+/g, " ").slice(0, max);
}

export function buildFollowupPrompt(req: FollowupRequest): string {
  const originalQuestion = compact(req.originalQuestion, 500);
  const resultSummary = compact(req.resultSummary, 1400);
  const followupQuestion = compact(req.followupQuestion, 500);

  if (req.language === "zh") {
    return `任务：只回答用户对当前 AskAura 结果的追问。

边界：
- 只使用下方已有结果上下文。
- 不重新抽牌，不添加新的牌、卦或随机结果。
- 不预测未来，不替用户做决定，不使用宿命化语言。
- 不展开成长篇报告。
- 回答必须落到一个今天或这周能做的小观察或小行动。
- 用 2 到 4 句中文回答，具体、克制、可执行。

Dynamic context:
已有问题：
${originalQuestion}

当前结果摘要：
${resultSummary}

用户追问：
${followupQuestion}`;
  }

  return `Task: Answer only as a follow-up to the current AskAura result.

Boundaries:
- Use only the existing result context below.
- Do not draw a new card, add a new gua, or invent a new random result.
- Do not predict the future, decide for the user, or use fatalistic language.
- Do not expand into a full new report.
- End with one small observation or action the user can try today or this week.
- Answer in 2 to 4 concise sentences.

Dynamic context:
Original question:
${originalQuestion}

Current result summary:
${resultSummary}

User follow-up:
${followupQuestion}`;
}
