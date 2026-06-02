# Tarot Question Clarification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Tarot-only question clarification step before drawing a card.

**Architecture:** Reuse the existing `reading` Edge Function and SSE stream path. Add a new `clarify` request mode, a prompt builder, token validation, and a small front-end state before the existing tarot draw flow.

**Tech Stack:** Static HTML/CSS/JS, Supabase Edge Functions on Deno, Node syntax tests.

---

### Task 1: Add Clarify Contract

**Files:**
- Modify: `supabase/functions/_shared/types.ts`
- Modify: `supabase/functions/_shared/token-validator.ts`
- Create: `supabase/functions/_shared/prompts/clarify.ts`
- Modify: `supabase/functions/reading/index.ts`

- [ ] Add `ClarifyRequest` with `mode: "clarify"`, `question`, `language`, and optional `round`.
- [ ] Include `clarify` in `ReadingMode` and `AnyReadingRequest`.
- [ ] Require `CLARIFIED_QUESTION` and `CLARIFY_NOTE` tokens.
- [ ] Route `clarify` to `buildClarifyPrompt`.
- [ ] Keep validation and SSE behavior identical to current modes.

### Task 2: Add Front-End Clarification State

**Files:**
- Modify: `index.html`
- Modify: `styles.css`

- [ ] Add a compact clarification box below the question hint.
- [ ] Add translations for the new labels and buttons.
- [ ] Add state variables for original and clarified question.
- [ ] On Tarot submit, call `mode: "clarify"` first unless a clarified question is already confirmed.
- [ ] Add actions: confirm, retry, edit.
- [ ] Confirm continues into the existing tarot draw with the clarified question.

### Task 3: Tests

**Files:**
- Modify: `tests/index-syntax.test.mjs`
- Create: `tests/clarify-contract.test.mjs`

- [ ] Keep the module syntax test passing.
- [ ] Add static contract checks for `clarify` mode, required tokens, and front-end buttons.
- [ ] Run `node tests/index-syntax.test.mjs`.
- [ ] Run `node tests/clarify-contract.test.mjs`.

### Task 4: Deploy

**Files:**
- No source change.

- [ ] Run `git diff --check`.
- [ ] Deploy `reading` function with Supabase CLI.
- [ ] Commit with Chinese message and configured author.
