# IFP-TASK-063: Use Case — Close, Archive, Restore

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 04 — Contract Enterprise |
| Epic | Epic-02-Contract-Lifecycle |
| ID | IFP-TASK-063 |
| Priority | P0 |
| Depends on | IFP-TASK-059 |
| Blocks | IFP-064 |
| Estimated | 8h |

---

## هدف

Use cases برای **بستن قرارداد**، **آرشیو**، **بازیابی از آرشیو**، و **soft delete/restore** قرارداد — مطابق §۴ بستن، آرشیو، حذف.

---

## معیار پذیرش

- [ ] `CloseContractUseCase` — permission `installments.sale.close`
- [ ] `ArchiveContractUseCase` — permission `installments.sale.archive`
- [ ] `UnarchiveContractUseCase` — permission `installments.sale.archive` + tenant owner
- [ ] `SoftDeleteSaleUseCase` — extend Phase 1 cancel/delete rules + enterprise statuses
- [ ] `RestoreSaleUseCase` — `core.data.restore` or tenant owner
- [ ] Archive sets `archivedAt` + status `ARCHIVED`; list excludes by default
- [ ] Soft delete: only if zero paid installments (existing policy) + not archived
- [ ] Audit: `sale.close`, `sale.archive`, `sale.unarchive`, `sale.soft_delete`, `sale.restore`

---

## مشخصات فنی

### CloseContractUseCase

```typescript
// Optional waiveRemaining requires installments.sale.waive_remaining
close(saleId, { reason, waiveRemaining: boolean })
// If waiveRemaining: mark pending installments WAIVED (delegates to waive UC — Phase 05 hook)
```

### ArchiveContractUseCase

Preconditions: status in `COMPLETED`, `CLOSED`, `CANCELLED`, `TERMINATED`

### Soft delete (SOFT-DELETE-POLICY §5)

| Condition | Allowed? |
|-----------|----------|
| Zero paid installments | Yes |
| Has paid | 409 `SALE_HAS_PAID_INSTALLMENT` |
| Archived | Must unarchive first or 409 |

### APIs (IFP-064)

```
POST /api/v1/sales/:id/close
POST /api/v1/sales/:id/archive
POST /api/v1/sales/:id/unarchive
DELETE /api/v1/sales/:id          → soft delete
POST /api/v1/sales/:id/restore
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/installments/close-contract.use-case.ts` |
| Create | `packages/application/installments/archive-contract.use-case.ts` |
| Create | `packages/application/installments/restore-sale.use-case.ts` |
| Update | Phase 1 soft delete sale use case if exists |

---

## مراحل پیاده‌سازی

1. Implement close with domain `sale.close()`
2. Implement archive/unarchive
3. Extend soft delete for enterprise statuses
4. Restore clears `deletedAt` + audit
5. Integration tests per action
6. List sales query: `includeArchived`, `includeDeleted` (admin only)

---

## Edge Cases & Errors

| سناریو | Code |
|--------|------|
| Close from completed | `INVALID_STATUS_TRANSITION` |
| Archive from active | `INVALID_STATUS_TRANSITION` |
| Soft delete with paid | `SALE_HAS_PAID_INSTALLMENT` |
| Restore cross-tenant | 404 |

---

## تست

- [ ] Integration: close terminated sale
- [ ] Integration: archive completed sale
- [ ] Integration: list excludes archived default
- [ ] Integration: soft delete + restore roundtrip
- [ ] RBAC restore deny for normal staff

---

## UX

IFP-077 — archive moves to «قراردادهای آرشیو» filter; restore in admin recycle view.

---

## Flow

```
close: confirm → optional waive remaining installments
archive: only when terminal states
soft delete: confirm + reason → recycle bin
restore: platform admin / owner action
```

---

## Policy Alignment

- [ ] SOFT-DELETE-POLICY §5 Sale rules
- [ ] Audit all mutations
- [ ] Restore API for admin/owner

---

## مراجع

- `docs/09-development/SOFT-DELETE-POLICY.md`
- IFP-TASK-059
- Phase 1 `TASK-073-usecase-cancel-sale.md`

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
