# TASK-020: Prisma Schema — Staff

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 0 |
| Epic | Epic-04-Database |
| ID | TASK-020 |
| Priority | P0 |
| Depends on | TASK-018, TASK-019a, TASK-021 |
| Blocks | TASK-027, TASK-031, TASK-035, TASK-041 |
| Estimated | 3h |

---

## هدف

تعریف مدل Prisma برای Staff — actor داخلی tenant. یک Staff به tenant و User وصل است (نه branch مستقیم). `phone` روی `User` است (ADR-017)؛ Staff فقط FK `userId`. محدودیت شعبه از طریق `assignedBranchIds[]` + `dataScope` + `primaryBranchId` (ADR-015). Staff و GlobalCustomer می‌توانند همان User/phone داشته باشند (ADR-011).

---

## معیار پذیرش

- [ ] مدل `Staff` با تمام فیلدهای base (EXCELLENCE §2.1) و EXCELLENCE §8 Staff
- [ ] فیلد `assignedBranchIds String[] @db.Uuid` — آرایه UUIDها (نه FK تکی)
- [ ] فیلد `primaryBranchId` اختیاری → FK به branches با `onDelete: SetNull`
- [ ] `dataScope DataScope @default(all)` — از enum TASK-018
- [ ] Enum `StaffStatus`: active, suspended
- [ ] فیلدهای کامل: `email`, `nationalId`, `avatarUrl`, `jobTitle`, `lastLoginAt`, `invitedAt`, `invitedById`
- [ ] FK `userId` → `User` (ADR-017) — **بدون** فیلد `phone` روی Staff
- [ ] Unique: `(tenantId, userId)` — یک User یک Staff per tenant
- [ ] Indexes: `(tenantId)`, `(tenantId, status)`
- [ ] `onDelete: Restrict` روی `tenantId`؛ `onDelete: SetNull` روی `primaryBranchId`
- [ ] `pnpm prisma validate` pass

---

## مشخصات فنی

### Schema

```prisma
enum StaffStatus {
  active
  suspended
}

model Staff {
  id                String      @id @default(uuid()) @db.Uuid
  tenantId          String      @map("tenant_id") @db.Uuid
  userId            String      @map("user_id") @db.Uuid
  name              String
  email             String?
  nationalId        String?     @map("national_id")
  avatarUrl         String?     @map("avatar_url")
  jobTitle          String?     @map("job_title")
  status            StaffStatus @default(active)
  dataScope         DataScope   @default(all) @map("data_scope")
  assignedBranchIds String[]    @map("assigned_branch_ids") @db.Uuid
  primaryBranchId   String?     @map("primary_branch_id") @db.Uuid
  lastLoginAt       DateTime?   @map("last_login_at") @db.Timestamptz
  invitedAt         DateTime?   @map("invited_at") @db.Timestamptz
  invitedById       String?     @map("invited_by_id") @db.Uuid
  createdAt         DateTime    @default(now()) @map("created_at") @db.Timestamptz
  updatedAt         DateTime    @updatedAt @map("updated_at") @db.Timestamptz
  createdById       String?     @map("created_by_id") @db.Uuid
  updatedById       String?     @map("updated_by_id") @db.Uuid
  deletedAt         DateTime?   @map("deleted_at") @db.Timestamptz
  deletedById       String?     @map("deleted_by_id") @db.Uuid
  deleteReason      String?     @map("delete_reason")
  version           Int         @default(1)
  metadata          Json?       @db.JsonB

  tenant              Tenant                   @relation(fields: [tenantId], references: [id], onDelete: Restrict)
  user                User                     @relation(fields: [userId], references: [id], onDelete: Restrict)
  primaryBranch       Branch?                  @relation("StaffPrimaryBranch", fields: [primaryBranchId], references: [id], onDelete: SetNull)
  staffRoles          StaffRole[]
  permissionOverrides UserPermissionOverride[]

  @@unique([tenantId, userId])
  @@index([tenantId])
  @@index([tenantId, status])
  @@map("staff")
}
```

### ADR-015 Branch Rules

- `assignedBranchIds = []` → دسترسی به همه branch‌های tenant
- `assignedBranchIds = [id1, id2]` → فقط این branch‌ها (validate same tenant + not deleted در use case)
- `primaryBranchId` → برای UX پیش‌فرض؛ باید `∈ assignedBranchIds` یا null (وقتی assign خالی است)
- `dataScope = branch` → فیلتر query به effective branch IDs
- Owner: `dataScope: all`, `assignedBranchIds: []`, `primaryBranchId: defaultBranch.id`

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Update | `prisma/schema.prisma` |
| Create | `packages/domain/src/core/staff/staff.entity.ts` — TASK-031 |
| Migration | TASK-027 |

---

## مراحل پیاده‌سازی

1. اضافه کردن enum `StaffStatus`
2. اضافه کردن model `Staff` با `assignedBranchIds String[] @db.Uuid`
3. تعریف FK `primaryBranch → Branch @relation("StaffPrimaryBranch")` با `SetNull`
4. تعریف relations به `StaffRole[]` و `UserPermissionOverride[]`
5. `pnpm prisma validate`

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| userId تکراری در tenant | 409 `STAFF_PHONE_DUPLICATE` | unique `(tenantId, userId)` — همان User |
| همان User در tenant دیگر | — | مجاز — multi-tenant staff (ADR-017) |
| `assignedBranchIds` با UUID متعلق به tenant دیگر | 422 | domain/use case reject |
| `primaryBranchId` خارج از assign | 422 `BRANCH_NOT_ALLOWED` | domain entity |
| soft delete owner staff | 422 `CANNOT_DELETE_OWNER` | use case layer |
| login با staff suspended | 401 | auth service |

---

## تست

- [ ] Unit: `Staff.canAccessBranch()` — all scope vs branch scope
- [ ] Unit: `Staff.effectiveBranchIds()` — با active session branch
- [ ] Unit: `Staff.softDelete()` + `restore()` cycle
- [ ] Integration: `(tenantId, userId)` unique — cross-tenant same User allowed
- [ ] RBAC: cross-tenant staff access → fail

---

## Policy Alignment

- [ ] EXCELLENCE-STANDARDS §8 Staff — تمام فیلدها (`email`, `nationalId`, `avatarUrl`, `jobTitle`, `lastLoginAt`, `invitedAt`)
- [ ] EXCELLENCE-STANDARDS §2.1 — base fields کامل
- [ ] SOFT-DELETE-POLICY §5 — soft delete staff، created records باقی می‌مانند
- [ ] ADR-017 — phone روی User؛ Staff FK userId؛ unique `(tenantId, userId)`
- [ ] ADR-011 — staff/customer same User/phone مجاز
- [ ] ADR-013 — no Cascade hard delete
- [ ] ADR-015 — `assignedBranchIds[]` + `primaryBranchId` (نه FK تکی)

---

## مراجع

- `docs/02-architecture/tenancy-and-entities.md` §Staff
- `docs/09-development/SOFT-DELETE-POLICY.md` §5
- `docs/08-decisions/ADR-017-user-platform-identity.md`
- `docs/08-decisions/adr-log.md` — ADR-011, ADR-015, ADR-017

---

## Self-Review Score

| محور | /25 | یادداشت |
|------|-----|---------|
| Metadata | 10/10 | ID, Priority, Depends, Blocks, Estimate ✓ |
| Completeness | 25/25 | Schema کامل، EXCELLENCE §8 Staff، acceptance criteria ✓ |
| Policy | 25/25 | Base fields، ADR-011/013/015، soft delete ✓ |
| Executability | 25/25 | Steps، edge cases، tests ✓ |
| Alignment | 15/15 | Sync با domain TASK-031، RBAC TASK-021 ✓ |
| **جمع** | **100/100** | ≥95 required ✓ |
