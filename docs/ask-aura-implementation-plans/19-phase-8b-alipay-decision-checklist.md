# Phase 8B Alipay Decision Checklist

> **For agentic workers:** This is a decision checklist, not an implementation plan. Do not implement checkout, payment buttons, customer portal, or Alipay-specific webhook code from this file.

**Goal:** Decide whether and how AskAura should use Alipay for Phase 8B live payment without opening payment code before the commercial, compliance, and refund rules are clear.

**Recommended MVP Direction:** Use Alipay for one-time entitlement packages first. Do not start with auto-renewing subscription.

---

## Current Recommendation

For AskAura's first paid release, prefer this shape:

- Provider: Alipay.
- Payment mode: website or mobile website payment.
- Product model: one-time entitlement packages.
- Entitlement source of truth: existing server-owned entitlement and usage tables from Phase 8A.
- Browser role: request purchase creation and display final plan state only.
- Backend role: create payment order, verify Alipay notification, store billing event, activate entitlement.

Avoid this in the MVP:

- Auto-renewing subscription.
- Complex membership levels.
- Multi-currency pricing.
- Automatic invoice workflow.
- Self-service refund portal.
- Any paid copy that promises accuracy, luck changes, deterministic outcomes, reunion probability, or wealth outcomes.

## Why One-Time Packages First

One-time packages match the current Phase 8A foundation better than subscriptions:

- Entitlements can be activated by a single verified payment event.
- Refund handling is simpler.
- Cancellation and failed renewal states are avoided.
- The product can validate paid demand before adding recurring billing operations.
- Support burden is lower while AskAura is still moving from beta to a growth product.

Auto-renewing subscription should wait until AskAura has proven:

- Users repeatedly need paid depth or higher limits.
- Support can handle cancellation, refund, downgrade, and invoice questions.
- Paid copy and entitlement boundaries are stable.
- Payment operations have a clear owner.

## Business Decisions Required

Do not start implementation until these are answered:

- [ ] Legal payment entity: personal merchant, individual business, company, or service provider account.
- [ ] Target market: mainland China only, overseas Chinese users, or global.
- [ ] Payment product: Alipay website payment, mobile website payment, QR/code payment, or a combination.
- [ ] Domain and hosting compliance: production domain, ICP status if required, app/site audit materials.
- [ ] Settlement account: who receives money and who handles reconciliation.
- [ ] Customer support owner: who handles failed payments, duplicate payments, refunds, and complaints.
- [ ] Refund policy: full refund, partial refund, no refund after usage, manual-only refund, and refund time window.
- [ ] Tax/invoice policy: no invoice, manual invoice, or platform invoice workflow.
- [ ] Customer identity policy: whether a paid user must sign in before purchase.

## Product Decisions Required

Choose a small first SKU set. Do not launch more than three paid products in the first Alipay MVP.

Recommended first options:

- [ ] Pro 30 days: unlock higher limits and deeper model route for 30 calendar days.
- [ ] Deep report pack: 5 deep reports, consumed one by one.
- [ ] Follow-up pack: extra follow-up quota for the current month.

Decide exact SKU rules:

- [ ] SKU names.
- [ ] Prices in CNY.
- [ ] Entitlement type: time-based, usage-count-based, or mixed.
- [ ] Start time: immediately after verified payment, or after first use.
- [ ] Expiry time.
- [ ] Whether unused quota rolls over.
- [ ] Whether repeat purchase stacks time/quota.
- [ ] Whether refunds revoke already granted quota.
- [ ] Whether paid features are visible before launch or hidden behind an admin flag.

## Alipay Account And App Checklist

Collect these outside git and markdown. Never paste secrets into repo files, docs, or chat.

- [ ] Alipay merchant account is available.
- [ ] Alipay Open Platform app is created.
- [ ] Required payment capability is signed and approved.
- [ ] Sandbox app is available.
- [ ] Sandbox buyer account is available.
- [ ] App ID is known.
- [ ] Alipay gateway mode is selected: sandbox or production.
- [ ] App private key is generated and stored in Supabase secrets only.
- [ ] Alipay public key or certificate is available and stored in Supabase secrets only.
- [ ] Notify URL can be reached publicly by Alipay.
- [ ] Return URL points to AskAura account/status page.
- [ ] Product names and site materials satisfy Alipay review requirements.

## Technical Decisions Required

Before writing code, define these contracts:

- [ ] Order id format, for example `askaura_yyyymmdd_random`.
- [ ] Local order table or billing event extension needed before webhook activation.
- [ ] Mapping from Alipay trade status to AskAura billing event type.
- [ ] Idempotency key: Alipay trade number, out trade number, or both.
- [ ] Signature verification method.
- [ ] Notification timestamp tolerance.
- [ ] Duplicate notification behavior.
- [ ] Payment success condition.
- [ ] Refund event handling.
- [ ] Manual reconciliation process when Alipay says paid but AskAura entitlement is missing.
- [ ] Admin kill switch behavior for paid UI and entitlement activation.

Recommended event mapping:

| Alipay signal | AskAura action |
| --- | --- |
| Payment verified and trade success | Store billing event, activate matching entitlement. |
| Duplicate payment notification | Return success without granting entitlement twice. |
| Invalid signature | Return failure, write no entitlement. |
| Refund confirmed | Store refund event, revoke or adjust entitlement according to refund policy. |
| Unknown trade status | Store ignored/error billing event, do not activate entitlement. |

## Security And Privacy Rules

- Browser must never receive Alipay private key, signing material, or service credentials.
- Entitlement activation must depend on verified async notification, not browser redirect.
- Return URL is only a user experience hint; it must not grant paid access.
- Billing logs must not store full user questions, generated readings, or private reflection text.
- Webhook processing must be idempotent.
- Failed signature verification must not mutate entitlement state.
- Admin runtime config must be able to hide paid UI and disable pro routing.

## Minimum Acceptance Tests For A Future Implementation Plan

When Phase 8B is unblocked, the implementation plan must include these tests:

- [ ] Static contract test confirms no browser-side payment secret exists.
- [ ] Static contract test confirms Alipay webhook verifies signature before writes.
- [ ] Unit or integration test confirms duplicate notification is idempotent.
- [ ] Unit or integration test confirms invalid signature does not grant entitlement.
- [ ] Unit or integration test confirms `return_url` alone cannot grant entitlement.
- [ ] HTTP smoke creates a sandbox payment order.
- [ ] HTTP smoke verifies sandbox payment notification activates entitlement once.
- [ ] HTTP smoke verifies refund path updates entitlement according to policy.
- [ ] Browser smoke confirms no checkout button appears while paid runtime flag is off.
- [ ] Browser smoke confirms account status updates after verified payment.

## Decision Summary Template

Fill this before writing the Phase 8B implementation plan:

```text
Payment provider: Alipay
Payment product:
Commercial entity:
Production domain:
ICP / audit status:
First SKU list:
Price list:
Entitlement mapping:
Refund policy:
Invoice/tax policy:
Required sign-in before payment: yes/no
Sandbox ready: yes/no
Webhook signature material ready in Supabase secrets: yes/no
Manual reconciliation owner:
Go/no-go decision:
```

## Go / No-Go Gate

Phase 8B is still blocked until every required business, product, account, technical, and acceptance-test decision above is either answered or explicitly marked out of scope.

Once the gate is complete, write a dedicated Phase 8B Alipay implementation plan before touching code.
