# IFP-TASK-091: Use Case + API — ثبت چک + هزینه

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 05 — Installments Advanced |
| Epic | Epic-02-Payment-Recording |
| ID | IFP-TASK-091 |
| Priority | P0 |
| Depends on | IFP-TASK-086 |
| Blocks | IFP-TASK-092, IFP-TASK-093, IFP-TASK-094, IFP-TASK-095 |
| Estimated | 6h |

---

## هدف

ثبت پرداخت با **چک** (ایجاد stub `Check` record لینک به IFP-111) و ثبت **هزینه** (fee) جدا از اصل قسط — هر دو به صورت `PaymentAttempt` pending با metadata تفکیک‌شده.

---

## معیار پذیرش

- [ ] `RecordCheckPaymentUseCase` — creates PaymentAttempt + placeholder Check link (`checkId` in metadata)
- [ ] `RecordFeePaymentUseCase` — fee does not mark installment paid alone
- [ ] API `POST .../payments/check` و `POST .../payments/fee`
- [ ] Permission: `installments.payment.report`
- [ ] Check fields: `checkNumber`, `bankName`, `dueDate`, `drawerName`, optional `sayadId`
- [ ] Fee types: `late_fee`, `service_fee`, `other`
- [ ] Audit: `payment.report` for both

---

## مشخصات فنی

### Check Payment API

```
POST /api/v1/installments/:installmentId/payments/check
Permission: installments.payment.report
```

### Check Request

```json
{
  "amountRial": "20000000",
  "checkNumber": "1234567",
  "bankName": "صادرات",
  "dueDate": "1405-12-01",
  "drawerName": "علی احمدی",
  "sayadId": "1234567890123456",
  "note": "چک دریافتی بابت قسط ۳"
}
```

### Fee Payment API

```
POST /api/v1/installments/:installmentId/payments/fee
```

### Fee Request

```json
{
  "amountRial": "500000",
  "feeType": "late_fee",
  "feeDescription": "جریمه دیرکرد ۵ روز",
  "note": null
}
```

### Check integration stub

Until IFP-111: store check details in `PaymentAttempt.metadata` with `checkPendingRegistration: true`. IFP-113 will promote to full `Check` entity.

```json
{
  "method": "check",
  "checkNumber": "1234567",
  "bankName": "صادرات",
  "dueDate": "1405-12-01",
  "checkPendingRegistration": true
}
```

### Fee behavior

- Fee attempt linked to installment but **confirm** (IFP-092) updates `metadata.feesCollectedRial` on installment — does not alone transition to `paid` unless `amountRial + fees >= installment.amountRial` per business rules.

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/installments/record-check-payment.use-case.ts` |
| Create | `packages/application/installments/record-fee-payment.use-case.ts` |
| Update | `apps/api/src/modules/installments/payment-recording.controller.ts` |
| Create | `packages/application/installments/record-check-fee-payment.integration.spec.ts` |

---

## مراحل پیاده‌سازی

1. Check payment use case + metadata structure
2. Fee payment use case + fee type validation
3. Controller routes
4. Document bridge to Phase-06 Check entity
5. Tests

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Duplicate check number same bank | 409 | `CHECK_NUMBER_DUPLICATE` (soft — warn if pending) |
| Fee amount zero | 400 | Zod |
| Paid installment + principal check | 409 | `INSTALLMENT_ALREADY_PAID` |
| Fee on waived | 409 | `INSTALLMENT_ALREADY_WAIVED` |

---

## تست

- [ ] Integration: check payment metadata stored
- [ ] Integration: fee payment separate from principal
- [ ] RBAC deny

---

## UX

N/A — تب چک و هزینه در IFP-099.

---

## Flow

```
ثبت پرداخت → چک → فرم چک (شماره، بانک، سررسید) → ثبت
ثبت پرداخت → هزینه → نوع + مبلغ → ثبت
```

---

## Policy Alignment

- [ ] ADR-008 pending
- [ ] ADR-007 bigint
- [ ] Bridge to IFP-111/113 Check lifecycle

---

## مراجع

- `docs/01-product/installment-module-features.md` §۵ — ثبت چک، ثبت هزینه
- `docs/01-product/installment-module-features.md` §۷ — چک‌ها

---

## Self-Review Score

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata | 10 | 10 | ✓ |
| Completeness | 25 | 25 | check + fee |
| Policy | 25 | 25 | |
| Executability | 25 | 25 | Phase-06 bridge |
| Alignment | 15 | 15 | |
| **جمع** | **100** | **100** | ≥95 ✅ |
