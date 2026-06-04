# Phase 3: Retention And Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Give users natural reasons to return after one day, three days, and one week without creating check-in anxiety.

**Architecture:** Extend records with action status and review metadata. Build review entry points inside history before adding generated weekly summaries.

**Tech Stack:** Static JS, local/cloud history records, Supabase table migrations, `reading` Edge Function for summaries.

---

## Preconditions

- Phase 2 is complete.
- History records already preserve result, followups, and clarification metadata.

## Task 1: Action Status

**Files:**
- Modify: `assets/app/storage.js`
- Modify: `assets/app/sync.js`
- Modify: `index.html`
- Modify: `tests/storage.test.mjs`
- Modify: `tests/sync.test.mjs`

- [x] Add optional `actionStatus` to record normalization.
- [x] Supported values: `done`, `not_done`, `skipped`, `not_fit`.
- [x] Add small controls on result/history detail.
- [x] Sync status with cloud record payload.
- [x] Keep status optional for old records.

## Task 2: Three-Day Review

**Files:**
- Modify: `assets/app/storage.js`
- Modify: `index.html`
- Modify: `tests/storage.test.mjs`

- [x] Add optional `reviewAt` and `reviewNote`.
- [x] When a result completes, create a suggested review date three days later.
- [x] In history, show review prompt when `reviewAt` is due.
- [x] Let user write a short review note.
- [x] Do not force reminders or push notifications in this phase.

## Task 3: Better History

**Files:**
- Modify: `index.html`
- Modify: `styles.css`

- [x] Group history by date.
- [x] Add mode filters: tarot, meihua, dual, daily.
- [x] Add favorite toggle.
- [x] Show follow-up count and clarification link when present.
- [x] Preserve the current compact drawer/panel pattern.

## Task 4: Weekly Summary

**Files:**
- Modify: `supabase/functions/_shared/types.ts`
- Create: `supabase/functions/_shared/prompts/weekly-summary.ts`
- Modify: `supabase/functions/reading/index.ts`
- Modify: `index.html`

- [x] Add `weekly-summary` mode only after enough records exist.
- [x] Request includes recent record summaries, not full private text unless necessary.
- [x] Response includes repeated theme, stuck point, and one action for next week.
- [x] Do not generate if fewer than 3 usable records exist.

## Verification

- [x] Action status saves locally and syncs.
- [x] Due review appears after `reviewAt`.
- [x] History filters work with old records.
- [x] Weekly summary refuses insufficient data.
- [x] Weekly summary avoids deterministic/fate language.

## Definition Of Done

- [x] User can mark whether an action was useful.
- [x] User can return after three days and add a review note.
- [x] User can see repeated themes through history and weekly summary.
