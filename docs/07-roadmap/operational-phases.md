# فازهای عملیاتی و تسک‌ها

> **ترتیب اجرا (به‌روز 1405/04/09):** به‌دلیل محدودیت/تحریم تلگرام، **فاز ۴ (بله + مارکتینگ) اکنون اجرا می‌شود** — جزئیات: [`Phases/Phase-4-Bale-Marketing/`](../Phases/Phase-4-Bale-Marketing/) (TASK-124 → TASK-174). **ربات تلگرام (فاز ۲ سند)** به بعد از PWA موکول شد.

```
اجرای فعلی:  فاز ۰ → فاز ۱ → فاز ۴ (بله) → فاز ۳ (PWA) → فاز ۲ (تلگرام — deferred)
```

---

## فاز ۰ — Foundation

### Infrastructure
- [ ] Monorepo scaffold (pnpm + Turborepo)
- [ ] Docker Compose (PostgreSQL 16, Redis 7)
- [ ] Shared config (ESLint, Prettier, TSConfig strict)
- [ ] GitHub Actions (lint, typecheck, test, **prisma validate**, **hard-delete grep**)
- [ ] `.env.example`

### Apps skeleton
- [ ] `apps/api` (NestJS)
- [ ] `apps/web` (Next.js)
- [ ] `apps/bot-gateway` (NestJS)
- [ ] `apps/scheduler` (NestJS)

### Packages skeleton
- [ ] `packages/domain`
- [ ] `packages/application`
- [ ] `packages/infrastructure`
- [ ] `packages/contracts`
- [ ] `packages/ui`
- [ ] `packages/config`
- [ ] `packages/i18n`
- [ ] `modules/installments` skeleton (permissions seed)

### Database
- [ ] Prisma schema: PlatformUser (+ soft delete base fields)
- [ ] Prisma schema: Tenant, Plan, Subscription (EXCELLENCE §8)
- [ ] Prisma schema: Branch
- [ ] Prisma schema: User (platform identity — ADR-017)
- [ ] Prisma schema: Staff
- [ ] Prisma schema: Role (isTemplate), Permission, RolePermission
- [ ] Prisma schema: UserPermissionOverride
- [ ] Prisma schema: GlobalCustomer, BotIdentity
- [ ] Prisma schema: TenantCustomer (EXCELLENCE §8)
- [ ] Prisma schema: AuditLog (append-only)
- [ ] Prisma schema: TenantSetting, BranchSetting
- [ ] Prisma schema: OutboxEvent (append-only)
- [ ] Initial migration (no onDelete Cascade)
- [ ] Seed (plans, template roles, demo tenant, permissions incl. restore/recycle)

### Domain (core)
- [ ] **User** entity (+ pseudonymizePhone, softDelete/restore) — ADR-017
- [ ] Tenant entity (+ softDelete/restore)
- [ ] Branch entity (+ softDelete/restore)
- [ ] Staff entity (+ softDelete/restore)
- [ ] GlobalCustomer entity (+ softDelete/pseudonymize)
- [ ] TenantCustomer entity (+ softDelete/restore)
- [ ] RBAC value objects (Permission, DataScope, Role template)

### Auth
- [ ] OTP request endpoint (intent: login | register)
- [ ] OTP verify endpoint (verifiedToken for register flow)
- [ ] **Onboarding flow** (Flow A/B/C — TASK-055)
- [ ] JWT access + refresh (httpOnly)
- [ ] Staff vs Customer token separation
- [ ] Phone normalize (`09xxxxxxxxx`)
- [ ] OTP rate limit (Redis)

### Middleware & Guards
- [ ] Tenant context middleware
- [ ] Auth guard
- [ ] Permission guard
- [ ] Module entitlement guard
- [ ] Data scope guard/filter
- [ ] Prisma tenant_id extension + **soft delete extension**

### Core services
- [ ] Audit log service
- [ ] Module registry skeleton
- [ ] Settings service (schema-based)
- [ ] Outbox publisher
- [ ] **Soft delete & restore use cases**
- [ ] **Register tenant use case** (clone template roles)
- [ ] **Create tenant customer use case**

### Contracts
- [ ] Auth Zod schemas (intent, verifiedToken, onboarding)
- [ ] Tenant/Staff/Customer Zod schemas (EXCELLENCE §8)
- [ ] Error response schema (incl. soft-delete codes)

### Vertical slice
- [ ] Flow A: register tenant → create customer → dashboard
- [ ] Flow B: demo seed login → create customer
- [ ] Soft delete customer → restore (E2E)

---

## فاز ۱ — پنل فروشنده

### Backend — Installments module
- [ ] Module register + permissions seed
- [ ] Prisma: Sale, Installment, PaymentAttempt
- [ ] Domain: Sale entity + installment generation
- [ ] Domain: Installment entity + state transitions
- [ ] Domain: PaymentAttempt entity
- [ ] Use case: CreateSale
- [ ] Use case: CancelSale
- [ ] Use case: ListInstallments
- [ ] Use case: ListTodayInstallments
- [ ] Use case: ListOverdueInstallments
- [ ] Use case: GetSaleDetail
- [ ] Settings schema (installments)
- [ ] Use case: Get/UpdateInstallmentSettings

### Backend — Customer
- [ ] Use case: CreateTenantCustomer
- [ ] Use case: UpdateTenantCustomer
- [ ] Use case: ListTenantCustomers
- [ ] Use case: GetTenantCustomer
- [ ] Use case: ImportCustomersExcel

### Backend — Core admin
- [ ] Use case: Branch CRUD
- [ ] Use case: Staff CRUD
- [ ] Use case: Role list/create/update (custom by owner)
- [ ] Use case: Assign role to staff
- [ ] Use case: Permission override (grant/deny)
- [ ] Default branch auto-create on tenant register

### Backend — Reports
- [ ] Use case: Dashboard stats
- [ ] Use case: Cashflow forecast (basic)

### Backend — API routes
- [ ] `/auth/*`
- [ ] `/tenants/me`
- [ ] `/branches/*`
- [ ] `/staff/*`
- [ ] `/roles/*`
- [ ] `/settings/*`
- [ ] `/customers/*`
- [ ] `/sales/*`
- [ ] `/installments/*`
- [ ] `/reports/dashboard`

### Frontend — Auth & layout
- [ ] OTP login (staff)
- [ ] Admin layout + sidebar
- [ ] RTL + fa-IR
- [ ] Permission-based menu

### Frontend — Pages
- [ ] Dashboard (today due, overdue count)
- [ ] Customer list
- [ ] Customer create/edit
- [ ] Customer import Excel
- [ ] Sale list
- [ ] Sale create form + installment preview
- [ ] Sale detail + installment list
- [ ] Overdue report
- [ ] Today due report
- [ ] Settings: reminders
- [ ] Branch management
- [ ] Staff management
- [ ] Role management (owner only)

### Tests
- [ ] Domain: installment sum = sale total
- [ ] Domain: state transitions
- [ ] Integration: CreateSale
- [ ] Integration: RBAC deny/allow
- [ ] Integration: cross-tenant fail

### Exit
- [ ] End-to-end: مشتری → فروش → اقساط → گزارش معوقات

---

## فاز ۲ — ربات تلگرام ⏸️ (منتقل / deferred)

> **وضعیت:** به‌دلیل محدودیت و تحریم تلگرام — **بعد از فاز ۳ (PWA)** اجرا می‌شود. تا آن زمان کانال اصلی: **بله (فاز ۴)**. Adapter تلگرام در ADR-018 stub می‌ماند.

### bot-gateway
- [ ] grammY setup
- [ ] Webhook endpoint + secret verification
- [ ] Command router
- [ ] `/start link_{token}` — link customer
- [ ] Customer: list installments
- [ ] Customer: report payment
- [ ] Seller: connect bot account
- [ ] Seller: daily summary notification
- [ ] Seller: payment reported alert
- [ ] Inline keyboards
- [ ] Deep links to PWA

### API
- [ ] `POST /bot/link-token`
- [ ] BotIdentity persist on link

### scheduler
- [ ] BullMQ setup
- [ ] Job: MarkOverdueInstallments (daily)
- [ ] Job: ScheduleReminders (daily)
- [ ] Job: SendReminder (delayed)
- [ ] NotificationLog + idempotency
- [ ] Telegram notification adapter
- [ ] Message templates (fa)

### Tests
- [ ] Link token one-time use
- [ ] Reminder idempotency
- [ ] Overdue transition (Tehran timezone)

### Exit
- [ ] مشتری linked → یادآور → «پرداخت کردم» → notify فروشنده

---

## فاز ۳ — PWA مشتری + Payment Flow

### Backend
- [ ] Customer auth flow (separate)
- [ ] `GET /my/installments`
- [ ] `GET /my/installments/calendar`
- [ ] `GET /my/payment-history`
- [ ] `GET/POST /my/personal-installments`
- [ ] Prisma: PersonalInstallment
- [ ] Use case: ReportPayment
- [ ] Use case: ConfirmPayment
- [ ] Use case: RejectPayment
- [ ] Audit: payment confirm/reject

### Frontend — Customer portal
- [ ] OTP login (customer)
- [ ] Installment list
- [ ] Installment calendar (Jalali)
- [ ] Payment history
- [ ] Report payment UI
- [ ] Personal installments CRUD
- [ ] Bot link page
- [ ] PWA manifest
- [ ] Service worker (basic cache)

### Frontend — Seller panel
- [ ] Pending payments list
- [ ] Confirm/reject payment UI
- [ ] Send bot link to customer (from sale/customer)

### Tests
- [ ] Payment flow E2E API
- [ ] Customer cannot access staff endpoints

### Exit
- [ ] Customer report → staff confirm → installment paid → both UIs updated

---

## فاز ۴ — بازوی بله + Marketing 🚀 (اجرای فعلی)

> **مستندات کامل:** [`Phases/Phase-4-Bale-Marketing/README.md`](../../Phases/Phase-4-Bale-Marketing/README.md) · **API بله:** [`bale-api-reference.md`](../05-channels/bale-api-reference.md) (منبع رسمی [docs.bale.ai](https://docs.bale.ai/))

### Epic-01 — Channel Abstraction (TASK-124 → 126)
- [ ] ADR-018 channel abstraction
- [ ] `NotificationChannel` port interface
- [ ] Contracts Zod (bot link, notification)

### Epic-02 — Bale Infrastructure (TASK-127 → 129)
- [ ] Bale HTTP client (`https://tapi.bale.ai/bot{token}/`)
- [ ] Bale Update types + Zod validation
- [ ] Webhook registration (`setWebhook`) + env config

### Epic-03 — Notification Database (TASK-130 → 133)
- [ ] Prisma `NotificationLog` (append-only)
- [ ] Prisma `StaffBotIdentity`
- [ ] Redis `BotLinkToken` (one-time, TTL 72h)
- [ ] Repositories

### Epic-04 — Bot Link API (TASK-134 → 137)
- [ ] Use case: `GenerateBotLinkToken` (customer + staff)
- [ ] Use case: `LinkBotIdentity` / `LinkStaffBotIdentity`
- [ ] `POST /api/v1/bot/link-token`
- [ ] Deep link: `https://ble.ir/{bot}?start=link_{token}`

### Epic-05 — Bot Gateway Bale (TASK-138 → 141)
- [ ] `POST /webhooks/bale` + secret header
- [ ] grammY با `apiRoot: https://tapi.bale.ai`
- [ ] Command router + `update_id` dedup (Redis)
- [ ] `answerCallbackQuery` utility (اجباری پس از inline click)

### Epic-06 — Customer Bot Flows (TASK-142 → 145)
- [ ] `/start link_{token}` — link customer
- [ ] List installments + pagination inline
- [ ] «پرداخت کردم» callback → `ReportPayment` use case
- [ ] Message templates (fa) + inline keyboards

### Epic-07 — Seller Bot Flows (TASK-146 → 149)
- [ ] Seller connect bot (`StaffBotIdentity`)
- [ ] Daily summary notification (06:00 Tehran)
- [ ] Payment reported alert
- [ ] Seller message templates

### Epic-08 — Scheduler + Notifications (TASK-150 → 154)
- [ ] BullMQ setup (`apps/scheduler`)
- [ ] Job: `MarkOverdueInstallments` (daily)
- [ ] Job: `ScheduleReminders` + `SendReminder` (delayed)
- [ ] `BaleNotificationAdapter` (`sendMessage`, rate limit 429)
- [ ] `NotificationService` + idempotency

### Epic-09 — Channel Settings (TASK-155 → 157)
- [ ] Settings schema: `defaultReminderChannels` (bale primary)
- [ ] API Get/Update channel preferences
- [ ] Frontend: settings/reminders channel UI

### Epic-10–11 — Marketing Site (TASK-158 → 162)
- [ ] Route group `(marketing)` + layout/nav
- [ ] Landing `/`
- [ ] Pricing `/pricing`
- [ ] Features `/features/installments`

### Epic-12 — Tenant Self-Register (TASK-163 → 165)
- [ ] Register page `/register`
- [ ] Flow A onboarding (reuse TASK-055)
- [ ] Post-register → `/admin/dashboard`

### Epic-13 — SEO + Blog (TASK-166 → 168) — P1
- [ ] SEO meta + OpenGraph
- [ ] `sitemap.xml` + `robots.txt`
- [ ] Blog shell `/blog` (empty)

### Epic-14 — Tests (TASK-169 → 173)
- [ ] Link token one-time use
- [ ] Reminder idempotency
- [ ] Overdue transition (Tehran timezone)
- [ ] Bale webhook auth
- [ ] RBAC bot API deny/allow

### Epic-15 — Vertical Slice (TASK-174)
- [ ] E2E: سایت ثبت‌نام → پنل → لینک بله → یادآور → پرداخت کردم → notify فروشنده

### Exit
- [ ] Tenant register from site → login → usable panel
- [ ] Reminder via Bale for linked customers
- [ ] Rate limit 429 handled (`retry_after`)

---

## فاز ۵ — Beta & Monetization

### Product
- [ ] Import Excel polish (validation, error report)
- [ ] Onboarding wizard (tenant first setup)
- [ ] In-app help / tooltips
- [ ] Error messages fa-IR review

### Subscription
- [ ] Plan entity enforcement
- [ ] Module entitlement check (production)
- [ ] Limits: max customers, staff, branches
- [ ] Trial period logic
- [ ] Upgrade/downgrade flow (manual)

### Billing
- [ ] Manual invoice flow
- [ ] Payment status tracking (offline)
- [ ] Tenant suspend on non-payment

### Beta ops
- [ ] ۱۰ pilot tenants onboarded
- [ ] Feedback collection process
- [ ] Case study document
- [ ] Support channel setup

### Ops
- [ ] Production deploy (Arvan)
- [ ] Backup automated + restore test
- [ ] Sentry production
- [ ] Uptime monitoring
- [ ] Health check endpoints

### Exit
- [ ] ۳–۵ paying tenants
- [ ] Case study published

---

## فاز ۶ — Post-Launch

### Medium priority
- [ ] SMS notification adapter
- [ ] SMS OTP fallback
- [ ] Export Excel reports
- [ ] Export PDF reports
- [ ] Customer data export (privacy)
- [ ] PostgreSQL RLS
- [ ] Feature flags (Unleash)

### Low priority
- [ ] SSE/WebSocket panel notifications
- [ ] Native seller app (Flutter)
- [ ] Offline PWA (seller view today)
- [ ] Credit profile v2

### When validated
- [ ] Payment gateway integration
- [ ] API `/v2` (if breaking changes)
- [ ] POS integration API

### Year 2+
- [ ] Extract notification service
- [ ] Meilisearch
- [ ] Analytics warehouse
- [ ] White-label
- [ ] Module: digital menu

---

## Vertical Slice Demo (QA checklist)

- [ ] Seller registers tenant (default branch)
- [ ] Seller adds customer
- [ ] Seller creates sale → 6 installments
- [ ] Seller sends **Bale** bot link (`ble.ir/...?start=link_...`)
- [ ] Customer `/start` in Bale → sees installments
- [ ] Scheduler sends reminder
- [ ] Customer «پرداخت کردم»
- [ ] Seller confirms in panel
- [ ] Installment → paid
- [ ] Dashboard updates
