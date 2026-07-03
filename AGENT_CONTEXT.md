# AGENT_CONTEXT — Hivork

> **هدف:** این فایل تنها مرجع معماری برای هر Agent جدید (Cursor یا هر AI دیگر) است.  
> **قانون نگهداری:** هر تغییر معماری، ADR، stack، یا قانون توسعه → این فایل باید به‌روز شود.  
> **نسخه:** 1.0 — 1405/04/12  
> **مکمل (نه جایگزین):** `AGENTS.md` · `docs/README.md` · `.cursor/rules/`

---

## فهرست

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Project Architecture](#project-architecture)
4. [Coding Standards](#coding-standards)
5. [Design Patterns](#design-patterns)
6. [Business Rules](#business-rules)
7. [Database Design](#database-design)
8. [API Standards](#api-standards)
9. [UI Standards](#ui-standards)
10. [Development Rules](#development-rules)
11. [Things Never To Do](#things-never-to-do)
12. [How To Continue Development](#how-to-continue-development)

---

# Project Overview

## هدف پروژه

**Hivork** یک پلتفرم SaaS ماژولار برای کسب‌وکارهای خرده‌فروشی در ایران است. فروشندگان می‌توانند فروش قسطی ثبت کنند، اقساط را پیگیری کنند، پرداخت‌ها را تأیید کنند، و مشتریان از طریق ربات/PWA یادآور دریافت کنند.

**چشم‌انداز ۱۰ ساله:** پلتفرم ماژولار با ماژول‌های بعدی (منوی دیجیتال، POS، CRM، Analytics) — نه یک اپ تک‌محصولی.

## حوزه فعالیت

| حوزه | توضیح |
|------|--------|
| **محصول اول** | مدیریت اقساط — ثبت فروش، اقساط، پرداخت، یادآور، گزارش (ADR-001) |
| **مخاطب B2B** | فروشگاه‌های خرده‌فروشی — پنل وب فروشنده (Staff) |
| **مخاطب B2C** | مشتریان فروشگاه — پورتال/PWA/ربات تلگرام/بله |
| **Platform** | تیم Hivork — مدیریت tenant، plan، module entitlement |
| **بازار** | ایران — RTL، Jalali، OTP موبایل، ریال/تومان |

## معماری کلی

```
┌─────────────────────────────────────────────────────────────┐
│                    Modular Monolith (ADR-003)               │
│  apps: api · web · bot-gateway · scheduler                  │
│  packages: domain · application · infrastructure · contracts│
│  modules: core · installments (+ future modules)            │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
    PostgreSQL 16          Redis 7 + BullMQ     Arvan S3
```

**اصول ثابت:**

| اصل | معنی عملی |
|-----|-----------|
| **API-first** | Web، Bot، Scheduler همه از همان use case / contract استفاده می‌کنند |
| **Clean Architecture** | Domain pure — بدون NestJS/Prisma |
| **Multi-tenant** | `tenantId` روی همه queryهای tenant-scoped |
| **Event-driven داخلی** | Side effects → Domain Event → Outbox → Worker |
| **Channel-agnostic** | Controller/Bot/Page = thin client |
| **Enterprise-grade** | نه MVP — EXCELLENCE-STANDARDS اجباری |

**وضعیت پیاده‌سازی (خلاصه):**

| بخش | وضعیت |
|-----|--------|
| Foundation (Prisma, Auth OTP/JWT, Guards) | ✅ |
| Core (tenant, branch, staff, RBAC, settings) | ✅ در حال توسعه |
| Installments (sales, installments, payments) | ⏳ فاز فعال — operations + payments |
| Bot Gateway (Telegram/Bale) | ⏳ فاز ۲ |
| Scheduler / Reminders | ⏳ فاز ۲ |
| Customer PWA | ⏳ فاز ۳ |

---

# Technology Stack

## Frontend

| تکنولوژی | کاربرد |
|----------|--------|
| **Next.js 15** (App Router) | `apps/web` — seller panel، customer portal، marketing |
| **TypeScript strict** | همه فایل‌های frontend |
| **Tailwind CSS + shadcn/ui** | Design system — `packages/ui` |
| **TanStack Query** | Server state — ممنوع raw fetch در component |
| **React Hook Form + Zod** | Forms — schemas از `@hivork/contracts` |
| **dayjs + Jalali plugin** | تاریخ شمسی |
| **Vitest + Playwright** | Unit + E2E |
| **RTL-first** | `fa-IR` زبان اصلی |

## Backend

| تکنولوژی | کاربرد |
|----------|--------|
| **NestJS** | `apps/api`, `apps/bot-gateway`, `apps/scheduler` |
| **TypeScript strict** | همه لایه‌ها |
| **Zod** | Validation — shared با frontend در `packages/contracts` |
| **Pino** | Structured JSON logging |
| **Sentry** | Error tracking |
| **OpenAPI 3.1** | API documentation |
| **grammY** | Telegram bot |
| **Bale HTTP adapter** | ربات بله |

## Database

| تکنولوژی | کاربرد |
|----------|--------|
| **PostgreSQL 16+** | Primary datastore — shared DB + `tenant_id` |
| **Prisma** | ORM — schema as code، migrations |
| **BigInt** | تمام مبالغ مالی (`amount_rial`) — ADR-007 |
| **timestamptz** | UTC storage — business logic در `Asia/Tehran` |
| **JSONB** | `metadata` extensibility |

## Libraries (کلیدی)

| Package | مسیر | نقش |
|---------|------|-----|
| `@hivork/domain` | `packages/domain` | Entities، domain rules، events |
| `@hivork/application` | `packages/application` | Use cases |
| `@hivork/infrastructure` | `packages/infrastructure` | Prisma repos، Redis، SMS، S3 |
| `@hivork/contracts` | `packages/contracts` | Zod schemas + shared types |
| `@hivork/ui` | `packages/ui` | shadcn components |
| `@hivork/i18n` | `packages/i18n` | fa-IR strings، formatters |

## Infrastructure

| سرویس | کاربرد |
|-------|--------|
| **Redis 7** | Session، rate limit، OTP TTL، BullMQ queue |
| **BullMQ** | Background jobs — reminders، overdue، outbox |
| **Arvan S3** | فایل‌ها — رسید، export، attachments |
| **SMS providers** | کاوه‌نگار / قاصدک / ملی‌پیامک |
| **Docker Compose** | Dev: postgres، redis، services |
| **GitHub Actions** | CI/CD |
| **Arvan Cloud** | Hosting ایران |

## Dev Tools

| ابزار | نسخه | کاربرد |
|-------|------|--------|
| **pnpm** | 9+ | Package manager — monorepo |
| **Turborepo** | 2.x | Build orchestration |
| **Node.js** | 20+ LTS | Runtime |
| **ESLint + Prettier** | 9.x | Lint + format |
| **Vitest** | — | Unit + integration tests |
| **Testcontainers** | — | Integration tests با PG واقعی |
| **Playwright** | — | E2E web |
| **Prisma CLI** | 6.x | migrate، generate، seed |

**Scripts ریشه:**

```bash
pnpm dev              # همه apps
pnpm build            # build همه packages
pnpm test             # تست‌ها
pnpm lint             # lint
pnpm typecheck        # type check
pnpm db:migrate       # prisma migrate dev
pnpm db:seed          # seed داده اولیه
pnpm docker:up        # postgres + redis
```

---

# Project Architecture

## معماری پوشه‌ها

```
hivork/
├── apps/
│   ├── api/                 # NestJS REST API (:3001)
│   ├── web/                 # Next.js (:3000)
│   ├── bot-gateway/         # Telegram/Bale webhooks (:3002)
│   └── scheduler/           # BullMQ workers + cron
├── packages/
│   ├── domain/              # Pure TS — entities, VOs, events
│   ├── application/         # Use cases + ports
│   ├── infrastructure/      # Prisma, Redis, adapters
│   ├── contracts/           # Zod DTOs — shared FE/BE
│   ├── ui/                  # Design system
│   ├── config/              # ESLint, TSConfig shared
│   └── i18n/                # Localization
├── modules/
│   ├── core/                # Platform module — always on
│   └── installments/        # Module 1 — permissions, settings schema
├── prisma/
│   ├── schema.prisma        # Single source of truth
│   └── migrations/
├── docs/                    # Architecture + domain docs
├── .cursor/rules/           # Cursor auto-apply rules
├── docker/
├── AGENTS.md                # Agent entry point (short)
└── AGENT_CONTEXT.md         # این فایل
```

### apps/api

```
apps/api/src/
├── main.ts
├── app.module.ts
├── config/                  # env schema (Zod)
├── common/
│   ├── guards/              # Auth, Permission, Module, DataScope, Branch
│   ├── decorators/
│   ├── filters/             # DomainError → HTTP
│   └── interceptors/        # Audit, TenantContext
├── core/                    # tenant, branch, staff, rbac, settings, auth
├── installments/            # sales, installments, payments controllers
├── settings/
└── webhooks/
```

### apps/web

```
apps/web/
├── app/
│   ├── (marketing)/         # landing, pricing
│   ├── (auth)/              # OTP login, register
│   ├── (seller)/admin/      # پنل فروشنده
│   └── (customer)/my/       # پورتال مشتری
├── components/              # Feature components
├── hooks/                   # TanStack Query hooks
├── lib/
│   ├── api/                 # Typed API clients
│   ├── i18n/
│   ├── navigation/
│   └── roles/
└── middleware.ts            # Auth routing
```

## ساختار ماژول‌ها

هر ماژول Hivork شامل:

```
Module
├── permissions[]           # ثبت در registry
├── settings.schema[]       # تنظیمات tenant (typed)
├── domain/                 # entities (در packages/domain)
├── application/            # use cases (در packages/application)
├── api/                    # controllers (در apps/api)
├── events/                 # domain events + handlers
├── jobs/                   # scheduler jobs
└── web-routes/             # menu entries
```

### Core Module (همیشه فعال)

`tenant` · `branch` · `staff/auth` · `rbac` · `settings` · `audit` · `notification` · `module-registry` · `subscription/plan`

### Installments Module (ماژول ۱)

Aggregates: `Sale` · `Installment` · `PaymentAttempt` · `Check` · `PersonalInstallment`  
Use cases: `CreateSale` · `ConfirmPayment` · `WaiveInstallment` · `MarkOverdue` · ...

### Module Entitlement

```
Request → Tenant.hasModule('installments')?
  NO  → 403 MODULE_NOT_ENABLED
  YES → permission check
```

## ارتباط ماژول‌ها

| مجاز | غیرمجاز |
|------|---------|
| Domain Events (async via Outbox) | import مستقیم entity ماژول A در ماژول B |
| Core services (audit, notification) | circular dependency |
| `packages/contracts` shared types | shared mutable state بین ماژول‌ها |

```
Installments --[SaleCreated event]--> Notification Worker
Installments --[uses]--> core.audit
Installments --[uses]--> core.settings
```

## Dependencyها (Clean Architecture)

```
Presentation (apps/*)
        ↓
Application (packages/application)
        ↓
Domain (packages/domain)  ←  Infrastructure (packages/infrastructure)
```

| لایه | وابستگی مجاز | ممنوع |
|------|-------------|-------|
| **Domain** | Pure TS فقط | NestJS، Prisma، HTTP، Redis |
| **Application** | Domain + Ports (interfaces) | Prisma مستقیم |
| **Infrastructure** | Domain + Application ports | Business logic |
| **Presentation** | Application use cases + Contracts | Domain logic، Prisma |

**قرارگیری فایل جدید:**

| چه می‌سازم | کجا |
|------------|-----|
| Entity / Domain Rule | `packages/domain/{module}/` |
| Use Case | `packages/application/{module}/` |
| Repository Port | `packages/application/src/ports/` |
| Prisma Repository | `packages/infrastructure/persistence/` |
| Zod DTO | `packages/contracts/{module}/` |
| REST Controller | `apps/api/src/{module}/` |
| Bot handler | `apps/bot-gateway/` → use case |
| Scheduled job | `apps/scheduler/` → use case |
| Seller page | `apps/web/app/(seller)/admin/` |
| Customer page | `apps/web/app/(customer)/my/` |
| Shared UI | `packages/ui/` |

---

# Coding Standards

## Naming Convention

| Item | Convention | مثال |
|------|------------|------|
| Files | `kebab-case.ts` | `create-sale.use-case.ts` |
| Classes | `PascalCase` | `CreateSaleUseCase` |
| Functions/vars | `camelCase` | `totalAmountRial` |
| DB tables | `snake_case` plural | `payment_attempts` |
| DB columns | `snake_case` | `tenant_id`, `amount_rial` |
| API routes | kebab-case | `/api/v1/payment-attempts` |
| Permissions | dot notation | `installments.payment.confirm` |
| Domain events | PascalCase past tense | `PaymentConfirmed` |
| Error codes | `DOMAIN_RESOURCE_ISSUE` | `INSTALLMENT_ALREADY_PAID` |
| Env vars | `SCREAMING_SNAKE` | `DATABASE_URL` |
| Git branches | `{type}/{scope}-{desc}` | `feature/installments-waive-api` |
| Commits | Conventional Commits | `feat(installments): add waive use case` |

## Folder Structure

- Feature-based در `apps/web/components/{feature}/`
- Use case یک فایل per action: `{action}.use-case.ts`
- Integration test: `{action}.use-case.integration.spec.ts`
- Unit test domain: `{entity}.entity.spec.ts`
- Contracts: `{resource}-{action}.schema.ts`

## Code Style

- **TypeScript `strict: true`** — بدون `any` (از `unknown` + narrow استفاده کن)
- Shared types فقط در `packages/contracts`
- Comments فقط برای business logic غیر obvious
- یک concern per PR — بدون drive-by refactor
- PR size limits: Feature ≤500 lines، Bug fix ≤200 lines

## Error Handling

```typescript
// Domain layer
throw new DomainError('INSTALLMENT_ALREADY_PAID');

// Application — map via packages/application/src/errors/map-domain-error.ts
// Presentation — NestJS filter → HTTP status + { code, message, details? }

// ❌ NEVER: empty catch
// ❌ NEVER: stack trace به client
```

**Error code format:** `{DOMAIN}_{RESOURCE}_{ISSUE}` — مرجع: `docs/09-development/ERROR-CODES.md`

## Logging

```typescript
// ✅ Structured — no PII in message string
logger.info({ tenantId, entityId, event: 'payment.confirmed' }, 'Payment confirmed');

// ❌ NEVER
logger.info('payment confirmed for ' + customerName);
console.log(...)  // در production paths
```

## Validation

- **API input:** Zod schemas در `packages/contracts` — parse در controller
- **Domain rules:** در entity methods — نه فقط Zod
- **Settings:** فقط keys از `settings.schema.ts` — نه free-form
- **Phone:** normalize به `09xxxxxxxxx`
- **Money:** `bigint` — validate > 0 where required

## Security Rules

هر endpoint Staff:

```typescript
@RequireAuth()
@RequireModule('installments')      // if module-scoped
@RequirePermission('installments.sale.create')
@ApplyDataScope()                   // all | branch | own
```

- `tenantId` **فقط از JWT** — هرگز از request body
- Actors جدا: Staff (`hivork_staff`) · Customer (`hivork_customer`) · Platform
- Active branch: `X-Branch-Id` header یا Redis session — JWT فقط `tenantId` (ADR-015)
- RBAC precedence: `DENY (user) > GRANT (user) > Role > default DENY`
- Audit اجباری برای actions حساس (sale.create، payment.confirm، ...)
- Rate limit OTP: 3/min per phone
- Refresh token rotation + blacklist در Redis

---

# Design Patterns

## 1. Clean Architecture / Layered Architecture

جداسازی Presentation → Application → Domain ← Infrastructure. Domain هیچ وابستگی framework ندارد.

## 2. Modular Monolith

یک codebase با مرزهای ماژولار واضح. Module Registry برای permissions، settings، menu. Extract به microservice فقط در صورت نیاز scale.

## 3. Use Case Pattern (Application Services)

هر action = یک use case class با `execute(command, ctx)`:

```typescript
class ConfirmPaymentUseCase {
  constructor(private readonly paymentRepo: PaymentRepositoryPort) {}
  async execute(cmd: ConfirmPaymentCommand, ctx: StaffContext): Promise<PaymentResult> {
    // orchestration — domain logic در entity
  }
}
```

## 4. Repository Pattern + Ports & Adapters

- **Port:** interface در `packages/application/src/ports/`
- **Adapter:** Prisma implementation در `packages/infrastructure/persistence/`
- Use case فقط port را می‌شناسد — نه Prisma

## 5. Domain Entity + Rich Domain Model

State transitions و invariants در entity methods:

```typescript
installment.markAsPaid(confirmedBy, at);  // نه if/else در controller
```

## 6. Domain Events + Transactional Outbox

```
Use Case → save entity + INSERT OutboxEvent (same transaction)
Worker → poll OutboxEvent → dispatch handlers → mark processed
```

Handlers **idempotent** — مثلاً reminder key = `(installmentId, type, channel)`.

## 7. CQRS (سبک)

Commands (use cases mutating) جدا از Queries (list/get). List APIs: cursor pagination، filter، sort.

## 8. State Machine Pattern

`Installment`, `PaymentAttempt`, `Sale`, `Check` — transitions فقط در domain entity.  
مرجع: `docs/03-modules/installments/state-machines.md`

## 9. Guard Pipeline (NestJS)

```
Request → AuthGuard → TenantContext → ModuleGuard → BranchGuard → PermissionGuard → DataScopeInterceptor → Controller
```

## 10. Schema-Based Settings (ADR-005)

تنظیمات tenant = typed schema با defaults. Invariant rules در domain code — نه per-tenant arbitrary rules.

## 11. Soft Delete Pattern (ADR-013)

`deletedAt` + `deletedById` — Prisma extension injects `deletedAt: null`. Restore API برای admin/owner.

## 12. Optimistic Locking

`version` field روی entities مالی — concurrent update → `409 VERSION_CONFLICT`.

## 13. Idempotency Pattern

`Idempotency-Key` header برای POSTهای مالی. `IdempotencyRecord` table.

## 14. Data Scope Pattern (ADR-004, ADR-015)

| Scope | Filter |
|-------|--------|
| `all` | `tenantId` only |
| `branch` | `tenantId` + `branchId IN assignedBranchIds` |
| `own` | `tenantId` + `createdById = staffId` |

## 15. Actor Context Pattern

```typescript
interface StaffContext {
  actorId: string;
  tenantId: string;
  activeBranchId?: string;
  permissions: string[];
  dataScope: 'all' | 'branch' | 'own';
}
```

## 16. DTO / Contract Sharing (Zod)

`packages/contracts` — single source for API shapes. Frontend + Backend import همان schema.

## 17. Thin Controller / Thin Client

Controller: validate DTO → call use case → map response.  
React component: fetch via hook → render — بدون business logic.

## 18. Factory / Mapper Pattern

Prisma row → domain entity via mappers در `packages/infrastructure/persistence/mappers/`.

## 19. Strategy Pattern (Adapters)

SMS provider، payment gateway، notification channel — interchangeable adapters.

## 20. Testcontainers Integration Testing

Use cases تست با PostgreSQL واقعی — cross-tenant tests اجباری.

---

# Business Rules

> مرجع کامل: `docs/03-modules/installments/BUSINESS-RULES.md` (BR-001 تا BR-049)

## اصول پایه (غیرقابل نقض)

1. **هیچ داده مالی hard delete نمی‌شود** — فقط soft delete (ADR-013)
2. **قسط `paid` یا `waived` terminal است** — برگشت‌ناپذیر
3. **گزارش پرداخت ≠ پرداخت واقعی** — تأیید فروشنده الزامی (پیش‌فرض) (ADR-008)
4. **تمام پول `BigInt` ریال** — هرگز float (ADR-007)
5. **هر فروش/تراکنش به یک شعبه تعلق دارد** (ADR-015)

## قوانین به تفکیک حوزه

### Sale Creation (BR-001 — BR-010)

- `totalAmountRial > 0` (BigInt)
- `downPaymentRial ≤ totalAmountRial`
- `installmentCount`: 1–120
- توزیع مبلغ: integer division + remainder به قسط‌های اول (BR-005)
- `sum(installments) + downPayment === totalAmount` — invariant همیشه
- first due date در آینده
- interval: 1–365 روز
- `branchId` معتبر + staff دسترسی دارد
- `tenantCustomerId` در همان tenant و not deleted
- وضعیت اولیه: `active`

### Sale Cancellation (BR-011 — BR-014)

- فقط `active` قابل لغو
- اگر هر قسط `paid` → لغو ممنوع
- `overdue`/`waived` مانع لغو نیست
- audit اجباری

### Installment Status (BR-015 — BR-018)

- `pending` → `overdue`: daily job بر اساس تاریخ **تهران**
- `pending`/`overdue` → `paid`: payment confirmed
- `pending`/`overdue` → `waived`: staff + permission
- `paid`/`waived` → **هیچ transition** — terminal
- آخرین قسط paid → sale `completed` (BR-018)

### Payment Reporting (BR-019 — BR-023)

- گزارش → `PaymentAttempt.status = pending`
- فقط یک pending per installment در زمان
- `paid`/`waived` installment → گزارش ممنوع
- `amountRial > 0`

### Payment Confirmation (BR-024 — BR-028)

- staff confirm → `PaymentAttempt.confirmed` + `Installment.paid` (atomic transaction)
- reject → installment به وضعیت قبلی
- Auto-confirm: فقط اگر setting `require_seller_payment_confirmation = false` **و** reporter = staff
- Customer report: **همیشه** pending تا confirm (default)

### Reminders (BR-029 — BR-031)

- Idempotent: `(installmentId, reminderType, channel)`
- فقط مشتریان linked (BotIdentity)
- ارسال در ساعت تنظیم‌شده تهران

### Customer (BR-032 — BR-035)

- Phone normalize `09xxxxxxxxx`
- `User.phone` unique platform-wide (ADR-017)
- `GlobalCustomer` 1:1 با `User`
- Staff و Customer می‌توانند same phone/User (ADR-011)
- Import: duplicate در فایل = skip

### Bot Link (BR-036 — BR-038)

- Token یک‌بار مصرف، 24h expire
- چند `BotIdentity` per customer مجاز

### Personal Installments (BR-039 — BR-041)

- متعلق به `GlobalCustomer` — CRUD توسط مشتری
- Status: `pending`/`paid` فقط

### Security & Access (BR-042 — BR-045)

- `tenantId` از JWT — cross-tenant = 404 (نه 403 leak)
- Branch data scope enforced
- Customer actor ≠ staff actor endpoints

### Audit (BR-046 — BR-047)

- Actions حساس → `AuditLog` append-only
- `AuditLog`/`OutboxEvent` هرگز delete

### Contract Financials (BR-048 — BR-049)

- Tax aggregation header + line items
- Insurance add-on در total (setting-based)

## State Machines (خلاصه)

**Installment:** `pending` → `overdue` | `paid` | `waived` — terminal: `paid`, `waived`

**PaymentAttempt:** `pending` → `confirmed` | `rejected` — confirmed triggers installment paid

**Sale:** `active` → `completed` | `cancelled`

**Check:** `registered` → `due` → `collected` | `returned` | `bounced` (see state-machines.md)

---

# Database Design

## نحوه طراحی Entityها

### فیلدهای پایه — هر جدول business

| فیلد | نوع | الزام |
|------|-----|--------|
| `id` | UUID | ✅ |
| `createdAt` / `updatedAt` | timestamptz | ✅ |
| `createdById` / `updatedById` | UUID? FK | ✅ |
| `deletedAt` / `deletedById` | timestamptz? / UUID? | ✅ soft delete |
| `deleteReason` | String? | اختیاری |
| `version` | Int @default(1) | ✅ entities مالی/حساس |
| `metadata` | Json? | ✅ extensibility |

### فیلدهای tenant-scoped

| فیلد | الزام |
|------|--------|
| `tenantId` | NOT NULL + index |
| `branchId` | اگر داده branch-specific (مثلاً Sale) |

### موجودیت‌های کلیدی (Platform Model — ADR-017)

```
Platform
├── User (phone unique) — platform identity
│   ├── Staff[] (per tenant)
│   └── GlobalCustomer? (1:1)
├── Tenant
│   ├── Branch[]
│   ├── Staff[]
│   └── TenantCustomer[] → GlobalCustomer
└── Plan / ModuleRegistry
```

**قوانین:**
- Customer **زیر Branch نیست** — `TenantCustomer` junction
- `TenantCustomer` به `GlobalCustomer` وصل — **نه** مستقیم به `User`
- Staff: `assignedBranchIds[]` + `primaryBranchId` — نه single `branchId` FK (ADR-015)

### Prisma Models (فعلی — خلاصه)

`PlatformUser` · `User` · `UserCredential` · `Tenant` · `Branch` · `Staff` · `Role` · `Permission` · `GlobalCustomer` · `TenantCustomer` · `Sale` · `Installment` · `PaymentAttempt` · `PaymentReceipt` · `Check` · `AuditLog` · `OutboxEvent` · `TenantSetting` · ...

مرجع: `prisma/schema.prisma`

## Relationها

- `onDelete: Restrict` یا `SetNull` — **هرگز Cascade hard delete**
- Soft delete parent → children financial records **باقی می‌مانند**
- `Installment` paid/waived: حتی soft delete توصیه نمی‌شود — status terminal
- Append-only: `AuditLog`, `OutboxEvent`, `ContractVersion`

### Indexing (اجباری)

- همه FK columns
- `(tenantId, status)` composite
- `(tenantId, createdAt DESC)` for lists
- `(tenantId, branchId)` for branch-scoped data

## Migration Strategy

```
✅ prisma migrate dev (local)
✅ prisma migrate deploy (staging/production)
❌ prisma db push (staging/production)
❌ DROP/TRUNCATE/DELETE در migration scripts
❌ تغییر نوع ستون مالی بدون ADR
```

**فرآیند:**
1. Edit `prisma/schema.prisma`
2. `pnpm db:migrate` (creates migration SQL)
3. Review SQL — no forbidden operations
4. Test: `prisma migrate reset` + `pnpm db:seed`
5. PR includes migration file

مرجع: `docs/06-operations/data-migration.md`

---

# API Standards

## Response Structure

### Success (single resource)

```json
{
  "data": { ... },
  "meta": { "requestId": "uuid" }
}
```

### Success (paginated list)

```json
{
  "data": [ ... ],
  "meta": {
    "hasNext": true,
    "nextCursor": "eyJpZCI6InV1aWQifQ==",
    "total": 150
  }
}
```

### Query parameters (lists)

| Param | Default | Max |
|-------|---------|-----|
| `cursor` | — | from previous response |
| `limit` | 20 | 100 |
| `sort` | `createdAt:desc` | whitelist fields |
| `search` | — | text search |
| `status` | — | filter |

## Error Structure

```json
{
  "code": "INSTALLMENT_ALREADY_PAID",
  "message": "این قسط قبلاً پرداخت شده است.",
  "details": { "installmentId": "uuid", "status": "paid" }
}
```

| HTTP | کاربرد |
|------|--------|
| 400 | Validation / domain rule violation |
| 401 | Auth missing/invalid |
| 403 | Permission denied / module disabled |
| 404 | Not found (including soft-deleted — no leak) |
| 409 | Conflict (duplicate, version, state) |
| 423 | Account locked |
| 429 | Rate limited |

مرجع کامل: `docs/09-development/ERROR-CODES.md`

## Authentication

| Actor | Method | Cookie |
|-------|--------|--------|
| Staff | Phone OTP (+ optional password/MFA) | `hivork_staff` |
| Customer | Phone OTP | `hivork_customer` |
| Platform | Phone OTP | separate |

**Flow:**
1. `POST /api/v1/auth/otp/request` — `{ phone, actor }`
2. `POST /api/v1/auth/otp/verify` — `{ phone, code, actor, tenantSlug? }`
3. Response: `accessToken` (15min) + refresh (httpOnly, 30d remember / 24h session)
4. `POST /api/v1/auth/refresh` — token rotation

**JWT claims (Staff):** `actor: staff`, `tenantId`, `staffId` — **نه** `branchId`

## Authorization

Pipeline (همه باید pass شوند):

```
1. Authenticated?
2. Actor type correct?
3. Tenant context valid?
4. Active branch allowed? (staff)
5. Module enabled?
6. Permission granted?
7. Data scope applied?
```

**Deny by default.**

Permission format: `{module}.{resource}.{action}` — e.g. `installments.payment.confirm`

## API Versioning (ADR-016)

- Base: `/api/v1/`
- Breaking change → `/api/v2/` با ۶ ماه parallel support
- Money در JSON: `string` (bigint safe)
- Dates: ISO 8601 UTC
- Idempotency: `Idempotency-Key` header برای POST مالی

مرجع کامل: `docs/02-architecture/api-contracts.md`

---

# UI Standards

## قوانین طراحی رابط کاربری

- **RTL-first** — `fa-IR` زبان اصلی
- **Enterprise-grade** — نه happy-path-only
- هر صفحه: breadcrumb، title، actions، filters، skeleton/empty/error states
- Permission denied state — explain + contact owner
- Mobile-friendly inputs (`type="tel"`, numeric keyboards)

## Component Structure

```
apps/web/components/{feature}/
├── {feature}-data-table.tsx      # List view
├── {feature}-filters.tsx         # Filter bar
├── {feature}-detail-header.tsx   # Detail page header
├── operation-modals/             # Action dialogs
└── *.spec.tsx                    # Component tests
```

**Hooks pattern:**

```
apps/web/hooks/use-{feature}-list.ts
apps/web/hooks/use-{feature}-detail.ts
apps/web/hooks/use-{feature}-mutations.ts
```

**API clients:**

```
apps/web/lib/api/{feature}.ts  → calls backend using contracts types
```

## Theme Rules

- **Tailwind CSS** + **shadcn/ui** components از `packages/ui`
- Design tokens via Tailwind config — consistent spacing، colors
- Money display: تومان (divide `amountRial / 10n`) — based on tenant setting
- Dates: Jalali display — `dayjs` + jalali plugin
- Icons: lucide-react (shadcn default)
- Toast notifications for success/error feedback
- Confirm dialogs قبل از actions مالی/destructive

## Form Standards (هر فیلد)

| Element | الزام |
|---------|--------|
| Label (fa) | ✅ |
| Placeholder | ✅ |
| Help text | ✅ for non-obvious fields |
| Validation message (fa) | ✅ client + server sync |
| Required indicator | ✅ |
| Loading/disabled on submit | ✅ |
| `aria-invalid`, `aria-describedby` | ✅ |

Forms: React Hook Form + Zod از `@hivork/contracts`

## Page Anatomy (admin)

```
┌─────────────────────────────────────┐
│ Breadcrumb                          │
│ Page title + primary action(s)      │
├─────────────────────────────────────┤
│ Filters / tabs                      │
├─────────────────────────────────────┤
│ Main content (table/form/dashboard) │
└─────────────────────────────────────┘
```

## Mandatory Page States

| State | Required |
|-------|----------|
| Loading | Skeleton |
| Empty | Illustration + CTA |
| Error | Retry button + message |
| No permission | Explanation |
| Success | Toast + next action |

مرجع: `docs/09-development/EXCELLENCE-STANDARDS.md` §5–7

---

# Development Rules

## پروتکل قبل از هر تغییر کد

```
1. AGENT_CONTEXT.md (این فایل) + AGENTS.md
2. docs/README.md → سند مرتبط با task
3. docs/08-decisions/adr-log.md — تأیید عدم نقض ADR
4. .cursor/rules/ — همه alwaysApply rules
5. docs/09-development/DEVELOPMENT_RULES.md
6. docs/09-development/EXCELLENCE-STANDARDS.md
7. docs/09-development/SOFT-DELETE-POLICY.md
8. تأیید scope task
9. شروع کدنویسی
```

## Definition of Done

| Change | Required |
|--------|----------|
| Domain rule | Unit test (Vitest) |
| Use case | Integration test (Testcontainers PG) |
| New permission endpoint | RBAC test (allow + deny + cross-tenant fail) |
| Payment flow | API integration/E2E test |
| Financial bug fix | Regression test **before** fix |
| API change | Update `packages/contracts` Zod |
| New env var | Update `.env.example` |
| Architecture change | New ADR in `docs/08-decisions/` |
| Behavior change | Update relevant `docs/` |

## Checklist بعد از task

- [ ] `EXCELLENCE-STANDARDS.md` §9 checklist
- [ ] `pnpm lint` + `pnpm typecheck` pass
- [ ] Relevant tests pass
- [ ] No `tenantId` query without filter
- [ ] Permission guard + audit if sensitive endpoint
- [ ] No `prisma.*.delete()` on business models
- [ ] No `number`/`float` for money

## Git / PR

- Branch: `{type}/{scope}-{description}`
- Commit: `type(scope): description`
- One concern per PR
- Squash and merge on `main`
- Hotfix: regression test first → fix → expedited PR

## Testing Commands

```bash
pnpm test                                    # all
pnpm --filter @hivork/api test:integration   # API integration
pnpm --filter @hivork/web exec vitest run    # web unit
pnpm test:integration:phase05                # vertical slice example
```

## Environment Setup

```bash
pnpm install
cp .env.example .env
pnpm docker:up          # postgres + redis
pnpm db:migrate
pnpm db:seed
pnpm dev                # api :3001 + web :3000
```

مرجع: `docs/09-development/ONBOARDING.md` · `docs/09-development/ENVIRONMENT-CONFIG.md`

## Cursor Rules (auto-apply)

| Rule | موضوع |
|------|--------|
| `00-master-protocol.mdc` | پروتکل کلی |
| `01-architecture-tenancy.mdc` | Multi-tenant |
| `02-security-rbac-audit.mdc` | RBAC + audit |
| `03-backend-nestjs.mdc` | NestJS patterns |
| `04-domain-data.mdc` | Domain + Prisma |
| `05-frontend-nextjs.mdc` | Next.js patterns |
| `06-testing-quality.mdc` | Testing DoD |
| `07-contracts-zod.mdc` | Contracts |
| `08-excellence-completeness.mdc` | Enterprise UI/DB |
| `09-soft-delete-mandatory.mdc` | Soft delete |
| `10-documentation-authoring.mdc` | Docs rules |
| `11-phase-epic-task-authoring.mdc` | Task authoring |
| `12-code-review-branching.mdc` | PR + git |

---

# Things Never To Do

## معماری و کد

| ❌ ممنوع | ✅ جایگزین |
|----------|-----------|
| Business logic در Controller / Bot handler / React component | Use case + domain entity |
| `prisma.*.delete()` روی business data | `softDelete()` با `deletedAt` |
| Hard delete هر business entity | Soft delete + audit (ADR-013) |
| `number` / `float` برای پول | `bigint` ریال (ADR-007) |
| Query بدون `tenantId` filter | همیشه tenant-scoped |
| `tenantId` از request body | فقط از JWT |
| Import مستقیم domain entity ماژول A در ماژول B | Domain events |
| State transition در controller/use case scattered if/else | Entity method |
| `prisma db push` در staging/production | `prisma migrate deploy` |
| Microservice / GraphQL / MongoDB | Modular monolith + PostgreSQL (مگر ADR جدید) |
| Free-form tenant business rules | Settings schema only (ADR-005) |
| Permission check فقط در UI | Backend guard همیشه |
| Staff token روی customer endpoints | Actor separation |
| `console.log` در production paths | Pino structured logging |
| PII در log messages | Structured fields بدون نام/تلفن |
| `any` type | `unknown` + narrow |
| Secrets در git | Env vars |
| Happy-path-only UI | loading/empty/error/permission states |
| Bare-minimum schema/form | EXCELLENCE-STANDARDS fields |
| `onDelete: Cascade` hard delete | Restrict / SetNull |
| Offset pagination | Cursor pagination |
| Auto-confirm customer payment reports | Staff confirm (unless explicit setting) |
| Delete `AuditLog` / `OutboxEvent` | Append-only forever |
| SQL DELETE برای customer privacy | Soft delete + pseudonymize |
| Installment paid/waived delete | Terminal status — record forever |
| Drive-by refactor در PR | One concern per PR |
| New dependency بدون justification | Use existing stack |
| Architecture decision بدون ADR | ADR قبل از implement |
| Breaking API بدون versioning plan | ADR-016 strategy |

## CI Blocks (خودکار)

- `prisma.*.delete(` در business code
- `number` برای financial amounts
- Missing permission guard on staff endpoints

---

# How To Continue Development

## اگر Agent جدید پروژه را باز کرد — این مسیر را دنبال کن

### گام ۱: درک context (۱۵ دقیقه)

1. **این فایل را کامل بخوان** (`AGENT_CONTEXT.md`)
2. `AGENTS.md` — پروتکل کوتاه
3. Task/user request را بخوان — scope را مشخص کن

### گام ۲: عمق‌بخشی بر اساس task (۱۰–۳۰ دقیقه)

| نوع task | اسناد ضروری |
|----------|-------------|
| هر task | `docs/09-development/DEVELOPMENT_RULES.md` |
| معماری/entity | `docs/02-architecture/overview.md` · `tenancy-and-entities.md` |
| اقساط/پرداخت | `docs/03-modules/installments/domain.md` · `state-machines.md` · `BUSINESS-RULES.md` |
| API جدید | `docs/02-architecture/api-contracts.md` · `ERROR-CODES.md` |
| RBAC | `docs/02-architecture/rbac.md` |
| UI/page/form | `docs/09-development/EXCELLENCE-STANDARDS.md` §5–7 |
| DB/migration | `docs/09-development/SOFT-DELETE-POLICY.md` · `prisma/schema.prisma` |
| تصمیم معماری | `docs/08-decisions/adr-log.md` |

### گام ۳: بررسی کد موجود

```bash
# ساختار مرتبط را پیدا کن
# مثال: use case جدید برای waive installment
ls packages/application/src/installments/installments/
ls apps/api/src/installments/
ls packages/contracts/src/installments/
```

**الگو را کپی کن** — use case موجود مشابه را template بگیر (مثلاً `apply-penalty.use-case.ts`).

### گام ۴: پیاده‌سازی (ترتیب پیشنهادی)

```
1. Domain rule / entity method (if needed)
2. Zod contract در packages/contracts
3. Use case در packages/application
4. Repository method در packages/infrastructure (if needed)
5. Controller در apps/api (thin)
6. Permission در modules/installments/permissions.ts
7. Frontend: hook + component + page (if UI task)
8. Tests: unit → integration → RBAC
```

### گام ۵: تأیید

```bash
pnpm typecheck
pnpm lint
pnpm test --filter <relevant-package>
```

### گام ۶: پس از اتمام

- اگر معماری عوض شد → ADR + به‌روزرسانی `AGENT_CONTEXT.md`
- اگر API عوض شد → `packages/contracts` + `docs/02-architecture/api-contracts.md`
- اگر business rule جدید → `docs/03-modules/installments/BUSINESS-RULES.md`

## نقشه ذهنی سریع — «کجا چی هست؟»

```
سوال: منطق کسب‌وکار کجاست؟     → packages/domain/
سوال: orchestration کجاست؟      → packages/application/
سوال: database access کجاست؟    → packages/infrastructure/persistence/
سوال: API shape کجاست؟          → packages/contracts/
سوال: HTTP endpoint کجاست؟      → apps/api/src/
سوال: UI کجاست؟                 → apps/web/app/ + components/
سوال: permission کجاست؟         → modules/{module}/permissions.ts
سوال: setting key کجاست؟        → modules/{module}/settings.schema.ts
سوال: DB schema کجاست؟          → prisma/schema.prisma
سوال: قانون کسب‌وکار کجاست؟     → docs/03-modules/installments/BUSINESS-RULES.md
سوال: state machine کجاست؟      → docs/03-modules/installments/state-machines.md
```

## ADRهای کلیدی (خلاصه تصمیم)

| ADR | تصمیم |
|-----|--------|
| ADR-001 | محصول اول = اقساط |
| ADR-002 | GlobalCustomer ≠ TenantCustomer |
| ADR-003 | Modular Monolith |
| ADR-004 | RBAC + user override + data scope |
| ADR-005 | Settings schema-based |
| ADR-007 | Money = BigInt Rial |
| ADR-008 | Payment report ≠ confirm |
| ADR-013 | Soft delete only |
| ADR-015 | Staff multi-branch + active branch session |
| ADR-016 | API `/api/v1/` versioning |
| ADR-017 | User = platform identity (phone unique) |

## فازبندی توسعه

- **Phases/** — operational phases (Phase 0 Foundation → ...)
- **InstallmentFeaturePhases/** — Enterprise feature tasks (IFP-TASK-001→199)
- قبل از شروع task → فایل TASK مربوطه را بخوان

---

## نگهداری این فایل

این سند **living document** است. هر Agent یا توسعه‌دهنده‌ای که موارد زیر را تغییر دهد، باید `AGENT_CONTEXT.md` را به‌روز کند:

- ADR جدید یا تغییر ADR
- اضافه/حذف app، package، module
- تغییر stack تکنولوژی
- business rule جدید (BR-xxx)
- تغییر API contract global
- تغییر entity model/platform identity
- قانون توسعه جدید

**Header version** را در بالای فایل increment کن.

---

*آخرین به‌روزرسانی: 1405/04/12 — نسخه 1.0*  
*منابع: `docs/README.md` · `AGENTS.md` · `.cursor/rules/` · `prisma/schema.prisma`*
