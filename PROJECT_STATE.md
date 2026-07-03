# PROJECT_STATE — Hivork

> **هدف:** ثبت وضعیت فعلی پروژه برای هر Agent جدید — «الان کجاییم و بعد چه کنیم؟»  
> **قانون نگهداری:** بعد از هر تغییر مهم (فاز، ماژول، ADR، merge بزرگ) این فایل را به‌روز کن.  
> **نسخه:** 1.0 — 1405/04/12  
> **مکمل:** [`AGENT_CONTEXT.md`](./AGENT_CONTEXT.md) (معماری) · [`AGENTS.md`](./AGENTS.md) (پروتکل) · [`docs/README.md`](./docs/README.md) (مستندات)

---

## فهرست

1. [Current Project Status](#current-project-status)
2. [Completed Modules](#completed-modules)
3. [Modules In Progress](#modules-in-progress)
4. [Pending Modules](#pending-modules)
5. [Current Branch](#current-branch)
6. [Recent Changes](#recent-changes)
7. [Known Issues](#known-issues)
8. [Current Decisions](#current-decisions)
9. [Next Recommended Tasks](#next-recommended-tasks)
10. [Important Notes](#important-notes)

---

# Current Project Status

**Hivork** در مرحله **توسعه فعال Enterprise Features** است — پایه (Foundation) و پنل فروشنده MVP تقریباً آماده؛ در حال حاضر تمرکز روی **IFP Phase 05 (عملیات اقساط)** و **IFP Phase 06 (پرداخت‌ها و چک)** است که اخیراً merge شده‌اند.

## خلاصه وضعیت

| لایه | وضعیت | درصد تقریبی |
|------|--------|-------------|
| Infrastructure & Monorepo | ✅ تکمیل | ~98% |
| Core Platform (auth, RBAC, tenant) | ✅ عمدتاً تکمیل | ~90% |
| Seller Panel MVP (Phase 1) | 🟡 نزدیک تکمیل | ~88% |
| Enterprise Features IFP 01–04 | 🟡 عمدتاً پیاده | ~70–85% |
| Enterprise Features IFP 05–06 | 🟡 تازه merge — نیاز polish/test | ~80–85% |
| Bale + Marketing (Phase 4) | 🔴 شروع نشده | ~5% |
| Customer PWA (Phase 3) | 🔴 placeholder | ~5% |
| Telegram Bot (Phase 2) | ⏸️ deferred | ~10% |
| IFP Phase 07–11 | 🔴 شروع نشده | 0–5% |

## فاز اجرایی فعلی (طبق `operational-phases.md`)

```
انجام‌شده/در حال تکمیل:  Phase 0 ✅  →  Phase 1 (~88%)  →  IFP 01–06 (در حال تکمیل)
بعدی (اولویت محصول):     Phase 4 (بله + مارکتینگ)  →  Phase 3 (PWA)  →  Phase 2 (تلگرام — deferred)
```

**نقطه تمرکز فعلی تیم/Agent:** تکمیل و تثبیت IFP-05/06 (تست، باگ، UI polish) سپس شروع **Phase 4 — Bale + Marketing**.

---

# Completed Modules

## 1. Foundation & Infrastructure

| | |
|---|---|
| **وضعیت** | ✅ تکمیل (~98%) |
| **امکانات** | pnpm monorepo + Turborepo · Docker Compose (PG 16, Redis 7) · GitHub Actions CI · ESLint/Prettier/TS strict · `.env.example` · hard-delete CI grep |
| **فایل‌های مهم** | `package.json` · `turbo.json` · `pnpm-workspace.yaml` · `docker/docker-compose.yml` · `.github/workflows/ci.yml` · `scripts/ci/` |
| **وابستگی‌ها** | — (پایه همه چیز) |

---

## 2. Core Platform Module

| | |
|---|---|
| **وضعیت** | ✅ تکمیل (~90%) |
| **امکانات** | Multi-tenant (`tenantId` on all queries) · Auth OTP + JWT refresh rotation · Password login (ADR-019) · MFA TOTP · Staff sessions · User platform identity (ADR-017) · RBAC (roles, overrides, data scope) · Active branch session (ADR-015) · Audit log · Outbox · Settings schema-based · Soft delete + restore · Module registry |
| **فایل‌های مهم** | `prisma/schema.prisma` (PlatformUser, User, Tenant, Branch, Staff, Role, Permission, AuditLog, OutboxEvent) · `apps/api/src/auth/` · `apps/api/src/core/` · `packages/domain/src/core/` · `packages/application/src/auth/` · `packages/infrastructure/src/persistence/` · `modules/core/` |
| **وابستگی‌ها** | Foundation |

**Controllers فعال:** `auth`, `tenants`, `branches`, `staff`, `roles`, `settings`, `security-settings`, `api-keys`, `saved-filters`, `saved-views`, `realtime`, `print`

---

## 3. IFP Phase 01 — Auth & Security

| | |
|---|---|
| **وضعیت** | ✅ تکمیل (~85%) |
| **امکانات** | Password credentials · Login tabs (OTP/password) · Forgot/reset password · Must-change-password gate · MFA setup/verify · Remember me · Session list/revoke · IP allowlist · Login rate limit · Account lock · Captcha (Turnstile) · Change phone flow |
| **فایل‌های مهم** | `apps/web/app/(auth)/` · `packages/application/src/auth/` · `apps/api/src/core/staff/staff-security*.ts` · `packages/integration-tests/src/phase-01-auth/` |
| **وابستگی‌ها** | Core Platform |

**تست:** `pnpm test:phase-01-auth` · integration `phase-01-auth.integration.spec.ts`

---

## 4. Customer Management (IFP Phase 03 + Phase 1)

| | |
|---|---|
| **وضعیت** | ✅ تکمیل (~75%) |
| **امکانات** | TenantCustomer CRUD · GlobalCustomer linkage · Addresses · Emergency contacts · Contact phones · Documents/notes · Categories/tags · Bulk tag/untag · Import Excel · Merge customers · Transfer ownership · Recycle bin (soft delete restore) · Customer timeline |
| **فایل‌های مهم** | `apps/api/src/customers/` · `packages/application/src/customers/` · `apps/web/app/(seller)/admin/customers/` · `packages/contracts/src/customers/` |
| **وابستگی‌ها** | Core Platform |

**تست:** `pnpm test:phase-03-customers`

---

## 5. Contract Enterprise (IFP Phase 04)

| | |
|---|---|
| **وضعیت** | ✅ تکمیل (~80%) |
| **امکانات** | Sale enterprise fields · Contract versions · Guarantors · Collaterals · Line items · Tax/insurance financials · Contract lifecycle (extend, copy, terminate, close, archive) · Contract attachments · Sale financials API |
| **فایل‌های مهم** | `apps/api/src/installments/sales/sales-enterprise.controller.ts` · `sale-guarantors.controller.ts` · `sale-collaterals.controller.ts` · `sale-financials.controller.ts` · `packages/application/src/installments/sales/` · `apps/web/components/sales/contract-detail-tabs.tsx` |
| **وابستگی‌ها** | Customer Management · Installments base |

**تست:** `pnpm test:phase-04-contract-enterprise`

---

## 6. Cross-Cutting UI (IFP Phase 02 — partial)

| | |
|---|---|
| **وضعیت** | ✅ بخشی تکمیل (~60%) |
| **امکانات** | Data table engine · Saved filters/views · Theme system (light/dark, tokens) · Realtime notifications (Redis) · Undo toast · Print snapshots · Jalali formatters · RTL layout shell |
| **فایل‌های مهم** | `packages/ui/` · `packages/theme/` · `apps/web/components/data-table/` · `apps/api/src/core/saved-*` · `apps/api/src/core/realtime/` · `apps/web/hooks/use-dashboard.ts` |
| **وابستگی‌ها** | Core Platform |

---

## 7. Seller Panel — Reports & Dashboard (partial IFP-07)

| | |
|---|---|
| **وضعیت** | ✅ MVP تکمیل (~70%) |
| **امکانات** | Dashboard KPI cards · Today due table · Collections chart · Overdue report · Today due report · Quick actions |
| **فایل‌های مهم** | `apps/web/app/(seller)/admin/dashboard/page.tsx` · `apps/web/app/(seller)/admin/reports/` · `apps/api/src/installments/reports/` · `packages/application/src/installments/reports/` |
| **وابستگی‌ها** | Installments base |

---

## 8. Seller Panel — Admin & Settings

| | |
|---|---|
| **وضعیت** | ✅ تکمیل (~85%) |
| **امکانات** | Branch CRUD · Staff CRUD · Role management · Permission overrides · Installments settings · Reminders settings · Security settings · Appearance/theme · API keys |
| **فایل‌های مهم** | `apps/web/app/(seller)/admin/branches/` · `staff/` · `roles/` · `settings/` · `apps/api/src/settings/` |
| **وابستگی‌ها** | Core Platform |

---

# Modules In Progress

## 1. Installments Advanced — IFP Phase 05

| | |
|---|---|
| **درصد پیشرفت** | ~85% |
| **وضعیت** | 🟡 Backend + Frontend merge شده — نیاز تثبیت و E2E کامل |
| **امکانات پیاده‌شده** | Installment operations: waive, penalty, discount, reschedule, defer, accelerate, split, merge, regenerate · Payment recording: cash, bank transfer, POS, check, fee · Payment confirm/reject/void · Payment receipt (print/send) · Online payment init + webhook · Installments list/detail UI · Operation modals · Payment recording wizard |
| **مشکلات احتمالی** | برخی edge cases partial payment نیاز تست بیشتر · Online payment webhook → attempt هنوز `pending` تا staff confirm (by design ADR-008) · UI polish برای flowهای چندمرحله‌ای |
| **فایل‌های درگیر** | `packages/application/src/installments/installments/` · `packages/application/src/installments/payments/` · `apps/api/src/installments/installments/` · `apps/api/src/webhooks/payment-gateway.webhook.controller.ts` · `apps/web/app/(seller)/admin/installments/` · `apps/web/components/installments/` · `prisma/migrations/*phase05*` |

**تست:** `pnpm test:integration:phase05` → `apps/api/test/integration/phase05-vertical-slice.spec.ts`

---

## 2. Payments & Checks — IFP Phase 06

| | |
|---|---|
| **درصد پیشرفت** | ~80% |
| **وضعیت** | 🟡 Backend + Frontend merge شده — settlement/reconciliation نیاز تست production-like |
| **امکانات پیاده‌شده** | Payment ledger · Unified payments API · Check entity + state machine · Check CRUD/actions · Payment transactions list · Settlement batches · Bank reconciliation · Refund/void · Payment method settings |
| **مشکلات احتمالی** | Reconciliation با CSV نمونه تست شده — فرمت‌های بانکی واقعی متنوع · Check image upload نیاز S3 config · Settlement workflow UI ممکن است نیاز UX review داشته باشد |
| **فایل‌های درگیر** | `packages/domain/src/installments/check*` · `packages/application/src/payments/` · `apps/api/src/installments/payments/` · `apps/web/app/(seller)/admin/payments/` · `apps/web/components/payments/` · `prisma/migrations/*payment*ledger*check*` |

**تست:** `pnpm test:integration:phase06` → `apps/api/test/integration/phase06-vertical-slice.spec.ts`

---

## 3. Phase 1 — Seller Panel MVP (باقی‌مانده)

| | |
|---|---|
| **درصد پیشرفت** | ~88% |
| **وضعیت** | 🟡 تقریباً کامل — vertical slice E2E رسمی (TASK-123) ممکن است نیاز تأیید نهایی داشته باشد |
| **امکانات پیاده‌شده** | OTP login · Admin layout + menu · Customer pages · Sale create/list/detail · Installment list per sale · Basic reports · Settings pages |
| **مشکلات احتمالی** | `operational-phases.md` هنوز همه checkboxها tick نشده · Playwright E2E phase1 ممکن است ناقص باشد |
| **فایل‌های درگیر** | `apps/web/app/(seller)/admin/` · `packages/application/src/vertical-slice/` · `apps/api/src/vertical-slice/` |

**تست:** `packages/application/src/vertical-slice/phase1-vertical-slice.integration.spec.ts` · `apps/api/src/vertical-slice/phase1-vertical-slice.http.e2e.spec.ts`

---

## 4. Scheduler (جزئی)

| | |
|---|---|
| **درصد پیشرفت** | ~25% |
| **وضعیت** | 🟡 Skeleton + outbox processor — jobs اصلی یادآور/overdue **هنوز نیست** |
| **امکانات پیاده‌شده** | Outbox event processor (BullMQ) · Staff session expire job · Health check processor · Queue module |
| **مشکلات احتمالی** | بدون `MarkOverdueJob` و `SendReminderJob` فلو یادآور end-to-end کار نمی‌کند |
| **فایل‌های درگیر** | `apps/scheduler/src/jobs/` · `packages/infrastructure/src/outbox/` |

---

## 5. Bot Gateway (جزئی)

| | |
|---|---|
| **درصد پیشرفت** | ~10% |
| **وضعیت** | 🟡 Skeleton — Telegram webhook stub؛ **Bale پیاده نشده** |
| **امکانات پیاده‌شده** | Health endpoint · Telegram webhook controller (secret verification) · `HandleTelegramWebhookUseCase` stub |
| **مشکلات احتمالی** | هیچ Bale HTTP client/adapter در `packages/infrastructure` وجود ندارد · Customer/Seller bot flows صفر |
| **فایل‌های درگیر** | `apps/bot-gateway/src/` · `packages/application/src/bot/` (اگر موجود) |

---

# Pending Modules

## Operational Phases (هنوز شروع نشده / deferred)

| Phase | عنوان | وضعیت | توضیح |
|-------|--------|--------|--------|
| **Phase 4** | Bale + Marketing | 🔴 Pending | TASK-124→174 — adapter بله، bot flows، scheduler reminders، landing/pricing/self-register |
| **Phase 3** | Customer PWA | 🔴 Pending | OTP customer login، calendar، payment history، personal installments |
| **Phase 2** | Telegram Bot | ⏸️ Deferred | به‌دلیل تحریم/محدودیت — بعد از PWA |
| **Phase 5** | Beta & Monetization | 🔴 Pending | Pilot tenants، plan enforcement، billing |
| **Phase 6** | Post-Launch | 🔴 Pending | SMS fallback، PDF export، SSE، payment gateway |

## InstallmentFeaturePhases (IFP — باقی‌مانده)

| IFP Phase | عنوان | Tasks | وضعیت |
|-----------|--------|-------|--------|
| **07** | Dashboard, Reports, Calendar | IFP-119→138 | 🔴 Pending — dashboard MVP جزئی وجود دارد |
| **08** | Notifications & Automation | IFP-139→156 | 🔴 Pending — وابسته به Phase 4 Bale |
| **09** | Users & Settings Extended | IFP-157→171 | 🔴 Pending — بخشی overlap با core |
| **10** | Files, Platform, Billing | IFP-172→187 | 🔴 Pending — file storage جزئی موجود |
| **11** | Accounting Pro | IFP-188→199 | 🔴 Pending |

## Future Platform Modules (placeholder)

| Module | وضعیت |
|--------|--------|
| `digital-menu` | 🔴 Not started |
| `pos` | 🔴 Not started |
| `crm` | 🔴 Not started |
| `analytics` | 🔴 Not started |
| `payment-gateway` (full) | 🔴 Partial — online payment stub only |

---

# Current Branch

| Item | Value |
|------|--------|
| **Branch** | `main` |
| **آخرین commit** | `629c2aa` — `chore: update CI pipeline and root dependencies for Phase 05/06` |
| **Working tree** | تمیز (committed) — فایل‌های untracked: `AGENT_CONTEXT.md`, `assets/` |
| **Merge strategy** | Squash and merge روی `main` |

---

# Recent Changes

## Commits اخیر (5 commit آخر — Jul 2026)

| Commit | خلاصه |
|--------|--------|
| `629c2aa` | CI pipeline + root deps برای Phase 05/06 |
| `bbe7442` | docs: domain model + payment state machines |
| `5ee1eb7` | web: installments & payments admin UI + operation modals |
| `e1191f8` | api: installment ops, payment recording, webhooks, vertical-slice tests |
| `a8e5409` | modules: Phase 05/06 permissions |

## تغییرات کلیدی در این بازه (~11,500 خط)

**Database:**
- Migrations برای installment operations، payment ledger، checks، settlement، reconciliation

**Backend (جدید/گسترش یافته):**
- `installment-operations.controller.ts` — waive, penalty, discount, reschedule, defer, accelerate, split, merge
- `payment-recording.controller.ts` — cash, bank, POS, check, fee
- `payment-confirmation.controller.ts` — confirm/reject/void
- `payment-receipt.controller.ts` — print/send receipt
- `online-payment.controller.ts` + `payment-gateway.webhook.controller.ts`
- `checks.controller.ts` · `payment-transactions.controller.ts`
- `settlement.controller.ts` · `reconciliation.controller.ts`
- `unified-payments.controller.ts`

**Frontend (جدید):**
- `/admin/installments` — list + detail + operation modals
- `/admin/payments` — transactions, checks, settlement, reconciliation panels
- `/admin/sales/[id]/installments` — sale installments view
- Hooks: `use-installments-list`, `use-installment-mutations`, `use-checks-list`, `use-payment-transactions-list`
- API clients: `lib/api/installments.ts`, `lib/api/payments.ts`

**Tests:**
- `phase05-vertical-slice.spec.ts` (IFP-100)
- `phase06-vertical-slice.spec.ts` (IFP-118)

---

# Known Issues

## Bugs / رفتارهای ناقص

| # | موضوع | شدت | توضیح |
|---|--------|-----|--------|
| B-01 | Customer portal placeholder | Medium | `apps/web/app/(customer)/my/page.tsx` فقط پیام «فاز ۲» — هیچ فلو مشتری کار نمی‌کند |
| B-02 | Mark overdue job missing | High | هیچ `MarkOverdueJob` در scheduler — BR-015 (daily overdue) خودکار اجرا نمی‌شود |
| B-03 | Send reminder job missing | High | یادآور BullMQ پیاده نشده — settings reminders ذخیره می‌شود ولی ارسال نمی‌شود |
| B-04 | Bale adapter missing | High | کانال `bale` در settings/schemas هست ولی HTTP client/adapter وجود ندارد |
| B-05 | Online payment → pending | Low (by design) | Webhook success → `PaymentAttempt.pending` تا staff confirm — تست `online-payment.integration.spec.ts` تأیید می‌کند |
| B-06 | Integration tests skip بدون runtime | Medium | `describe.skip` وقتی `DATABASE_URL`/Redis در دسترس نیست — CI باید PG+Redis داشته باشد |

## Technical Debt

| # | موضوع | اولویت | توضیح |
|---|--------|--------|--------|
| TD-01 | `operational-phases.md` out of sync | Medium | Checkboxها با واقعیت کد هم‌خوان نیستند |
| TD-02 | PostgreSQL RLS | Low | فقط Prisma middleware — RLS فاز ۲+ planned |
| TD-03 | ADR-018 Proposed | Medium | Notification Channel Abstraction هنوز formal نشده |
| TD-04 | Telegram deferred | Low | Webhook stub موجود — flows صفر |
| TD-05 | Marketing pages minimal | Medium | Landing basic — pricing/features/SEO/blog نیست |
| TD-06 | Dashboard partial vs IFP-07 | Medium | KPIهای کامل ۱۵گانه و charts پیشرفته نیست |
| TD-07 | E2E Playwright coverage | Medium | فقط phase-01-auth و phase04-contract — phase05/06 فقط integration |
| TD-08 | `AGENT_CONTEXT.md` untracked | Low | فایل ایجاد شده ولی commit نشده |

## موارد نیاز اصلاح بعدی

- تکمیل vertical slice tests برای phase05/06 در CI pipeline (اگر هنوز اضافه نشده)
- پیاده‌سازی scheduler jobs قبل از Phase 4 vertical slice
- Sync مستندات `domain.md` / `state-machines.md` با کد (اخیراً به‌روز شده — بررسی دوره‌ای)
- Review permission catalog frontend vs backend consistency
- تست cross-tenant برای endpointهای جدید payments/checks

---

# Current Decisions

## ADRهای تأیید‌شده (فعال)

| ADR | تصمیم | تأثیر فعلی |
|-----|--------|------------|
| ADR-001 | محصول اول = اقساط | تمرکز توسعه روی installments |
| ADR-002 | GlobalCustomer ≠ TenantCustomer | مدل customer در کد و schema |
| ADR-003 | Modular Monolith | apps + packages + modules |
| ADR-004 | RBAC + user override + data scope | guards روی همه endpoints |
| ADR-005 | Settings schema-based | `modules/*/settings.schema.ts` |
| ADR-006 | Bot قبل از Native App | PWA بعد از Bale |
| ADR-007 | Money = BigInt Rial | همه `amountRial: bigint` |
| ADR-008 | Payment report ≠ confirm | online webhook → pending |
| ADR-013 | Soft delete only | `deletedAt` everywhere |
| ADR-015 | Staff multi-branch + active branch | `X-Branch-Id` header |
| ADR-016 | API `/api/v1/` | versioning strategy |
| ADR-017 | User platform identity | phone on `User` |
| ADR-019 | Password credentials | login/password flows |

## تصمیمات اخیر (محصول/اجرا)

| تاریخ | تصمیم | منبع |
|-------|--------|------|
| 1405/04/09 | **فاز ۴ (بله) قبل از فاز ۳ (PWA)** — تلگرام deferred | `operational-phases.md` |
| 1405/04/10 | **InstallmentFeaturePhases** به‌عنوان لایه Enterprise روی MVP | `InstallmentFeaturePhases/README.md` |
| 1405/07/03 | **Phase 05/06 merge** — installment ops + payments/checks vertical slice | git history |
| — | ADR-018 Notification Abstraction — **Proposed** (هنوز Accepted نیست) | `adr-log.md` |

---

# Next Recommended Tasks

به ترتیب اولویت برای Agent بعدی:

## P0 — فوری (تثبیت کار جاری)

1. **اجرای و fix تست‌های phase05/06**
   - `pnpm test:integration:phase05`
   - `pnpm test:integration:phase06`
   - رفع هر failure در CI

2. **اضافه کردن phase05/06 به CI workflow** (اگر missing)
   - `.github/workflows/ci.yml` — مشابه phase04

3. **Commit فایل‌های مستندات**
   - `AGENT_CONTEXT.md` · `PROJECT_STATE.md` · `assets/` (اگر لازم)

## P1 — تکمیل gapهای blocker برای Phase 4

4. **Scheduler: MarkOverdueJob** (TASK-151 / BR-015)
   - `apps/scheduler/` → use case mark overdue
   - timezone Tehran

5. **Scheduler: SendReminderJob** (TASK-152–154)
   - BullMQ delayed jobs · idempotency `(installmentId, type, channel)`

6. **Bale HTTP client + adapter** (TASK-127–129)
   - `packages/infrastructure/src/bale/`
   - مرجع: `docs/05-channels/bale-api-reference.md`

7. **Bot link token API** (TASK-134–137)
   - `POST /api/v1/bot/link-token`

8. **Bot gateway Bale webhook** (TASK-138–141)
   - `apps/bot-gateway/` — نه telegram

## P2 — Phase 4 Marketing

9. **Marketing pages** — pricing, features (TASK-160–162)
10. **Tenant self-register flow** (TASK-163–165)
11. **Phase 4 vertical slice E2E** (TASK-174)

## P3 — بعد از Phase 4

12. **Customer PWA** (Phase 3) — جایگزین placeholder در `(customer)/my/`
13. **IFP Phase 07** — Dashboard KPIs کامل + calendar
14. **IFP Phase 08** — Notification automation (وابسته به Bale)

## مرجع Task

| اولویت | مسیر Task |
|--------|-----------|
| Phase 4 | `Phases/Phase-4-Bale-Marketing/` TASK-124→174 |
| IFP-07+ | `InstallmentFeaturePhases/Phase-07-*` |
| Traceability | `InstallmentFeaturePhases/TRACEABILITY-MATRIX.md` |

---

# Important Notes

## قبل از شروع هر Task

1. **بخوان:** `AGENT_CONTEXT.md` → `AGENTS.md` → task file مرتبط
2. **تأیید کن:** task داخل scope است و ADR نقض نمی‌شود
3. **الگو بگیر:** use case/controller مشابه موجود را template کن
4. **تست بنویس:** integration برای use case · RBAC allow/deny · cross-tenant fail

## محیط توسعه

```bash
pnpm install
cp .env.example .env
pnpm docker:up          # postgres + redis
pnpm db:migrate
pnpm db:seed
pnpm dev                # api :3001 + web :3000
```

**Integration tests نیاز دارند:** `DATABASE_URL` + Redis running

## نقشه ذهنی — «الان کجاییم؟»

```
[✅ Foundation] → [✅ Core + Auth] → [🟡 Seller MVP 88%]
                                        ↓
                              [🟡 IFP 05/06 80-85%]  ← YOU ARE HERE
                                        ↓
                              [🔴 Phase 4 Bale]  ← NEXT BIG MILESTONE
                                        ↓
                              [🔴 Phase 3 PWA] → [⏸️ Phase 2 Telegram]
```

## فایل‌های مرجع سریع

| نیاز | فایل |
|------|------|
| معماری کامل | `AGENT_CONTEXT.md` |
| وضعیت پروژه | `PROJECT_STATE.md` (این فایل) |
| قوانین کسب‌وکار | `docs/03-modules/installments/BUSINESS-RULES.md` |
| State machines | `docs/03-modules/installments/state-machines.md` |
| Roadmap | `docs/07-roadmap/operational-phases.md` |
| ADRها | `docs/08-decisions/adr-log.md` |
| DB schema | `prisma/schema.prisma` |
| Permissions | `modules/installments/src/installments.permissions.ts` |

## هشدارهای حیاتی برای Agent

- ❌ `prisma.*.delete()` روی business data
- ❌ `number` برای پول — فقط `bigint` ریال
- ❌ `tenantId` از request body
- ❌ Business logic در controller/component
- ✅ Soft delete · audit · permission guard · cursor pagination
- ✅ هر endpoint staff: `@RequireAuth` + `@RequirePermission` + `@ApplyDataScope`

---

## نگهداری این فایل

بعد از هر مورد زیر، `PROJECT_STATE.md` را به‌روز کن:

- تکمیل یا شروع فاز/ماژول جدید
- Merge بزرگ (مثل phase05/06)
- ADR جدید Accepted
- کشف bug/debt مهم
- تغییر اولویت roadmap
- تغییر branch اصلی توسعه

**Header version** را increment کن.

---

*آخرین به‌روزرسانی: 1405/04/12 — نسخه 1.0*  
*Branch: `main` · Commit: `629c2aa` · بر اساس بررسی کد و git history*
