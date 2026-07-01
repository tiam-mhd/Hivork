# Epic-01 — Infrastructure

## هدف Epic

Scaffold کامل monorepo با pnpm + Turborepo، محیط Docker local، تنظیمات مشترک TypeScript/ESLint/Prettier، GitHub Actions CI با hard-delete guard، و قالب `.env.example` جامع — پایه اجرای تمام Phase 0.

## Tasks

| ID  | فایل | عنوان | Priority | Depends | Blocks |
|-----|------|--------|----------|---------|--------|
| 001 | [TASK-001-monorepo-scaffold.md](./TASK-001-monorepo-scaffold.md) | Monorepo Scaffold (pnpm + Turborepo) | P0 | — | 002–016 |
| 002 | [TASK-002-docker-compose.md](./TASK-002-docker-compose.md) | Docker Compose (PostgreSQL 16 + Redis 7) | P0 | 001 | 017, 035 |
| 003 | [TASK-003-shared-config.md](./TASK-003-shared-config.md) | Shared Config (ESLint, Prettier, TSConfig) | P0 | 001 | 006–016 |
| 004 | [TASK-004-github-actions.md](./TASK-004-github-actions.md) | GitHub Actions CI | P1 | 001, 003 | — |
| 005 | [TASK-005-env-example.md](./TASK-005-env-example.md) | Environment Variables Template | P0 | 002 | 006, 035 |

## ترتیب اجرا (Dependency داخلی Epic)

```
TASK-001 (monorepo)
  ├── TASK-002 (docker) ──→ TASK-005 (.env.example)
  ├── TASK-003 (shared config)
  └── (unblocks 004)
TASK-003 + TASK-001 ──→ TASK-004 (CI)
```

TASK-001 باید اول اجرا شود. TASK-002 و TASK-003 می‌توانند موازی باشند. TASK-005 بعد از TASK-002. TASK-004 آخر.

## Policy Notes

- **TASK-004**: CI شامل `prisma validate` + `rg "\.(delete|deleteMany)\("` hard-delete guard (ADR-013)
- **TASK-003**: `strict: true`, `noUncheckedIndexedAccess: true` — هیچ استثنا (DEVELOPMENT_RULES §8)
- **TASK-002**: PostgreSQL 16 (نه پایین‌تر) + Redis 7 — نسخه‌های مشخص در stack ثابت

## وضعیت پیاده‌سازی

| Task | Status |
|------|--------|
| TASK-001 | ✅ Done |
| TASK-002 | ✅ Done |
| TASK-003 | ✅ Done |
| TASK-004 | ✅ Done |
| TASK-005 | ✅ Done |

## مراجع

- `docs/04-technology/monorepo-structure.md`
- `docs/09-development/DEVELOPMENT_RULES.md`
- `docs/08-decisions/adr-log.md` — ADR-013 (soft delete)
