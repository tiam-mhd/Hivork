# Epic-02 — Apps Skeleton

## هدف Epic

ایجاد skeleton اجرایی برای چهار app اصلی monorepo: API (NestJS)، Web (Next.js)، Bot Gateway (NestJS)، Scheduler (NestJS + BullMQ) — هر کدام با health endpoint، ساختار Clean Architecture، و اتصال به workspace packages.

## Tasks

| ID  | فایل | عنوان | Priority | Depends | Blocks |
|-----|------|--------|----------|---------|--------|
| 006 | [TASK-006-apps-api.md](./TASK-006-apps-api.md) | App Skeleton — apps/api (NestJS) | P0 | 001, 003, 005 | 017, 035, 041, 047 |
| 007 | [TASK-007-apps-web.md](./TASK-007-apps-web.md) | App Skeleton — apps/web (Next.js) | P0 | 001, 003, 005 | 054 |
| 008 | [TASK-008-apps-bot-gateway.md](./TASK-008-apps-bot-gateway.md) | App Skeleton — apps/bot-gateway (NestJS) | P1 | 006 | — |
| 009 | [TASK-009-apps-scheduler.md](./TASK-009-apps-scheduler.md) | App Skeleton — apps/scheduler (NestJS + BullMQ) | P1 | 006, 002 | 050 |

## ترتیب اجرا (Dependency داخلی Epic)

```
TASK-006 (api) ──→ TASK-008 (bot-gateway)
TASK-006 (api) + TASK-002 (docker) ──→ TASK-009 (scheduler)
TASK-007 (web) — موازی با 006
```

TASK-006 و TASK-007 موازی اجرا می‌شوند. TASK-008 و TASK-009 بعد از TASK-006.

## Policy Notes

- **TASK-006**: Business logic ممنوع در controller — فقط use case calls (ADR-002)
- **TASK-006**: Global prefix `api` + route-level `v1/` ← استانداردشده
- **TASK-007**: `dir="rtl"` و `lang="fa"` اجباری — RTL layout از همان ابتدا
- **TASK-008**: Bot handler فقط facade — هیچ business logic مستقیم ندارد
- **TASK-009**: BullMQ برای job scheduling — نه naive cron

## وضعیت پیاده‌سازی

| Task | Status |
|------|--------|
| TASK-006 | ✅ Done |
| TASK-007 | ✅ Done |
| TASK-008 | ✅ Done |
| TASK-009 | ✅ Done |

## مراجع

- `docs/04-technology/monorepo-structure.md`
- `docs/05-channels/channels-strategy.md`
- `.cursor/rules/03-backend-nestjs.mdc`
- `.cursor/rules/05-frontend-nextjs.mdc`
