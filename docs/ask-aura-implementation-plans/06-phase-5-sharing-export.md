# Phase 5: Sharing And Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let users take results with them without exposing private questions by default.

**Architecture:** Start with local share image and copy summary. Add private links only after record ownership and revoke behavior are clear.

**Tech Stack:** Static browser rendering, local canvas or DOM-to-image approach, Supabase RLS for private links.

---

## Preconditions

- Phase 3 history records are stable.
- Result payload contains a core conclusion and one action.

## Task 1: Copy Summary

**Files:**
- Modify: `index.html`

- [x] Add copy options: short summary and full result.
- [x] Short summary includes symbol, core conclusion, and action.
- [x] Full result excludes hidden internal metadata.
- [x] Copy failure falls back to selecting text.

## Task 2: Local Share Image

**Files:**
- Modify: `index.html`
- Modify: `styles.css`

- [x] Create a share card layout.
- [x] Include AskAura mark, card/gua symbol, core conclusion, and one action.
- [x] Exclude original question by default.
- [x] Allow user to opt into including question only if explicit.
- [x] Generate image locally in browser.

## Task 3: PDF Export

**Files:**
- Modify: `index.html`

- [x] Add export for one result.
- [x] Include review note if present.
- [x] Do not include raw account data.
- [x] If browser print is used, style print output cleanly.

## Task 4: Private Link

**Files:**
- Create migration for `askaura_share_links`
- Modify: `assets/app/sync.js`
- Modify: `index.html`
- Create/modify Edge Function if public read is needed.

- [x] Private links require login.
- [x] Default is off.
- [x] Generated links are read-only.
- [x] Links can be revoked.
- [x] Public endpoint must not expose user email or raw private metadata.

**Status:** Implemented with a dedicated `askaura_share_links` table and `share-link` Edge Function. Direct table access stays denied by RLS; public reads return only cropped payloads by token hash. Live smoke covered anonymous-create rejection, bad-token rejection, authenticated create, read, revoke, and revoked-token rejection.

## Verification

- [x] Local share image works without login.
- [x] Default share image excludes original question.
- [x] Private link cannot be created anonymously.
- [x] Revoked private link no longer loads.
- [x] PDF/export does not leak hidden data.

## Definition Of Done

- [x] User can copy, export, and optionally share without losing privacy control.
- [x] Sharing does not turn AskAura into a public social product.
