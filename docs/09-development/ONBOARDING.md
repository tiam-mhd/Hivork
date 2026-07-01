# راهنمای Onboarding — Hivork

> **وضعیت:** Approved — v1.0  
> **نسخه:** 1.0 — 1405/04/08  
> **مخاطب:** توسعه‌دهنده جدید، AI agent در اولین session  
> **هدف:** از صفر تا اولین کد اجرا در کمتر از ۲ ساعت

---

## ۱. Hivork چیست؟ (خلاصه ۵ دقیقه‌ای)

**Hivork** پلتفرم SaaS ماژولار برای کسب‌وکارهای خرده‌فروشی ایران است.

- **ماژول اول:** مدیریت اقساط — فروشنده فروش قسطی ثبت می‌کند، مشتری یادآور دریافت می‌کند
- **معماری:** Modular Monolith + Clean Architecture + Multi-tenant
- **Stack:** NestJS + Next.js + Prisma + PostgreSQL + Redis + BullMQ
- **زبان:** TypeScript strict در همه جا

**پیش از هر چیز، این سه سند را بخوان:**

1. [`docs/README.md`](../README.md) — نقشه کامل مستندات
2. [`docs/02-architecture/overview.md`](../02-architecture/overview.md) — معماری کلان
3. [`docs/08-decisions/adr-log.md`](../08-decisions/adr-log.md) — چرا هر تصمیم گرفته شده

---

## ۲. پیش‌نیازها

| ابزار | نسخه | بررسی |
|-------|------|--------|
| Node.js | ۲۰+ LTS | `node --version` |
| pnpm | ۹+ | `pnpm --version` |
| Docker Desktop | آخرین | `docker --version` |
| Git | آخرین | `git --version` |

```bash
# نصب pnpm (اگر نداری)
npm install -g pnpm@latest
```

---

## ۳. راه‌اندازی محیط محلی

### ۳.۱ کلون و نصب

```bash
git clone https://github.com/YOUR_ORG/hivork.git
cd hivork
pnpm install
```

### ۳.۲ تنظیم Environment Variables

```bash
cp .env.example .env
```

فایل `.env` را ویرایش کن — مرجع کامل: [`ENVIRONMENT-CONFIG.md`](./ENVIRONMENT-CONFIG.md)

مقادیر اجباری برای local:

```env
DATABASE_URL=postgresql://hivork:hivork_dev_pass@localhost:5432/hivork_dev
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=dev-access-secret-change-in-prod
JWT_REFRESH_SECRET=dev-refresh-secret-change-in-prod
```

### ۳.۳ راه‌اندازی زیرساخت (Docker)

```bash
# PostgreSQL + Redis را بالا می‌آورد
docker-compose up -d postgres redis

# وضعیت بررسی
docker-compose ps
```

### ۳.۴ Migration و Seed پایگاه داده

```bash
# Migration (schema اعمال)
pnpm db:migrate

# Seed (داده‌های اولیه: plans, roles, demo tenant)
pnpm db:seed
```

**نتیجه seed:**
- ۳ پلن: `starter`, `pro`, `enterprise`
- نقش‌های سیستمی: `owner`, `manager`, `cashier`, `viewer`
- یک tenant دمو با branch پیش‌فرض و staff owner
- مشتریان و فروش‌های نمونه برای تست

### ۳.۵ اجرای سرویس‌ها

```bash
# همه سرویس‌ها با هم (توصیه شده)
pnpm dev

# یا جداگانه:
pnpm --filter api dev          # NestJS API روی :3001
pnpm --filter web dev          # Next.js روی :3000
pnpm --filter bot-gateway dev  # Bot webhooks روی :3002
pnpm --filter scheduler dev    # Cron jobs و BullMQ workers
```

### ۳.۶ بررسی صحت

```bash
# Health check API
curl http://localhost:3001/health

# خروجی مورد انتظار:
# { "status": "ok", "db": "ok", "redis": "ok" }
```

باز کردن مرورگر:
- **پنل فروشنده:** [http://localhost:3000/admin](http://localhost:3000/admin)
- **پورتال مشتری:** [http://localhost:3000/my](http://localhost:3000/my)
- **API Docs:** [http://localhost:3001/api](http://localhost:3001/api)

---

## ۴. ساختار پروژه (نگاه اول)

```
hivork/
├── apps/
│   ├── api/           # NestJS — REST API (پورت 3001)
│   ├── web/           # Next.js — پنل فروشنده + پورتال مشتری (پورت 3000)
│   ├── bot-gateway/   # webhook تلگرام/بله (پورت 3002)
│   └── scheduler/     # BullMQ workers + cron
│
├── packages/
│   ├── domain/        # Entities + Domain Events (pure TS — بدون NestJS)
│   ├── application/   # Use Cases (business logic)
│   ├── infrastructure/# Prisma, Redis, SMS, Bot adapters
│   ├── contracts/     # Zod schemas — shared بین FE و BE
│   ├── ui/            # Design system (shadcn-based)
│   └── i18n/          # ترجمه‌های فارسی
│
├── prisma/
│   ├── schema.prisma  # مدل داده کامل
│   └── migrations/    # تاریخچه migration
│
└── docs/              # این مستندات
```

مرجع کامل ساختار: [`docs/04-technology/monorepo-structure.md`](../04-technology/monorepo-structure.md)

---

## ۵. جریان Request (چطور کار می‌کند؟)

```
HTTP Request (از web یا bot)
    ↓
NestJS Controller  ← validation با Zod (thin — فقط DTO check)
    ↓
Guards:
  1. AuthGuard     ← JWT verify
  2. ModuleGuard   ← tenant.enabledModules includes 'installments'?
  3. PermissionGuard ← RBAC check
  4. DataScopeInterceptor ← filter query by branch/own
    ↓
Use Case           ← business logic اصلی (packages/application/)
    ↓
Domain Entity      ← invariants + state transitions (packages/domain/)
    ↓
Repository         ← Prisma + tenant_id filter (packages/infrastructure/)
    ↓
Domain Event       ← Outbox → Worker → notifications
```

---

## ۶. قوانین مهم (حتماً بخوان)

### ۶.۱ چیزهایی که ممنوع است

```
❌  prisma.*.delete()  روی business entities — فقط soft delete
❌  float / number  برای پول — فقط  bigint ریال
❌  Logic مالی در Controller یا Bot handler
❌  Query بدون tenant_id  برای داده‌های tenant-scoped
❌  prisma db push  در staging/production
❌  console.log  در production code paths
```

### ۶.۲ چیزهایی که اجباری است

```
✅  هر endpoint:  @RequireAuth() + @RequirePermission() + @RequireModule()
✅  هر جدول business:  deletedAt, deletedById, version, metadata
✅  هر API list:  cursor pagination + filter + sort
✅  هر form:  loading state + error state + fa validation
✅  هر action حساس:  AuditLog entry
```

مرجع کامل: [`DEVELOPMENT_RULES.md`](./DEVELOPMENT_RULES.md) و [`EXCELLENCE-STANDARDS.md`](./EXCELLENCE-STANDARDS.md)

---

## ۷. اولین Task (Vertical Slice تمرینی)

برای درک کامل سیستم، این flow را از ابتدا تا انتها دنبال کن:

```
1. POST /v1/auth/otp/request   { phone: '09121234567', actor: 'staff' }
2. POST /v1/auth/otp/verify    { phone: '09121234567', code: '12345', actor: 'staff', intent: 'login', tenantSlug: 'demo' }
   # اگر همان phone در چند tenant Staff است → 409 NEED_TENANT_SLUG + لیست slugها (ADR-017)
3. GET  /v1/tenants/me         → اطلاعات tenant
4. GET  /v1/customers          → لیست مشتریان
5. POST /v1/sales              → ثبت فروش جدید
6. GET  /v1/reports/dashboard  → داشبورد
```

اعتبارنامه‌های demo seed:

| نقش | شماره | شعبه |
|-----|-------|------|
| owner | 09100000001 | شعبه اصلی |
| manager | 09100000002 | شعبه اصلی |
| cashier | 09100000003 | شعبه اصلی |

در محیط dev، OTP در log کنسول چاپ می‌شود (SMS mock).

---

## ۸. ابزارهای توسعه

### ۸.۱ Script‌های اصلی

```bash
pnpm dev            # همه سرویس‌ها با hot-reload
pnpm build          # build همه packages
pnpm test           # تمام unit + integration tests
pnpm test:e2e       # E2E tests (نیاز به DB)
pnpm lint           # ESLint روی همه packages
pnpm typecheck      # TypeScript strict check
pnpm db:migrate     # اعمال migration جدید
pnpm db:seed        # Seed پایگاه داده
pnpm db:reset       # Drop + migrate + seed (فقط local)
pnpm db:studio      # Prisma Studio GUI
```

### ۸.۲ Prisma Studio (GUI برای DB)

```bash
pnpm db:studio
# باز می‌شود روی http://localhost:5555
```

### ۸.۳ BullMQ Dashboard (صف‌های async)

```bash
docker-compose up -d bull-board
# باز می‌شود روی http://localhost:3003
```

### ۸.۶ HTTP Client (تست API)

فایل‌های `.http` در `apps/api/src/` برای VSCode REST Client extension موجود است.

---

## ۹. چرخه کار روزانه

```
1. git pull --rebase
2. pnpm install     (اگر package.json تغییر کرده)
3. pnpm db:migrate  (اگر migration جدید دارد)
4. pnpm dev
5. ... کدنویسی ...
6. pnpm lint && pnpm typecheck
7. pnpm test
8. git commit -m "type(scope): description"
```

---

## ۱۰. تست نوشتن

### Unit Test (domain rules)

```typescript
// packages/domain/installments/installment.entity.spec.ts
describe('Installment', () => {
  it('cannot transition from paid to any other status', () => {
    const inst = new Installment({ status: 'paid', ... });
    expect(() => inst.markAsOverdue()).toThrow('INVALID_STATUS_TRANSITION');
  });
});
```

### Integration Test (use case + DB)

```typescript
// packages/application/installments/create-sale.use-case.spec.ts
describe('CreateSale', () => {
  it('sum of installments equals total minus down payment', async () => {
    const result = await createSaleUseCase.execute({ totalAmountRial: 1_200_000n, downPaymentRial: 200_000n, installmentCount: 5, ... });
    const sum = result.installments.reduce((s, i) => s + i.amountRial, 0n);
    expect(sum).toBe(1_000_000n);
  });
});
```

مرجع کامل: [`docs/06-operations/testing-observability.md`](../06-operations/testing-observability.md)

---

## ۱۱. مشکلات رایج

| مشکل | راه‌حل |
|------|--------|
| `pnpm install` خطا | نسخه Node را بررسی کن: باید ۲۰+ LTS باشد |
| `Cannot connect to DB` | `docker-compose up -d postgres` را اجرا کن |
| OTP در محیط dev دریافت نمی‌شود | در log کنسول api جستجو کن: `OTP for ...` |
| `MODULE_NOT_ENABLED` | tenant در DB را بررسی کن — `enabledModules` باید شامل `installments` باشد |
| Migration خطا | `pnpm db:reset` فقط در local — داده‌ها پاک می‌شوند |
| TypeScript خطا import | مطمئن شو از `packages/contracts` import می‌کنی، نه مستقیم از package دیگر |

---

## ۱۲. مراجع

| موضوع | سند |
|-------|-----|
| معماری کلی | [`docs/02-architecture/overview.md`](../02-architecture/overview.md) |
| Entity model | [`docs/02-architecture/tenancy-and-entities.md`](../02-architecture/tenancy-and-entities.md) |
| RBAC | [`docs/02-architecture/rbac.md`](../02-architecture/rbac.md) |
| ماژول اقساط | [`docs/03-modules/installments/domain.md`](../03-modules/installments/domain.md) |
| Stack تکنولوژی | [`docs/04-technology/tech-stack.md`](../04-technology/tech-stack.md) |
| ساختار Monorepo | [`docs/04-technology/monorepo-structure.md`](../04-technology/monorepo-structure.md) |
| محیط‌ها و config | [`ENVIRONMENT-CONFIG.md`](./ENVIRONMENT-CONFIG.md) |
| قوانین توسعه | [`DEVELOPMENT_RULES.md`](./DEVELOPMENT_RULES.md) |
| استاندارد تعالی | [`EXCELLENCE-STANDARDS.md`](./EXCELLENCE-STANDARDS.md) |
| کدهای خطا | [`ERROR-CODES.md`](./ERROR-CODES.md) |
| واژه‌نامه | [`GLOSSARY.md`](./GLOSSARY.md) |

---

*نسخه 1.0 — 1405/04/08*
