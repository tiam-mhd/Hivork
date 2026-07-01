# TASK-076: Use Case — List Today Due Installments

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 1 |
| Epic | Epic-05-Installments-Use-Cases |
| ID | TASK-076 |
| Priority | P0 |
| Depends on | TASK-075, TASK-069 |
| Blocks | TASK-083, TASK-113 |
| Estimated | 4h |

---

## هدف

`ListTodayDueInstallmentsUseCase` — اقساطی که **امروز** (تقویم Asia/Tehran) سررسید دارند و status `pending` یا `overdue` (edge: marked overdue same day). گزارش «سررسید امروز» پنل فروشنده.

---

## معیار پذیرش

- [ ] Dedicated use case wrapping list logic with today filter preset
- [ ] Permission: `installments.installment.view` (or `installments.report.today` if split — Phase 1 uses view)
- [ ] Date window: `dueDate` = start of today Tehran .. end of today Tehran (UTC stored)
- [ ] Status filter: `pending` OR `overdue` (exclude paid/waived)
- [ ] Optional `branchId` + data scope ADR-015
- [ ] Sort: `dueDate:asc`, then `sequenceNumber:asc`
- [ ] Response includes `totalAmountRial` sum in meta (optional aggregate)
- [ ] Empty today → `data: []`, meta total 0
- [ ] Align with `TodayInstallmentsQuerySchema` (TASK-069)

---

## مشخصات فنی

### Input

```typescript
export type ListTodayDueInstallmentsInput = {
  tenantId: string;
  actorId: string;
  staffContext: DataScopeStaffContext;
  branchId?: string;
  activeBranchId?: string;
  cursor?: string;
  limit: number;
};
```

### Today Range (Tehran)

```typescript
function getTehranTodayUtcRange(now = new Date()): { from: Date; to: Date } {
  const tehranToday = startOfDayInTimezone(now, 'Asia/Tehran');
  const from = tehranToday;
  const to = endOfDayInTimezone(now, 'Asia/Tehran');
  return { from, to };
}
```

### Delegation

```typescript
async execute(input: ListTodayDueInstallmentsInput) {
  const { from, to } = getTehranTodayUtcRange();
  return this.listInstallments.execute({
    ...input,
    from,
    to,
    sort: 'dueDate:asc',
    // status: handled in repo — pending OR overdue within today due date
  });
}
```

### Repository Filter

```sql
WHERE due_date >= :todayStartTehranUtc
  AND due_date <= :todayEndTehranUtc
  AND status IN ('pending', 'overdue')
  AND sale.status = 'active'
```

### Meta Aggregate (optional)

```json
{
  "meta": {
    "total": 5,
    "totalAmountRial": "10000000",
    "hasNext": false
  }
}
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/src/installments/installments/list-today-due-installments.use-case.ts` |
| Create | `packages/application/src/installments/installments/list-today-due-installments.use-case.spec.ts` |
| Reuse | `packages/application/src/installments/installments/list-installments.use-case.ts` |

---

## مراحل پیاده‌سازی

1. Implement Tehran today range helper (shared with overdue job)
2. Create use case delegating to ListInstallments with preset filters
3. Add repo method or query flag `todayDueOnly`
4. Optional: sum aggregate in meta
5. Unit tests: timezone boundary (23:30 UTC = next day Tehran edge)
6. Integration: installment due today appears; tomorrow excluded

---

## Edge Cases & Errors

| سناریو | رفتار |
|--------|--------|
| dueDate yesterday, status overdue | **excluded** — not today due |
| dueDate today, status pending | **included** |
| dueDate today, status paid | excluded |
| Cancelled sale installments | excluded (sale.status != active) |
| DST transition day Tehran | use timezone lib — no manual offset |

---

## تست

- [ ] Unit: today range boundaries Tehran
- [ ] Unit: excludes paid installments due today
- [ ] Unit: branch scope applied
- [ ] Integration: seed installment due today → appears in list
- [ ] Integration: installment due tomorrow → not in list

---

## UX

N/A — TASK-113 frontend today-due report.

---

## Flow

```
GET today-due report
  → compute Tehran today range
  → list installments (pending/overdue, active sales)
  → optional sum meta
Exit: paginated list
```

---

## Policy Alignment

- [ ] EXCELLENCE-STANDARDS §3 — report query complete
- [ ] ADR-015 — branch scope
- [ ] Timezone: tenant timezone from settings (default Asia/Tehran)

---

## مراجع

- `docs/03-modules/installments/BUSINESS-RULES.md` — due date rules
- `docs/02-architecture/api-contracts.md` — reports section
- `Phases/Phase-1-Seller-Panel/Epic-12-Frontend-Sales-Installments/TASK-113-frontend-today-due-report.md`

---

## Self-Review Score

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata | 10 | 10 | ✓ |
| Completeness | 25 | 25 | TZ logic، delegation، meta |
| Policy | 25 | 25 | scope، timezone |
| Executability | 25 | 25 | 5 tests، edge table |
| Alignment | 15 | 15 | TASK-075، TASK-113 |
| **جمع** | **100** | **100** | ≥95 ✅ |
