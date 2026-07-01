# IFP-TASK-090: Use Case + API — ثبت کارتخوان

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 05 — Installments Advanced |
| Epic | Epic-02-Payment-Recording |
| ID | IFP-TASK-090 |
| Priority | P0 |
| Depends on | IFP-TASK-086 |
| Blocks | IFP-TASK-092, IFP-TASK-093, IFP-TASK-094, IFP-TASK-095 |
| Estimated | 5h |

---

## هدف

ثبت پرداخت **کارتخوان (POS)** — شماره پایانه، trace، و اختیاری `cardLast4` — برای تطبیق با settlement batch در Phase-06.

---

## معیار پذیرش

- [ ] `RecordPosPaymentUseCase`
- [ ] API `POST /api/v1/installments/:installmentId/payments/pos`
- [ ] Permission: `installments.payment.report`
- [ ] Required: `terminalId`, `traceNumber`
- [ ] Optional: `cardLast4`, `batchNumber`, `paidAt`
- [ ] Idempotency on `(tenantId, terminalId, traceNumber)`
- [ ] Audit: `payment.report`

---

## مشخصات فنی

### API

```
POST /api/v1/installments/:installmentId/payments/pos
Permission: installments.payment.report
```

### Request

```json
{
  "amountRial": "7500000",
  "terminalId": "TERM-001",
  "traceNumber": "987654",
  "cardLast4": "1234",
  "batchNumber": "B20250714",
  "note": "پرداخت با کارتخوان شعبه"
}
```

### Response `201`

```json
{
  "paymentAttempt": {
    "id": "uuid",
    "status": "pending",
    "method": "pos",
    "metadata": {
      "terminalId": "TERM-001",
      "traceNumber": "987654"
    }
  }
}
```

### Duplicate POS trace

Same terminal + trace in tenant (non-rejected) → `409 POS_TRACE_DUPLICATE`

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/installments/record-pos-payment.use-case.ts` |
| Update | `apps/api/src/modules/installments/payment-recording.controller.ts` |
| Create | `packages/application/installments/record-pos-payment.use-case.integration.spec.ts` |

---

## مراحل پیاده‌سازی

1. Use case with POS-specific validation
2. Duplicate trace check
3. Controller endpoint
4. Tests

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Duplicate trace | 409 | `POS_TRACE_DUPLICATE` |
| Invalid cardLast4 | 400 | Zod |
| Paid installment | 409 | `INSTALLMENT_ALREADY_PAID` |

---

## تست

- [ ] Integration: POS payment recorded
- [ ] Integration: duplicate trace
- [ ] RBAC deny

---

## UX

N/A — فرم POS در IFP-099.

---

## Flow

```
ثبت پرداخت → کارتخوان → ترمینال + پیگیری + مبلغ → ثبت
```

---

## Policy Alignment

- [ ] ADR-008 pending
- [ ] ADR-007 bigint
- [ ] Links to IFP-109 settlement (metadata preserved)

---

## مراجع

- `docs/01-product/installment-module-features.md` §۵ — ثبت کارتخوان

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
