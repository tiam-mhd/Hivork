# توسعه و قوانین پیاده‌سازی

## فایل‌های اجباری (قوانین)

| فایل | نقش |
|------|-----|
| [DEVELOPMENT_RULES.md](./DEVELOPMENT_RULES.md) | **مرجع کامل** — ساختار، کد، امنیت، تست |
| [EXCELLENCE-STANDARDS.md](./EXCELLENCE-STANDARDS.md) | **تعالی حرفه‌ای** — DB، UI، Flow |
| [SOFT-DELETE-POLICY.md](./SOFT-DELETE-POLICY.md) | **Soft delete — ADR-013** |
| [DOCUMENTATION_AUTHORING_RULES.md](./DOCUMENTATION_AUTHORING_RULES.md) | **قوانین نگارش docs/** |
| [PHASE_EPIC_TASK_AUTHORING_RULES.md](./PHASE_EPIC_TASK_AUTHORING_RULES.md) | **قوانین Phase/Epic/Task** |
| [TASK-TEMPLATE.md](./TASK-TEMPLATE.md) | قالب کپی Task |
| [../../AGENTS.md](../../AGENTS.md) | نقطه ورود AI agents |
| [../../.cursor/rules/](../../.cursor/rules/) | قوانین Cursor (auto-apply در هر session) |

## راهنماهای کیفیت و فرآیند

| فایل | نقش |
|------|-----|
| [CODE-REVIEW-GUIDE.md](./CODE-REVIEW-GUIDE.md) | **چک‌لیست PR** — red flags، reviewer checklist، patterns |
| [BRANCHING-STRATEGY.md](./BRANCHING-STRATEGY.md) | **Git flow** — branch naming، commit format، PR process، hotfix |

## راهنماهای عملیاتی

| فایل | نقش |
|------|-----|
| [ONBOARDING.md](./ONBOARDING.md) | راه‌اندازی محیط dev — برای توسعه‌دهنده جدید |
| [ENVIRONMENT-CONFIG.md](./ENVIRONMENT-CONFIG.md) | همه env vars با توضیح کامل |
| [ERROR-CODES.md](./ERROR-CODES.md) | کاتالوگ کدهای خطا با HTTP status |
| [GLOSSARY.md](./GLOSSARY.md) | واژه‌نامه دوزبانه domain terms |

## پروتکل

```
هر task توسعه:
  1. AGENTS.md
  2. docs/README.md + سند مرتبط
  3. docs/08-decisions/adr-log.md
  4. DEVELOPMENT_RULES.md
  5. EXCELLENCE-STANDARDS.md
  6. SOFT-DELETE-POLICY.md
  7. (اگر doc/task می‌سازی) DOCUMENTATION / PHASE_EPIC_TASK authoring rules
  8. .cursor/rules/ (alwaysApply)
  9. شروع
```

## قوانین Cursor (`.cursor/rules/`)

| Rule | Scope | alwaysApply |
|------|-------|-------------|
| `00-master-protocol` | پروتکل کلی | ✅ |
| `01-architecture-tenancy` | معماری، tenant | ✅ |
| `02-security-rbac-audit` | RBAC، audit | ✅ |
| `06-testing-quality` | تست، DoD | ✅ |
| `08-excellence-completeness` | DB/UI/Flow کامل | ✅ |
| `09-soft-delete-mandatory` | Soft delete فقط | ✅ |
| `03-backend-nestjs` | Backend | apps/api, bot-gateway, scheduler, modules, packages/application,infrastructure |
| `04-domain-data` | Domain، Prisma | packages/domain, prisma |
| `05-frontend-nextjs` | Next.js | apps/web, packages/ui |
| `07-contracts-zod` | Zod contracts | packages/contracts |
| `10-documentation-authoring` | نگارش docs | docs/** |
| `11-phase-epic-task-authoring` | Phase/Epic/Task | Phases/** |
| `12-code-review-branching` | Code review، Git | \*.ts, \*.tsx, Phases/** |

---

---

*نسخه 1.1 — 1405/04/08*  
*هر تغییر در قوانین → همگام‌سازی DEVELOPMENT_RULES.md و .cursor/rules/*
