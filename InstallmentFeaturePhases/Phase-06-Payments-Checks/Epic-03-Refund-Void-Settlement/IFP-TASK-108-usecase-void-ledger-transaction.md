# IFP-TASK-108: Use Case + API — ابطال تراکنش Ledger

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 06 — Payments & Checks |
| Epic | Epic-03-Refund-Void-Settlement |
| ID | IFP-TASK-108 |
| Priority | P0 |
| Depends on | IFP-TASK-103, IFP-TASK-094 |
| Blocks | IFP-TASK-117, IFP-TASK-118 |
| Estimated | 5h |

---

## هدف

**ابطال ردیف ledger** — جفت reversal (IFP-102 `void`) هم‌تراز با IFP-094 void payment — برای اصلاح خطاهای حسابداری بدون hard delete.

---

## معیار پذیرش

- [ ] `VoidLedgerTransactionUseCase`
- [ ] API `POST /api/v1/payments/transactions/:ledgerEntryId/void`
- [ ] Permission: `installments.payment.void`
- [ ] Posted → voided + reversing entry
- [ ] Already voided → `409`
- [ ] Coordinates with PaymentAttempt void if linked
- [ ] Audit: `payment.void` (ledger context)
- [ ] Settlement closed → blocked

---

## مشخصات فنی

### API

```
POST /api/v1/payments/transactions/:ledgerEntryId/void
Permission: installments.payment.void
```

### Request

```json
{
  "voidReason": "ثبت تکراری در ledger",
  "expectedVersion": 1
}
```

### Response `200`

```json
{
  "originalEntry": { "id": "uuid", "status": "voided" },
  "reversalEntry": { "id": "uuid", "entryType": "adjustment", "direction": "debit", "amountRial": "5000000" }
}
```

### Coordination with IFP-094

If `paymentAttemptId` present and attempt still `CONFIRMED` (not voided):
- Option A: require payment void first
- Option B: chain void payment in same TX (document choice: **chain in same TX**)

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/payments/void-ledger-transaction.use-case.ts` |
| Create | `packages/contracts/src/payments/void-ledger.schema.ts` |
| Update | `apps/api/src/modules/payments/payment-transactions.controller.ts` |
| Create | `packages/application/payments/void-ledger-transaction.integration.spec.ts` |

---

## مراحل پیاده‌سازی

1. Use case wrapping domain void
2. Payment attempt coordination
3. Controller endpoint
4. Audit
5. Tests

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Already voided | 409 | `LEDGER_ALREADY_VOIDED` |
| Settlement locked | 409 | `SETTLEMENT_LOCKED` |
| REFUND entry void | 403 | `VOID_NOT_ALLOWED_ON_REFUND` |

---

## تست

- [ ] Integration: void creates reversal pair
- [ ] Integration: double void → 409
- [ ] Integration: chains payment void

---

## UX

N/A — IFP-117.

---

## Flow

```
تراکنش posted → ابطال ledger → دلیل → reversal ایجاد
```

---

## Policy Alignment

- [ ] SOFT-DELETE — void not delete
- [ ] Audit payment.void
- [ ] ADR-007 bigint balance preserved

---

## مراجع

- IFP-TASK-094, IFP-TASK-102
- `docs/01-product/installment-module-features.md` §۶ — ابطال

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
