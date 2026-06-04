# AskAura Model Routing And Cost Policy

Updated: 2026-06-03

## Current Provider

- Provider is `deepseek`.
- Public beta routes use `deepseek-v4-flash` by default.
- `deepseek-v4-pro` is only available when the backend runtime config enables the `pro` tier.
- The frontend may send `tier` and `entry` hints, but it must not control the final model name.

## Route Caps

| Entry | Tier | Model | Thinking | Max output cap |
| --- | --- | --- | --- | --- |
| `daily` | `basic` | `deepseek-v4-flash` | disabled | 800 |
| `meihua` | `basic` | `deepseek-v4-flash` | disabled | 900 |
| `tarot` | `basic` | `deepseek-v4-flash` | disabled | 1600 |
| `dual` | `basic` | `deepseek-v4-flash` | disabled | 1800 route cap, 2200 entry cap |
| `followup` | `basic` | `deepseek-v4-flash` | disabled | 700 |
| any pro-enabled entry | `pro` | `deepseek-v4-pro` | route-controlled | bounded by entry cap and 3072 tier cap |

Runtime config can lower or raise tier caps inside these hard route limits. It cannot let the frontend force `deepseek-v4-pro`.

## Thinking Mode

- Thinking is disabled for `basic`.
- Thinking can be enabled only for backend-approved `pro`.
- Streamed `reasoning_content` is intentionally ignored by the provider adapter.
- User-facing SSE only emits `data: {"delta":"..."}` and `data: [DONE]`.

## Prompt And Cache Rules

- Keep stable instructions in shared prompt files instead of composing large ad hoc prompts in the browser.
- Put dynamic user content such as question, card, gua, and result summary near the end of the prompt whenever a prompt is added or substantially edited.
- Do not send raw full history to follow-up routes. Send compact result summaries.
- Do not log API keys, service role keys, or full private user text for cost diagnostics.

## Smoke Evidence To Capture

For each deploy smoke, capture:

- `X-AskAura-Provider`
- `X-AskAura-Model`
- `X-AskAura-Tier`
- `X-AskAura-Entry`
- `X-AskAura-Thinking`

Do not capture secrets or raw long-form user content in handoff docs.
