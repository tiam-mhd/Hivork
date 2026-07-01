# IFP-TASK-085: Use Case + API — تقسیم قسط

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 05 — Installments Advanced |
| Epic | Epic-01-Installment-Operations |
| ID | IFP-TASK-085 |
| Priority | P0 |
| Depends on | IFP-TASK-079 |
| Blocks | IFP-TASK-099, IFP-TASK-100 |
| Estimated | 6h |

---

## هدف

پیاده‌سازی **تقسیم قسط** (split) — جایگزینی یک قسط `pending`/`overdue` با N قسط جدید که مجموع مبلغ برابر اصل است — با حداقل مبلغ هر بخش از settings.

---

## معیار پذیرش

- [ ] `SplitInstallmentUseCase`
- [ ] API `POST /api/v1/installments/:installmentId/split`
- [ ] Permission: `installments.installment.split`
- [ ] Body: `parts[]` — `{ amountRial, dueDate }` یا equal split با `partCount`
- [ ] `sum(parts.amountRial) === original.amountRial`
- [ ] Each part ≥ `installments.split.minPartRial` setting
- [ ] Original soft-deleted؛ new installments inserted
- [ ] Audit: `installment.split`

---

## مشخصات فنی

### API

```
POST /api/v1/installments/:installmentId/split
Permission: installments.installment.split
```

### Request (explicit parts)

```json
{
  "reason": "تقسیم قسط به دو بخش",
  "parts": [
    { "amountRial": "3000000", "dueDate": "1405-08-01" },
    { "amountRial": "2000000", "dueDate": "1405-09-01" }
  ],
  "expectedVersion": 2
}
```

### Request (equal split)

```json
{
  "partCount": 3,
  "firstDueDate": "1405-08-01",
  "intervalDays": 30,
  "reason": "تقسیم مساوی"
}
```

### Response `200`

```json
{
  "originalInstallmentId": "uuid",
  "newInstallments": [
    { "id": "uuid1", "sequenceNumber": 5, "amountRial": "3000000", "dueDate": "..." },
    { "id": "uuid2", "sequenceNumber": 6, "amountRial": "2000000", "dueDate": "..." }
  ],
  "operationLogId": "uuid"
}
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/installments/split-installment.use-case.ts` |
| Create | `packages/contracts/src/installments/split-installment.schema.ts` |
| Update | `apps/api/src/modules/installments/installment-operations.controller.ts` |
| Create | `packages/application/installments/split-installment.use-case.integration.spec.ts` |

---

## مراحل پیاده‌سازی

1. Zod discriminated union: explicit parts vs equal split
2. Domain validation (IFP-079) — amount sum, min part
3. TX: soft delete original, insert parts, sequence renumber
4. Log + audit
5. Tests

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Sum mismatch | 400 | `AMOUNT_MISMATCH` |
| partCount < 2 | 400 | `SPLIT_INVALID_PARTS` |
| Part below minimum | 400 | `SPLIT_PART_TOO_SMALL` |
| Paid/waived | 409 | `INSTALLMENT_STATUS_INVALID` |
| Version conflict | 409 | `VERSION_CONFLICT` |

---

## تست

- [ ] Unit: 3-way equal split preserves total
- [ ] Unit: explicit parts validation
- [ ] Integration: split success
- [ ] Financial regression

---

## UX

N/A — split dialog در IFP-099.

---

## Flow

```
جزئیات قسط → تقسیم → تعیین بخش‌ها (مبلغ + تاریخ) یا تقسیم مساوی
→ preview sums → confirm
```

---

## Policy Alignment

- [ ] SOFT-DELETE-POLICY
- [ ] ADR-007 bigint
- [ ] ADR-015 scope

---

## مراجع

- `docs/01-product/installment-module-features.md` §۵ — تقسیم قسط
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
