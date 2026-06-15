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
- 不要把用户问题里的具体对象改写成另一个领域；例如问午餐就必须继续写午餐或餐食，问睡眠就必须继续写睡眠。
- 如果用户问的是吃饭、睡眠、工作、学习等具体日常问题，不要引入用户没提到的人际关系、承诺、对方或表态。
- 如果用户问“今晚吃什么/午餐吃什么/点什么”这类轻量选择，直接给餐食选择框架，不要升格成情绪、关系或人生判断。
- [ACTION] 必须落到今天或这周能做的一件小行动。
- [AVOID] 和 [WATCH] 必须回应用户问题，不能使用固定关系话术。

格式必须严格遵守，只输出这五个标签：
[GUA_SIGNAL]
（1 到 2 句，说明这个卦先提醒你看见的当下信号）
[GUA_TREND]
（1 句，说明更适合怎样把握节奏、方向或推进方式）
[ACTION]
（一句不超过 40 个中文字、可执行的行动）
[AVOID]
（今天先不要做的一件事，不超过 40 个中文字）
[WATCH]
（接下来观察的一个具体信号，不超过 40 个中文字）

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
- Do not rewrite the user's concrete object into another domain; if they ask about lunch, keep writing about lunch or food; if they ask about sleep, keep writing about sleep.
- If the user asks about concrete daily topics like food, sleep, work, or study, do not introduce relationships, promises, the other person, or demands for a response unless the user mentioned them.
- If the user asks "what should I eat tonight/lunch/takeout", give a practical food-choice frame instead of escalating it into emotion, relationships, or a life decision.
- [ACTION] must end with one concrete action the user can do today or this week.
- [AVOID] and [WATCH] must answer the user's question, not use a fixed relationship script.

Strict format, exactly these five tokens:
[GUA_SIGNAL]
(1 to 2 sentences on what signal is most visible now)
[GUA_TREND]
(1 sentence on the timing, direction, or pace to notice)
[ACTION]
(One concrete action under 45 chars)
[AVOID]
(One thing not to do today, under 120 chars)
[WATCH]
(One concrete signal to watch next, under 120 chars)

Dynamic context:
Hexagram: ${gua.name} (${gua.image}, ${gua.essence})
Intent: ${req.intent}
Question: ${req.question}`;
}
