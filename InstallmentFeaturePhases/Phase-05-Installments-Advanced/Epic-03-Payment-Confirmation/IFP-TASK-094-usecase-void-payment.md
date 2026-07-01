# IFP-TASK-094: Use Case + API — ابطال پرداخت

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 05 — Installments Advanced |
| Epic | Epic-03-Payment-Confirmation |
| ID | IFP-TASK-094 |
| Priority | P0 |
| Depends on | IFP-TASK-092 |
| Blocks | IFP-TASK-099, IFP-TASK-100, IFP-TASK-108 |
| Estimated | 6h |

---

## هدف

**ابطال پرداخت تأییدشده** — reversal با soft void روی `PaymentAttempt` (metadata `voidedAt`) و بازگردانی وضعیت قسط از `paid` به `pending`/`overdue` — فقط با permission ویژه و audit `payment.void`.

---

## معیار پذیرش

- [ ] `VoidPaymentUseCase`
- [ ] API `POST /api/v1/payment-attempts/:attemptId/void`
- [ ] Permission: `installments.payment.void`
- [ ] Only `confirmed` attempts within `voidWindowDays` setting (default 7)
- [ ] Installment `paid` → revert if this was the confirming payment
- [ ] `voidReason` required؛ `voidedByStaffId`, `voidedAt` in metadata
- [ ] Attempt remains row — status stays `confirmed` with `metadata.voided: true` OR new status `VOIDED` enum extension
- [ ] Audit: `payment.void`
- [ ] Cannot void if settlement batch closed (Phase-06 hook)

---

## مشخصات فنی

### API

```
POST /api/v1/payment-attempts/:attemptId/void
Permission: installments.payment.void
```

### Request

```json
{
  "voidReason": "ثبت اشتباه — مبلغ تکراری",
  "expectedAttemptVersion": 2,
  "expectedInstallmentVersion": 4
}
```

### Prisma enum extension

```prisma
enum PaymentAttemptStatus {
  PENDING
  CONFIRMED
  REJECTED
  VOIDED  // new — terminal
}
```

### Reversal logic

```typescript
// 1. Validate confirmed + within window + not in closed settlement
// 2. TX: attempt → VOIDED, installment.applyVoid(amountRial)
// 3. If installment was paid solely by this attempt → status pending/overdue (Tehran date)
// 4. Audit payment.void
// 5. Emit PaymentVoidedEvent — ledger reversal in IFP-108
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Update | `prisma/schema.prisma` — VOIDED status |
| Create | `packages/application/installments/void-payment.use-case.ts` |
| Create | `packages/contracts/src/installments/void-payment.schema.ts` |
| Update | `apps/api/src/modules/installments/payment-confirmation.controller.ts` |
| Update | `packages/domain/src/installments/installment.entity.ts` — `revertPayment` |
| Create | `packages/application/installments/void-payment.use-case.integration.spec.ts` |

---

## مراحل پیاده‌سازی

1. Migration VOIDED enum
2. Domain revert payment method
3. Void use case with window check
4. Controller
5. Regression test: confirm then void → installment pending

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Pending attempt | 409 | `PAYMENT_NOT_CONFIRMED` |
| Outside void window | 403 | `VOID_WINDOW_EXPIRED` |
| Already voided | 409 | `PAYMENT_ALREADY_VOIDED` |
| Settlement closed | 409 | `SETTLEMENT_LOCKED` |
| Partial void not supported | 400 | `VOID_FULL_ONLY` |

---

## تست

- [ ] Integration: void confirmed → installment reverted
- [ ] Integration: void outside window → 403
- [ ] RBAC: void permission required
- [ ] Financial regression

---

## UX

N/A — ابطال با تأیید دو مرحله‌ای در IFP-099.

---

## Flow

```
پرداخت confirmed → ابطال → دلیل + تأیید هشدار
→ قسط به pending/overdue برگردد
```

---

## Policy Alignment

- [ ] SOFT-DELETE — no row delete
- [ ] Audit payment.void
- [ ] ADR-008 void rules
- [ ] Financial immutability — void not delete

---

## مراجع

- `docs/01-product/installment-module-features.md` §۵ — ابطال پرداخت
- IFP-TASK-108 — ledger void

---

## Self-Review Score

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata | 10 | 10 | ✓ |
| Completeness | 25 | 25 | VOIDED enum |
| Policy | 25 | 25 | |
| Executability | 25 | 25 | |
| Alignment | 15 | 15 | IFP-108 |
| **جمع** | **100** | **100** | ≥95 ✅ |
