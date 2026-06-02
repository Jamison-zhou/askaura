# Tarot Result Structure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade Tarot results from one sentence to a four-part short reading.

**Architecture:** Extend the existing `reading` mode token contract and render optional Tarot detail fields in the current answer panel. Keep Meihua and Daily flows unchanged.

**Tech Stack:** Static HTML/CSS/JS, Supabase Edge Functions on Deno, Node contract tests.

---

### Task 1: Extend Reading Contract

**Files:**
- Modify: `supabase/functions/_shared/prompts/reading.ts`
- Modify: `supabase/functions/_shared/token-validator.ts`

- [ ] Require `CORE_QUESTION`, `TENSION`, `JUDGMENT`, and `ACTION` for `reading`.
- [ ] Update the Chinese and English prompts to request short, non-predictive sections.

### Task 2: Render Tarot Detail Fields

**Files:**
- Modify: `index.html`
- Modify: `styles.css`

- [ ] Add a hidden detail grid in the answer panel.
- [ ] Render the three detail fields for Tarot only.
- [ ] Keep the final action in the existing large `action-sentence`.
- [ ] Hide details for Meihua, Daily, and stored records without detail data.

### Task 3: Tests and Deployment

**Files:**
- Modify: `tests/clarify-contract.test.mjs`

- [ ] Add checks for the new Tarot tokens and UI nodes.
- [ ] Run syntax and contract tests.
- [ ] Deploy the `reading` Edge Function.
- [ ] Commit and push using `Jamison⚡CodeNinja <z1076250394@gmail.com>`.
