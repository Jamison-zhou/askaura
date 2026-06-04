# Later Roadmap: Community, Paid, Ops Implementation Notes

> **For agentic workers:** This is a route-level plan. Do not execute these tasks until Phases 0-5 are complete and a new implementation plan is written for the specific subsystem.

**Goal:** Preserve the full product direction from the v2 plan while keeping later systems out of the current migration and beta work.

**Architecture:** Community, paid features, and operations are separate subsystems. Each requires its own design/spec/implementation plan before coding.

**Tech Stack:** Supabase tables and functions, payment provider, admin UI, model monitoring.

---

## Phase 6: Anonymous Resonance Pool

Build only after:

- content safety exists
- record redaction rules exist
- user can revoke public submissions

Allowed:

- anonymous theme/action submission
- similar theme discovery
- good-question template extraction
- lightweight reactions

Not allowed:

- direct messages
- comments
- public profiles
- rankings
- trending lists
- follows

Core privacy rule:

- raw original questions do not enter the public pool by default.

## Phase 7: Long-Term Companion

Build only after:

- enough history exists
- review and action status are stable

Allowed:

- observation trail
- personal theme map
- symbol/action collection
- growth echo after one month
- quiet achievements

Not allowed:

- punishment for missed days
- dependency loops
- fate/fortune trend claims
- aggressive reminders

## Phase 8: Paid Features

Build only after:

- auth and sync are stable
- usage/cost can be measured
- free core value is complete

Possible paid features:

- deep dual report
- monthly theme report
- advanced spreads
- higher follow-up limits
- longer history
- synced collections
- PDF export
- private link management

Never sell:

- fortune changing
- deterministic future prediction
- reunion probability
- wealth/luck packages
- master blessing

## Phase 9: Operations And Quality

Build only after:

- prompt modes are stable
- model quality issues need ongoing monitoring

Possible systems:

- prompt version management
- copy CMS
- model event metrics
- content safety scan
- A/B tests
- admin rollback

Privacy rule:

- model monitoring must not store raw private questions or full generated content by default.

## Required Future Planning

Before implementing any subsystem here:

- [ ] Write a dedicated spec.
- [ ] Write a dedicated implementation plan.
- [ ] Define schema and RLS.
- [ ] Define privacy failure modes.
- [ ] Define rollback path.
- [ ] Define tests and smoke scenarios.

