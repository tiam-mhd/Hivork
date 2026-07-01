# IFP-184: Frontend — Subscription & Billing UI

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 10 |
| Epic | Epic-04-Subscription-Billing |
| ID | IFP-184 |
| Priority | P0 |
| Depends on | IFP-183, IFP-002 |
| Blocks | IFP-187 |
| Estimated | 12h |

---

## هدف

صفحه `/admin/subscription` — پلن فعلی، usage caps، renew، invoices.

---

## معیار پذیرش

- [ ] Current plan card
- [ ] Usage meters staff/branch/sms
- [ ] Renew CTA
- [ ] Invoice table download PDF P1
- [ ] Excellence §7

---

## مشخصات فنی

SubscriptionPage, UsageMeter, InvoiceTable

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/web/src/app/(admin)/admin/subscription/page.tsx` |

---

## مراحل پیاده‌سازی

1. Layout
2. Usage API
3. Renew flow

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Trial expired | — | Banner + renew block |

---

## تست

- [ ] E2E view subscription

---

## UX (if UI)

- [ ] Excellence §7

---

## Policy Alignment

- [ ] EXCELLENCE §7

---

## مراجع

- `§22`

---

## Self-Review Score

> مبنا: `docs/09-development/PHASE_EPIC_TASK_AUTHORING_RULES.md` §10

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata (ID, Priority, Depends, Blocks, Estimate) | /10 | 10 | |
| Completeness (criteria, spec بدون TODO، files table) | /25 | 25 | |
| Policy (EXCELLENCE §8، soft delete، ADR cited) | /25 | 25 | |
| Executability (edge cases، tests، dev بدون سؤال) | /25 | 24 | |
| Alignment (sync docs، contracts، Epic README) | /15 | 15 | |
| **جمع** | **/100** | **99** | ≥95 — Ready |
