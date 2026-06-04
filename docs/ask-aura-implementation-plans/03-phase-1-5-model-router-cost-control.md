# Phase 1.5: Model Router, Thinking, And Cost Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Prepare AskAura for basic/pro model tiers without letting the frontend directly choose paid models.

**Architecture:** Keep `provider = deepseek`. Route model choice on the Edge Function side from trusted tier/entry rules. Optimize prompt ordering for DeepSeek input cache economics. Support thinking mode without exposing reasoning text to the user.

**Tech Stack:** Static frontend request hints, Supabase Edge Function `reading`, DeepSeek OpenAI-compatible API, Node tests, runtime config.

---

## Preconditions

- Phase 0 is complete on the dedicated AskAura Supabase project.
- Phase 1 public beta cleanup is complete or in final verification.
- DeepSeek provider works for the existing `reading` flow.
- Do not implement payment or membership enforcement in this phase unless it already exists.

## Pricing Facts To Preserve

- DeepSeek input cache hits are much cheaper than misses.
- Stable prompt prefixes should be kept stable and placed before dynamic user content.
- Pro output is more expensive than basic output, so `maxTokens` must be tier-aware.
- Thinking mode can increase useful quality and token usage; it should be enabled by route, not globally.

## Hard Boundaries

- Do not trust frontend-provided `model`.
- Do not expose `reasoning_content` to the frontend result UI.
- Do not add payment, subscription, or entitlement tables in this phase.
- Do not rewrite all prompts; restructure only the parts needed for stable-prefix routing.
- Do not change existing `reading` response SSE contract except to filter DeepSeek reasoning chunks.

## Task 1: Add Model Route Types

**Files:**
- Modify: `supabase/functions/_shared/types.ts`
- Modify: `supabase/functions/_shared/llm.ts`
- Modify/Create: `supabase/functions/_shared/model-router.ts`

- [x] Add request hints such as `tier?: "basic" | "pro"` and `entry?: "tarot" | "meihua" | "dual" | "daily" | "followup"`.
- [x] Keep hints optional so existing requests keep working.
- [x] Define trusted backend route output:

```ts
type ModelRoute = {
  provider: "deepseek";
  model: "deepseek-v4-flash" | "deepseek-v4-pro";
  thinking: { type: "disabled" } | { type: "enabled" };
  reasoningEffort?: "high" | "max";
  maxTokens: number;
};
```

- [x] Add tests or static assertions that frontend `llm.model` cannot force `deepseek-v4-pro`.

## Task 2: Add Runtime Config For Tiers

**Files:**
- Modify: `supabase/functions/_shared/runtime-config.ts`
- Modify: `supabase/functions/admin-config/index.ts`
- Modify: `admin.html`

- [x] Add config shape for `models.basic` and `models.pro`.
- [x] Default basic route to `deepseek-v4-flash`.
- [x] Default pro route to `deepseek-v4-pro`.
- [x] Allow admin to configure model names and token caps.
- [x] Keep provider-level API key masked and stored only in Supabase runtime config or secrets.

## Task 3: DeepSeek Thinking Support

**Files:**
- Modify: `supabase/functions/_shared/providers/deepseek.ts`
- Modify: `supabase/functions/_shared/providers/openai-compatible.ts` only if shared support is cleaner.
- Modify: `supabase/functions/reading/index.ts`

- [x] Add request payload support for DeepSeek thinking mode:

```json
{
  "thinking": { "type": "enabled" },
  "reasoning_effort": "high"
}
```

- [x] Disable thinking for routes where latency/cost matters.
- [x] Enable thinking for pro/deep routes only when route rules allow it.
- [x] Ignore streamed `delta.reasoning_content`.
- [x] Yield only streamed `delta.content` to the frontend.
- [x] Preserve existing SSE output: `data: {"delta":"..."}` and `data: [DONE]`.

## Task 4: Prompt Cache Optimization

**Files:**
- Modify: `supabase/functions/_shared/prompts/*.ts`
- Modify/Create: `supabase/functions/_shared/prompt-cache-policy.ts` if useful.

- [x] Keep system prompt and token protocol stable across requests.
- [x] Put stable instructions before dynamic user question, card, gua, and history text.
- [x] Move dynamic context to the end of the user prompt.
- [x] Avoid injecting full history by default.
- [x] Prefer compact summaries over raw history for follow-up/pro routes.
- [x] Add comments or tests documenting stable-prefix intent.

## Task 5: Frontend Request Hints

**Files:**
- Modify: `index.html`
- Modify: `tests/clarify-contract.test.mjs`

- [x] Send route hint such as `tier: "basic"` for current public flows.
- [x] Do not send raw `model` for basic/pro selection.
- [x] Keep admin runtime config model values server-authoritative.
- [x] Keep pro UI hidden or force backend downgrade until membership exists.

## Task 6: Cost And Abuse Guardrails

**Files:**
- Modify/Create: `docs/ask-aura-cost-policy.md`
- Modify: `supabase/functions/reading/index.ts`

- [x] Define max token caps by route.
- [x] Keep daily/basic routes short.
- [x] Keep pro routes bounded even with thinking enabled.
- [x] Log provider/model/tier headers or internal metadata for smoke verification.
- [x] Do not log API keys, full user secrets, or service role values.

## Verification

- [x] Basic reading uses `deepseek-v4-flash`.
- [x] Pro route cannot be selected by simply changing frontend `llm.model`.
- [x] Pro route uses `deepseek-v4-pro` only when backend route rules allow it.
- [x] Thinking route emits no `reasoning_content` to frontend SSE.
- [x] Prompt prefix remains stable before dynamic question/card/gua content.
- [x] Existing tests pass.
- [x] Real smoke confirms headers expose expected provider/model without exposing secrets.

## Definition Of Done

- [x] AskAura has a backend-owned model router.
- [x] DeepSeek flash/pro can be selected by trusted route rules.
- [x] DeepSeek thinking mode is supported but does not leak reasoning text.
- [x] Prompt structure is designed for cache-hit economics.
- [x] Basic/pro cost behavior is documented before membership or payment work begins.
