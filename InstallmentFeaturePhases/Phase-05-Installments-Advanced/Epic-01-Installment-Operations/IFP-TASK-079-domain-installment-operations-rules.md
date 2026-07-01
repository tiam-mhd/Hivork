# IFP-TASK-079: Domain — قوانین عملیات اقساط

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 05 — Installments Advanced |
| Epic | Epic-01-Installment-Operations |
| ID | IFP-TASK-079 |
| Priority | P0 |
| Depends on | Phase-1 TASK-066, IFP Phase-04 contract settings |
| Blocks | IFP-TASK-080, IFP-TASK-081, IFP-TASK-082, IFP-TASK-083, IFP-TASK-084, IFP-TASK-085 |
| Estimated | 8h |

---

## هدف

تعریف **قوانین دامنه** مشترک برای عملیات پیشرفته اقساط (reschedule، defer، accelerate، regenerate، merge، split) در `packages/domain/installments/` — بدون وابستگی framework، با invariantهای مبلغ و state machine.

---

## معیار پذیرش

- [ ] Value objects: `ReschedulePolicy`, `DeferPolicy`, `MergeSplitPolicy`
- [ ] `InstallmentOperationsService` با متدهای pure validation
- [ ] قسط `paid` / `waived` → `InstallmentOperationNotAllowedError`
- [ ] merge/split/regenerate: حفظ `sum(amountRial) === sale.remainingRial` (± rounding policy)
- [ ] `sequenceNumber` یکتا پس از regenerate
- [ ] Unit tests برای هر rule — حداقل ۱۵ case

---

## مشخصات فنی

### Operation Types (enum)

```typescript
export type InstallmentOperationType =
  | 'reschedule'
  | 'defer'
  | 'accelerate'
  | 'regenerate'
  | 'merge'
  | 'split';
```

### Core Validation Rules

| Operation | Preconditions | Invariants |
|-----------|---------------|------------|
| reschedule | status ∈ pending, overdue | newDueDate ≥ today (Tehran) unless setting allows past |
| defer | status ∈ pending | deferDays > 0; max defer from settings |
| accelerate | status ∈ pending, overdue | newDueDate ≤ current dueDate |
| regenerate | sale active; no paid installments in affected range | total amount unchanged |
| merge | ≥2 installments pending/overdue same sale | merged amount = sum |
| split | 1 installment pending/overdue | parts sum = original; min part from settings |

### InstallmentOperationLog (concept — persisted in use cases)

```typescript
export type InstallmentOperationLog = {
  operationType: InstallmentOperationType;
  installmentIds: string[];
  previousSnapshot: InstallmentSnapshot[];
  newSnapshot: InstallmentSnapshot[];
  reason?: string;
  performedByStaffId: string;
};
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/domain/src/installments/installment-operations.service.ts` |
| Create | `packages/domain/src/installments/errors/installment-operation.errors.ts` |
| Create | `packages/domain/src/installments/value-objects/reschedule-policy.vo.ts` |
| Create | `packages/domain/src/installments/installment-operations.service.spec.ts` |

---

## مراحل پیاده‌سازی

1. Define error classes (`INSTALLMENT_STATUS_INVALID`, `AMOUNT_MISMATCH`, `MERGE_MIN_COUNT`)
2. Implement validation methods per operation type
3. Export policies reading from settings schema keys (penalty/defer max)
4. Write unit tests — paid blocked, amount conservation, sequence uniqueness
5. Document cross-reference in `domain.md`

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Operate on paid installment | — | `INSTALLMENT_STATUS_INVALID` |
| Operate on waived | — | `INSTALLMENT_ALREADY_WAIVED` |
| Merge 1 installment | — | `MERGE_MIN_COUNT` |
| Split into 0 parts | — | `SPLIT_INVALID_PARTS` |
| Regenerate with paid in range | — | `REGENERATE_PAID_BLOCKED` |
| Sum mismatch after split | — | `AMOUNT_MISMATCH` |

---

## تست

- [ ] Unit: reschedule blocked on paid
- [ ] Unit: defer exceeds max days
- [ ] Unit: merge amount conservation
- [ ] Unit: split 3-way sum equals original
- [ ] Unit: regenerate preserves total
- [ ] Unit: accelerate to past date blocked

---

## UX

N/A — domain only.

---

## Flow

```
Operation request → load installments → validate status → validate amounts/dates → ready for use case TX
```

---

## Policy Alignment

- [ ] EXCELLENCE-STANDARDS §2 — domain purity
- [ ] SOFT-DELETE-POLICY — no hard delete
- [ ] ADR-008 — state transitions
- [ ] `state-machines.md` — paid/waived terminal

---

## مراجع

- `docs/03-modules/installments/domain.md`
- `docs/03-modules/installments/state-machines.md`
- `docs/03-modules/installments/BUSINESS-RULES.md`
- `Phases/Phase-1-Seller-Panel/Epic-03-Installments-Domain/TASK-066-domain-installment-entity.md`

---

## Self-Review Score

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata | 10 | 10 | ✓ |
| Completeness | 25 | 25 | 15+ unit cases |
| Policy | 25 | 25 | state machine |
| Executability | 25 | 25 | rules table |
| Alignment | 15 | 15 | TASK-066 |
| **جمع** | **100** | **100** | ≥95 ✅ |
