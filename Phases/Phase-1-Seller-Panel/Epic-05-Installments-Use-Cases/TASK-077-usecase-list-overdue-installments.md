# TASK-077: Use Case — List Overdue Installments

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 1 |
| Epic | Epic-05-Installments-Use-Cases |
| ID | TASK-077 |
| Priority | P0 |
| Depends on | TASK-075, TASK-069 |
| Blocks | TASK-083, TASK-112, TASK-123 |
| Estimated | 5h |

---

## هدف

`ListOverdueInstallmentsUseCase` — اقساط با status `overdue` (یا `pending` با dueDate < today Tehran — defensive) برای گزارش معوقات. خروجی Phase 1 vertical slice exit: **گزارش معوقات**.

---

## معیار پذیرش

- [ ] `ListOverdueInstallmentsUseCase` — preset filter on TASK-075
- [ ] Primary filter: `status = 'overdue'`
- [ ] Defensive: include `pending` where `dueDate < startOfToday(Tehran)` if job lag
- [ ] Optional `minDaysOverdue` filter (TASK-069 query schema)
- [ ] Sort default: `daysOverdue:desc`, then `dueDate:asc`
- [ ] `daysOverdue` on every row
- [ ] Meta: `total`, `totalOutstandingRial` (sum amountRial)
- [ ] Exclude cancelled/completed sales
- [ ] Data scope ADR-015
- [ ] Permission: `installments.installment.view`

---

## مشخصات فنی

### Input

```typescript
export type ListOverdueInstallmentsInput = {
  tenantId: string;
  actorId: string;
  staffContext: DataScopeStaffContext;
  branchId?: string;
  minDaysOverdue?: number;
  cursor?: string;
  limit: number;
  sort?: 'dueDate:asc' | 'daysOverdue:desc';
};
```

### Overdue Criteria

```typescript
const todayStart = startOfDayInTimezone(new Date(), 'Asia/Tehran');

const isOverdue = (i: InstallmentRow) =>
  i.status === 'overdue' ||
  (i.status === 'pending' && i.dueDate < todayStart);

// minDaysOverdue filter
if (input.minDaysOverdue != null) {
  rows = rows.filter(r => computeDaysOverdue(r) >= input.minDaysOverdue!);
}
```

### Response Example

```json
{
  "data": [
    {
      "id": "uuid",
      "saleId": "uuid",
      "customer": { "id": "uuid", "phone": "09121234567", "name": "حسین احمدی" },
      "branchId": "uuid",
      "sequenceNumber": 2,
      "dueDate": "2025-01-10T00:00:00.000Z",
      "amountRial": "3000000",
      "status": "overdue",
      "daysOverdue": 12
    }
  ],
  "meta": {
    "total": 8,
    "totalOutstandingRial": "24000000",
    "hasNext": false
  }
}
```

### State Machine Alignment

Per `state-machines.md`: `pending → overdue` via daily job. Report shows `overdue` status primarily; defensive pending catch handles job delay.

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/src/installments/installments/list-overdue-installments.use-case.ts` |
| Create | `packages/application/src/installments/installments/list-overdue-installments.use-case.spec.ts` |
| Reuse | `packages/application/src/installments/installments/list-installments.use-case.ts` |

---

## مراحل پیاده‌سازی

1. Implement overdue filter predicate (status + due date)
2. Create use case with minDaysOverdue support
3. Compute meta aggregates (count + sum bigint)
4. Sort by daysOverdue desc
5. Unit tests: minDaysOverdue، defensive pending
6. Integration: mark installment overdue → appears in report

---

## Edge Cases & Errors

| سناریو | رفتار |
|--------|--------|
| All installments paid | empty list |
| Waived overdue (edge) | excluded — waived terminal |
| minDaysOverdue=7 | only 7+ days |
| Cancelled sale | excluded |
| Paid installment never in list | BR: paid terminal |

---

## تست

- [ ] Unit: includes status=overdue
- [ ] Unit: includes pending with past dueDate (defensive)
- [ ] Unit: excludes paid/waived
- [ ] Unit: minDaysOverdue filter
- [ ] Unit: totalOutstandingRial sum correct (bigint)
- [ ] Integration: overdue installment in report after job/manual mark
- [ ] Integration: branch scope limits results

---

## UX

N/A — TASK-112 frontend overdue report.

---

## Flow

```
Overdue report request
  → query overdue + defensive pending
  → apply minDaysOverdue + scope
  → sort by daysOverdue desc
  → aggregate meta
Exit: overdue list (Phase 1 exit criteria)
```

---

## Policy Alignment

- [ ] state-machines.md — overdue transition
- [ ] ADR-007 — bigint sum in meta
- [ ] ADR-015 — data scope
- [ ] EXCELLENCE-STANDARDS §3 — report aggregates

---

## مراجع

- `docs/03-modules/installments/state-machines.md` § Installment
- `docs/07-roadmap/operational-phases.md` § فاز ۱ Exit
- `Phases/Phase-1-Seller-Panel/Epic-12-Frontend-Sales-Installments/TASK-112-frontend-overdue-report.md`

---

## Self-Review Score

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata | 10 | 10 | ✓ |
| Completeness | 25 | 25 | Filters، meta sum، defensive |
| Policy | 25 | 25 | state machine، bigint |
| Executability | 25 | 25 | 7 tests |
| Alignment | 15 | 15 | exit criteria، TASK-112 |
| **جمع** | **100** | **100** | ≥95 ✅ |
