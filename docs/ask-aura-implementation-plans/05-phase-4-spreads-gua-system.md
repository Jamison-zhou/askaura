# Phase 4: Spreads And Gua System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Expand AskAura from a one-card flow into a fuller symbolic system while preserving its self-reflection boundary.

**Architecture:** Add spread support after extracting a small ritual/spread data seam. Add meihua cast methods after current meihua behavior is preserved by tests.

**Tech Stack:** Static JS, existing tarot deck data, `assets/app/meihua.js`, Supabase `reading`.

---

## Preconditions

- Phase 3 is complete or history schema can store richer `cards` and `gua` payloads.
- Current one-card tarot and current meihua tests pass.

## Task 1: Extract Spread Data Shape

**Files:**
- Modify: `index.html`
- Create optional: `assets/app/ritual.js`
- Modify: `tests/clarify-contract.test.mjs` or add new spread test.

- [x] Define spread types:
  - `single`
  - `three_current_resistance_next`
  - `relationship_tension`
  - `choice_a_b_reminder`
- [x] Store selected cards as an array with position labels.
- [x] Keep single-card behavior unchanged.

## Task 2: Three-Card Spread UI

**Files:**
- Modify: `index.html`
- Modify: `styles.css`

- [x] Add spread selector only in tarot mode.
- [x] Default remains one-card.
- [x] For three-card spread, user selects three cards in sequence.
- [x] Show positions before result generation.
- [x] Avoid long traditional tarot text.

## Task 3: Spread Prompt

**Files:**
- Modify: `supabase/functions/_shared/types.ts`
- Modify/Create: `supabase/functions/_shared/prompts/reading.ts`

- [x] Extend `reading` request to optionally include `spreadType` and `cards`.
- [x] Prompt gives one sentence per card, one combined conclusion, one action.
- [x] Relationship spread must not claim to know the other person's hidden mind.
- [x] Choice spread must not decide for the user.

## Task 4: Meihua Cast Methods

**Files:**
- Modify: `assets/app/meihua.js`
- Modify: `tests/meihua.test.mjs`
- Modify: `index.html`

- [x] Preserve current time-based meihua behavior.
- [x] Add cast methods:
  - current time
  - one Chinese character
  - one number
  - casual selected number
- [x] Store `castMethod` and seed in gua payload.
- [x] Result explains rhythm/change, not prediction.

## Verification

- [x] One-card flow still passes.
- [x] Three-card flow stores three cards.
- [x] Relationship spread avoids deterministic claims.
- [x] Meihua methods are deterministic for same seed.
- [x] History restores spread/gua payloads.

## Definition Of Done

- [x] AskAura supports one-card and selected multi-card flows.
- [x] Meihua feels distinct from tarot.
- [x] Dual report clearly separates emotion, rhythm, and action strategy.
