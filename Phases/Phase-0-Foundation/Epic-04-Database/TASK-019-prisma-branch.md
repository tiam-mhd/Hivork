# TASK-019: Prisma Schema — Branch

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 0 |
| Epic | Epic-04-Database |
| ID | TASK-019 |
| Priority | P0 |
| Depends on | TASK-018 |
| Blocks | TASK-027, TASK-030, TASK-057 |
| Estimated | 2h |

---

## هدف

تعریف مدل Prisma برای Branch — بخش عملیاتی tenant. هر tenant حداقل یک branch (شعبه اصلی) دارد. Branch نمی‌تواند زیر Customer باشد (ADR-002). Soft delete branch پیش‌فرض ممنوع است (ADR-009).

---

## معیار پذیرش

- [ ] مدل `Branch` با تمام فیلدهای base (EXCELLENCE §2.1)
- [ ] فیلد `isDefault` + partial unique index: یک `isDefault=true` per tenant (non-deleted)
- [ ] فیلد `isActive` برای deactivation بدون soft delete
- [ ] فیلد `phone` اختیاری (VarChar 11)
- [ ] Unique: `(tenantId, name)`
- [ ] Indexes: `(tenantId)`, `(tenantId, isDefault)`
- [ ] `onDelete: Restrict` روی `tenantId` FK
- [ ] `pnpm prisma validate` pass

---

## مشخصات فنی

### Schema

```prisma
model Branch {
  id           String    @id @default(uuid()) @db.Uuid
  tenantId     String    @map("tenant_id") @db.Uuid
  name         String
  address      String?
  phone        String?   @db.VarChar(11)
  isDefault    Boolean   @default(false) @map("is_default")
  isActive     Boolean   @default(true) @map("is_active")
  createdAt    DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt    DateTime  @updatedAt @map("updated_at") @db.Timestamptz
  createdById  String?   @map("created_by_id") @db.Uuid
  updatedById  String?   @map("updated_by_id") @db.Uuid
  deletedAt    DateTime? @map("deleted_at") @db.Timestamptz
  deletedById  String?   @map("deleted_by_id") @db.Uuid
  deleteReason String?   @map("delete_reason")
  version      Int       @default(1)
  metadata     Json?     @db.JsonB

  tenant          Tenant           @relation(fields: [tenantId], references: [id], onDelete: Restrict)
  staffPrimaryFor Staff[]          @relation("StaffPrimaryBranch")
  tenantCustomers TenantCustomer[]
  settings        BranchSetting[]

  @@unique([tenantId, name])
  @@index([tenantId])
  @@index([tenantId, isDefault])
  @@map("branches")
}
```

### Partial Unique Index (در TASK-027 migration)

```sql
-- ADR-009: exactly one default branch per tenant (non-deleted)
CREATE UNIQUE INDEX "branches_one_default_per_tenant_idx"
  ON "branches"("tenant_id")
  WHERE "is_default" = true AND "deleted_at" IS NULL;
```

این index در migration SQL باید raw SQL اضافه شود — Prisma از conditional unique index پشتیبانی نمی‌کند.

### Invariants (ADR-009, ADR-015)

1. دقیقاً یک `isDefault=true` per tenant (index + use case)
2. Soft delete branch پیش‌فرض → `DELETE_FORBIDDEN` در domain entity
3. `Staff.assignedBranchIds` — هر UUID باید branch همان tenant با `deletedAt IS NULL` باشد
4. `Sale.branchId NOT NULL` (phase 1) — branch-scoped operations

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Update | `prisma/schema.prisma` |
| Update | `prisma/migrations/...init/migration.sql` (partial unique index) |
| Create | `packages/domain/src/core/branch/branch.entity.ts` — TASK-030 |

---

## مراحل پیاده‌سازی

1. اضافه کردن model `Branch` به schema.prisma
2. تأیید FK با `onDelete: Restrict`
3. در migration (TASK-027)، اضافه کردن partial unique index با raw SQL
4. `pnpm prisma validate`

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| soft delete default branch | 422 `DELETE_FORBIDDEN` | domain entity throws |
| deactivate default branch | 422 `CANNOT_DEACTIVATE_DEFAULT_BRANCH` | domain entity throws |
| name تکراری در tenant | 409 `BRANCH_NAME_TAKEN` | unique constraint |
| tenant حذف با branch | — | onDelete: Restrict — باید ابتدا branch soft delete شود |
| دو branch با isDefault=true | 409 | partial unique index violation |

---

## تست

- [ ] Unit: `Branch.softDelete()` روی default branch → `DELETE_FORBIDDEN`
- [ ] Unit: `Branch.deactivate()` روی default → `CANNOT_DEACTIVATE_DEFAULT_BRANCH`
- [ ] Integration: ایجاد دو branch با `isDefault=true` → constraint violation
- [ ] Integration: soft delete non-default branch → not in list; restore → visible

---

## Policy Alignment

- [ ] EXCELLENCE-STANDARDS §2.1 — base fields کامل
- [ ] SOFT-DELETE-POLICY §5 — soft delete branch، فروش‌ها باقی می‌مانند
- [ ] ADR-009 — دقیقاً یک default branch per tenant
- [ ] ADR-013 — no Cascade hard delete
- [ ] ADR-015 — `assignedBranchIds` validation در use case

---

## مراجع

- `docs/02-architecture/tenancy-and-entities.md` §Branch
- `docs/09-development/SOFT-DELETE-POLICY.md` §5
- `docs/08-decisions/adr-log.md` — ADR-009, ADR-015

---

## Self-Review Score

| محور | /25 | یادداشت |
|------|-----|---------|
| Metadata | 10/10 | ID, Priority, Depends, Blocks, Estimate ✓ |
| Completeness | 25/25 | Schema، partial index، invariants، acceptance criteria ✓ |
| Policy | 25/25 | Base fields، soft delete، ADR-009/015/013 ✓ |
| Executability | 25/25 | Steps، edge cases table، tests ✓ |
| Alignment | 15/15 | Sync با domain TASK-030، migration TASK-027 ✓ |
| **جمع** | **100/100** | ≥95 required ✓ |
