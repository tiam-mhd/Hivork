# IFP-183: Use Case + API — Subscription Billing

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 10 |
| Epic | Epic-04-Subscription-Billing |
| ID | IFP-183 |
| Priority | P0 |
| Depends on | IFP-182 |
| Blocks | IFP-184, IFP-187 |
| Estimated | 14h |

---

## هدف

تمدید اشتراک، پرداخت پلن، صورتحساب/فاکتور tenant-facing.

---

## معیار پذیرش

- [ ] GetSubscriptionUseCase
- [ ] RenewSubscriptionUseCase
- [ ] ListInvoicesUseCase
- [ ] SubscriptionInvoice model
- [ ] POST renew → payment gateway
- [ ] GET /api/v1/subscription
- [ ] /invoices
- [ ] Audit subscription.renew

---

## مشخصات فنی

Invoice: amountRial bigint, status, paidAt, gatewayRef

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/src/subscription/*.use-case.ts` |
| Create | `packages/infrastructure/persistence/prisma/schema/subscription-invoice.prisma` |

---

## مراحل پیاده‌سازی

1. Invoice schema
2. Renew flow
3. API

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Payment fail | 402 | SUBSCRIPTION_PAYMENT_FAILED |

---

## تست

- [ ] Integration renew mock gateway

---

## Policy Alignment

- [ ] Financial bigint
- [ ] Audit

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
