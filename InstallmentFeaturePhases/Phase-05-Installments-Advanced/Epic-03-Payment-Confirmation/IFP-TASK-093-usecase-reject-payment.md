# IFP-TASK-093: Use Case + API — رد پرداخت

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 05 — Installments Advanced |
| Epic | Epic-03-Payment-Confirmation |
| ID | IFP-TASK-093 |
| Priority | P0 |
| Depends on | IFP-TASK-087, IFP-TASK-088, IFP-TASK-089, IFP-TASK-090, IFP-TASK-091 |
| Blocks | IFP-TASK-099, IFP-TASK-100 |
| Estimated | 4h |

---

## هدف

**رد پرداخت** گزارش‌شده — `PaymentAttempt` از `pending` به `rejected` با `rejectedReason` اجباری — بدون تغییر وضعیت قسط؛ audit `payment.reject`.

---

## معیار پذیرش

- [ ] `RejectPaymentUseCase`
- [ ] API `POST /api/v1/payment-attempts/:attemptId/reject`
- [ ] Permission: `installments.payment.reject`
- [ ] `rejectedReason` ۳–۵۰۰ کاراکتر required
- [ ] Only pending → rejected (terminal)
- [ ] Installment unchanged
- [ ] Audit: `payment.reject`
- [ ] Optional notify customer (event — not blocking)

---

## مشخصات فنی

### API

```
POST /api/v1/payment-attempts/:attemptId/reject
Permission: installments.payment.reject
```

### Request

```json
{
  "rejectedReason": "رسید ارسالی با مبلغ ثبت‌شده مطابقت ندارد",
  "expectedVersion": 1
}
```

### Response `200`

```json
{
  "paymentAttempt": {
    "id": "uuid",
    "status": "rejected",
    "rejectedReason": "...",
    "rejectedAt": "2025-06-30T10:05:00.000Z",
    "version": 2
  }
}
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/installments/reject-payment.use-case.ts` |
| Create | `packages/contracts/src/installments/reject-payment.schema.ts` |
| Update | `apps/api/src/modules/installments/payment-confirmation.controller.ts` |
| Create | `packages/application/installments/reject-payment.use-case.integration.spec.ts` |

---

## مراحل پیاده‌سازی

1. Contract schema
2. Use case — status check + update
3. Audit + optional `PaymentRejectedEvent`
4. Controller
5. Tests

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Already confirmed | 409 | `PAYMENT_ALREADY_CONFIRMED` |
| Already rejected | 409 | `PAYMENT_ALREADY_REJECTED` |
| Empty reason | 400 | Zod |
| Version conflict | 409 | `VERSION_CONFLICT` |

---

## تست

- [ ] Integration: reject pending → rejected
- [ ] Integration: reject confirmed → 409
- [ ] RBAC deny

---

## UX

N/A — modal رد با دلیل در IFP-099.

---

## Flow

```
پرداخت pending → رد → وارد کردن دلیل (required) → confirm
→ وضعیت rejected نمایش داده شود
```

---

## Policy Alignment

- [ ] ADR-008 state machine
- [ ] Audit payment.reject
- [ ] SOFT-DELETE — reject ≠ delete

---

## مراجع

- `docs/01-product/installment-module-features.md` §۵ — رد پرداخت

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
