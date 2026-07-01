# IFP-TASK-087: Use Case + API — ثبت نقدی/دستی

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 05 — Installments Advanced |
| Epic | Epic-02-Payment-Recording |
| ID | IFP-TASK-087 |
| Priority | P0 |
| Depends on | IFP-TASK-086, IFP-TASK-079 |
| Blocks | IFP-TASK-092, IFP-TASK-093, IFP-TASK-094, IFP-TASK-095 |
| Estimated | 5h |

---

## هدف

ثبت پرداخت **نقدی** یا **دستی** توسط staff — ایجاد `PaymentAttempt` با `status: pending`، `reportedByType: STAFF`، و metadata روش — با idempotency و audit `payment.report`.

---

## معیار پذیرش

- [ ] `RecordCashManualPaymentUseCase`
- [ ] API `POST /api/v1/installments/:installmentId/payments/cash`
- [ ] API `POST /api/v1/installments/:installmentId/payments/manual` (alias با flag)
- [ ] Permission: `installments.payment.report`
- [ ] Header `Idempotency-Key` — unique per tenant
- [ ] قسط paid/waived → `409 INSTALLMENT_ALREADY_PAID`
- [ ] Partial payment اگر `installments.payment.allowPartial` setting
- [ ] Audit: `payment.report`
- [ ] Integration + idempotency test

---

## مشخصات فنی

### API

```
POST /api/v1/installments/:installmentId/payments/cash
POST /api/v1/installments/:installmentId/payments/manual
Permission: installments.payment.report
Headers: X-Branch-Id, Idempotency-Key (UUID, optional but recommended)
```

### Request

```json
{
  "amountRial": "5000000",
  "note": "دریافت نقدی در شعبه مرکزی",
  "paidAt": "1405-07-15T14:30:00.000Z",
  "evidenceFileId": null
}
```

### Response `201`

```json
{
  "paymentAttempt": {
    "id": "uuid",
    "status": "pending",
    "amountRial": "5000000",
    "method": "cash",
    "installmentId": "uuid",
    "createdAt": "..."
  }
}
```

### Use Case

```typescript
// 1. Scope: installment + sale.branchId
// 2. Validate amount ≤ remaining (or partial rules)
// 3. Check idempotencyKey → return existing if duplicate
// 4. Insert PaymentAttempt PENDING, metadata: { method: 'cash' }
// 5. Audit payment.report
// 6. Emit PaymentReportedEvent (for notifications)
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/installments/record-cash-manual-payment.use-case.ts` |
| Create | `apps/api/src/modules/installments/payment-recording.controller.ts` |
| Create | `packages/application/installments/record-cash-manual-payment.use-case.integration.spec.ts` |

---

## مراحل پیاده‌سازی

1. Shared base `record-payment.use-case.ts` helper
2. Cash/manual use case
3. Controller endpoints
4. Idempotency middleware/repository lookup
5. Tests

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Installment paid | 409 | `INSTALLMENT_ALREADY_PAID` |
| Amount > remaining (no partial) | 400 | `AMOUNT_EXCEEDS_REMAINING` |
| Duplicate idempotency key | 200 | return same attempt |
| Backdate without permission | 403 | `BACKDATE_NOT_ALLOWED` |
| Cross-tenant | 404 | `INSTALLMENT_NOT_FOUND` |

---

## تست

- [ ] Integration: record cash → pending attempt
- [ ] Integration: idempotent retry same key
- [ ] Integration: paid installment → 409
- [ ] RBAC deny

---

## UX

N/A — فرم ثبت نقدی در IFP-099.

---

## Flow

```
جزئیات قسط → ثبت پرداخت → نقدی → مبلغ + یادداشت → ثبت
→ وضعیت «در انتظار تأیید» نمایش داده شود
```

---

## Policy Alignment

- [ ] ADR-008 — pending until confirm
- [ ] ADR-007 bigint
- [ ] ADR-015 branch scope
- [ ] Audit payment.report

---

## مراجع

- `docs/01-product/installment-module-features.md` §۵ — ثبت نقدی، ثبت دستی
- `docs/03-modules/installments/STAFF-FLOWS.md`

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
