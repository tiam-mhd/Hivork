# TASK-024: Prisma Schema — AuditLog

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 0 |
| Epic | Epic-04-Database |
| ID | TASK-024 |
| Priority | P0 |
| Depends on | TASK-018 |
| Blocks | TASK-027, TASK-047 |
| Estimated | 2h |

---

## هدف

تعریف مدل Prisma برای `AuditLog` — جدول append-only برای ثبت تمام رویدادهای حساس. این جدول **استثنا** است: بدون soft delete، بدون updatedAt، هرگز حذف یا ویرایش نمی‌شود. فقط `create` و `findMany` مجاز هستند.

---

## معیار پذیرش

- [ ] مدل `AuditLog` **فقط با** `createdAt` — بدون `updatedAt`, `deletedAt`, `deletedById`
- [ ] فیلدهای: `tenantId?`, `actorType`, `actorId`, `action`, `entityType`, `entityId`, `oldValue`, `newValue`, `ip`, `userAgent`, `metadata`
- [ ] Enum `ActorType`: staff, customer, system, platform
- [ ] Indexes: `(tenantId, createdAt DESC)`, `(entityType, entityId)`, `(action, createdAt DESC)`
- [ ] Extension Prisma باید `delete`/`deleteMany` را برای AuditLog block کند
- [ ] Repository فقط `create` و `find` expose می‌کند

---

## مشخصات فنی

### Schema (Append-Only Exception)

```prisma
enum ActorType {
  staff
  customer
  system
  platform
}

model AuditLog {
  id         String    @id @default(uuid()) @db.Uuid
  tenantId   String?   @map("tenant_id") @db.Uuid
  actorType  ActorType @map("actor_type")
  actorId    String    @map("actor_id") @db.Uuid
  action     String    // e.g. "entity.soft_delete", "auth.login_success"
  entityType String    @map("entity_type")
  entityId   String    @map("entity_id") @db.Uuid
  oldValue   Json?     @map("old_value")
  newValue   Json?     @map("new_value")
  ip         String?
  userAgent  String?   @map("user_agent")
  metadata   Json?     @db.JsonB
  createdAt  DateTime  @default(now()) @map("created_at") @db.Timestamptz

  @@index([tenantId, createdAt(sort: Desc)])
  @@index([entityType, entityId])
  @@index([action, createdAt(sort: Desc)])
  @@map("audit_logs")
}
```

### Append-Only Policy

| قانون | |
|-------|---|
| No `updatedAt` | AuditLog هرگز ویرایش نمی‌شود |
| No `deletedAt` | AuditLog هرگز حذف نمی‌شود |
| Extension | `delete()` → throw `HardDeleteForbiddenError` |
| Repository | فقط `create(input)` و `findMany(filter)` |

### Action Convention

```typescript
// format: "{entity}.{verb}"
"staff.create"          "staff.suspend"       "staff.soft_delete"
"tenant.suspend"        "tenant.restore"
"sale.create"           "sale.cancel"
"installment.waive"     "payment.confirm"
"auth.login_success"    "auth.login_fail"
"settings.change"       "role.update"
```

### Mandatory Audit Actions (TASK-047)

`sale.create|cancel`, `installment.waive`, `payment.confirm|reject`, `staff.*`, `role.*`, `settings.change`, `customer.import`, `customer.soft_delete`, `customer.restore`

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Update | `prisma/schema.prisma` |
| Create | `packages/infrastructure/src/audit/prisma-audit.service.ts` — TASK-047 |
| Migration | TASK-027 |

---

## مراحل پیاده‌سازی

1. اضافه کردن enum `ActorType`
2. اضافه کردن مدل `AuditLog` **بدون** updatedAt/deletedAt
3. اطمینان از indexes روی tenantId+createdAt، entityType+entityId
4. در TASK-047: پیاده‌سازی `PrismaAuditService.log()`
5. `pnpm prisma validate`

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| delete AuditLog | — | Prisma extension block می‌کند |
| update AuditLog | — | نه در API؛ extension update را نیز می‌تواند block کند |
| tenantId=null | — | platform-level event (platform admin actions) |
| خطا در audit log | — | نباید main transaction را fail کند؛ log error جداگانه |

---

## تست

- [ ] Unit: AuditLog فقط `create` — `delete()` throws
- [ ] Integration: `PrismaAuditService.log()` — entry ایجاد می‌شود
- [ ] Integration: query با tenantId filter
- [ ] Integration: extension block `deleteMany` روی audit_logs

---

## Policy Alignment

- [ ] SOFT-DELETE-POLICY §2 — AuditLog استثنا: append-only، نه soft delete
- [ ] EXCELLENCE-STANDARDS §2.5 — append-only audit
- [ ] ADR-013 — no delete on AuditLog

---

## مراجع

- `docs/06-operations/security-and-audit.md`
- `docs/09-development/SOFT-DELETE-POLICY.md` §2

---

## Self-Review Score

| محور | /25 | یادداشت |
|------|-----|---------|
| Metadata | 10/10 | ID, Priority, Depends, Blocks, Estimate ✓ |
| Completeness | 25/25 | Schema append-only، action convention، acceptance criteria ✓ |
| Policy | 25/25 | استثنا documented، extension policy، ADR-013 ✓ |
| Executability | 25/25 | Steps، edge cases، tests ✓ |
| Alignment | 15/15 | Sync با TASK-047 service، security-and-audit.md ✓ |
| **جمع** | **100/100** | ≥95 required ✓ |
