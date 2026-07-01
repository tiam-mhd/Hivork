# IFP-TASK-098: Use Case + API — ثبت تخفیف

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 05 — Installments Advanced |
| Epic | Epic-04-Adjustments |
| ID | IFP-TASK-098 |
| Priority | P0 |
| Depends on | IFP-TASK-079, IFP Phase-04 contract settings |
| Blocks | IFP-TASK-099, IFP-TASK-100 |
| Estimated | 5h |

---

## هدف

**ثبت تخفیف** روی قسط `pending`/`overdue` — کاهش `amountRial` via `InstallmentAdjustment` نوع `DISCOUNT` — با سقف از settings و audit `installment.discount`.

---

## معیار پذیرش

- [ ] `ApplyDiscountUseCase`
- [ ] API `POST /api/v1/installments/:installmentId/discount`
- [ ] Permission: `installments.installment.discount`
- [ ] `amountRial` discount > 0 و ≤ remaining installment amount
- [ ] Max discount % from `installments.discount.maxPercentBps` setting
- [ ] `reason` required
- [ ] Cannot discount `paid`/`waived`
- [ ] Audit: `installment.discount`
- [ ] Minimum installment amount after discount from settings

---

## مشخصات فنی

### API

```
POST /api/v1/installments/:installmentId/discount
Permission: installments.installment.discount
```

### Request

```json
{
  "discountRial": "500000",
  "reason": "تخفیف وفاداری مشتری",
  "expectedVersion": 1
}
```

### Response `200`

```json
{
  "installment": {
    "id": "uuid",
    "amountRial": "4500000",
    "version": 2
  },
  "adjustment": {
    "id": "uuid",
    "adjustmentType": "discount",
    "amountRial": "500000"
  }
}
```

### Validation

```typescript
// newAmount = currentAmount - discountRial
// newAmount >= minInstallmentRial setting
// discountRial <= currentAmount * maxPercentBps / 10000
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/installments/apply-discount.use-case.ts` |
| Create | `packages/contracts/src/installments/discount.schema.ts` |
| Update | `apps/api/src/modules/installments/installment-adjustments.controller.ts` |
| Create | `packages/application/installments/apply-discount.use-case.integration.spec.ts` |

---

## مراحل پیاده‌سازی

1. Reuse InstallmentAdjustment from IFP-097
2. Discount validation in domain
3. Use case + TX
4. Controller + audit
5. Tests

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Discount > amount | 400 | `DISCOUNT_EXCEEDS_AMOUNT` |
| Below min after discount | 400 | `INSTALLMENT_AMOUNT_TOO_LOW` |
| Exceeds max percent | 400 | `DISCOUNT_MAX_EXCEEDED` |
| Paid/waived | 409 | `INSTALLMENT_STATUS_INVALID` |

---

## تست

- [ ] Integration: discount reduces amount
- [ ] Integration: max percent enforced
- [ ] RBAC deny

---

## UX

N/A — فرم تخفیف در IFP-099.

---

## Flow

```
جزئیات قسط → تخفیف → مبلغ + دلیل → preview مبلغ جدید → confirm
```

---

## Policy Alignment

- [ ] ADR-007 bigint
- [ ] Audit installment.discount
- [ ] SOFT-DELETE — adjustment reversal not hard delete

---

## مراجع

- `docs/01-product/installment-module-features.md` §۵ — ثبت تخفیف
- IFP-TASK-097 — InstallmentAdjustment model

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
