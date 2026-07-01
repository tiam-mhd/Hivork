# قوانین توسعه Hivork — مرجع کامل

> **وضعیت:** اجباری برای تمام توسعه‌دهندگان و AI agents  
> **دید:** ۱۰ ساله — هر خط کد باید فردا، سال بعد، و سال پنجم قابل نگه‌داری باشد  
> **نسخه:** 1.0 — 1405/04/08

---

## ۰. پروتکل قبل از هر پیاده‌سازی

```
┌─────────────────────────────────────────┐
│ 1. docs/README.md + سند مرتبط با task  │
│ 2. docs/08-decisions/adr-log.md         │
│ 3. .cursor/rules/ (alwaysApply rules)   │
│ 4. این فایل (DEVELOPMENT_RULES.md)      │
│ 5. docs/09-development/EXCELLENCE-STANDARDS.md │
│ 6. docs/09-development/SOFT-DELETE-POLICY.md    │
│ 7. (نگارش doc) DOCUMENTATION_AUTHORING_RULES    │
│ 8. (نگارش task) PHASE_EPIC_TASK_AUTHORING_RULES │
│ 9. تأیید scope + عدم نقض ADR           │
│ 10. شروع کدنویسی                        │
└─────────────────────────────────────────┘
```

**بعد از اتمام task:**
- [ ] `EXCELLENCE-STANDARDS.md` §9 checklist
- [ ] تست مرتبط (حداقل unit برای domain rule)
- [ ] Audit log اگر action حساس
- [ ] Permission guard اگر endpoint جدید
- [ ] Zod contract در `packages/contracts`
- [ ] مستندات `docs/` اگر رفتار عمومی تغییر کرد
- [ ] ADR جدید اگر تصمیم معماری گرفته شد

---

## ۱. اصول معماری (غیرقابل مذاکره)

### ۱.۱ Modular Monolith

- یک codebase، مرزهای ماژولار واضح
- Apps: `api`, `web`, `bot-gateway`, `scheduler`
- Modules: `core`, `installments`, (آینده: ...)
- **ممنوع:** import مستقیم domain entity ماژول A در ماژول B — فقط events یا core services

### ۱.۲ Clean Architecture — جهت وابستگی

```
Presentation → Application → Domain ← Infrastructure
```

| لایه | مسیر | مجاز |
|------|------|------|
| **Domain** | `packages/domain/` | Pure TS — بدون NestJS، Prisma، HTTP |
| **Application** | `packages/application/` | Use cases — orchestration |
| **Infrastructure** | `packages/infrastructure/` | Prisma، Redis، SMS، Bot |
| **Presentation** | `apps/*` controllers, handlers, pages | نازک — فقط validation + call use case |

### ۱.۳ API-First

- هر UI (Web، Bot، Job) از **همان use case / API contract** استفاده کند
- Bot handler **هرگز** Prisma را مستقیم صدا نزند

### ۱.۴ Event-Driven داخلی

- Side effects (یادآور، notify، stats) → Domain Event → Outbox → Worker
- Event handlers **idempotent**

### ۱.۵ Multi-Tenant از روز ۱

- هر جدول tenant-scoped: `tenant_id` NOT NULL
- هر query: filter `tenant_id` — middleware + repository
- تست: cross-tenant access **باید fail**

---

## ۲. ساختار Monorepo

```
hivork/
├── apps/api|web|bot-gateway|scheduler/
├── modules/core|installments/
├── packages/domain|application|infrastructure|contracts|ui|config|i18n/
├── prisma/
├── docs/
└── .cursor/rules/
```

### قوانین قرارگیری فایل

| چی می‌سازم | کجا |
|------------|-----|
| Entity / Domain Rule | `packages/domain/{module}/` |
| Use Case | `packages/application/{module}/` |
| Prisma repository | `packages/infrastructure/persistence/` |
| Zod DTO | `packages/contracts/{module}/` |
| REST controller | `apps/api/src/` یا `modules/{x}/api/` |
| Bot command | `apps/bot-gateway/` → use case |
| Scheduled job | `apps/scheduler/` → use case |
| UI page (seller) | `apps/web/app/(seller)/admin/` |
| UI page (customer) | `apps/web/app/(customer)/my/` |
| Shared UI | `packages/ui/` |

### Naming

| Item | Convention |
|------|------------|
| Files | `kebab-case.ts` |
| Classes | `PascalCase` |
| DB tables | `snake_case` plural |
| API routes | `/api/v1/kebab-resource` |
| Permissions | `{module}.{resource}.{action}` |
| Events | `PascalCase` past tense (`PaymentConfirmed`) |

---

## ۳. Domain & Data Rules

### ۳.۱ پول

```typescript
// ✅ ALWAYS
amountRial: bigint  // DB + domain + API internal

// ❌ NEVER
amount: number  // float precision loss
```

- UI: تومان = `amountRial / 10n` (با setting `display_currency`)
- JSON API: string برای bigint (`"1500000"`) یا custom serializer — document in contracts

### ۳.۲ تاریخ

- DB: `timestamptz` UTC
- Business logic timezone: `Asia/Tehran`
- UI: Jalali — `dayjs` + jalali plugin
- Overdue job: بر اساس **تاریخ تهران**، نه UTC naive

### ۳.۳ موجودیت‌های کلیدی (خلاصه)

- `User` — platform identity؛ phone unique (ADR-017)
- `GlobalCustomer` — B2C profile؛ FK `userId` (ADR-002, ADR-017)
- `TenantCustomer` — رابطه tenant ↔ customer (**نه** customer زیر branch؛ **نه** مستقیم User)
- `Staff` — B2B membership per tenant؛ FK `userId`؛ `assignedBranchIds` + `primaryBranchId` + active branch session (ADR-015)
- `Branch` — operational partition؛ `Sale.branchId` NOT NULL در ماژول اقساط
- `Installment` paid — **هرگز delete** (نه soft نه hard) — status terminal فقط
- **همه entityهای دیگر:** فقط soft delete — `SOFT-DELETE-POLICY.md`

### ۳.۴ Soft Delete (اجباری — ADR-013)

```
❌ prisma.*.delete() / SQL DELETE on business data
✅ deletedAt + deletedById + audit
✅ Queries default: deletedAt IS NULL (Prisma extension)
✅ Restore: admin/owner only — user never sees deleted rows
```

مرجع: **`docs/09-development/SOFT-DELETE-POLICY.md`**

### ۳.۵ State Machines

قبل از تغییر status هر entity → `docs/03-modules/installments/state-machines.md`  
Transition فقط در domain entity method — نه در controller.

### ۳.۶ Migrations

- فقط `prisma migrate dev` (local) / `prisma migrate deploy` (prod)
- **ممنوع:** `prisma db push` در staging/production
- تغییر type ستون مالی → ADR + migration plan

---

## ۴. RBAC & Security

### ۴.۱ Checklist هر Endpoint جدید

```
@RequireAuth()
@RequireModule('installments')      // if module-scoped
@RequirePermission('installments.sale.create')
@ApplyDataScope()                   // all | branch | own
```

Active branch: `X-Branch-Id` یا session Redis — ADR-015؛ JWT فقط `tenantId`.

### ۴.۲ Precedence

```
DENY (user) > GRANT (user) > Role permissions > default DENY
```

### ۴.۳ Actors جدا

| Actor | Token claim | Cookie namespace |
|-------|-------------|------------------|
| Staff | `actor: staff`, `tenant_id` | `hivork_staff` |
| Customer | `actor: customer` | `hivork_customer` |
| Platform | `actor: platform` | separate |

**ممنوع:** staff token به customer endpoints یا برعکس

### ۴.۴ Audit (اجباری برای)

`sale.create|cancel`, `installment.waive`, `payment.confirm|reject`, `staff.*`, `role.*`, `settings.change`, `customer.import`

### ۴.۵ Settings

- فقط keys تعریف‌شده در `settings.schema.ts`
- **ممنوع:** tenant arbitrary business rules
- Invariant rules → domain code

---

## ۵. Backend (NestJS)

### ۵.۱ Controller Pattern

```typescript
// ✅ GOOD — thin controller
@Post()
@RequirePermission('installments.sale.create')
async create(@Body() dto: CreateSaleDto, @CurrentStaff() staff: StaffContext) {
  return this.createSaleUseCase.execute({ ...dto, tenantId: staff.tenantId, createdBy: staff.id });
}

// ❌ BAD — logic in controller
@Post()
async create(@Body() dto) {
  const remaining = dto.total - dto.down;
  const installment = remaining / dto.count; // NO
}
```

### ۵.۲ Error Handling

```typescript
// Domain errors → HTTP mapping in filter
throw new DomainError('INSTALLMENT_ALREADY_PAID');

// ❌ NEVER empty catch
// ❌ NEVER expose stack trace to client
```

### ۵.۳ API Conventions

- Prefix: `/api/v1/`
- Pagination: cursor-based
- POST مالی: support `Idempotency-Key` header
- Response errors: `{ code, message, details? }`

### ۵.۴ Bot / Scheduler

- Webhook verification اجباری
- Same use case as REST — no duplicate logic
- Reminder: idempotency key `(installment_id, type, channel)`

---

## ۶. Frontend (Next.js)

### ۶.۱ Structure

- `(seller)/admin/*` — پنل فروشنده
- `(customer)/my/*` — پورتال مشتری
- `(marketing)/*` — landing

### ۶.۲ Rules

- Server state: **TanStack Query** — no raw fetch in components
- Forms: **React Hook Form + Zod** (schemas from `packages/contracts`)
- **ممنوع:** business logic in components (amount calc, permission logic)
- Permission UI hide ≠ security — backend always checks
- RTL-first — fa-IR primary

### ۶.۳ Data Fetching

```typescript
// ✅ typed client from contracts
const sales = useQuery({ queryKey: ['sales'], queryFn: () => api.sales.list() });
```

---

## ۷. Testing (Definition of Done)

| Change Type | Minimum Test |
|-------------|--------------|
| Domain rule | Unit test (Vitest) |
| Use case | Integration (Testcontainers PG) |
| RBAC | Test deny + allow + cross-tenant fail |
| Payment flow | E2E API test |
| UI critical path | Playwright (seller happy path) |

**Golden rule:** bug مالی → test قبل از fix

---

## ۸. Code Quality

### ۸.۱ TypeScript

- `"strict": true` — no `any` (except documented escape hatch)
- Prefer `unknown` over `any`
- Shared types in `packages/contracts` — no duplicate DTO definitions

### ۸.۲ Logging

```typescript
logger.info({ tenantId, entityId, event: 'payment.confirmed' }, 'Payment confirmed');
// ❌ logger.info('payment confirmed for ' + customerName)  // no PII in message
```

### ۸.۳ Comments

- فقط non-obvious business logic
- **ممنوع:** comment که code obsolete را توضیح دهد — code را fix کن

### ۸.۴ Dependencies

- New dependency → justify in PR / commit message
- Prefer existing stack — no new ORM, no new state library

---

## ۹. Git & PR Discipline

- یک concern per commit/PR
- Commit message (Conventional Commits): `type(scope): description` — e.g. `feat(installments): add create sale use case`
- **ممنوع:** unrelated refactor در همان PR
- Secrets در git — **هرگز**
- `.env.example` update اگر env var جدید
- Merge strategy: **Squash and merge** — یک commit تمیز روی `main`
- Hotfix: branch از `main` → regression test اول → fix → PR → merge

### Branch Naming

```
{type}/{scope}-{description}
feature/installments-waive-api
fix/rbac-deny-override
hotfix/payment-confirm-race
```

مرجع کامل: **`docs/09-development/BRANCHING-STRATEGY.md`**

### Code Review

- هر PR قبل از merge: **PR Author Checklist** از `CODE-REVIEW-GUIDE.md` §3
- Red flags (auto-block): `prisma.*.delete()`, `number` برای پول، `tenantId` از body
- Bug مالی: regression test **قبل از** fix

مرجع کامل: **`docs/09-development/CODE-REVIEW-GUIDE.md`**

---

## ۱۰. Module Development (ماژول جدید)

1. Register in Module Registry
2. Define permissions list → `rbac.md` update
3. Define settings schema
4. Domain entities + events
5. Use cases + tests
6. API routes + contracts
7. UI routes (if applicable)
8. Check `enabled_modules` guard

---

## ۱۱. چیزهایی که الان نمی‌سازیم

| Item | Until |
|------|-------|
| Microservices | ADR + proven scale pain |
| GraphQL | ADR |
| Native mobile app | Traction + ADR |
| Payment gateway | Phase 2 + legal review |
| Generic workflow engine | Never without ADR |
| Float money | Never |

---

## ۱۲. وقتی شک داری

1. `docs/08-decisions/adr-log.md`
2. `docs/02-architecture/overview.md`
3. `docs/09-development/EXCELLENCE-STANDARDS.md`
4. اگر تصمیم جدید → **ADR بنویس قبل از implement**
5. اگر docs و task conflict → **توقف — از human بپرس**

---

## ۱۳. استاندارد تعالی (Enterprise Completeness)

> **اجباری** — مکمل این سند، نه جایگزین.

Hivork محصول **حرفه‌ای** است. در هر پیاده‌سازی:

| لایه | الزام خلاصه |
|------|-------------|
| **Database** | فیلدهای audit، soft delete، version، metadata — index کامل |
| **Backend** | edge cases، pagination/filter/sort، audit، idempotency |
| **Forms** | label، help، validation fa، loading/error، a11y، RTL |
| **Pages** | skeleton، empty، error، filters، actions — بدون happy-path-only |
| **Flows** | entry/error/exit/recovery documented + implemented |

**قانون:** اگر فیلد یا UX path برای کاربر حرفه‌ای منطقی است → **اضافه کن** مگر ADR یا scope صریح منع کند.

مرجع کامل: **`docs/09-development/EXCELLENCE-STANDARDS.md`**

---

---

*نسخه 1.1 — 1405/04/08*  
*این سند با `.cursor/rules/` همگام است. تغییر در یکی → به‌روزرسانی دیگری.*  
*مراجع جدید: `BRANCHING-STRATEGY.md` · `CODE-REVIEW-GUIDE.md` — نسخه ۲.۰ docs*
