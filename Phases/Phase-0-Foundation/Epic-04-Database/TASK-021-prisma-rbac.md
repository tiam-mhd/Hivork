# TASK-021: Prisma Schema — Role, Permission, RBAC

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 0 |
| Epic | Epic-04-Database |
| ID | TASK-021 |
| Priority | P0 |
| Depends on | TASK-018 |
| Blocks | TASK-027, TASK-028, TASK-034, TASK-041, TASK-057 |
| Estimated | 5h |

---

## هدف

تعریف مدل‌های Prisma برای سیستم RBAC: `Permission` (catalog)، `Role` (tenant-specific)، `RolePermission` (junction)، `StaffRole` (assignment)، `UserPermissionOverride` (exception). Precedence: DENY > GRANT > Role > default deny.

---

## معیار پذیرش

- [ ] مدل `Permission` با فیلدهای base کامل (createdById, updatedById, deletedById, metadata)
- [ ] مدل `Role` با فیلدهای base + `isTemplate` + `isSystem` + `dataScope`
- [ ] `RolePermission`: junction table با `onDelete: Restrict` روی هر دو FK
- [ ] `StaffRole`: junction با soft delete (`deletedAt`)
- [ ] `UserPermissionOverride`: با `expiresAt`, `reason`, `effect: grant/deny`، `updatedAt`, `updatedById`
- [ ] Enum `RoleScope`: platform, tenant
- [ ] Enum `PermissionEffect`: grant, deny
- [ ] Template roles: `isTemplate=true`, `tenantId=null` — فقط platform می‌تواند ایجاد کند
- [ ] System roles: `isSystem=true` — قابل حذف نیستند
- [ ] Unique: `(tenantId, code)` روی Role
- [ ] Indexes: `(tenantId)`, `(isTemplate)` روی Role؛ `(module)` روی Permission
- [ ] `onDelete: Restrict` روی همه FK (هیچ Cascade)

---

## مشخصات فنی

### Schema

```prisma
enum RoleScope {
  platform
  tenant
}

enum PermissionEffect {
  grant
  deny
}

model Permission {
  id          String    @id @default(uuid()) @db.Uuid
  code        String    @unique
  module      String
  description String?
  createdAt   DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt   DateTime  @updatedAt @map("updated_at") @db.Timestamptz
  createdById String?   @map("created_by_id") @db.Uuid
  updatedById String?   @map("updated_by_id") @db.Uuid
  deletedAt   DateTime? @map("deleted_at") @db.Timestamptz
  deletedById String?   @map("deleted_by_id") @db.Uuid
  version     Int       @default(1)
  metadata    Json?     @db.JsonB

  rolePermissions     RolePermission[]
  permissionOverrides UserPermissionOverride[]

  @@index([module])
  @@map("permissions")
}

model Role {
  id          String    @id @default(uuid()) @db.Uuid
  scope       RoleScope
  tenantId    String?   @map("tenant_id") @db.Uuid
  code        String
  name        String
  isSystem    Boolean   @default(false) @map("is_system")
  isTemplate  Boolean   @default(false) @map("is_template")
  dataScope   DataScope @default(all) @map("data_scope")
  moduleId    String?   @map("module_id")
  createdAt   DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt   DateTime  @updatedAt @map("updated_at") @db.Timestamptz
  createdById String?   @map("created_by_id") @db.Uuid
  updatedById String?   @map("updated_by_id") @db.Uuid
  deletedAt   DateTime? @map("deleted_at") @db.Timestamptz
  deletedById String?   @map("deleted_by_id") @db.Uuid
  version     Int       @default(1)
  metadata    Json?     @db.JsonB

  rolePermissions RolePermission[]
  staffRoles      StaffRole[]

  @@unique([tenantId, code])
  @@index([tenantId])
  @@index([isTemplate])
  @@map("roles")
}

model RolePermission {
  roleId       String @map("role_id") @db.Uuid
  permissionId String @map("permission_id") @db.Uuid

  role       Role       @relation(fields: [roleId], references: [id], onDelete: Restrict)
  permission Permission @relation(fields: [permissionId], references: [id], onDelete: Restrict)

  @@id([roleId, permissionId])
  @@map("role_permissions")
}

model StaffRole {
  staffId   String    @map("staff_id") @db.Uuid
  roleId    String    @map("role_id") @db.Uuid
  createdAt DateTime  @default(now()) @map("created_at") @db.Timestamptz
  deletedAt DateTime? @map("deleted_at") @db.Timestamptz

  staff Staff @relation(fields: [staffId], references: [id], onDelete: Restrict)
  role  Role  @relation(fields: [roleId], references: [id], onDelete: Restrict)

  @@id([staffId, roleId])
  @@map("staff_roles")
}

model UserPermissionOverride {
  id           String           @id @default(uuid()) @db.Uuid
  staffId      String           @map("staff_id") @db.Uuid
  permissionId String           @map("permission_id") @db.Uuid
  effect       PermissionEffect
  reason       String?
  expiresAt    DateTime?        @map("expires_at") @db.Timestamptz
  createdById  String           @map("created_by_id") @db.Uuid
  updatedById  String?          @map("updated_by_id") @db.Uuid
  createdAt    DateTime         @default(now()) @map("created_at") @db.Timestamptz
  updatedAt    DateTime         @updatedAt @map("updated_at") @db.Timestamptz
  deletedAt    DateTime?        @map("deleted_at") @db.Timestamptz

  staff      Staff      @relation(fields: [staffId], references: [id], onDelete: Restrict)
  permission Permission @relation(fields: [permissionId], references: [id], onDelete: Restrict)

  @@unique([staffId, permissionId])
  @@map("user_permission_overrides")
}
```

### Precedence (پیاده در TASK-034/043)

```
DENY (user override) > GRANT (user override) > Role permissions > default DENY
```

### Template vs System Roles

- `isTemplate=true, tenantId=null` → template که clone می‌شود هنگام tenant registration
- `isSystem=true` → قابل حذف نیست (حتی soft delete)؛ فقط permissions قابل تغییر
- Clone: `isTemplate=false, tenantId=<id>` → نسخه tenant

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Update | `prisma/schema.prisma` |
| Seed | `prisma/seed/role-mappings.ts` + `prisma/seed/permissions.ts` — TASK-028 |
| Migration | TASK-027 |

---

## مراحل پیاده‌سازی

1. اضافه کردن enums `RoleScope`, `PermissionEffect`
2. اضافه کردن مدل `Permission` با base fields کامل
3. اضافه کردن مدل `Role` با `isTemplate`, `isSystem`, `dataScope`
4. اضافه کردن junction tables: `RolePermission`, `StaffRole`
5. اضافه کردن `UserPermissionOverride` با `expiresAt` و `updatedAt`
6. `pnpm prisma validate`

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| soft delete system role | 422 `DELETE_FORBIDDEN` | use case/domain |
| clone template role برای tenant | — | ایجاد role جدید با `tenantId` |
| permission code تکراری | 409 | unique constraint |
| role code تکراری در tenant | 409 `ROLE_CODE_TAKEN` | unique `(tenantId, code)` |
| override منقضی شده | — | use case `expiresAt < now()` را ignore کند |

---

## تست

- [ ] Unit: `resolveEffectivePermissions()` — DENY > GRANT > Role
- [ ] Unit: `Role.softDelete()` روی isSystem=true → `DELETE_FORBIDDEN`
- [ ] Integration: clone template role برای tenant جدید
- [ ] Integration: override DENY blocks role permission

---

## Policy Alignment

- [ ] EXCELLENCE-STANDARDS §2.1 — base fields روی Permission و Role
- [ ] SOFT-DELETE-POLICY — Role soft deletable (غیر system)؛ Permission soft deletable
- [ ] ADR-013 — `onDelete: Restrict` روی همه FK
- [ ] `docs/02-architecture/rbac.md` — precedence

---

## مراجع

- `docs/02-architecture/rbac.md`
- `docs/09-development/SOFT-DELETE-POLICY.md`
- `docs/09-development/EXCELLENCE-STANDARDS.md` §2.1

---

## Self-Review Score

| محور | /25 | یادداشت |
|------|-----|---------|
| Metadata | 10/10 | ID, Priority, Depends, Blocks, Estimate ✓ |
| Completeness | 25/25 | Schema کامل، enums، acceptance criteria، files ✓ |
| Policy | 25/25 | Base fields کامل، soft delete، Restrict FK، ADR ✓ |
| Executability | 25/25 | Steps، edge cases، tests ✓ |
| Alignment | 15/15 | Sync با TASK-034 domain، TASK-028 seed، rbac.md ✓ |
| **جمع** | **100/100** | ≥95 required ✓ |
