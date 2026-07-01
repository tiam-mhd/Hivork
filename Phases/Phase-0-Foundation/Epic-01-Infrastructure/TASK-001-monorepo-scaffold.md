# TASK-001: Monorepo Scaffold (pnpm + Turborepo)

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 0 |
| Epic | Epic-01-Infrastructure |
| ID | TASK-001 |
| Priority | P0 |
| Depends on | — |
| Blocks | TASK-002, TASK-003, TASK-006–016 |
| Estimated | 2h |
| Status | ✅ Done |

---

## هدف

ایجاد skeleton ریشه monorepo با pnpm workspace و Turborepo pipeline تا apps و packages بعدی روی آن سوار شوند. این task پایه اجرای تمام Phase 0 است — هیچ task دیگری بدون آن قابل اجرا نیست.

---

## معیار پذیرش

- [x] `pnpm install` در root بدون خطا (exit 0)
- [x] `pnpm turbo build` (حتی با package خالی) exit 0
- [x] `pnpm-workspace.yaml` شامل `apps/*`, `packages/*`, `modules/*`
- [x] Node `>=20`, pnpm `>=9` در `package.json` engines
- [x] `.gitignore` شامل `node_modules`, `.env`, `dist`, `.turbo`, `.next`
- [x] Root scripts: `dev`, `build`, `lint`, `test`, `typecheck`, `clean`, `format`, `format:check`
- [x] پوشه‌های `apps/`, `packages/`, `modules/`, `prisma/`, `docker/` ایجاد شده

---

## مشخصات فنی

### Root `package.json`

```json
{
  "name": "hivork",
  "private": true,
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "test": "turbo test",
    "typecheck": "turbo typecheck",
    "clean": "turbo clean && rimraf node_modules",
    "docker:up": "docker compose -f docker/docker-compose.yml up -d",
    "docker:down": "docker compose -f docker/docker-compose.yml down",
    "db:validate": "node scripts/ci/prisma-validate.mjs",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:seed": "tsx prisma/seed.ts",
    "ci:hard-delete-check": "node scripts/ci/hard-delete-check.mjs"
  },
  "engines": { "node": ">=20", "pnpm": ">=9" },
  "packageManager": "pnpm@9.15.0"
}
```

### `pnpm-workspace.yaml`

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
  - 'modules/*'
```

### `turbo.json`

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**", ".next/**"] },
    "dev": { "cache": false, "persistent": true },
    "lint": { "dependsOn": ["^build"] },
    "test": { "dependsOn": ["^build"] },
    "typecheck": { "dependsOn": ["^build"] },
    "clean": { "cache": false }
  }
}
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `package.json` |
| Create | `pnpm-workspace.yaml` |
| Create | `turbo.json` |
| Create | `.gitignore` |
| Create | `README.md` |
| Create dirs | `apps/`, `packages/`, `modules/`, `prisma/`, `docker/`, `scripts/ci/` |

---

## مراحل پیاده‌سازی

1. `pnpm init` در root
2. دستی `pnpm-workspace.yaml` ایجاد کن
3. `pnpm add -D turbo rimraf` در root
4. `turbo.json` با pipeline کامل
5. `.gitignore` با entries استاندارد
6. پوشه‌های خالی با `.gitkeep`
7. `pnpm install` و `pnpm turbo build` را تأیید کن

---

## Edge Cases & Errors

| سناریو | رفتار |
|--------|--------|
| Node قدیمی (< 20) | `pnpm install` error: engines check |
| pnpm قدیمی (< 9) | warning در terminal — packageManager مانع install |
| Package بدون `build` script | Turbo آن را skip می‌کند (بدون خطا) |
| `modules/*` خالی | Workspace آن را نادیده می‌گیرد |
| `pnpm turbo typecheck` بدون package | Exit 0 — هیچ کاری برای typecheck وجود ندارد |

---

## تست

```bash
pnpm install
pnpm turbo build
pnpm turbo lint
pnpm typecheck
```

Expected: همه exit 0

---

## ممنوعیت‌ها

- npm/yarn — فقط pnpm
- Lerna — Turborepo جایگزین است
- nested `package.json` بدون workspace pattern

---

## Policy Alignment

- [x] DEVELOPMENT_RULES.md §1 — Stack ثابت: pnpm + Turborepo
- [x] ADR-002 — معماری Modular Monolith (workspace structure پایه آن)
- [ ] SOFT-DELETE-POLICY — N/A (infrastructure, no data entities)

---

## مراجع

- `docs/04-technology/monorepo-structure.md`
- `docs/09-development/DEVELOPMENT_RULES.md`

---

## Self-Review Score

| محور | /امتیاز | یادداشت |
|------|---------|---------|
| Metadata (10) | 10/10 | ID, Priority, Depends, Blocks, Estimate, Status |
| Completeness (25) | 25/25 | AC measurable, tech spec کامل, files table |
| Policy (25) | 23/25 | ADR-002 cited; soft delete N/A documented |
| Executability (25) | 25/25 | Edge cases، Steps، Tests |
| Alignment (15) | 14/15 | Sync با monorepo-structure.md |
| **جمع** | **97/100** | ✅ Ready |
