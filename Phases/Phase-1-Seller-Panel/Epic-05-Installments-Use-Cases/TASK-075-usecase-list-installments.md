# TASK-075: Use Case — List Installments

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 1 |
| Epic | Epic-05-Installments-Use-Cases |
| ID | TASK-075 |
| Priority | P0 |
| Depends on | TASK-066, TASK-069, TASK-072 |
| Blocks | TASK-076, TASK-077, TASK-081, TASK-112 |
| Estimated | 6h |

---

## هدف

`ListInstallmentsUseCase` — لیست cursor-paginated اقساط با فیلتر status، branch، sale، customer، و بازه تاریخ. پایه برای گزارش‌های today/overdue و صفحه لیست اقساط. Data scope ADR-015 از طریق join به Sale.branchId.

---

## معیار پذیرش

- [ ] `ListInstallmentsUseCase.execute()` با `ListInstallmentsQueryDto`
- [ ] Permission: `installments.installment.view`
- [ ] Filters: `status`, `branchId`, `saleId`, `tenantCustomerId`, `from`, `to`
- [ ] Data scope via sale join: branch/own filters applied
- [ ] Exclude installments of soft-deleted sales
- [ ] Exclude soft-deleted installments (`deletedAt IS NULL`)
- [ ] Customer embed در هر row
- [ ] `daysOverdue` computed when status=overdue (Tehran today − dueDate)
- [ ] Cursor pagination + sort (`dueDate:asc` default)
- [ ] Response: `InstallmentSummarySchema` array + meta

---

## مشخصات فنی

### Input

```typescript
export type ListInstallmentsInput = {
  tenantId: string;
  actorId: string;
  staffContext: DataScopeStaffContext;
  cursor?: string;
  limit: number;
  sort: 'dueDate:asc' | 'dueDate:desc' | 'sequenceNumber:asc';
  status?: InstallmentStatus;
  branchId?: string;
  saleId?: string;
  tenantCustomerId?: string;
  from?: Date;
  to?: Date;
  activeBranchId?: string;
};
```

### Repository Query Pattern

```typescript
// Join Installment → Sale for branch scope
const where = {
  tenantId,
  deletedAt: null,
  sale: {
    deletedAt: null,
    tenantId,
    branchId: { in: allowedBranchIds },
    ...(ownScope && { createdByStaffId: actorId }),
    ...(branchId && { branchId }),
    ...(saleId && { id: saleId }),
  },
  ...(status && { status }),
  ...(tenantCustomerId && { sale: { tenantCustomerId } }),
  dueDate: { gte: from, lte: to },
};
```

### daysOverdue Calculation

```typescript
function computeDaysOverdue(dueDate: Date, status: InstallmentStatus, timezone = 'Asia/Tehran'): number {
  if (status !== 'overdue') return 0;
  const today = startOfDayInTimezone(new Date(), timezone);
  const due = startOfDayInTimezone(dueDate, timezone);
  return Math.max(0, differenceInCalendarDays(today, due));
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
      "sequenceNumber": 3,
      "dueDate": "2025-03-01T00:00:00.000Z",
      "amountRial": "2000000",
      "status": "overdue",
      "daysOverdue": 5
    }
  ],
  "meta": { "total": 23, "hasNext": true, "nextCursor": "..." }
}
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/src/installments/installments/list-installments.use-case.ts` |
| Create | `packages/application/src/installments/installments/list-installments.use-case.spec.ts` |
| Update | `packages/application/src/ports/installment.repository.port.ts` |
| Update | `packages/infrastructure/persistence/installment.repository.ts` |

---

## مراحل پیاده‌سازی

1. Extend installment repository with list query + sale join
2. Implement scope filter builder (reuse from TASK-074)
3. Implement `ListInstallmentsUseCase`
4. Add `daysOverdue` in mapper
5. Unit tests: scope + status filter
6. Integration: create sale → list installments by saleId

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| No installments | 200 | empty array |
| Filter status=paid on cancelled sale | 200 | paid installments still visible |
| saleId other tenant | 200 empty | tenant filter |
| Invalid cursor | 400 | `INVALID_CURSOR` |
| branchId outside scope | 403 | `BRANCH_NOT_ALLOWED` |

---

## تست

- [ ] Unit: branch scope limits results
- [ ] Unit: own scope limits to seller's sales
- [ ] Unit: status filter overdue only
- [ ] Unit: daysOverdue calculation Tehran TZ
- [ ] Unit: date range filter
- [ ] Integration: list by saleId after CreateSale
- [ ] Integration: soft-deleted sale installments excluded

---

## UX

N/A — TASK-112 overdue report uses TASK-077 wrapper.

---

## Flow

```
Query params → scope resolve → repo list → map summaries + daysOverdue → cursor meta
```

---

## Policy Alignment

- [ ] EXCELLENCE-STANDARDS §3 — list API complete
- [ ] SOFT-DELETE-POLICY — deletedAt filters
- [ ] ADR-015 — scope via sale branch
- [ ] tenantId mandatory

---

## مراجع

- `docs/02-architecture/api-contracts.md` § GET installments
- `docs/03-modules/installments/state-machines.md`
- `Phases/Phase-1-Seller-Panel/Epic-04-Installments-Contracts/TASK-069-contracts-installment-payment.md`

---

## Self-Review Score

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata | 10 | 10 | ✓ |
| Completeness | 25 | 25 | Filters، cursor، daysOverdue |
| Policy | 25 | 25 | scope، soft delete |
| Executability | 25 | 25 | 7 tests |
| Alignment | 15 | 15 | TASK-069 schema |
| **جمع** | **100** | **100** | ≥95 ✅ |
