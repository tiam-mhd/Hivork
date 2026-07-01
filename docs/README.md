# Hivork — مستندات پروژه

> **Hivork** پلتفرم SaaS ماژولار برای کسب‌وکارهای خرده‌فروشی در ایران.  
> **ماژول اول:** مدیریت اقساط (ثبت فروش، یادآور، پیگیری معوقات، پورتال مشتری).

---

## فهرست مستندات

### معماری و محصول

| # | سند | توضیح |
|---|-----|--------|
| 1 | [چشم‌انداز و محصول](./01-product/vision-and-scope.md) | هدف ۱۰ ساله، scope، ماژول‌ها |
| 2 | [تحلیل بازار و Go-to-Market](./01-product/market-and-gtm.md) | چرا اقساط، ICP، فاز ۹۰ روز |
| 3 | [امکانات ماژول اقساط (Enterprise)](./01-product/installment-module-features.md) | فهرست ۲۳ حوزه — منبع [InstallmentFeaturePhases](../InstallmentFeaturePhases/) |
| 4 | [معماری کلان](./02-architecture/overview.md) | اصول، دیاگرام Mermaid، لایه‌ها |
| 5 | [Data Flow — جریان داده کامل](./02-architecture/data-flow.md) | **جدید** — HTTP request → DB، outbox، event flow، sequence diagrams |
| 6 | [Multi-Tenancy و موجودیت‌ها](./02-architecture/tenancy-and-entities.md) | Tenant، Branch، Customer، Staff |
| 7 | [سیستم RBAC](./02-architecture/rbac.md) | Role، Permission، Override، Data Scope |
| 8 | [سیستم تنظیمات](./02-architecture/settings.md) | Tenant/Branch settings، invariant rules |
| 9 | [معماری ماژولار](./02-architecture/modules.md) | Core، Installments، Module Registry |
| 10 | [قراردادهای API و Versioning](./02-architecture/api-contracts.md) | REST API کامل، request/response، versioning |

### ماژول اقساط

| # | سند | توضیح |
|---|-----|--------|
| 11 | [ماژول اقساط — Domain](./03-modules/installments/domain.md) | Sale، Installment، Payment، Events |
| 12 | [State Machine](./03-modules/installments/state-machines.md) | وضعیت قسط و پرداخت |
| 13 | [قوانین کسب‌وکار — کامل](./03-modules/installments/BUSINESS-RULES.md) | **جدید** — BR-001 تا BR-047، مثال‌های مالی BigInt، هر دو زبان |
| 14 | [فلوهای مشتری](./03-modules/installments/CUSTOMER-FLOWS.md) | **جدید** — CF-001 تا CF-007، ربات، PWA، یادآور |
| 15 | [فلوهای کارمند (Staff)](./03-modules/installments/STAFF-FLOWS.md) | **جدید** — SF-001 تا SF-010، panel، RBAC per flow |
| 16 | [گزارش‌ها و KPIها](./03-modules/installments/REPORTS.md) | **جدید** — Dashboard، معوقات، cashflow، export، cache |

### تکنولوژی

| # | سند | توضیح |
|---|-----|--------|
| 17 | [استک تکنولوژی](./04-technology/tech-stack.md) | NestJS، Next.js، PostgreSQL، ... |
| 18 | [ساختار Monorepo](./04-technology/monorepo-structure.md) | apps، packages، conventions |

### کانال‌ها

| # | سند | توضیح |
|---|-----|--------|
| 19 | [کانال‌ها و UI](./05-channels/channels-strategy.md) | وب، ربات، PWA — اولویت توسعه |
| 20 | [Notification Engine](./05-channels/notifications.md) | یادآور، queue، کانال‌ها |
| 20b | [مرجع API بازوی بله](./05-channels/bale-api-reference.md) | **فاز ۴** — منبع رسمی docs.bale.ai |

### عملیات

| # | سند | توضیح |
|---|-----|--------|
| 21 | [امنیت و Audit](./06-operations/security-and-audit.md) | Auth، OTP، audit log |
| 22 | [Testing و Observability](./06-operations/testing-observability.md) | **ارتقاء یافته** — code examples، factories، RBAC tests، coverage |
| 23 | [استراتژی Migration داده](./06-operations/data-migration.md) | Prisma migrate، import، rollback |
| 24 | [راهنمای Deployment](./06-operations/DEPLOYMENT.md) | CI/CD، Docker، production، backup |

### نقشه راه

| # | سند | توضیح |
|---|-----|--------|
| 25 | [نقشه راه توسعه](./07-roadmap/development-roadmap.md) | فازها و timeline |
| 26 | [فازهای عملیاتی + تسک‌ها](./07-roadmap/operational-phases.md) | checklist کامل |
| 26b | [InstallmentFeaturePhases](../InstallmentFeaturePhases/) | **فازبندی Enterprise** — IFP-TASK-001→199 (۲۳ حوزه محصول) |
| 27 | [چشم‌انداز ۱۰ ساله](./07-roadmap/ten-year-vision.md) | رشد پلتفرم |

### تصمیم‌های معماری

| # | سند | توضیح |
|---|-----|--------|
| 28 | [ADR — تصمیم‌های معماری](./08-decisions/adr-log.md) | ثبت تصمیم‌های تأیید شده (ADR-001 تا ADR-016) |

### توسعه

| # | سند | توضیح |
|---|-----|--------|
| 29 | [قوانین توسعه](./09-development/DEVELOPMENT_RULES.md) | **اجباری** |
| 30 | [استاندارد تعالی](./09-development/EXCELLENCE-STANDARDS.md) | DB، UI، فلو |
| 31 | [سیاست Soft Delete](./09-development/SOFT-DELETE-POLICY.md) | **بدون hard delete** |
| 32 | [راهنمای Code Review](./09-development/CODE-REVIEW-GUIDE.md) | **جدید** — checklist، red flags، review patterns |
| 33 | [استراتژی شاخه‌بندی (Git)](./09-development/BRANCHING-STRATEGY.md) | **جدید** — branch naming، PR process، hotfix، release |
| 34 | [قوانین نگارش مستندات](./09-development/DOCUMENTATION_AUTHORING_RULES.md) | docs ≥95 |
| 35 | [قوانین Phase/Epic/Task](./09-development/PHASE_EPIC_TASK_AUTHORING_RULES.md) | Tasks ≥95 |
| 36 | [راهنمای Onboarding](./09-development/ONBOARDING.md) | **شروع کار — setup محلی** |
| 37 | [پیکربندی محیط](./09-development/ENVIRONMENT-CONFIG.md) | همه env vars توضیح‌داده‌شده |
| 38 | [کاتالوگ کدهای خطا](./09-development/ERROR-CODES.md) | همه error codes با HTTP status |
| 39 | [واژه‌نامه دوزبانه](./09-development/GLOSSARY.md) | Persian/English domain terms |

---

## قوانین توسعه (اجباری)

| فایل | کاربرد |
|------|-----|
| [DEVELOPMENT_RULES.md](./09-development/DEVELOPMENT_RULES.md) | مرجع کامل |
| [EXCELLENCE-STANDARDS.md](./09-development/EXCELLENCE-STANDARDS.md) | تعالی حرفه‌ای |
| [SOFT-DELETE-POLICY.md](./09-development/SOFT-DELETE-POLICY.md) | Soft delete |
| [DOCUMENTATION_AUTHORING_RULES.md](./09-development/DOCUMENTATION_AUTHORING_RULES.md) | نگارش docs |
| [PHASE_EPIC_TASK_AUTHORING_RULES.md](./09-development/PHASE_EPIC_TASK_AUTHORING_RULES.md) | نگارش Tasks |
| [AGENTS.md](../AGENTS.md) | دستورالعمل AI |
| [.cursor/rules/](../.cursor/rules/) | قوانین auto-apply در Cursor |

---

## تصمیم‌های کلیدی (خلاصه)

| موضوع | تصمیم |
|-------|--------|
| محصول اول | مدیریت اقساط (ADR-001) |
| معماری | Modular Monolith + Workers (ADR-003) |
| Repo | pnpm Monorepo + Turborepo (ADR-010) |
| Backend | NestJS + TypeScript + Prisma + PostgreSQL (ADR-010) |
| Frontend | Next.js + shadcn/ui (ADR-010) |
| Customer identity | `User` (phone unique) + `GlobalCustomer` profile — [ADR-017](08-decisions/ADR-017-user-platform-identity.md) |
| Tenant structure | Tenant → Branch → Staff؛ TenantCustomer برای رابطه (ADR-002) |
| RBAC | Role (system + custom) + User override (grant/deny) + Data Scope (ADR-004) |
| Configurable | Schema-based settings — نه free-form rules (ADR-005) |
| Data retention | **Soft delete only** — no hard delete (ADR-013) |
| کانال اول | پنل وب فروشنده → ربات تلگرام → PWA مشتری → بله (ADR-006) |
| Money | BigInt ریال — نمایش تومان در UI (ADR-007) |
| Staff-Branch | assignedBranchIds[] + active branch session — نه FK تکی (ADR-015) |
| API Versioning | `/api/v1/` — breaking change → v2 با ۶ ماه parallel (ADR-016) |
| Native App | بعد از traction — فعلاً PWA + Bot |

---

## وضعیت پیاده‌سازی

| بخش | وضعیت |
|-----|--------|
| Product & Business | ✅ تأیید شده |
| Architecture & RBAC | ✅ تأیید شده |
| Technology Stack | ✅ تأیید شده |
| Prisma Schema (Foundation) | ✅ پیاده‌سازی شده (Phase 0) |
| Auth OTP + JWT | ✅ پیاده‌سازی شده |
| NestJS Guards (Auth/Permission/Module/DataScope) | ✅ پیاده‌سازی شده |
| Core tenant/branch/staff API | ✅ در حال توسعه |
| Installments Module | ⏳ فاز ۱ — در حال توسعه |
| Bot Gateway (Telegram) | ⏳ فاز ۲ |
| Scheduler / Reminders | ⏳ فاز ۲ |
| PWA مشتری | ⏳ فاز ۳ |
| Development Rules | ✅ v1.0 |
| Excellence Standards | ✅ v1.0 |
| Soft Delete Policy | ✅ v1.0 (ADR-013) |
| Doc/Task Authoring Rules | ✅ v1.0 |
| Onboarding Guide | ✅ v1.0 |
| Environment Config | ✅ v1.0 |
| Error Codes Catalog | ✅ v1.0 |
| API Contracts | ✅ v1.0 |
| Deployment Guide | ✅ v1.0 |
| Data Migration Strategy | ✅ v1.0 |
| Glossary | ✅ v1.0 |

---

## ساختار پوشه

```
docs/
├── README.md                              # این فایل — فهرست کامل
├── 01-product/                            # محصول، بازار، GTM
│   ├── vision-and-scope.md
│   └── market-and-gtm.md
├── 02-architecture/                       # معماری، RBAC، tenant، API
│   ├── overview.md                        # معماری کلان
│   ├── data-flow.md                       # ★ جریان داده + sequence diagrams
│   ├── tenancy-and-entities.md
│   ├── rbac.md
│   ├── settings.md
│   ├── modules.md
│   └── api-contracts.md
├── 03-modules/installments/              # domain اقساط — کامل‌ترین بخش
│   ├── domain.md                          # aggregate roots، events، use cases
│   ├── state-machines.md                  # Mermaid state diagrams
│   ├── BUSINESS-RULES.md                  # ★ BR-001 تا BR-047 — دوزبانه
│   ├── CUSTOMER-FLOWS.md                  # ★ CF-001 تا CF-007
│   ├── STAFF-FLOWS.md                     # ★ SF-001 تا SF-010
│   └── REPORTS.md                         # ★ Dashboard، KPI، query patterns
├── 04-technology/                         # stack، monorepo
├── 05-channels/                           # UI، bot، notification
├── 06-operations/                         # security، test، deployment، migration
│   ├── security-and-audit.md
│   ├── testing-observability.md           # ★ ارتقاء‌یافته — code examples
│   ├── data-migration.md
│   └── DEPLOYMENT.md
├── 07-roadmap/                            # فازها، operational checklist
├── 08-decisions/                          # ADR-log (ADR-001 تا ADR-016)
└── 09-development/                        # قوانین توسعه + onboarding + glossary
    ├── DEVELOPMENT_RULES.md
    ├── EXCELLENCE-STANDARDS.md
    ├── SOFT-DELETE-POLICY.md
    ├── CODE-REVIEW-GUIDE.md               # ★ checklist، red flags، patterns
    ├── BRANCHING-STRATEGY.md              # ★ git flow، PR process، hotfix
    ├── DOCUMENTATION_AUTHORING_RULES.md
    ├── PHASE_EPIC_TASK_AUTHORING_RULES.md
    ├── ONBOARDING.md
    ├── ENVIRONMENT-CONFIG.md
    ├── ERROR-CODES.md
    └── GLOSSARY.md

★ = جدید یا ارتقاء‌یافته در نسخه ۲.۰
```

---

## مستندات جدید (نسخه ۲.۰)

| سند | هدف | کاربرد |
|-----|-----|--------|
| [data-flow.md](./02-architecture/data-flow.md) | جریان داده کامل + sequence diagrams | توسعه‌دهنده backend |
| [BUSINESS-RULES.md](./03-modules/installments/BUSINESS-RULES.md) | ۴۷ قانون کسب‌وکار شماره‌گذاری‌شده — دوزبانه | همه |
| [CUSTOMER-FLOWS.md](./03-modules/installments/CUSTOMER-FLOWS.md) | فلوهای مشتری CF-001 تا CF-007 | product، bot dev |
| [STAFF-FLOWS.md](./03-modules/installments/STAFF-FLOWS.md) | فلوهای کارمند SF-001 تا SF-010 | frontend، product |
| [REPORTS.md](./03-modules/installments/REPORTS.md) | گزارش‌ها، KPI، query patterns، cache | backend، product |
| [CODE-REVIEW-GUIDE.md](./09-development/CODE-REVIEW-GUIDE.md) | چک‌لیست review، red flags، الگوها | همه توسعه‌دهندگان |
| [BRANCHING-STRATEGY.md](./09-development/BRANCHING-STRATEGY.md) | git flow، نام‌گذاری branch، PR process | همه |

---

*آخرین به‌روزرسانی: ۱۴۰۵/۰۴/۰۸ — نسخه ۲.۱*
