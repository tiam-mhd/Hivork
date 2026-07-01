# TASK-017: Prisma Schema — PlatformUser

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 0 |
| Epic | Epic-04-Database |
| ID | TASK-017 |
| Priority | P0 |
| Depends on | TASK-002, TASK-012 |
| Blocks | TASK-027, TASK-028 |
| Estimated | 2h |

---

## هدف

تعریف مدل Prisma برای کاربران admin/support پلتفرم Hivork (تیم داخلی). این entity از tenant جدا است و دسترسی سطح پلتفرم دارد. Soft delete اجباری — داده پلتفرم هرگز حذف نمی‌شود.

---

## معیار پذیرش

- [ ] مدل `PlatformUser` در `prisma/schema.prisma` با تمام فیلدهای زیر
- [ ] Enum `PlatformUserRole` و `PlatformUserStatus` تعریف شده
- [ ] فیلدهای base کامل (EXCELLENCE §2.1): `createdById`, `updatedById`, `deletedAt`, `deletedById`, `deleteReason`, `version`, `metadata`
- [ ] Index روی `status`
- [ ] `onDelete: Restrict` روی همه FK (هیچ Cascade hard delete)
- [ ] AuditLog در هر login/suspend/restore (TASK-047)
- [ ] `pnpm prisma validate` pass

---

## مشخصات فنی

### Schema

```prisma
enum PlatformUserRole {
  super_admin
  support
}

enum PlatformUserStatus {
  active
  suspended
}

model PlatformUser {
  id           String             @id @default(uuid()) @db.Uuid
  phone        String             @unique @db.VarChar(11)
  email        String?            @unique
  name         String
  role         PlatformUserRole   @default(support)
  status       PlatformUserStatus @default(active)
  lastLoginAt  DateTime?          @map("last_login_at") @db.Timestamptz
  createdAt    DateTime           @default(now()) @map("created_at") @db.Timestamptz
  updatedAt    DateTime           @updatedAt @map("updated_at") @db.Timestamptz
  createdById  String?            @map("created_by_id") @db.Uuid
  updatedById  String?            @map("updated_by_id") @db.Uuid
  deletedAt    DateTime?          @map("deleted_at") @db.Timestamptz
  deletedById  String?            @map("deleted_by_id") @db.Uuid
  deleteReason String?            @map("delete_reason")
  version      Int                @default(1)
  metadata     Json?              @db.JsonB

  @@index([status])
  @@map("platform_users")
}
```

### Enums

- `PlatformUserRole`: `super_admin` | `support`
- `PlatformUserStatus`: `active` | `suspended`

### Business Rules

- Phone: normalized `09xxxxxxxxx` (11 digits, unique platform-wide)
- Email: اختیاری، unique
- Role: حداقل یک `super_admin` باید وجود داشته باشد
- Status: `suspended` = login blocked
- Soft delete: فقط `super_admin` می‌تواند انجام دهد

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Update | `prisma/schema.prisma` |
| Run | `prisma/migrations/20260629203408_add_base_fields/migration.sql` |

---

## مراحل پیاده‌سازی

1. اضافه کردن enums `PlatformUserRole`, `PlatformUserStatus` به schema.prisma
2. اضافه کردن model `PlatformUser` با تمام فیلدهای base
3. اجرای `pnpm prisma validate`
4. اجرای `pnpm prisma migrate dev --name init` (یا در TASK-027)
5. تأیید index روی `status`

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| phone تکراری | 409 `PHONE_ALREADY_EXISTS` | reject |
| email تکراری | 409 `EMAIL_ALREADY_EXISTS` | reject |
| suspend آخرین super_admin | 422 `CANNOT_SUSPEND_LAST_ADMIN` | reject |
| login با status=suspended | 401 `ACCOUNT_SUSPENDED` | reject |
| soft delete → restore | audit log هر دو | allowed (super_admin only) |

---

## تست

- [ ] Unit: phone validation (09xxxxxxxxx pattern)
- [ ] Integration: upsert در seed idempotent
- [ ] Integration: دو PlatformUser با phone یکسان → unique violation
- [ ] Integration: soft delete → not in list; restore → visible again

---

## Policy Alignment

- [ ] EXCELLENCE-STANDARDS §2.1 — تمام base fields حاضر
- [ ] SOFT-DELETE-POLICY §3 — `deletedAt`, `deletedById`, `deleteReason`
- [ ] SOFT-DELETE-POLICY §2 — PlatformUser soft deletable (نه hard delete)
- [ ] ADR-013 — no Cascade hard delete

---

## مراجع

- `docs/09-development/EXCELLENCE-STANDARDS.md` §2
- `docs/09-development/SOFT-DELETE-POLICY.md`
- `docs/02-architecture/tenancy-and-entities.md` — Platform Layer

---

## Self-Review Score

| محور | /25 | یادداشت |
|------|-----|---------|
| Metadata | 10/10 | ID, Priority, Depends, Blocks, Estimate ✓ |
| Completeness | 25/25 | Schema کامل، acceptance criteria، files table ✓ |
| Policy | 25/25 | EXCELLENCE §2، soft delete، ADR-013 ✓ |
| Executability | 25/25 | Steps، edge cases، tests ✓ |
| Alignment | 15/15 | Sync با docs و Epic README ✓ |
| **جمع** | **100/100** | ≥95 required ✓ |
