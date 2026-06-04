# AskAura Implementation Plans Index

> **For agentic workers:** This is the single source of truth for AskAura implementation status. Do not infer unfinished work from old unchecked boxes inside phase documents until this index says that phase is active again.

**Goal:** Keep AskAura planning executable without letting completed migration notes, blocked payment work, and future product ideas collapse into one growing task list.

**Architecture:** AskAura is an independent project migrated from RiLL / cijing. The product is currently built as a static frontend with Supabase Edge Functions and Supabase storage tables. Future work should proceed one bounded phase at a time, with explicit status, blockers, and verification.

**Tech Stack:** Static HTML/CSS/JS, Supabase Edge Functions, Supabase Auth/REST, Vercel static hosting, Node-based test scripts.

---

## How To Read This Folder

- Treat this file as the authoritative status page.
- Treat phase files as implementation records and detailed references.
- Do not restart completed phases because an old task-level checkbox remains unchecked.
- Do not implement live payment checkout, payment buttons, subscription copy, or provider-specific webhooks until Phase 8B is explicitly unblocked here.
- Before starting any future feature, update this file first with the active goal, scope, blockers, and verification commands.

## Document Noise Policy

Older phase documents intentionally preserve the original task-by-task execution details. Many of those files still contain unchecked task boxes because they are historical implementation plans, not live task trackers.

Use this policy when deciding what is still open:

- `Complete` in this index overrides old unchecked boxes inside the phase file.
- `Blocked` means the work is known but must not be implemented until the listed decisions are made.
- `Future planning` means the idea needs a fresh spec before any code or UI work starts.
- `Decision checklist` files collect questions and gates only; they are not implementation plans.
- If a future worker believes a completed phase must be reopened, they must first update this index with the reason, scope, and verification plan.

## Current Status Summary

| Area | Status | Meaning |
| --- | --- | --- |
| Phase 0-7 foundation | Complete | Migration, beta cleanup, core experience, retention, spreads/gua, sharing/export, resonance pool, and companion foundation are treated as done. |
| Phase 1.5 model routing | Complete | Model routing, DeepSeek thinking controls, and cost-control guardrails are done. |
| Phase 8A paid foundation | Complete | Server-owned entitlements, usage ledger, cost gates, provider-neutral webhook skeleton, and account plan status UI are done. |
| Phase 8B live payment | Blocked | Payment provider, refund/cancel/tax flow, pricing, and sandbox webhook contract are not selected. Do not touch payment code for this yet. |
| Phase 9A ops quality | Complete | Privacy-safe quality metadata, quality events, Admin Ops controls, and rollback controls are done. |
| Phase 9B/9C ops expansion | Future planning | Prompt CMS, copy CMS, A/B tests, and richer dashboards need a fresh spec before implementation. |
| Engineering refactor route | Complete | Reading Client, Result Renderer, Followup, History Store, Ritual Engine, and Meihua Engine slices are done. |
| Later roadmap | Future planning | Community, paid packaging, and advanced product ideas are not active implementation tasks until separately scoped. |
| Pre-release smoke checklist | Active document | Use this as the release-readiness checklist before preview or production validation. |

## Completed Foundation

These documents are completion records unless this index is updated to reopen them:

1. [Phase 0: Supabase Migration](./01-phase-0-supabase-migration.md)
2. [Phase 1: Public Beta Cleanup](./02-phase-1-public-beta-cleanup.md)
3. [Phase 1.5: Model Router, Thinking, And Cost Control](./03-phase-1-5-model-router-cost-control.md)
4. [Phase 2: Core Experience Upgrade](./03-phase-2-core-experience-followup.md)
5. [Phase 3: Retention And Review](./04-phase-3-retention-review.md)
6. [Phase 4: Spreads And Gua System](./05-phase-4-spreads-gua-system.md)
7. [Phase 5: Sharing And Export](./06-phase-5-sharing-export.md)
8. [Phase 6: Anonymous Resonance Pool](./09-phase-6-anonymous-resonance-pool.md)
9. [Phase 7: Long-Term Companion](./10-phase-7-long-term-companion.md)
10. [Engineering Refactor Route](./08-engineering-refactor.md)
11. [Refactor Slice: Reading Client](./13-refactor-reading-client.md)
12. [Refactor Slice: Result Renderer](./14-refactor-result-renderer.md)
13. [Refactor Slice: Followup](./15-refactor-followup.md)
14. [Refactor Slice: History Store](./16-refactor-history-store.md)
15. [Refactor Slice: Ritual Engine](./17-refactor-ritual-engine.md)
16. [Refactor Slice: Meihua Engine](./18-refactor-meihua-engine.md)

## Active Or Blocked Work

### Pre-Release Smoke Checklist

**Status:** Active document, not a feature implementation.

**Reference:** [Pre-Release Smoke Checklist](./20-pre-release-smoke-checklist.md)

Use this checklist before a preview or production release. Keep it focused on verification, rollback, and release readiness; do not add new product scope from it.

### Phase 8B: Live Payment Checkout And Portal

**Status:** Blocked.

**Reference:** [Phase 8: Paid Features](./11-phase-8-paid-features.md)

**Provider decision aid:** [Phase 8B Alipay Decision Checklist](./19-phase-8b-alipay-decision-checklist.md)

**Do not implement yet:**

- Checkout buttons.
- Public subscription purchase copy.
- Provider-specific webhook handlers.
- Customer billing portal.
- Automatic paid entitlement activation from real payment events.

**Unblock only after these decisions exist:**

- Payment provider: Stripe, Paddle, Lemon Squeezy, WeChat Pay, Alipay, or another named provider.
- Refund, cancellation, grace-period, and failed-payment behavior.
- Tax or invoice expectations.
- Plan names, prices, quota rules, and entitlement mapping.
- Sandbox credentials and webhook signature verification requirements.
- Browser and HTTP smoke scenarios for a full sandbox purchase and cancellation cycle.

### Phase 9B/9C: Operations Expansion

**Status:** Future planning, not active implementation.

**Reference:** [Phase 9: Operations And Quality](./12-phase-9-operations-quality.md)

Possible later work:

- Prompt version CMS.
- Copy CMS.
- A/B testing.
- Internal quality dashboard.
- Safer prompt rollback workflow beyond current Phase 9A controls.

Start only after a dedicated spec defines the operator workflow, data model, privacy boundaries, rollback behavior, and tests.

## Future Ideas, Not Current Tasks

**Reference:** [Later Roadmap: Community, Paid, Ops](./07-later-roadmap-community-paid-ops.md)

These ideas are not active tasks:

- Deep dual report.
- Monthly theme report.
- Advanced spreads.
- Higher follow-up limits.
- Longer history.
- Synced collections.
- Paid PDF export.
- Private link management as a paid feature.
- More community mechanics beyond the completed resonance foundation.

Before implementing any one of these, write a dedicated spec and implementation plan covering:

- Product behavior.
- Data schema and RLS.
- Privacy failure modes.
- Cost and abuse controls.
- Rollback path.
- Local tests, HTTP smoke, and browser smoke.

## Current Repo Facts

- Repo: `D:\CursorAgentChats\askaura`
- Frontend: pure static `index.html` + `styles.css`
- Admin: `admin.html`
- Storage: `assets/app/storage.js`
- Sync: `assets/app/sync.js`
- Functions: `supabase/functions/reading`, `tarot-draw`, `admin-config`
- Old Supabase ref: `icvegpfnpkyrebtojoca`
- Old tables: `rill_reflection_records`, `rill_daily_anchors`, `rill_runtime_config`
- Old localStorage keys: `rill.history.v1`, `rill.dailyAnchors.v1`, `rill.authSession.v1`
- Current active code should use AskAura placeholders or real AskAura values, never the old ref.
- Current active table names: `askaura_reflection_records`, `askaura_daily_anchors`, `askaura_runtime_config`
- Current active localStorage keys: `askaura.history.v1`, `askaura.dailyAnchors.v1`, `askaura.authSession.v1`

## Verification Baseline

Run the checks relevant to the touched area. For broad changes, use the full local baseline:

```powershell
node --experimental-vm-modules tests/index-syntax.test.mjs
node tests/askaura-migration-static.test.mjs
node tests/clarify-contract.test.mjs
node tests/meihua.test.mjs
node tests/phase1-mobile-css.test.mjs
node tests/storage.test.mjs
node tests/sync.test.mjs
```

For payment-related work after Phase 8B is unblocked, add provider sandbox HTTP smoke and browser smoke before marking complete.
