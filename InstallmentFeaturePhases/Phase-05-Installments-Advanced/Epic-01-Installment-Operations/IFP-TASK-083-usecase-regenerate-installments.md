# IFP-TASK-083: Use Case + API — بازتولید اقساط

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 05 — Installments Advanced |
| Epic | Epic-01-Installment-Operations |
| ID | IFP-TASK-083 |
| Priority | P0 |
| Depends on | IFP-TASK-079 |
| Blocks | IFP-TASK-099, IFP-TASK-100 |
| Estimated | 8h |

---

## هدف

پیاده‌سازی **بازتولید اقساط** (regenerate) برای قرارداد `active` — حذف نرم اقساط `pending`/`overdue` در بازه انتخابی و ایجاد schedule جدید با **حفظ مجموع مبلغ** باقی‌مانده — بدون دست زدن به اقساط `paid`/`waived`.

---

## معیار پذیرش

- [ ] `RegenerateInstallmentsUseCase`
- [ ] API `POST /api/v1/sales/:saleId/installments/regenerate`
- [ ] Permission: `installments.installment.regenerate`
- [ ] Input: `firstDueDate`, `installmentCount`, `intervalDays` یا `customDueDates[]`
- [ ] Sum(new amounts) === sum(soft-deleted pending/overdue amounts) ± rounding policy
- [ ] Paid installments in range → `409 REGENERATE_PAID_BLOCKED`
- [ ] Soft delete affected installments (`deletedAt`, `deleteReason: regenerate`)
- [ ] `sequenceNumber` یکتا پس از regenerate
- [ ] Preview endpoint `POST .../regenerate/preview` (بدون TX)
- [ ] Audit: `installment.regenerate`

---

## مشخصات فنی

### API

```
POST /api/v1/sales/:saleId/installments/regenerate
POST /api/v1/sales/:saleId/installments/regenerate/preview
Permission: installments.installment.regenerate
```

### Request

```json
{
  "reason": "توافق مجدد اقساط با مشتری",
  "schedule": {
    "firstDueDate": "1405-09-01",
    "installmentCount": 6,
    "intervalDays": 30
  },
  "roundingPolicy": "last_installment_absorbs_remainder"
}
```

### Response `200`

```json
{
  "saleId": "uuid",
  "removedInstallmentIds": ["uuid1", "uuid2"],
  "newInstallments": [
    { "id": "uuid", "sequenceNumber": 3, "dueDate": "...", "amountRial": "10000000", "status": "pending" }
  ],
  "totalAmountRial": "60000000",
  "operationLogId": "uuid"
}
```

### Algorithm

1. Load sale + unpaid installments in scope
2. `remainingRial = sum(amountRial)` of pending/overdue
3. Divide by count — remainder to last installment (bigint)
4. Soft delete old rows in single TX
5. Insert new installments with next sequence numbers
6. Write operation log with full before/after snapshots

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/installments/regenerate-installments.use-case.ts` |
| Create | `packages/application/installments/preview-regenerate-installments.use-case.ts` |
| Create | `packages/contracts/src/installments/regenerate-installments.schema.ts` |
| Create | `packages/domain/src/installments/installment-schedule.generator.ts` |
| Update | `apps/api/src/modules/installments/sale-installments.controller.ts` |
| Create | `packages/application/installments/regenerate-installments.use-case.integration.spec.ts` |

---

## مراحل پیاده‌سازی

1. Schedule generator (pure domain) — bigint division
2. Preview use case (read-only)
3. Regenerate use case with `$transaction`
4. Contracts + controller
5. Financial regression tests (sum conservation)

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Paid in affected range | 409 | `REGENERATE_PAID_BLOCKED` |
| Sale not active | 409 | `SALE_NOT_ACTIVE` |
| installmentCount < 1 | 400 | `SCHEDULE_INVALID` |
| Amount mismatch after split | 500 | `AMOUNT_MISMATCH` (must not happen) |
| Empty unpaid installments | 400 | `NO_INSTALLMENTS_TO_REGENERATE` |

---

## تست

- [ ] Unit: 6-way split preserves total bigint
- [ ] Unit: remainder on last installment
- [ ] Integration: regenerate → old soft-deleted, new created
- [ ] Integration: paid in range → 409
- [ ] Regression: sum before === sum after

---

## UX

N/A — wizard در IFP-099 (preview قبل از confirm).

---

## Flow

```
قرارداد → بازتولید اقساط → wizard: تعداد، فاصله، تاریخ اول
→ Preview جدول → تأیید → schedule جدید
Errors: paid in range → highlight blocked rows
```

---

## Policy Alignment

- [ ] EXCELLENCE-STANDARDS §8 — Installment fields
- [ ] SOFT-DELETE-POLICY — soft delete only, never `prisma.delete`
- [ ] ADR-007 bigint money
- [ ] ADR-015 branch scope on Sale

---

## مراجع

- `docs/01-product/installment-module-features.md` §۵ — بازتولید اقساط
- `IFP-TASK-079-domain-installment-operations-rules.md`

---

## Self-Review Score

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata | 10 | 10 | ✓ |
| Completeness | 25 | 25 | preview + regenerate |
| Policy | 25 | 25 | soft delete |
| Executability | 25 | 25 | algorithm documented |
| Alignment | 15 | 15 | |
| **جمع** | **100** | **100** | ≥95 ✅ |
