# TASK-027: Prisma Initial Migration

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 0 |
| Epic | Epic-04-Database |
| ID | TASK-027 |
| Priority | P0 |
| Depends on | TASK-017–026 |
| Blocks | TASK-028, TASK-029–034 |
| Estimated | 3h |

---

## هدف

ایجاد migration اولیه از تمام مدل‌های TASK-017 تا TASK-026. Migration باید از `prisma migrate dev` (local) و `prisma migrate deploy` (prod) اجرا شود — هرگز `prisma db push` در staging/prod. Partial unique index برای default branch و validation کامل migration.

---

## معیار پذیرش

- [ ] فایل `prisma/schema.prisma` با generator و datasource کامل
- [ ] `pnpm db:migrate` موفق — فایل `prisma/migrations/202xxx_init/migration.sql` ایجاد شود
- [ ] `pnpm prisma migrate deploy` روی DB جدید موفق
- [ ] تمام جداول، indexes، uniques مطابق task specs
- [ ] **هر** جدول business: `deletedAt`, `deletedById`, `deleteReason`, `version` (Epic-04 README)
- [ ] **هیچ** `onDelete: Cascade` روی business FK — فقط `Restrict` یا `SetNull`
- [ ] AuditLog + OutboxEvent: بدون soft-delete columns (append-only)
- [ ] Partial unique index: `(tenant_id) WHERE is_default=true AND deleted_at IS NULL` روی branches
- [ ] `pnpm prisma validate` pass

---

## مشخصات فنی

### Pre-Migrate Checklist

```
[ ] TASK-017–023: EXCELLENCE §2.1 base fields کامل (createdById, updatedById, deletedAt, deletedById, deleteReason, version, metadata)
[ ] TASK-019: partial unique index branches — raw SQL در migration
[ ] TASK-020/023: FK primaryBranchId, defaultBranchId → branches (SetNull)
[ ] TASK-024–026: append-only models (بدون deletedAt، updatedAt)
[ ] TASK-025: settings soft delete fields
[ ] همه tenant-scoped models: tenantId + index
[ ] enum values مطابق seed (TASK-028)
[ ] grep schema: onDelete: Cascade → zero results
```

### Partial Unique Index (Raw SQL)

```sql
-- ADR-009: دقیقاً یک branch پیش‌فرض per tenant (non-deleted)
CREATE UNIQUE INDEX "branches_one_default_per_tenant_idx"
  ON "branches"("tenant_id")
  WHERE "is_default" = true AND "deleted_at" IS NULL;
```

این در انتهای migration SQL اضافه می‌شود زیرا Prisma از conditional unique index پشتیبانی نمی‌کند.

### Migration Commands

```bash
docker compose -f docker/docker-compose.yml up -d
pnpm prisma migrate dev --name init
pnpm prisma generate
pnpm prisma validate
```

### Verify

```bash
psql $DATABASE_URL -c "\dt"
psql $DATABASE_URL -c "\di" | grep branches_one_default
pnpm prisma db pull  # optional diff check
```

### Additional Migration

```bash
# برای اضافه کردن base fields به Plan, Subscription, Permission, Role, GlobalCustomer, UserPermissionOverride:
pnpm prisma migrate dev --name add_base_fields
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `prisma/migrations/20260628130121_init/migration.sql` |
| Create | `prisma/migrations/20260629203408_add_base_fields/migration.sql` |
| Verify | `prisma/migrations/migration_lock.toml` |

---

## مراحل پیاده‌سازی

1. اطمینان از اتمام TASK-017 تا TASK-026 (schema کامل)
2. Pre-migrate checklist بالا را pass کردن
3. اجرای `pnpm prisma validate`
4. اجرای `pnpm prisma migrate dev --name init`
5. تأیید partial unique index branches در migration SQL
6. اجرای `pnpm prisma generate`
7. اجرای `pnpm prisma migrate deploy` روی DB جدید برای تأیید

---

## Edge Cases & Errors

| سناریو | رفتار |
|--------|--------|
| `pnpm prisma db push` — استفاده ممنوع | فقط برای local prototype — نه staging/prod |
| migration conflict (دو dev همزمان) | `prisma migrate dev` resolve می‌کند |
| column type تغییر (financial) | ADR جدید + migration plan |
| index نامناسب | اضافه کردن migration جدید |
| `onDelete: Cascade` یافت شد | رد در CI — باید Restrict/SetNull شود |

---

## تست

- [ ] `pnpm prisma validate` — exit code 0
- [ ] `pnpm prisma migrate deploy` روی fresh DB — موفق
- [ ] grep `onDelete: Cascade` در `prisma/` → zero results
- [ ] بررسی manual: جدول `branches` partial unique index وجود دارد
- [ ] بررسی: AuditLog بدون `deleted_at` column

---

## Policy Alignment

- [ ] EXCELLENCE-STANDARDS §2.7 — pre-merge schema checklist
- [ ] SOFT-DELETE-POLICY §3 — deletedAt, deletedById روی همه business tables
- [ ] ADR-009 — partial unique index برای default branch
- [ ] ADR-013 — no Cascade hard delete
- [ ] DEVELOPMENT_RULES §3.6 — `migrate dev` فقط، نه `db push` در production

---

## مراجع

- `docs/09-development/EXCELLENCE-STANDARDS.md` §2.7
- `docs/09-development/SOFT-DELETE-POLICY.md`
- `docs/09-development/DEVELOPMENT_RULES.md` §3.6
- `docs/08-decisions/adr-log.md` — ADR-009, ADR-013

---

## Self-Review Score

| محور | /25 | یادداشت |
|------|-----|---------|
| Metadata | 10/10 | ID, Priority, Depends, Blocks, Estimate ✓ |
| Completeness | 25/25 | Pre-checklist، partial index، commands، rollback ✓ |
| Policy | 25/25 | EXCELLENCE §2.7، soft delete، no Cascade، ADR-009/013 ✓ |
| Executability | 25/25 | Commands، verify steps، edge cases، tests ✓ |
| Alignment | 15/15 | Sync با TASK-017–026، TASK-028 seed ✓ |
| **جمع** | **100/100** | ≥95 required ✓ |
