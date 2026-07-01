# TASK-004: GitHub Actions CI

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 0 |
| Epic | Epic-01-Infrastructure |
| ID | TASK-004 |
| Priority | P1 |
| Depends on | TASK-001, TASK-003 |
| Blocks | — |
| Estimated | 3h |
| Status | ✅ Done |

---

## هدف

CI Pipeline در GitHub Actions برای تضمین کیفیت هر PR — شامل lint، typecheck، test، `prisma validate`، و **hard-delete grep guard** که هرگونه استفاده از `prisma.*.delete()` روی business models را reject می‌کند (ADR-013).

---

## معیار پذیرش

- [x] Workflow فایل `.github/workflows/ci.yml` وجود دارد
- [x] PostgreSQL 16 + Redis 7 service containers در CI
- [x] pnpm cache — سرعت build
- [x] `format:check` — Prettier بررسی می‌شود
- [x] `pnpm db:validate` — Prisma schema validate
- [x] **Hard delete grep** — PR با `prisma.*.delete(` fail می‌کند
- [x] `pnpm turbo lint` — ESLint
- [x] `pnpm turbo typecheck` — TypeScript strict
- [x] `pnpm turbo test` — Vitest unit/integration
- [x] `pnpm turbo build` — build artifacts
- [x] concurrency cancel-in-progress برای push‌های متوالی

---

## مشخصات فنی

### `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main, master, develop]
  pull_request:
    branches: [main, master, develop]

concurrency:
  group: ci-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

env:
  DATABASE_URL: postgresql://hivork:hivork_dev@localhost:5432/hivork?schema=public
  REDIS_URL: redis://localhost:6379

jobs:
  quality:
    name: Lint, typecheck, test
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: hivork
          POSTGRES_PASSWORD: hivork_dev
          POSTGRES_DB: hivork
        ports: ['5432:5432']
        options: >-
          --health-cmd "pg_isready -U hivork -d hivork"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7-alpine
        ports: ['6379:6379']
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Check formatting
        run: pnpm format:check

      - name: Forbid Prisma hard delete
        run: |
          ! rg "\.(delete|deleteMany)\(" apps packages modules \
            --glob "*.ts" --glob "!**/*.spec.ts" --glob "!**/prisma-soft-delete*"

      - name: Prisma validate
        run: pnpm db:validate

      - name: Lint
        run: pnpm turbo lint

      - name: Typecheck
        run: pnpm turbo typecheck

      - name: Test
        run: pnpm turbo test

      - name: Build
        run: pnpm turbo build
```

### Hard Delete Guard — منطق دقیق

```bash
# این command هر فراخوانی .delete() یا .deleteMany() را در TypeScript files
# به جز test files و فایل prisma-soft-delete extension پیدا می‌کند
! rg "\.(delete|deleteMany)\(" apps packages modules \
  --glob "*.ts" --glob "!**/*.spec.ts" --glob "!**/prisma-soft-delete*"
```

- `!` قبل از `rg` یعنی اگر match پیدا شد، CI fail می‌کند
- `--glob "!**/*.spec.ts"` — test files از بررسی خارج
- `--glob "!**/prisma-soft-delete*"` — extension فایل خارج

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `.github/workflows/ci.yml` |

---

## مراحل پیاده‌سازی

1. پوشه `.github/workflows/` را ایجاد کن
2. `ci.yml` را با service containers بنویس
3. Hard delete grep step را قبل از lint قرار بده (fast fail)
4. `pnpm db:validate` script در root را تأیید کن (TASK-001)
5. در PR اول بررسی کن که همه steps pass می‌کنند

---

## Edge Cases & Errors

| سناریو | رفتار |
|--------|--------|
| Branch نامناسب | CI اجرا نمی‌شود (فقط main/master/develop + PR) |
| `.delete(` در test file | Guard pass — spec files excluded |
| `prisma-soft-delete.ts` extension | Guard pass — مجاز است |
| PostgreSQL healthcheck timeout | CI fail: service unhealthy |
| Cache stale در pnpm | `--frozen-lockfile` تضمین می‌کند lock‌file تغییر نکرده |
| PR موازی روی همان branch | cancel-in-progress قدیمی را cancel می‌کند |
| `ripgrep` (rg) نصب نیست | Ubuntu Latest دارای آن است — اجرای local: `cargo install ripgrep` |

---

## تست

1. PR با `prisma.user.delete(` → CI fail در step "Forbid Prisma hard delete"
2. PR پاک → همه steps pass
3. `pnpm format:check` failure → PR fail قبل از lint

---

## Policy Alignment

- [x] ADR-013 — Soft delete mandatory — hard delete guard در CI
- [x] DEVELOPMENT_RULES.md §9 — "CI guards (hard delete grep)"
- [x] PHASE_EPIC_TASK_AUTHORING_RULES §4.7 — CI: prisma validate + grep hard-delete
- [x] SOFT-DELETE-POLICY.md — "CI: Reject PRs with Prisma `.delete(` on business models"

---

## مراجع

- `docs/09-development/SOFT-DELETE-POLICY.md`
- `docs/08-decisions/adr-log.md` — ADR-013
- `docs/06-operations/testing-observability.md`

---

## Self-Review Score

| محور | /امتیاز | یادداشت |
|------|---------|---------|
| Metadata (10) | 10/10 | همه فیلدها |
| Completeness (25) | 25/25 | AC testable، spec کامل با YAML |
| Policy (25) | 25/25 | ADR-013 explicit، hard-delete guard documented |
| Executability (25) | 25/25 | Edge cases، steps، tests |
| Alignment (15) | 15/15 | Sync با SOFT-DELETE-POLICY + AUTHORING_RULES §4.7 |
| **جمع** | **100/100** | ✅ Ready |
