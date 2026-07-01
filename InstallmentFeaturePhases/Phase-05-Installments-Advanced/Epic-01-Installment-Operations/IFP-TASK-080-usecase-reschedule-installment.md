# IFP-TASK-080: Use Case + API — جابجایی تاریخ قسط

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 05 — Installments Advanced |
| Epic | Epic-01-Installment-Operations |
| ID | IFP-TASK-080 |
| Priority | P0 |
| Depends on | IFP-TASK-079 |
| Blocks | IFP-TASK-099, IFP-TASK-100 |
| Estimated | 6h |

---

## هدف

پیاده‌سازی use case و API **جابجایی تاریخ سررسید** (reschedule) برای قسط‌های `pending` یا `overdue` — با اعتبارسنجی دامنه (IFP-079)، audit، optimistic locking (`version`) و ثبت `InstallmentOperationLog`.

---

## معیار پذیرش

- [ ] `RescheduleInstallmentUseCase` در `packages/application/installments/`
- [ ] API `POST /api/v1/installments/:installmentId/reschedule`
- [ ] Permission: `installments.installment.reschedule` + `@ApplyDataScope()` via `Sale.branchId`
- [ ] `newDueDate` — date-only Tehran; optional `reason` (۳–۵۰۰ کاراکتر)
- [ ] قسط `paid` / `waived` → `409 INSTALLMENT_STATUS_INVALID`
- [ ] `InstallmentOperationLog` append-only با `operationType: reschedule`
- [ ] Audit: `installment.reschedule`
- [ ] Integration test: success + paid blocked + cross-tenant deny

---

## مشخصات فنی

### API

```
POST /api/v1/installments/:installmentId/reschedule
Auth: hivork_staff cookie
Headers: X-Branch-Id (required for branch scope)
Permission: installments.installment.reschedule
Module: installments
```

### Request

```json
{
  "newDueDate": "1405-08-15",
  "reason": "توافق با مشتری برای تغییر سررسید",
  "expectedVersion": 3
}
```

### Response `200`

```json
{
  "installment": {
    "id": "uuid",
    "sequenceNumber": 2,
    "dueDate": "1405-08-15T00:00:00.000Z",
    "amountRial": "5000000",
    "status": "pending",
    "version": 4
  },
  "operationLogId": "uuid"
}
```

### Use Case Flow

```typescript
type RescheduleInstallmentInput = {
  tenantId: string;
  branchId: string;
  staffId: string;
  installmentId: string;
  newDueDate: DateOnly;
  reason?: string;
  expectedVersion: number;
};
// 1. Load installment + sale (tenant + branch scope)
// 2. InstallmentOperationsService.validateReschedule(...)
// 3. TX: update dueDate, version++, write InstallmentOperationLog
// 4. Audit + optional domain event InstallmentRescheduled
```

### InstallmentOperationLog (Prisma — new model in migration)

```prisma
model InstallmentOperationLog {
  id              String   @id @default(uuid()) @db.Uuid
  tenantId        String   @map("tenant_id") @db.Uuid
  saleId          String   @map("sale_id") @db.Uuid
  operationType   String   @map("operation_type") // reschedule|defer|...
  installmentIds  String[] @map("installment_ids") @db.Uuid
  previousSnapshot Json    @map("previous_snapshot")
  newSnapshot     Json     @map("new_snapshot")
  reason          String?
  performedById   String   @map("performed_by_id") @db.Uuid
  // base fields: createdAt, createdById, version, metadata — append-only, no deletedAt updates
}
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/installments/reschedule-installment.use-case.ts` |
| Create | `packages/contracts/src/installments/reschedule-installment.schema.ts` |
| Create | `apps/api/src/modules/installments/installment-operations.controller.ts` |
| Create | `packages/infrastructure/persistence/installment-operation-log.repository.ts` |
| Update | `prisma/schema.prisma` — `InstallmentOperationLog` |
| Create | `packages/application/installments/reschedule-installment.use-case.integration.spec.ts` |

---

## مراحل پیاده‌سازی

1. Migration `InstallmentOperationLog` (append-only semantics)
2. Zod contract `RescheduleInstallmentSchema`
3. Repository + use case با domain validation از IFP-079
4. Controller endpoint با guards RBAC + data scope
5. Audit log writer
6. Integration tests (Testcontainers)

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Installment paid | 409 | `INSTALLMENT_STATUS_INVALID` |
| Installment waived | 409 | `INSTALLMENT_ALREADY_WAIVED` |
| newDueDate in past (setting disallows) | 400 | `DUE_DATE_INVALID` |
| Version mismatch | 409 | `VERSION_CONFLICT` |
| Cross-tenant installment | 404 | `INSTALLMENT_NOT_FOUND` |
| Branch out of scope | 403 | `BRANCH_ACCESS_DENIED` |
| Sale archived/terminated | 409 | `SALE_NOT_ACTIVE` |

---

## تست

- [ ] Unit: domain validation delegated to IFP-079 service
- [ ] Integration: reschedule pending installment → dueDate updated
- [ ] Integration: paid installment → 409
- [ ] Integration: version conflict → 409
- [ ] RBAC: deny without `installments.installment.reschedule`

---

## UX

N/A — API only; UI در IFP-099.

---

## Flow

```
Staff → جزئیات قسط → «جابجایی تاریخ» → فرم تاریخ + دلیل
  → POST reschedule → toast موفق → timeline عملیات به‌روز
Errors: paid → disable action; version conflict → refresh + retry
```

---

## Policy Alignment

- [ ] EXCELLENCE-STANDARDS §2 — use case thin, domain rules in IFP-079
- [ ] SOFT-DELETE-POLICY — no hard delete; operation log append-only
- [ ] ADR-015 — branch scope via Sale
- [ ] ADR-008 — status transitions unchanged (still pending/overdue)

---

## مراجع

- `docs/01-product/installment-module-features.md` §۵ — جابجایی تاریخ
- `docs/03-modules/installments/state-machines.md`
- `IFP-TASK-079-domain-installment-operations-rules.md`

---

## Self-Review Score

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata | 10 | 10 | ✓ |
| Completeness | 25 | 25 | API + schema + log |
| Policy | 25 | 25 | audit, scope, soft delete |
| Executability | 25 | 25 | request/response examples |
| Alignment | 15 | 15 | §۵ product |
| **جمع** | **100** | **100** | ≥95 ✅ |
