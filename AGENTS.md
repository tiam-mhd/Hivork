# Hivork — Agent Instructions

> **قبل از هر توسعه یا پیاده‌سازی، این فایل و قوانین `.cursor/rules/` را بخوان.**

## پروژه

**Hivork** — پلتفرم SaaS ماژولار (ایران). ماژول اول: **مدیریت اقساط**.

## پروتکل اجباری (هر PR / هر task)

1. **بخوان:** `docs/README.md` → سند مرتبط با task → `docs/08-decisions/adr-log.md`
2. **بخوان:** `.cursor/rules/` (همه `alwaysApply: true` + rule مرتبط با فایل)
3. **بخوان:** `docs/09-development/DEVELOPMENT_RULES.md` (مرجع کامل)
4. **بخوان:** `docs/09-development/EXCELLENCE-STANDARDS.md` (کمال حرفه‌ای — DB، UI، فلو)
5. **تأیید:** task داخل scope است؟ ADR نقض نمی‌شود؟
6. **اجرا:** فقط بعد از ۱–۵

## مراجع سریع

| موضوع | سند |
|--------|-----|
| معماری | `docs/02-architecture/overview.md` |
| Tenant / Customer / User | `docs/02-architecture/tenancy-and-entities.md` |
| User identity (ADR-017) | `docs/08-decisions/ADR-017-user-platform-identity.md` |
| RBAC | `docs/02-architecture/rbac.md` |
| ماژول اقساط | `docs/03-modules/installments/domain.md` |
| State machines | `docs/03-modules/installments/state-machines.md` |
| Monorepo | `docs/04-technology/monorepo-structure.md` |
| Tech stack | `docs/04-technology/tech-stack.md` |
| امنیت | `docs/06-operations/security-and-audit.md` |
| تست | `docs/06-operations/testing-observability.md` |
| قوانین توسعه | `docs/09-development/DEVELOPMENT_RULES.md` |
| استاندارد تعالی | `docs/09-development/EXCELLENCE-STANDARDS.md` |
| Soft Delete | `docs/09-development/SOFT-DELETE-POLICY.md` |
| Code Review | `docs/09-development/CODE-REVIEW-GUIDE.md` |
| Branching & Git | `docs/09-development/BRANCHING-STRATEGY.md` |
| نگارش docs | `docs/09-development/DOCUMENTATION_AUTHORING_RULES.md` |
| نگارش Phase/Task | `docs/09-development/PHASE_EPIC_TASK_AUTHORING_RULES.md` |
| Onboarding | `docs/09-development/ONBOARDING.md` |
| متغیرهای محیطی | `docs/09-development/ENVIRONMENT-CONFIG.md` |
| کدهای خطا | `docs/09-development/ERROR-CODES.md` |
| واژه‌نامه | `docs/09-development/GLOSSARY.md` |

## ممنوعیت‌های مطلق

- Business logic در Controller / Bot handler / React component
- Query بدون `tenant_id` (برای داده tenant-scoped)
- `float` / `number` برای پول
- Hard delete **هر** business data (فقط soft delete — ADR-013)
- `prisma.*.delete()` روی entityهای business
- Permission check فقط در UI (بدون backend guard)
- `db push` در production
- Free-form tenant business rules (فقط settings schema)
- Microservice / GraphQL / MongoDB (مگر ADR جدید)
- Happy-path-only UI (بدون empty/error/loading states)
- Schema/Form با فیلدهای حداقلی وقتی فیلدهای حرفه‌ای در EXCELLENCE-STANDARDS آمده

## Stack (ثابت)

`pnpm` + Turborepo · NestJS · Next.js · Prisma · PostgreSQL · Redis · BullMQ · Zod · TypeScript strict
