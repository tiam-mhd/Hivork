# IFP-TASK-088: Use Case + API — ثبت بانکی/حواله

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 05 — Installments Advanced |
| Epic | Epic-02-Payment-Recording |
| ID | IFP-TASK-088 |
| Priority | P0 |
| Depends on | IFP-TASK-086 |
| Blocks | IFP-TASK-092, IFP-TASK-093, IFP-TASK-094, IFP-TASK-095 |
| Estimated | 5h |

---

## هدف

ثبت پرداخت **بانکی/حواله/انتقال** با شماره پیگیری، نام بانک و تاریخ واریز — `PaymentAttempt` pending با `metadata.methodDetails` کامل برای تطبیق بعدی (Phase-06 reconciliation).

---

## معیار پذیرش

- [ ] `RecordBankTransferPaymentUseCase`
- [ ] API `POST /api/v1/installments/:installmentId/payments/bank-transfer`
- [ ] Permission: `installments.payment.report`
- [ ] Fields: `bankName`, `referenceNumber`, `transferDate`, optional `accountLast4`
- [ ] Unique `(tenantId, referenceNumber, bankName)` where status ≠ rejected — duplicate warning
- [ ] Idempotency header support
- [ ] Audit: `payment.report`

---

## مشخصات فنی

### API

```
POST /api/v1/installments/:installmentId/payments/bank-transfer
Permission: installments.payment.report
```

### Request

```json
{
  "amountRial": "10000000",
  "bankName": "ملت",
  "referenceNumber": "1234567890",
  "transferDate": "1405-07-14",
  "accountLast4": "4521",
  "note": "واریز به حساب شرکت"
}
```

### metadata storage

```json
{
  "method": "bank_transfer",
  "bankName": "ملت",
  "referenceNumber": "1234567890",
  "transferDate": "1405-07-14"
}
```

### Duplicate detection

Query existing attempts with same ref+bank in tenant (pending/confirmed) → `409 PAYMENT_REFERENCE_DUPLICATE` unless same idempotency key.

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/installments/record-bank-transfer-payment.use-case.ts` |
| Update | `apps/api/src/modules/installments/payment-recording.controller.ts` |
| Create | `packages/application/installments/record-bank-transfer-payment.use-case.integration.spec.ts` |

---

## مراحل پیاده‌سازی

1. Use case extending shared record helper
2. Duplicate reference check
3. Controller + validation
4. Tests including duplicate ref

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Duplicate reference | 409 | `PAYMENT_REFERENCE_DUPLICATE` |
| Invalid transfer date future | 400 | `TRANSFER_DATE_INVALID` |
| Paid installment | 409 | `INSTALLMENT_ALREADY_PAID` |
| Empty reference | 400 | Zod validation |

---

## تست

- [ ] Integration: bank transfer recorded
- [ ] Integration: duplicate ref blocked
- [ ] RBAC test

---

## UX

N/A — فرم حواله در IFP-099.

---

## Flow

```
ثبت پرداخت → حواله/انتقال → بانک + شماره پیگیری + تاریخ → ثبت
```

---

## Policy Alignment

- [ ] ADR-008 pending
- [ ] ADR-007 bigint
- [ ] Audit payment.report

---

## مراجع

- `docs/01-product/installment-module-features.md` §۵ — ثبت بانکی، ثبت حواله، ثبت انتقال

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
