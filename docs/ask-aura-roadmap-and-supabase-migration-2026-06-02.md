# AskAura Roadmap And Supabase Migration Plan - 2026-06-02

## 1. Current Stage

AskAura is currently a beta product with the core experience working, but with backend and brand migration still incomplete.

Already in place:

- Independent AskAura frontend and Vercel project.
- Three main modes: `牌象解读`, `卦象解读`, `双象报告`.
- 22-card tarot ritual with full-screen modal, selected card state, and result page.
- Result page structure: core conclusion, card message, stuck point, reminder, next step, and follow-up exploration.
- History, daily anchor, email login, and cloud sync.
- Supabase Edge Functions, SSE streaming, MiMo/Kimi provider support, and admin runtime config.
- Tests for syntax, clarification contract, meihua, storage, and sync.

Biggest current risk:

- AskAura frontend is independent, but Supabase still points to the old cijing/RiLL project `icvegpfnpkyrebtojoca`.
- Tables, localStorage keys, runtime config, and admin UI still use `rill_*` naming.
- Before growth work, backend isolation must be completed to prevent AskAura and cijing data/config/deployments from crossing.

## 2. Phase 0: Independent Supabase Migration

Goal: AskAura uses its own Supabase project and no longer depends on or pollutes cijing.

Implementation:

- Create a new AskAura Supabase project.
- Create AskAura-owned tables:
  - `askaura_reflection_records`
  - `askaura_daily_anchors`
  - `askaura_runtime_config`
- Copy and adapt RLS policies so users can only read and write their own records.
- Deploy these Edge Functions to the new project:
  - `reading`
  - `tarot-draw`
  - `admin-config`
- Switch frontend and admin page to the new Supabase URL and anon key.
- Rename runtime config, admin session, and localStorage keys to `askaura_*`.
- Keep compatibility reads for old `rill.*` localStorage keys, but write new data only to `askaura.*`.
- Replace old project refs, cijing URLs, and RiLL deployment commands in docs.

Risk controls:

- Do not modify the old cijing Supabase project.
- Do not migrate old cijing cloud user data by default.
- Do not write service role keys, LLM keys, or admin secrets into code or chat.
- Configure a fresh LLM provider key for AskAura.
- Rotate the previously exposed Xiaomi key.
- Configure Auth Redirect URLs for AskAura production and local development.
- Rename Edge Function headers/persona from RiLL/此镜 to AskAura/象问.
- Add scans/tests for old Supabase refs and brand residue.

Acceptance:

- AskAura production only talks to the new Supabase project.
- Old cijing project receives no new AskAura test records.
- Login, history, sync, and admin config write into AskAura tables.
- Existing tests pass.

## 3. Phase 1: Public Beta Cleanup

Goal: turn the current beta into a stable public trial.

Product cleanup:

- Standardize visible brand language to `象问 AskAura`.
- Keep the current result page direction:
  - left side is `本次象意摘要`
  - right side keeps the accepted result hierarchy
- Keep ordinary follow-ups separate from clarification-card drawing.
- Keep `重新抽牌（新结果）` visually weaker and confirmation-gated.
- Never show `undefined`, `null`, or empty result sections.
- Check mobile layout for ritual, result page, follow-up panel, and login panel.

Engineering cleanup:

- Use a fixed local command:

```powershell
python -m http.server 5174 --directory D:\CursorAgentChats\askaura
```

- Use this local URL:

```text
http://127.0.0.1:5174/index.html
```

- Update README, DEPLOY, AGENTS, and handoff docs.
- Verify on Vercel Preview before production.
- Keep a working deployment rollback path.

Acceptance:

- Local and production page title is `象问 AskAura`.
- All three modes generate results.
- History, login, sync, and admin config work.
- Docs no longer guide deployment to cijing.

## 4. Phase 2: Core Experience Upgrade

Goal: make users feel AskAura understands the current question, not just that it generated a one-off result.

Features:

- AI ordinary follow-up:
  - user asks about the current result
  - answer appends to the current result page
  - no new card draw
- Clarification-card report:
  - still triggers a new draw
  - explains what the clarification card adds to the previous card
  - shows what judgment it adjusts
  - gives a combined reminder and one action
- Good-question guidance:
  - add examples that turn vague questions into observable questions
- Result feedback:
  - `有帮助`
  - `太泛`
  - `不适合我`
  - `想继续问`

Interface changes:

- Add `followup` mode to the `reading` Edge Function.
- Follow-up request includes original question, current result summary, user follow-up, and language.
- Clarification-card request includes previous question, previous result summary, previous card, and clarification card.
- History payload stores `followups` and `clarificationOf`.

Acceptance:

- Ordinary follow-up never triggers card drawing.
- Clarification card always triggers a new draw.
- Follow-up failure does not clear the current result.
- Restored history still shows follow-ups and clarification-card links.

## 5. Phase 3: Retention And Review

Goal: give users a natural reason to return tomorrow, in three days, and after a week.

Features:

- Daily AskAura:
  - upgrade current daily note into a daily entry
  - generate once per day
  - avoid encouraging result refreshing
- Action status:
  - `已完成`
  - `没完成`
  - `暂时跳过`
  - `不适合我`
- Three-day review:
  - result page creates a review question
  - history reminds the user to return after three days
- Better history:
  - date grouping
  - mode filters
  - favorites
  - follow-up records
  - clarification-card chain
- Weekly summary:
  - repeated theme this week
  - where the user often gets stuck
  - one action for next week

Interface changes:

- History records add `actionStatus`, `reviewAt`, `reviewNote`, and `favorite`.
- Add `weekly-summary` mode to `reading`.
- Cloud sync covers all new fields.

Acceptance:

- A result can lead into a three-day review.
- History answers: "What have I been repeatedly asking about?"
- Weekly summary stays observational and does not make fate claims.

## 6. Phase 4: Spread And Gua System

Goal: upgrade AskAura from a one-card tool into a fuller symbolic system.

Features:

- Tarot spreads:
  - one card: current reflection
  - three cards: current state / resistance / next step
  - relationship spread: me / the other person / the tension between us
  - choice spread: option A / option B / shared reminder
- Spread result shape:
  - one sentence per card
  - one combined conclusion
  - one action
  - no long traditional tarot essay
- Meihua enhancement:
  - cast by current moment
  - cast from one Chinese character
  - cast from one number
  - cast from a casually selected number
- Dual report enhancement:
  - card reads emotion
  - gua reads rhythm
  - dual report reads action strategy

Interface changes:

- `reading` supports `spreadType` and `cards[]`.
- `meihua-reading` supports `castMethod`, `seedText`, and `seedNumber`.
- History records store spread details and cast source.

Acceptance:

- Multi-card spreads remain structured self-reflection, not future prediction.
- Meihua no longer feels like reskinned tarot.
- Dual report has clear value beyond single card or single gua.

## 7. Phase 5: Sharing And Export

Goal: let users take results with them without breaking privacy.

Features:

- Share image:
  - AskAura mark
  - card/gua symbol
  - core conclusion
  - one small action
  - user question excluded by default
- Copy summary:
  - short summary
  - full result
- Private link:
  - logged-in users can manually enable a read-only link
  - default off
  - revocable
- PDF export:
  - one result
  - one review
  - one weekly summary

Interface changes:

- Prefer local share-image generation.
- Private links require record-level `shareToken` or a new share table.
- Sharing status must be revocable.

Acceptance:

- Share images do not leak private questions.
- Visual style remains quiet and non-mystical.
- Anonymous/local users can still generate local share images.

## 8. Phase 6: Community And Resonance Pool

Goal: build low-noise shared reflection, not a social feed.

Features:

- Anonymous resonance pool:
  - users can anonymously submit a result summary
  - show theme and action only
  - hide original question by default
- Similar themes:
  - show that others are observing similar themes
  - do not show identities
- Good-question templates:
  - derive reusable question templates from anonymous content
- Lightweight reactions only:
  - `我也在经历`
  - `这个行动有用`
  - `我想收藏这个问题`

Explicitly out of scope:

- DMs
- comments
- like rankings
- trending lists
- follows
- user profile pages

Interface changes:

- Add anonymous theme table.
- Public content must be redacted.
- Raw questions do not enter the community by default.

Acceptance:

- Community does not become an emotional dumping ground.
- No social pressure.
- Community content improves question templates.

## 9. Phase 7: Long-Term Companion And Light Gamification

Goal: strengthen continued use without creating check-in anxiety.

Features:

- Gentle continuity:
  - show recent observation trail
  - no punishment for missed days
- Personal theme map:
  - relationship
  - work
  - self-doubt
  - decision difficulty
  - emotional drain
  - action delay
- Symbol collection:
  - saved card
  - saved gua
  - saved action sentence
- Growth echo:
  - one month later: "You asked this a month ago. How do you see it now?"
- Quiet achievements:
  - completed one review
  - observed yourself for three days
  - saved one important question

Acceptance:

- No anxiety mechanics.
- No dependency loop.
- All growth feedback is based on records and reviews.

## 10. Phase 8: Paid Features

Goal: monetize high-cost AI and deeper organization after core value is stable.

Paid features:

- Deep dual report.
- Monthly theme report.
- Advanced spreads.
- Unlimited AI follow-ups.
- Longer history retention.
- Synced collections.
- PDF export.
- Private link management.

Free features to keep:

- Basic tarot/gua/dual reading.
- Basic history.
- Daily AskAura.
- Limited follow-ups.

Payment implementation:

- Use Stripe, Creem, or Lemon Squeezy.
- Store entitlement in Supabase.
- Edge Functions gate advanced modes by entitlement.
- Payment failure must not break free functionality.

Never sell:

- fortune changing
- future prediction certainty
- reunion probability
- wealth/luck packages
- master blessing
- any deterministic claim

Acceptance:

- Free version still delivers complete core value.
- Paid tier sells deeper organization, longer history, and higher AI usage.
- Copy does not manufacture anxiety.

## 11. Phase 9: Operations And Quality System

Goal: make AskAura operable without code changes.

Features:

- Prompt config admin:
  - manage prompts by mode
  - manage prompt versions
- Copy CMS:
  - homepage copy
  - mode descriptions
  - sample questions
  - result section labels
- Model monitoring:
  - provider
  - model
  - failure rate
  - missing-token rate
  - average latency
- Content safety scan:
  - block terms such as `算命`, `改运`, `命中注定`, `转运`
- A/B tests:
  - homepage copy
  - sample questions
  - follow-up entry
  - result structure

Interface changes:

- `askaura_runtime_config` adds prompt version.
- History records store prompt version.
- Admin supports config rollback.

Acceptance:

- Key prompt and copy can be adjusted without code changes.
- Model quality issues are visible.
- Bad prompt versions can be rolled back quickly.

## 12. Engineering Refactor Route

Goal: reduce risk as features grow.

First split:

- `reading-client`: SSE, errors, token warnings.
- `result-renderer`: structured result rendering.
- `followup`: ordinary follow-up and clarification-card state.
- `history-store`: local history, cloud sync, record structure.
- `runtime-config`: config loading and default copy merge.

Second split:

- `ritual-engine`: draw, select, spread.
- `meihua-engine`: cast methods and gua generation.
- `i18n`: Chinese and English copy.
- `auth-panel`: login, reset password, sync status.
- `admin-client`: admin config load/save.

Tests to add:

- Old Supabase ref scan.
- Brand residue scan.
- Storage key migration.
- Follow-up flow.
- Clarification-card chain.
- Multi-card spread data.
- History record migration.
- Browser smoke test.

## 13. Recommended Execution Order

1. AskAura Supabase independent migration.
2. Brand and deployment documentation cleanup.
3. AI ordinary follow-up.
4. Clarification-card report.
5. History and action status.
6. Three-day review.
7. Meihua cast enhancement.
8. Three-card spread.
9. Share image.
10. Weekly summary.
11. Symbol collection.
12. Admin prompt management.
13. Paid deep report.
14. Anonymous resonance pool.
15. Monthly report.
16. Personal theme map.
17. Private links.
18. PDF export.
19. A/B testing and quality monitoring.
20. Long-term companion system.

## 14. Global Risk List

Long-term risks to control:

- AskAura and cijing backend crossing.
- User data written into the wrong project.
- RLS misconfiguration leaking user data.
- Auth redirects pointing to the wrong site.
- LLM key leakage or reuse of exposed keys.
- Weak admin-config permissions.
- Anonymous entry points being abused and increasing model cost.
- Result output drifting into fortune telling, prediction, or reunion probability.
- Share images leaking private questions.
- Community becoming a noisy emotional dumping ground.
- Paid copy manufacturing anxiety.
- Multi-card spreads turning the product into a traditional tarot tool.
- Gamification creating dependency.
- `index.html` continuing to grow until it becomes hard to change safely.
- Old project names in docs causing future deployments to hit cijing.

## 15. Success Criteria

Stage success:

- AskAura backend is independent and no longer accesses cijing Supabase.
- Current beta is stable enough for public trial.
- User can complete: ask, draw/cast, read result, follow up, draw clarification card, save, review history, login, and sync.
- Product has natural return points after three days and after one week.
- Sharing, community, and paid features all preserve privacy and self-reflection principles.

Final product standard:

- AskAura is not a fortune-telling tool.
- AskAura is not generic AI chat.
- AskAura is not a traditional tarot utility.
- AskAura is a private companion product built around symbols, self-reflection, action, and review.
