import type { WeeklySummaryRequest, WeeklySummaryRecord } from "../types.ts";

function compact(value: string, max = 500): string {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, max);
}

function formatRecord(record: WeeklySummaryRecord, index: number): string {
  return [
    `#${index + 1}`,
    `mode: ${compact(record.mode, 40)}`,
    `date: ${compact(record.createdAt, 40)}`,
    `title: ${compact(record.title, 120)}`,
    `question: ${compact(record.question, 180)}`,
    `summary: ${compact(record.summary, 260)}`,
    `action: ${compact(record.action, 180)}`,
    `actionStatus: ${compact(record.actionStatus || "", 40)}`,
    `reviewNote: ${compact(record.reviewNote || "", 180)}`,
  ].join("\n");
}

export function buildWeeklySummaryPrompt(req: WeeklySummaryRequest): string {
  const records = req.records.slice(0, 7).map(formatRecord).join("\n\n");

  if (req.language === "zh") {
    return `任务：基于最近一周的 AskAura 记录，整理一个克制的周复盘。

边界：
- 只使用下方记录摘要，不索要或假设更多私密细节。
- 不预测未来，不替用户做决定，不使用宿命化语言。
- 不使用“命中注定、一定、注定、转运、改运、玄学、算命”等表达。
- 不给诊断，不制造焦虑，不把重复主题说成定论。
- 输出必须包含 [THEME]、[STUCK_POINT]、[NEXT_ACTION] 三个标签。
- [NEXT_ACTION] 必须是一件今天或这周能做的小行动。
- 中文回答，每个标签 1 到 2 句。

Dynamic context:
最近记录摘要：
${records}`;
  }

  return `Task: Create a restrained AskAura weekly review from recent record summaries.

Boundaries:
- Use only the summaries below; do not ask for or infer extra private details.
- Do not predict the future, decide for the user, or use fatalistic language.
- Do not use deterministic wording such as "fated", "destined", "certain", or "meant to be".
- Do not diagnose, create anxiety, or turn repeated themes into fixed conclusions.
- Output exactly these labels: [THEME], [STUCK_POINT], [NEXT_ACTION].
- [NEXT_ACTION] must be one small action the user can do today or this week.
- Answer in English, 1 to 2 sentences per label.

Dynamic context:
Recent record summaries:
${records}`;
}
