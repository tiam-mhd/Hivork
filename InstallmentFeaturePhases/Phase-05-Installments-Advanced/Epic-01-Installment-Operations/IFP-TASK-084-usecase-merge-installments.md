# IFP-TASK-084: Use Case + API — ادغام اقساط

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 05 — Installments Advanced |
| Epic | Epic-01-Installment-Operations |
| ID | IFP-TASK-084 |
| Priority | P0 |
| Depends on | IFP-TASK-079 |
| Blocks | IFP-TASK-099, IFP-TASK-100 |
| Estimated | 6h |

---

## هدف

پیاده‌سازی **ادغام اقساط** (merge) — ترکیب ≥۲ قسط `pending`/`overdue` از یک `sale` در یک قسط جدید با `dueDate` انتخابی و مبلغ برابر مجموع — soft delete اقساط منبع.

---

## معیار پذیرش

- [ ] `MergeInstallmentsUseCase`
- [ ] API `POST /api/v1/sales/:saleId/installments/merge`
- [ ] Permission: `installments.installment.merge`
- [ ] Body: `installmentIds[]` (min 2), `targetDueDate`, `reason`
- [ ] همه IDs متعلق به همان sale و tenant
- [ ] merged `amountRial = sum(sources)`
- [ ] Sources soft-deleted؛ یک installment جدید با `sequenceNumber = min(sources)`
- [ ] Audit: `installment.merge`
- [ ] Integration: amount conservation test

---

## مشخصات فنی

### API

```
POST /api/v1/sales/:saleId/installments/merge
Permission: installments.installment.merge
```

### Request

```json
{
  "installmentIds": ["uuid-a", "uuid-b", "uuid-c"],
  "targetDueDate": "1405-10-01",
  "reason": "ادغام سه قسط متوالی به یک قسط",
  "expectedVersions": { "uuid-a": 1, "uuid-b": 1, "uuid-c": 2 }
}
```

### Response `200`

```json
{
  "mergedInstallment": {
    "id": "new-uuid",
    "sequenceNumber": 4,
    "dueDate": "1405-10-01T00:00:00.000Z",
    "amountRial": "15000000",
    "status": "pending"
  },
  "removedInstallmentIds": ["uuid-a", "uuid-b", "uuid-c"],
  "operationLogId": "uuid"
}
```

### Validation (IFP-079)

- `installmentIds.length >= 2` else `MERGE_MIN_COUNT`
- All status ∈ {pending, overdue}
- Same `saleId`
- Optional: consecutive sequence policy from settings

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/installments/merge-installments.use-case.ts` |
| Create | `packages/contracts/src/installments/merge-installments.schema.ts` |
| Update | `apps/api/src/modules/installments/sale-installments.controller.ts` |
| Create | `packages/application/installments/merge-installments.use-case.integration.spec.ts` |

---

## مراحل پیاده‌سازی

1. Contract with version map per installment
2. Load + validate all installments in one query
3. TX: soft delete sources, create merged, renumber if needed
4. Operation log + audit
5. Tests

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Only 1 ID | 400 | `MERGE_MIN_COUNT` |
| Mixed sale | 400 | `INSTALLMENTS_SALE_MISMATCH` |
| Contains paid | 409 | `INSTALLMENT_STATUS_INVALID` |
| Version conflict any | 409 | `VERSION_CONFLICT` |
| Different tenants | 404 | not found |

---

## تست

- [ ] Unit: merge 3 installments sum correct
- [ ] Integration: merge success path
- [ ] Integration: merge with paid → 409
- [ ] Financial regression: sum preserved

---

## UX

N/A — multi-select در IFP-099.

---

## Flow

```
لیست اقساط → انتخاب چند ردیف → ادغام → تاریخ هدف + دلیل → confirm
```

---

## Policy Alignment

- [ ] SOFT-DELETE-POLICY — sources soft-deleted
- [ ] ADR-007 bigint
- [ ] ADR-015 scope

---

## مراجع

- `docs/01-product/installment-module-features.md` §۵ — ادغام اقساط
- `IFP-TASK-079-domain-installment-operations-rules.md`

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
