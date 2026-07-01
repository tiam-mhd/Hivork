# استراتژی Migration داده — Hivork

> **وضعیت:** Approved — v1.0  
> **نسخه:** 1.0 — 1405/04/08  
> **ADR مرتبط:** ADR-010, ADR-013  

---

## ۱. اصول پایه

```
✅ فقط Prisma Migrate — هرگز db push در staging/production
✅ Migration = forward-only (جز rollback plan)
✅ Migration حساس = ADR قبل از اجرا
✅ Backward compatibility = فاز deploy کثیف (multi-step)
✅ Financial columns → BigInt ثابت، هرگز تغییر نوع
❌ DROP COLUMN بدون deprecation period
❌ TRUNCATE روی جداول business
❌ DELETE در migration scripts (فقط soft delete)
```

---

## ۲. انواع Migration

### ۲.۱ Safe (بدون downtime)

- اضافه کردن ستون جدید `nullable` یا با `DEFAULT`
- اضافه کردن جدول جدید
- اضافه کردن index
- تغییر nullable → nullable

```bash
# اجرا در production بدون آماده‌سازی خاص
pnpm exec prisma migrate deploy
```

### ۲.۲ Potentially Unsafe (نیاز به بررسی)

| تغییر | ریسک | روش |
|-------|------|-----|
| `NOT NULL` کردن ستون nullable | Lock جدول اگر داده بدون default دارد | Backfill اول، بعد constraint |
| اضافه کردن unique index | Lock + scan | `CONCURRENTLY` در PostgreSQL |
| تغییر نوع ستون non-financial | Lock | فاز double-write |
| rename ستون یا جدول | Breaking برای همه clients | فاز multi-step |

### ۲.۳ Forbidden (بدون ADR جدید)

- `ALTER COLUMN amount_rial TYPE` هر نوع غیر از `bigint`
- `DROP TABLE` روی جداول business
- `TRUNCATE` روی جداول business
- `DELETE FROM` در migration script (استفاده از soft delete)

---

## ۳. فرآیند Migration جدید

### ۳.۱ Local Development

```bash
# ۱. ویرایش prisma/schema.prisma
# ۲. ساخت migration file
pnpm exec prisma migrate dev --name add_sale_invoice_number

# ۳. بررسی migration SQL تولیدشده
cat prisma/migrations/TIMESTAMP_add_sale_invoice_number/migration.sql

# ۴. تست اجرا
pnpm exec prisma migrate reset --force   # ریست کامل local
pnpm db:seed                             # seed مجدد
```

### ۳.۲ Code Review Migration

قبل از merge هر PR با migration:

```
[ ] migration SQL بررسی شده — بدون DROP/TRUNCATE/DELETE غیرمجاز
[ ] ستون soft delete دارد (deletedAt, deletedById)
[ ] Financial columns BigInt هستند
[ ] Index‌های لازم اضافه شده (FK، tenantId+status، unique)
[ ] onDelete: Restrict (نه Cascade) در relations
[ ] test با migration اجرا می‌شود
[ ] اگر breaking: ADR مربوطه Accepted است
```

### ۳.۳ Production Deploy

```bash
# ۱. Backup قبل از migration
pg_dump $DATABASE_URL > backup_before_$(date +%Y%m%d_%H%M).sql

# ۲. اعمال migration
DATABASE_URL=... pnpm exec prisma migrate deploy

# ۳. تأیید
pnpm exec prisma migrate status  # باید همه applied باشند

# ۴. Smoke test
curl https://api.hivork.ir/health
```

---

## ۴. Migration Multi-Step (Breaking Changes)

### مثال: rename ستون `title` → `description` در Sale

**فاز ۱: اضافه کردن ستون جدید**

```sql
-- migration 001
ALTER TABLE sales ADD COLUMN description VARCHAR;
```

```typescript
// کد: هر دو ستون پر می‌شود
data: { title: dto.title, description: dto.title }
```

**Deploy فاز ۱ → production**

**فاز ۲: migrate داده قدیمی**

```sql
-- migration 002 (run once)
UPDATE sales SET description = title WHERE description IS NULL;
```

**Deploy فاز ۲ → production**

**فاز ۳: کد فقط از `description` می‌خواند**

```typescript
// کد: فقط description
data: { description: dto.description }
```

**Deploy فاز ۳ → production**

**فاز ۴: حذف ستون قدیمی (بعد از ۱+ release)**

```sql
-- migration 003
ALTER TABLE sales DROP COLUMN title;
```

**Deploy فاز ۴ → production**

---

## ۵. Data Import و Migration از سیستم قدیمی

### ۵.۱ Import مشتریان از Excel

```typescript
// Use Case: ImportCustomersExcel
// فرمت: phone, name, local_code?, notes?

const importFlow = {
  validate: (rows) => rows.filter(r => !isValidPhone(r.phone)),  // خطاها
  normalize: (phone) => normalizePhone(phone),                    // 09xxxxxxxxx
  upsert: async (row) => {
    const user = await userRepo.findOrCreateByPhone(row.phone);
    return globalCustomerRepo.findOrCreateByUserId(user.id, row.name);
  },
  linkTenant: (gcId, tenantId, row) => tenantCustomerRepo.link(...),
};
```

**خطاهای Import:**

| شرط | خطا | رفتار |
|-----|-----|--------|
| phone نامعتبر | `INVALID_PHONE` | skip + گزارش در result |
| phone تکراری در فایل | `CUSTOMER_PHONE_DUPLICATE_IN_FILE` | skip row دوم |
| فایل خالی | `VALIDATION_ERROR` | reject کل import |
| فرمت اشتباه Excel | `CUSTOMER_IMPORT_FAILED` | reject |

### ۵.۲ Migration از سیستم قدیمی (Excel کلی)

برای تنانت‌هایی که می‌خواهند داده تاریخی وارد کنند:

```bash
# اسکریپت یکبار مصرف — فقط در محیط staging اول تست
tsx scripts/migrate-from-legacy.ts \
  --tenant-id UUID \
  --file customers.xlsx \
  --dry-run    # اول dry-run، بعد اجرا

# نتیجه dry-run:
# { total: 200, new: 180, existing: 15, invalid: 5, errors: [...] }
```

---

## ۶. Migration Schema Versioning

هر migration Prisma با timestamp نام‌گذاری می‌شود:

```
prisma/migrations/
├── 20250101120000_initial_schema/
│   └── migration.sql
├── 20250115090000_add_sale_invoice_number/
│   └── migration.sql
└── 20250120150000_add_customer_birth_date/
    └── migration.sql
```

**قوانین نام‌گذاری:**
- `YYYYMMDDHHMMSS_lowercase_underscore_description`
- توضیح دقیق و کوتاه
- نام migration = اثر آن (نه «fix» یا «update»)

---

## ۷. Seed Production (یکبار)

```typescript
// prisma/seed-production.ts — فقط داده‌های اجباری بدون demo

async function seedProduction() {
  // ۱. Plans
  await upsertPlans([
    { code: 'starter', name: 'پایه', maxCustomers: 100, ... },
    { code: 'pro', name: 'حرفه‌ای', maxCustomers: 1000, ... },
    { code: 'enterprise', name: 'سازمانی', maxCustomers: -1, ... },
  ]);

  // ۲. Template Roles (برای clone به هر tenant جدید)
  await upsertTemplateRoles([
    { code: 'owner', name: 'صاحب', isTemplate: true, dataScope: 'all', ... },
    { code: 'manager', name: 'مدیر', isTemplate: true, dataScope: 'all', ... },
    { code: 'cashier', name: 'صندوقدار', isTemplate: true, dataScope: 'branch', ... },
    { code: 'viewer', name: 'مشاهده‌گر', isTemplate: true, dataScope: 'all', ... },
  ]);

  // ۳. Permissions (همه module.resource.action‌ها)
  await upsertPermissions(ALL_PERMISSIONS);

  // ۴. RolePermission mapping برای template roles
  await assignRolePermissions(ROLE_PERMISSION_MATRIX);
}
```

**اجرا:**

```bash
DATABASE_URL=... tsx prisma/seed-production.ts
```

---

## ۸. Monitoring Migration‌ها

```bash
# وضعیت migration‌ها
pnpm exec prisma migrate status

# باید نشان دهد:
# Database schema is up to date!

# اگر migration pending باشد:
# 1 migration found that has not been applied:
#   20250120150000_add_customer_birth_date
```

```sql
-- بررسی مستقیم در DB
SELECT * FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 10;
```

---

## ۹. بازیابی از Migration خراب

```bash
# ۱. اگر migration ناقص اجرا شد:
pnpm exec prisma migrate resolve --rolled-back 20250120150000_add_customer_birth_date

# ۲. Fix کد migration
# ۳. deploy مجدد:
pnpm exec prisma migrate deploy
```

---

*نسخه 1.0 — 1405/04/08*
