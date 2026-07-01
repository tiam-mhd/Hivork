# TASK-025: Prisma Schema — TenantSetting, BranchSetting

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 0 |
| Epic | Epic-04-Database |
| ID | TASK-025 |
| Priority | P0 |
| Depends on | TASK-018, TASK-019 |
| Blocks | TASK-027, TASK-048 |
| Estimated | 2h |

---

## هدف

تعریف مدل‌های Prisma برای `TenantSetting` و `BranchSetting` — ذخیره key-value تنظیمات module-scoped. فقط کلیدهای تعریف‌شده در `settings.schema.ts` مجاز هستند. Tenant نمی‌تواند arbitrary business rules را در settings بگذارد — invariant ها در domain code هستند.

---

## معیار پذیرش

- [ ] مدل `TenantSetting` با فیلدهای base کامل (EXCELLENCE §2.1)
- [ ] مدل `BranchSetting` با فیلدهای base کامل
- [ ] ستون `module` برای namespace‌بندی کلیدها
- [ ] ستون `value Json` — نه `value String` (مقادیر می‌توانند آرایه/object باشند)
- [ ] Unique: `(tenantId, module, key)` و `(branchId, module, key)`
- [ ] Soft delete fields روی هر دو (deletedAt, deletedById, deleteReason)
- [ ] `onDelete: Restrict` روی FK‌ها
- [ ] `pnpm prisma validate` pass

---

## مشخصات فنی

### Schema

```prisma
model TenantSetting {
  id           String    @id @default(uuid()) @db.Uuid
  tenantId     String    @map("tenant_id") @db.Uuid
  module       String
  key          String
  value        Json
  createdAt    DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt    DateTime  @updatedAt @map("updated_at") @db.Timestamptz
  createdById  String?   @map("created_by_id") @db.Uuid
  updatedById  String?   @map("updated_by_id") @db.Uuid
  deletedAt    DateTime? @map("deleted_at") @db.Timestamptz
  deletedById  String?   @map("deleted_by_id") @db.Uuid
  deleteReason String?   @map("delete_reason")
  version      Int       @default(1)
  metadata     Json?     @db.JsonB

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Restrict)

  @@unique([tenantId, module, key])
  @@index([tenantId, module])
  @@index([tenantId, deletedAt])
  @@map("tenant_settings")
}

model BranchSetting {
  id           String    @id @default(uuid()) @db.Uuid
  branchId     String    @map("branch_id") @db.Uuid
  module       String
  key          String
  value        Json
  createdAt    DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt    DateTime  @updatedAt @map("updated_at") @db.Timestamptz
  createdById  String?   @map("created_by_id") @db.Uuid
  updatedById  String?   @map("updated_by_id") @db.Uuid
  deletedAt    DateTime? @map("deleted_at") @db.Timestamptz
  deletedById  String?   @map("deleted_by_id") @db.Uuid
  deleteReason String?   @map("delete_reason")
  version      Int       @default(1)
  metadata     Json?     @db.JsonB

  branch Branch @relation(fields: [branchId], references: [id], onDelete: Restrict)

  @@unique([branchId, module, key])
  @@index([branchId, deletedAt])
  @@map("branch_settings")
}
```

### Settings Schema Validation (TASK-048)

فقط کلیدهایی که در `settings.schema.ts` تعریف شده‌اند مجاز هستند:
```typescript
// packages/infrastructure/src/settings/settings-schema.registry.ts
// مثال:
{ module: 'core', key: 'timezone', type: 'string' }
{ module: 'core', key: 'display_currency', type: 'string' }
{ module: 'installments', key: 'late_fee_percentage', type: 'number' }
```

### Seed Defaults (TASK-028)

```typescript
{ module: 'core', key: 'timezone', value: 'Asia/Tehran' }
{ module: 'core', key: 'display_currency', value: 'toman' }
{ module: 'core', key: 'default_branch_required', value: true }
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Update | `prisma/schema.prisma` |
| Create | `packages/infrastructure/src/settings/settings-schema.registry.ts` — TASK-048 |
| Migration | TASK-027 |

---

## مراحل پیاده‌سازی

1. اضافه کردن مدل `TenantSetting` با `value Json` (نه string)
2. اضافه کردن مدل `BranchSetting`
3. تأیید soft delete fields روی هر دو
4. تأیید unique constraints
5. `pnpm prisma validate`

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| key نامعتبر (خارج از schema) | 422 `INVALID_SETTING_KEY` | use case/service reject |
| upsert setting (create یا update) | — | idempotent via unique constraint |
| soft delete setting | — | default query فیلتر می‌کند |
| BranchSetting با branchId tenant دیگر | — | onDelete: Restrict |
| value type اشتباه | 422 `INVALID_SETTING_VALUE` | Zod schema در service |

---

## تست

- [ ] Integration: upsert tenant setting idempotent
- [ ] Integration: key نامعتبر → service reject
- [ ] Integration: soft delete setting → not visible; restore → visible
- [ ] Integration: `TenantSetting.findOne` با `deletedAt: null`

---

## Policy Alignment

- [ ] EXCELLENCE-STANDARDS §2.1 — base fields کامل روی هر دو مدل
- [ ] SOFT-DELETE-POLICY §2 — Settings soft deletable
- [ ] ADR-013 — `onDelete: Restrict` روی FK
- [ ] `docs/02-architecture/rbac.md` — settings فقط schema keys (نه arbitrary rules)

---

## مراجع

- `docs/02-architecture/overview.md` §Settings
- `docs/09-development/SOFT-DELETE-POLICY.md`
- `docs/09-development/DEVELOPMENT_RULES.md` §4.5

---

## Self-Review Score

| محور | /25 | یادداشت |
|------|-----|---------|
| Metadata | 10/10 | ID, Priority, Depends, Blocks, Estimate ✓ |
| Completeness | 25/25 | Schema کامل، value Json، schema validation، acceptance criteria ✓ |
| Policy | 25/25 | Base fields، soft delete، Restrict FK، ADR-013 ✓ |
| Executability | 25/25 | Steps، edge cases، tests ✓ |
| Alignment | 15/15 | Sync با TASK-048، seed defaults ✓ |
| **جمع** | **100/100** | ≥95 required ✓ |
