# IFP-TASK-107: Use Case + API — استرداد

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 06 — Payments & Checks |
| Epic | Epic-03-Refund-Void-Settlement |
| ID | IFP-TASK-107 |
| Priority | P0 |
| Depends on | IFP-TASK-105, IFP-TASK-103 |
| Blocks | IFP-TASK-117, IFP-TASK-118 |
| Estimated | 6h |

---

## هدف

**استرداد (refund)** پرداخت تأییدشده — ایجاد ledger entry نوع `REFUND` + optional gateway refund callback — با audit `payment.refund` و بازگردانی partial/full به مشتری.

---

## معیار پذیرش

- [ ] `RefundPaymentUseCase`
- [ ] API `POST /api/v1/payments/transactions/:ledgerEntryId/refund`
- [ ] Permission: `installments.payment.refund`
- [ ] Only `POSTED` `PAYMENT_IN` entries eligible
- [ ] `refundAmountRial` ≤ original amount − prior refunds
- [ ] Creates ledger `REFUND` DEBIT entry + links `reversesEntryId`
- [ ] Online payments: trigger gateway refund port
- [ ] Installment status revert if full refund
- [ ] Audit: `payment.refund`
- [ ] Idempotency-Key support

---

## مشخصات فنی

### API

```
POST /api/v1/payments/transactions/:ledgerEntryId/refund
Permission: installments.payment.refund
```

### Request

```json
{
  "refundAmountRial": "5000000",
  "reason": "اشتباه در مبلغ — استرداد کامل",
  "refundMethod": "original"
}
```

### Response `201`

```json
{
  "refundEntry": {
    "id": "uuid",
    "entryType": "refund",
    "direction": "debit",
    "amountRial": "5000000",
    "status": "posted"
  },
  "gatewayRefundId": "optional-external-id"
}
```

### Logic

```typescript
// 1. Load ledger entry + validate posted PAYMENT_IN
// 2. Sum prior refunds for same entry
// 3. TX: insert REFUND entry, update installment if full refund
// 4. Gateway refund if method online
// 5. Audit payment.refund
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/payments/refund-payment.use-case.ts` |
| Create | `packages/contracts/src/payments/refund-payment.schema.ts` |
| Create | `apps/api/src/modules/payments/refund.controller.ts` |
| Create | `packages/application/payments/refund-payment.integration.spec.ts` |

---

## مراحل پیاده‌سازی

1. Refund eligibility rules in domain
2. Use case + ledger writes
3. Gateway refund port (mock for tests)
4. Controller
5. Regression: refund amount = original for full refund

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Entry already voided | 409 | `LEDGER_ENTRY_VOIDED` |
| Refund > remaining | 400 | `REFUND_AMOUNT_EXCEEDS` |
| Settlement batch closed | 409 | `SETTLEMENT_LOCKED` |
| Gateway refund fail | 502 | `GATEWAY_REFUND_FAILED` — TX rollback |

---

## تست

- [ ] Integration: full refund → installment pending
- [ ] Integration: partial refund
- [ ] Integration: exceed amount → 400
- [ ] RBAC deny
- [ ] Financial regression

---

## UX

N/A — refund modal در IFP-117.

---

## Flow

```
جزئیات تراکنش → استرداد → مبلغ + دلیل → confirm
→ ledger REFUND + وضعیت قسط به‌روز
```

---

## Policy Alignment

- [ ] ADR-007 bigint
- [ ] Audit payment.refund
- [ ] No hard delete — refund = new entry
- [ ] ADR-015 scope

---

## مراجع

- `docs/01-product/installment-module-features.md` §۶ — استرداد
- IFP-TASK-101, IFP-TASK-102

---

## Self-Review Score

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata | 10 | 10 | ✓ |
| Completeness | 25 | 25 | |
| Policy | 25 | 25 | |
| Executability | 25 | 25 | |
| Alignment | 15 | 15 | §۶ |
| **جمع** | **100** | **100** | ≥95 ✅ |
