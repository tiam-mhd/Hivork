# IFP-TASK-092: Use Case + API — تأیید پرداخت

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 05 — Installments Advanced |
| Epic | Epic-03-Payment-Confirmation |
| ID | IFP-TASK-092 |
| Priority | P0 |
| Depends on | IFP-TASK-087, IFP-TASK-088, IFP-TASK-089, IFP-TASK-090, IFP-TASK-091 |
| Blocks | IFP-TASK-094, IFP-TASK-095, IFP-TASK-099, IFP-TASK-100 |
| Estimated | 6h |

---

## هدف

**تأیید پرداخت** (`PaymentAttempt` → `confirmed`) و به‌روزرسانی `Installment` — full یا partial pay — با domain state machine، audit `payment.confirm` و optimistic locking.

---

## معیار پذیرش

- [ ] `ConfirmPaymentUseCase`
- [ ] API `POST /api/v1/payment-attempts/:attemptId/confirm`
- [ ] Permission: `installments.payment.confirm`
- [ ] Only `status: pending` → `confirmed`
- [ ] Installment: if `sum(confirmed amounts) >= amountRial` → `paid` + `paidAt`
- [ ] Partial: installment stays `pending`/`overdue` with `metadata.paidRial` tracked
- [ ] `confirmedByStaffId`, `confirmedAt` set
- [ ] Audit: `payment.confirm`
- [ ] Domain event `PaymentConfirmedEvent`
- [ ] Integration + RBAC tests

---

## مشخصات فنی

### API

```
POST /api/v1/payment-attempts/:attemptId/confirm
Permission: installments.payment.confirm
Headers: X-Branch-Id
```

### Request

```json
{
  "note": "رسید بانکی تطبیق شد",
  "expectedAttemptVersion": 1,
  "expectedInstallmentVersion": 3
}
```

### Response `200`

```json
{
  "paymentAttempt": {
    "id": "uuid",
    "status": "confirmed",
    "confirmedAt": "2025-06-30T10:00:00.000Z",
    "version": 2
  },
  "installment": {
    "id": "uuid",
    "status": "paid",
    "paidAt": "2025-06-30T10:00:00.000Z",
    "version": 4
  }
}
```

### Domain transitions

```
PaymentAttempt: PENDING → CONFIRMED (terminal)
Installment: pending|overdue → paid (when fully paid)
Sale: recalculate remaining — optional event
```

### TX order

1. Lock attempt + installment rows
2. Validate versions + status
3. Update attempt confirmed
4. Apply payment to installment entity method `applyPayment(amountRial)`
5. Audit + outbox event

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/installments/confirm-payment.use-case.ts` |
| Create | `packages/contracts/src/installments/confirm-payment.schema.ts` |
| Create | `apps/api/src/modules/installments/payment-confirmation.controller.ts` |
| Update | `packages/domain/src/installments/installment.entity.ts` — `applyPayment` |
| Create | `packages/application/installments/confirm-payment.use-case.integration.spec.ts` |

---

## مراحل پیاده‌سازی

1. Domain `applyPayment` on Installment entity
2. Confirm use case with transaction
3. Controller + guards
4. Outbox `PaymentConfirmedEvent`
5. Tests: full pay, partial pay, double confirm blocked

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Already confirmed | 409 | `PAYMENT_ALREADY_CONFIRMED` |
| Rejected attempt | 409 | `PAYMENT_STATUS_INVALID` |
| Installment waived | 409 | `INSTALLMENT_ALREADY_WAIVED` |
| Version conflict | 409 | `VERSION_CONFLICT` |
| Confirm exceeds remaining | 400 | `AMOUNT_EXCEEDS_REMAINING` |

---

## تست

- [ ] Integration: confirm → installment paid
- [ ] Integration: partial confirm → still pending
- [ ] Integration: double confirm → 409
- [ ] RBAC: deny without permission
- [ ] Cross-tenant → 404

---

## UX

N/A — دکمه تأیید در IFP-099.

---

## Flow

```
لیست پرداخت‌های در انتظار → انتخاب → تأیید → قسط paid (اگر کامل)
→ toast + به‌روزرسانی وضعیت رنگ
```

---

## Policy Alignment

- [ ] ADR-008 — staff confirm required
- [ ] ADR-007 bigint
- [ ] ADR-015 branch scope
- [ ] Audit payment.confirm immutable

---

## مراجع

- `docs/01-product/installment-module-features.md` §۵ — تایید پرداخت
- `docs/03-modules/installments/state-machines.md`
- `docs/03-modules/installments/BUSINESS-RULES.md`

---

## Self-Review Score

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata | 10 | 10 | ✓ |
| Completeness | 25 | 25 | |
| Policy | 25 | 25 | |
| Executability | 25 | 25 | |
| Alignment | 15 | 15 | |
| **جمع** | **100** | **100** | ≥95 ✅ |
