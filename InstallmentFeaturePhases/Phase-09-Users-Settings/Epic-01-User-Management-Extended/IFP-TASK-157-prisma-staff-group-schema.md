# IFP-157: Prisma — StaffGroup و StaffGroupMember

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 09 |
| Epic | Epic-01-User-Management-Extended |
| ID | IFP-157 |
| Priority | P0 |
| Depends on | IFP-001, Phase-0 TASK-020 |
| Blocks | IFP-158, IFP-165 |
| Estimated | 5h |

---

## هدف

مدل‌های گروه کارمندان tenant — دسته‌بندی Staff برای مدیریت دسترسی گروهی و گزارش‌گیری؛ پایه Epic کاربران §۱۳.

---

## معیار پذیرش

- [ ] Prisma models `StaffGroup`, `StaffGroupMember` با migration
- [ ] Base fields + tenantId روی StaffGroup
- [ ] Unique `(tenantId, code)` و `(staffGroupId, staffId)`
- [ ] onDelete: Restrict روی همه FKها
- [ ] Soft delete StaffGroup — عضوها cascade soft (junction deactivate)
- [ ] Index `(tenantId, status)` و `(tenantId, name)`

---

## مشخصات فنی

### StaffGroup

```prisma
// Base fields — EVERY business model (Epic-04 + SOFT-DELETE-POLICY)
id           String    @id @default(uuid()) @db.Uuid
createdAt    DateTime  @default(now()) @map("created_at") @db.Timestamptz
updatedAt    DateTime  @updatedAt @map("updated_at") @db.Timestamptz
createdById  String?   @map("created_by_id") @db.Uuid
updatedById  String?   @map("updated_by_id") @db.Uuid
deletedAt    DateTime? @map("deleted_at") @db.Timestamptz
deletedById  String?   @map("deleted_by_id") @db.Uuid
deleteReason String?   @map("delete_reason")
version      Int       @default(1)
metadata     Json?     @db.JsonB
tenantId     String    @map("tenant_id") @db.Uuid
```
status String @default("active") // active | archived
code String // slug tenant-unique
name String
description String?

### StaffGroupMember (junction)

id, createdAt, staffGroupId, staffId, tenantId
@@unique([staffGroupId, staffId])

### Relations

StaffGroup → StaffGroupMember[] → Staff

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/infrastructure/persistence/prisma/schema/staff-group.prisma` |
| Create | `packages/infrastructure/persistence/migrations/.../staff_groups` |

---

## مراحل پیاده‌سازی

1. Add models
2. Migration + prisma validate
3. Register in SOFT_DELETE_MODELS
4. Export types

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Duplicate code | 409 | STAFF_GROUP_CODE_DUPLICATE |
| Group not found | 404 | STAFF_GROUP_NOT_FOUND |
| Hard delete attempt | — | CI grep reject |

---

## تست

- [ ] Migration applies clean
- [ ] Unique constraints enforced

---

## Policy Alignment

- [ ] EXCELLENCE-STANDARDS §8
- [ ] SOFT-DELETE-POLICY
- [ ] ADR-002 tenancy

---

## مراجع

- `docs/02-architecture/tenancy-and-entities.md`
- `docs/09-development/SOFT-DELETE-POLICY.md`

---

## Self-Review Score

> مبنا: `docs/09-development/PHASE_EPIC_TASK_AUTHORING_RULES.md` §10

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata (ID, Priority, Depends, Blocks, Estimate) | /10 | 10 | |
| Completeness (criteria, spec بدون TODO، files table) | /25 | 25 | |
| Policy (EXCELLENCE §8، soft delete، ADR cited) | /25 | 25 | |
| Executability (edge cases، tests، dev بدون سؤال) | /25 | 24 | |
| Alignment (sync docs، contracts، Epic README) | /15 | 15 | |
| **جمع** | **/100** | **99** | ≥95 — Ready |
