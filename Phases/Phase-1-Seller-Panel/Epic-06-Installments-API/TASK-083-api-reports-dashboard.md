# TASK-083: API — Reports Dashboard

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 1 |
| Epic | Epic-06-Installments-API |
| ID | TASK-083 |
| Priority | P0 |
| Depends on | TASK-098, TASK-042, TASK-043, TASK-044, TASK-045 |
| Blocks | — |
| Estimated | 3h |

---

## هدف

`ReportsController` endpoint `GET /api/v1/reports/dashboard` — wiring نازک به `GetDashboardReportUseCase` (TASK-098). Redis cache TTL 5 دقیقه در use case.

---

## معیار پذیرش

- [ ] `GET /api/v1/reports/dashboard` — permission `installments.report.dashboard`
- [ ] Response KPIs از REPORTS.md §1.1 + api-contracts
- [ ] همه مبالغ `string` (bigint)
- [ ] `updatedAt` در response
- [ ] Data scope: branch filter when scoped
- [ ] `@RequireModule('installments')`

---

## مشخصات فنی

### `GET /api/v1/reports/dashboard`

| Item | Value |
|------|-------|
| Method | `GET` |
| Path | `/api/v1/reports/dashboard` |
| Auth | Staff JWT |
| Module | `installments` |
| Permission | `installments.report.dashboard` |
| Headers | `Authorization`, `X-Branch-Id` (optional) |
| Query | `branchId` (optional — override active branch) |

**Response 200:**

```json
{
  "data": {
    "todayDueCount": 15,
    "todayDueAmountRial": "30000000",
    "overdueCount": 8,
    "overdueAmountRial": "16000000",
    "pendingPaymentCount": 3,
    "todayCollectedRial": "12000000",
    "thisMonthCollectedRial": "120000000",
    "activeSalesCount": 47,
    "customersWithDebtCount": 12,
    "updatedAt": "2025-01-15T09:00:00.000Z"
  },
  "meta": { "requestId": "uuid", "cached": true, "cacheExpiresAt": "2025-01-15T09:05:00.000Z" }
}
```

| KPI | محاسبه (REPORTS.md §1.1) |
|-----|--------------------------|
| `todayDueCount` | pending+overdue where due_date = today (tenant TZ) |
| `todayDueAmountRial` | sum amounts today due |
| `overdueCount` | status = overdue |
| `overdueAmountRial` | sum overdue amounts |
| `pendingPaymentCount` | PaymentAttempt status=pending |
| `todayCollectedRial` | paid installments where paidAt = today |
| `thisMonthCollectedRial` | paid in current calendar month |
| `activeSalesCount` | sales status=active |
| `customersWithDebtCount` | distinct customers with overdue > 0 |

**Cache:** Redis TTL **300s (5 min)** — key `report:{tenantId}:dashboard:{scopeHash}`

**Audit:** read-only — no audit

---

### Data Scope (ADR-015)

| Scope | Behavior |
|-------|----------|
| `all` | aggregate کل tenant |
| `branch` | filter `sale.branchId IN assignedBranchIds` |
| `own` | filter `sale.sellerId = actorId` |

---

### Error Codes

| سناریو | HTTP | Code |
|--------|------|------|
| branchId خارج scope | 403 | `BRANCH_NOT_ALLOWED` |
| مجوز ندارد | 403 | `PERMISSION_DENIED` |
| Redis unavailable | 200 | compute live (degraded — no cache meta) |

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create/Update | `apps/api/src/installments/reports/reports.controller.ts` |
| Create | `apps/api/src/installments/reports/reports.module.ts` |
| Create | `apps/api/src/installments/reports/reports.integration.spec.ts` |
| Consume | `packages/application/src/installments/reports/get-dashboard-report.use-case.ts` |
| Update | `apps/api/src/app.module.ts` |

---

## مراحل پیاده‌سازی

1. `ReportsController` با route `v1/reports`
2. Method `getDashboard()` → `GetDashboardReportUseCase`
3. Pass `staffContext` + optional `branchId`
4. Map use case output → response DTO
5. Integration test with seeded installments

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| No data | 200 | all counts 0, amounts "0" |
| Cache hit | 200 | `meta.cached: true` |
| Branch scope empty branches | 200 | zeros |

---

## تست

- [ ] Integration: dashboard returns expected counts after seed
- [ ] Integration: branch scope reduces counts
- [ ] RBAC: viewer allowed; no permission → 403
- [ ] Cache: second request within 5min returns cached

---

## Policy Alignment

- [ ] ADR-015 scope on aggregates
- [ ] Money as bigint string

---

## مراجع

- `docs/02-architecture/api-contracts.md` § dashboard
- `docs/03-modules/installments/REPORTS.md` §1
- `Phases/Phase-1-Installments/Epic-09-Reports/TASK-098-usecase-dashboard-report.md`

---

## Self-Review Score

| محور | سقف | امتیاز |
|------|-----|--------|
| Metadata | 10 | 10 |
| Completeness | 25 | 25 |
| Policy | 25 | 25 |
| Executability | 25 | 25 |
| Alignment | 15 | 15 |
| **جمع** | **100** | **100** |
