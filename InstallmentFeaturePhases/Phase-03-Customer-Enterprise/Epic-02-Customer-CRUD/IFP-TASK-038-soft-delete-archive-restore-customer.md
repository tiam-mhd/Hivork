# IFP-TASK-038: Soft Delete + Archive + Restore Customer

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | IFP-03 Customer Enterprise |
| Epic | Epic-02-Customer-CRUD |
| ID | IFP-038 |
| Priority | P0 |
| Depends on | IFP-036, IFP-037, Phase 0 TASK-046 |
| Blocks | IFP-039, IFP-050 |
| Estimated | 6h |

---

## هدف

Use caseهای **soft delete**، **archive** (مخفی از list عادی بدون حذف)، و **restore** برای TenantCustomer — §۳ حذف/آرشیو محصول. Restore فقط tenant owner یا permission اختصاصی؛ audit اجباری.

---

## معیار پذیرش

- [ ] DELETE `/api/v1/customers/:id` — soft delete با optional deleteReason
- [ ] POST `/api/v1/customers/:id/archive` — set archivedAt/status=archived
- [ ] POST `/api/v1/customers/:id/unarchive` — clear archive
- [ ] POST `/api/v1/customers/:id/restore` — restore soft-deleted (deletedAt null)
- [ ] Permissions: delete `installments.customer.delete`, restore `installments.customer.restore`, archive `installments.customer.archive`
- [ ] Active sales block soft delete → 409 CUSTOMER_HAS_ACTIVE_SALES (configurable tenant setting)
- [ ] Soft-deleted invisible in default queries (Prisma extension TASK-046)
- [ ] Audit: customer.delete, customer.restore, customer.archive, customer.unarchive
- [ ] Platform admin restore path documented (optional separate endpoint)

---

## مشخصات فنی

### Soft delete vs archive

| Operation | deletedAt | archivedAt | Visible in default list | Can create sale |
|-----------|-----------|------------|-------------------------|-----------------|
| Active | null | null | Yes | Yes (if not blacklisted) |
| Archived | null | set | No (filter) | No |
| Soft deleted | set | — | No | No |
| Blacklisted | null | null | Yes (badge) | No |

### Delete pre-checks

- Count active Sales (status not cancelled/closed) — if > 0 and setting strict → 409
- Soft delete nested documents/notes optional cascade soft-delete (same transaction)
- Sales history **retained** per SOFT-DELETE-POLICY §5

### Restore

- Clears deletedAt, deletedById, deleteReason
- Does not auto-unarchive
- Plan limit **not** applied on restore (same as TASK-058)

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/src/customers/soft-delete-tenant-customer.use-case.ts` |
| Create | `packages/application/src/customers/archive-tenant-customer.use-case.ts` |
| Create | `packages/application/src/customers/restore-tenant-customer.use-case.ts` |
| Update | `apps/api/src/customers/customers.controller.ts` |
| Update | `packages/domain/src/core/customer/tenant-customer.entity.ts` |

---

## مراحل پیاده‌سازی

1. Domain methods: softDelete, restore, archive, unarchive
2. Use cases + permission guards
3. Controller routes + Zod (IFP-039)
4. Active sales guard
5. Audit integration
6. Integration tests all paths

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Delete with active sales | 409 | CUSTOMER_HAS_ACTIVE_SALES |
| Restore not deleted | 409 | NOT_DELETED |
| Archive already archived | 409 | ALREADY_ARCHIVED |
| Normal staff restore without permission | 403 | PERMISSION_DENIED |
| Get soft-deleted by id | 404 | RECORD_DELETED |

---

## تست

- [ ] Integration: soft delete → not in list → restore → visible
- [ ] Integration: archive → hidden from default filter
- [ ] Integration: delete blocked with active sale
- [ ] RBAC restore deny/allow

---

## UX (اگر UI دارد)

- [ ] Confirm dialog delete/archive with reason field
- [ ] Admin «سطل بازیابی» filter — IFP-053
- [ ] Empty state for archived list

---

## Flow

```
Delete flow:
Entry: detail → حذف
Confirm + reason optional
API soft delete
Exit: redirect list — customer gone

Archive flow:
Entry: detail → آرشیو
Confirm
Exit: list without archived (default filter)

Restore flow (admin):
Entry: archived/deleted list → بازیابی
Confirm
Exit: customer active in list
```

---

## Policy Alignment

- [ ] SOFT-DELETE-POLICY — no prisma.delete
- [ ] ADR-013
- [ ] Audit immutable

---

## مراجع

- `docs/09-development/SOFT-DELETE-POLICY.md` §5
- Phase 0 TASK-046 soft delete extension

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
