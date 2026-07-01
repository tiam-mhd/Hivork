# IFP-TASK-060: Use Case — Extend Contract (تمدید)

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 04 — Contract Enterprise |
| Epic | Epic-02-Contract-Lifecycle |
| ID | IFP-TASK-060 |
| Priority | P0 |
| Depends on | IFP-TASK-059, IFP-TASK-058, IFP-TASK-056 |
| Blocks | IFP-064 |
| Estimated | 6h |

---

## هدف

`ExtendContractUseCase` — تمدید قرارداد فعال: تغییر تاریخ پایان، افزودن اقساط اختیاری، snapshot نسخه، audit — مطابق §۴ «تمدید».

---

## معیار پذیرش

- [ ] `ExtendContractUseCase.execute({ saleId, tenantId, staffId, branchId, ...dto })`
- [ ] Permission: `installments.sale.extend` + `@ApplyDataScope()`
- [ ] Precondition: sale `ACTIVE`, not archived, `canExtend()` true
- [ ] Append `ContractVersion` با `changeType=EXTEND` before mutation
- [ ] Optional `regenerateSchedule` — delegates to installment service (stub hook for IFP Phase 05)
- [ ] Audit: `sale.extend`
- [ ] Optimistic lock via `version` field
- [ ] Returns updated `SaleDetailEnterpriseDto`

---

## مشخصات فنی

### Input (from IFP-058)

```typescript
type ExtendContractInput = {
  tenantId: string;
  staffId: string;
  branchId: string;
  saleId: string;
  newLastDueDate: string;       // YYYY-MM-DD
  additionalInstallmentCount?: number;
  reason: string;
  regenerateSchedule?: boolean;
  expectedVersion: number;
};
```

### Logic outline

1. Load sale + installments (tenant scoped)
2. Assert branch access `canAccessBranch()`
3. `sale.canExtend()` — last due date < newLastDueDate
4. Create ContractVersion snapshot
5. If `regenerateSchedule`: call `InstallmentScheduleService.extend(...)` (interface)
6. Update sale metadata / `extendedFromSaleId` self-reference if first extend
7. Increment version, audit, return DTO

### API (wired in IFP-064)

```
POST /api/v1/sales/:saleId/extend
Authorization: staff JWT
X-Branch-Id: uuid
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/installments/extend-contract.use-case.ts` |
| Create | `packages/application/installments/extend-contract.use-case.spec.ts` |
| Create | `packages/infrastructure/persistence/contract-version.repository.ts` |

---

## مراحل پیاده‌سازی

1. Define use case interface + input DTO
2. Implement version snapshot before change
3. Wire sale repository update with version check
4. Audit log entry
5. Integration test with Testcontainers
6. Document schedule regeneration defer to Phase 05

---

## Edge Cases & Errors

| سناریو | HTTP | Code |
|--------|------|------|
| Sale not active | 409 | `INVALID_STATUS_TRANSITION` |
| newLastDueDate before last installment | 422 | `EXTEND_DATE_INVALID` |
| Version conflict | 409 | `VERSION_CONFLICT` |
| Cross-tenant saleId | 404 | no leak |
| No permission | 403 | `PERMISSION_DENIED` |

---

## تست

- [ ] Integration: extend active sale — version +1
- [ ] Integration: extend completed sale — 409
- [ ] Integration: version conflict — 409
- [ ] RBAC: deny without `installments.sale.extend`

---

## UX

Consumed by IFP-077 — modal with date picker Jalali, reason field, regenerate checkbox.

---

## Flow

```
entry: sale detail → action «تمدید»
steps: form → confirm → API → refresh installments tab
errors: invalid date, conflict → toast + retry
exit: success toast + version history updated
```

---

## Policy Alignment

- [ ] Audit `sale.extend`
- [ ] ADR-015 branch scope
- [ ] tenantId from JWT only

---

## مراجع

- IFP-TASK-058 `ExtendContractSchema`
- `docs/03-modules/installments/STAFF-FLOWS.md`
- `docs/01-product/installment-module-features.md` §۴ — تمدید

---

## Self-Review Score

| محور | سقف | امتیاز |
|------|-----|--------|
| Metadata | 10 | 10 |
| Completeness | 25 | 25 |
| Policy | 25 | 25 |
| Executability | 25 | 24 |
| Alignment | 15 | 15 |
| **جمع** | **100** | **99** |
