# Epic-03 — Packages Skeleton

## هدف Epic

ایجاد skeleton تمام workspace packages — domain (pure TS)، application (use cases + ports)، infrastructure (Prisma/Redis adapters)، contracts (Zod)، ui (RTL components)، i18n (Farsi formatters)، modules/core، و modules/installments. این packages پایه تمام Phase 0 و ماژول اقساط هستند.

## Tasks

| ID  | فایل | عنوان | Priority | Depends | Blocks |
|-----|------|--------|----------|---------|--------|
| 010 | [TASK-010-package-domain.md](./TASK-010-package-domain.md) | Package Skeleton — packages/domain | P0 | 003 | 029–034 |
| 011 | [TASK-011-package-application.md](./TASK-011-package-application.md) | Package Skeleton — packages/application | P0 | 010 | 035, 047, 054 |
| 012 | [TASK-012-package-infrastructure.md](./TASK-012-package-infrastructure.md) | Package Skeleton — packages/infrastructure | P0 | 010, 017 | 035, 041, 047 |
| 013 | [TASK-013-package-contracts.md](./TASK-013-package-contracts.md) | Package Skeleton — packages/contracts | P0 | 003 | 051–053, 035, 007 |
| 014 | [TASK-014-package-ui.md](./TASK-014-package-ui.md) | Package Skeleton — packages/ui | P1 | 003, 007 | 054 |
| 015 | [TASK-015-package-i18n.md](./TASK-015-package-i18n.md) | Package Skeleton — packages/i18n | P1 | 003 | 007, 054 |
| 016 | [TASK-016-module-core-skeleton.md](./TASK-016-module-core-skeleton.md) | Module Skeleton — modules/core | P0 | 006, 010, 011 | 047, 041 |
| 059 | [TASK-059-modules-installments-skeleton.md](./TASK-059-modules-installments-skeleton.md) | Module Skeleton — modules/installments | P1 | 016 | 028, 043, 044 |

## ترتیب اجرا (Dependency داخلی Epic)

```
TASK-010 (domain)
  ├── TASK-011 (application) ──→ TASK-016 (core module) ──→ TASK-059 (installments module)
  └── TASK-012 (infrastructure)   [depends on TASK-006 api + TASK-017 prisma]

TASK-013 (contracts) — موازی با TASK-010 (فقط نیاز به TASK-003)
TASK-014 (ui) — موازی (نیاز به TASK-007 web)
TASK-015 (i18n) — موازی (فقط TASK-003)
```

## Policy Notes

- **TASK-010**: Pure TypeScript — هیچ NestJS/Prisma import ندارد (zero framework)
- **TASK-011**: فقط `@hivork/domain` import — نه مستقیم infrastructure
- **TASK-012**: Prisma soft delete extension اجباری — `prisma.*.delete()` ممنوع
- **TASK-013**: Zod only — `bigint` برای مبالغ مالی — type shared از اینجا
- **TASK-014**: RTL logical properties (`ms-/me-` نه `ml-/mr-`)
- **TASK-015**: `formatToman(bigint)` — نه number/float
- **TASK-059**: permissions seed باید از TASK-028 خوانده شود

## وضعیت پیاده‌سازی

| Task | Status |
|------|--------|
| TASK-010 | ✅ Done |
| TASK-011 | ✅ Done |
| TASK-012 | ✅ Done |
| TASK-013 | ✅ Done |
| TASK-014 | ✅ Done |
| TASK-015 | ✅ Done |
| TASK-016 | ✅ Done |
| TASK-059 | ✅ Done |

## مراجع

- `docs/02-architecture/overview.md`
- `docs/04-technology/tech-stack.md`
- `docs/09-development/SOFT-DELETE-POLICY.md`
- `docs/02-architecture/rbac.md`
