// "meihua-reading" mode prompt.
// Keep the output contract stable; dynamic gua/question context is appended last.
import { findGuaByName } from "../data/meihua-gua.ts";
import type { MeihuaReadingRequest } from "../types.ts";

export function buildMeihuaPrompt(req: MeihuaReadingRequest): string {
  const gua = findGuaByName(req.guaName);
  if (!gua) throw new Error(`Unknown gua: ${req.guaName}`);

  if (req.language === "zh") {
    return `任务：基于梅花易数卦象，给出克制、具体、可执行的观察与下一步。
边界：
- 不预测未来，不下定论，不替用户做决定。
- 不展开卦理教材，不把象意说成注定结果。
- [ACTION] 必须落到今天或这周能做的一件小行动。

格式必须严格遵守，只输出这三个标签：
[GUA_SIGNAL]
（1 到 2 句，说明这个卦先提醒你看见的当下信号）
[GUA_TREND]
（1 句，说明更适合怎样把握节奏、方向或推进方式）
[ACTION]
（一句不超过 40 个中文字、可执行的行动）

Dynamic context:
卦：${gua.name}（${gua.image}，${gua.essence}）
意图：${req.intent}
问题：${req.question}`;
  }

  return `Task: Based on the Meihua Yishu gua, give a restrained signal, trend, and next action.

Boundaries:
- Do not predict the future, deliver verdicts, or decide for the user.
- Do not explain gua theory or philosophy.
- Do not turn the gua into a deterministic result.
- [ACTION] must end with one concrete action the user can do today or this week.

Strict format, exactly these three tokens:
[GUA_SIGNAL]
(1 to 2 sentences on what signal is most visible now)
[GUA_TREND]
(1 sentence on the timing, direction, or pace to notice)
[ACTION]
(One concrete action under 45 chars)

Dynamic context:
Hexagram: ${gua.name} (${gua.image}, ${gua.essence})
Intent: ${req.intent}
Question: ${req.question}`;
}
