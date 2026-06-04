# Phase 2: Core Experience Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade AskAura from one-shot results to a result-centered exploration flow.

**Architecture:** Add AI ordinary follow-up without redrawing cards, then add clarification-card reports that explicitly connect the new card to the previous result. Extract only the smallest modules needed for these flows.

**Tech Stack:** Static JS, Supabase Edge Function `reading`, local/cloud history, Node tests.

---

## Preconditions

- Phase 0 and Phase 1 are complete.
- History and sync are stable on AskAura Supabase.
- Current result page structure remains accepted.

## Task 1: Add `followup` Backend Mode

**Files:**
- Modify: `supabase/functions/_shared/types.ts`
- Create: `supabase/functions/_shared/prompts/followup.ts`
- Modify: `supabase/functions/reading/index.ts`
- Modify: `supabase/functions/_shared/token-validator.ts`

- [x] Add request type with original question, result summary, user follow-up, and language.
- [x] Add prompt that answers only within the current result context.
- [x] Ensure prompt forbids new draw, prediction, and deterministic advice.
- [x] Return compact answer text with one specific action or observation.
- [x] Add token validation only if the response uses explicit tokens.

## Task 2: Frontend Follow-Up Flow

**Files:**
- Modify: `index.html`
- Modify: `tests/clarify-contract.test.mjs`

- [x] Ordinary follow-up submits to `reading` with `mode: "followup"`.
- [x] Answer appends to current result page.
- [x] The card image and selected card do not change.
- [x] The ritual modal does not open.
- [x] Failure shows inline error and preserves current result.

## Task 3: Persist Follow-Ups

**Files:**
- Modify: `assets/app/storage.js`
- Modify: `assets/app/sync.js`
- Modify: `tests/storage.test.mjs`
- Modify: `tests/sync.test.mjs`

- [x] Add optional `followups` array to normalized record payload.
- [x] Store follow-up question, answer, createdAt, and source result id.
- [x] Sync followups as part of record payload without adding a separate table in this phase.
- [x] Restore followups from history view.

## Task 4: Clarification-Card Report

**Files:**
- Modify: `index.html`
- Modify: `supabase/functions/_shared/prompts/reading.ts` or create dedicated clarification report prompt if needed.

- [x] Keep clarification card as a new draw.
- [x] Pass previous result summary and previous card into the new reading request.
- [x] Result must say what the clarification card adds or adjusts.
- [x] Store `clarificationOf` in the new record payload.
- [x] History can show the relationship between original result and clarification record.

## Task 5: Good Question Guidance

**Files:**
- Modify: `index.html`
- Modify: `styles.css`

- [x] Add 3 to 5 example questions near input.
- [x] Examples should transform vague questions into observable questions.
- [x] Click example fills input without submitting.
- [x] Keep tone quiet and non-instructional.

## Verification

- [x] Ordinary follow-up does not trigger ritual.
- [x] Clarification card does trigger ritual.
- [x] Follow-up failure does not clear result.
- [x] History restores followups and clarification links.
- [x] Existing tests pass.

## Definition Of Done

- [x] User can ask one AI follow-up on the current result without drawing again.
- [x] User can draw one clarification card and understand how it relates to the previous result.
- [x] Followups and clarification chains survive history save/restore/sync.
