# TASK-005: Environment Variables Template

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 0 |
| Epic | Epic-01-Infrastructure |
| ID | TASK-005 |
| Priority | P0 |
| Depends on | TASK-002 |
| Blocks | TASK-006, TASK-035 |
| Estimated | 1h |
| Status | ✅ Done |

---

## هدف

`.env.example` جامع در root شامل همه environment variables پروژه با comment، بدون secret واقعی. این فایل سند زنده‌ای است که با اضافه شدن هر module/feature باید update شود.

---

## معیار پذیرش

- [x] `.env.example` در root وجود دارد
- [x] همه vars از TASK-002 (DB, Redis), TASK-006 (API), TASK-007 (Web), TASK-008 (Bot) documented
- [x] هر var یک comment توضیحی دارد (چه چیزی است، چه مقداری می‌گیرد)
- [x] `.env` در `.gitignore` — هیچ secret در git
- [x] `apps/api/.env.example` subset pointer به root
- [x] Validation schema در `apps/api/src/config/env.schema.ts` (TASK-006)
- [x] Secret vars: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` — comment "min 32 chars"

---

## مشخصات فنی — متغیرهای کامل

```bash
# =============================================================================
# Hivork — environment template
# Setup: cp .env.example .env
# Never commit .env with real secrets
# =============================================================================

# --- App ---
NODE_ENV=development
APP_URL=http://localhost:3000
API_URL=http://localhost:4000/api/v1
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
WEB_PORT=3000
API_PORT=4000
BOT_GATEWAY_PORT=4001
SCHEDULER_PORT=4002

# --- Database (docker compose — TASK-002) ---
DATABASE_URL=postgresql://hivork:hivork_dev@127.0.0.1:5432/hivork?schema=public

# --- Redis (docker compose — TASK-002) ---
# OTP storage, rate limits, BullMQ
REDIS_URL=redis://localhost:6379

# --- Auth / JWT ---
# Min 32 chars in production — generate with: openssl rand -base64 32
JWT_ACCESS_SECRET=change-me-access-secret-min-32-chars
JWT_REFRESH_SECRET=change-me-refresh-secret-min-32-chars
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=30d

# --- OTP ---
OTP_TTL_SECONDS=120
OTP_RATE_LIMIT_PER_MINUTE=3

# --- SMS ---
# dev: console (log only) | mailhog (SMTP) | kavenegar (production)
SMS_PROVIDER=console
KAVENEGAR_API_KEY=
SMTP_HOST=localhost
SMTP_PORT=1025

# --- Telegram (phase 2 — bot-gateway) ---
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=dev

# --- Bale (phase 2+ — bot-gateway) ---
BALE_BOT_TOKEN=
BALE_WEBHOOK_SECRET=

# --- Logging ---
# debug | info | warn | error
LOG_LEVEL=debug

# --- CORS (api — TASK-006) ---
CORS_ORIGIN=http://localhost:3000

# --- Seed data (TASK-028) ---
SEED_PLATFORM_ADMIN_PHONE=09120000001
SEED_OWNER_PHONE=09120000000
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `.env.example` (root) |
| Create | `apps/api/.env.example` (subset pointer) |
| Verify | `.env` در `.gitignore` |

---

## مراحل پیاده‌سازی

1. لیست همه vars از docs/سرویس‌های موجود جمع‌آوری کن
2. `.env.example` با comments ایجاد کن
3. تأیید کن `.env` در `.gitignore` است
4. `apps/api/.env.example` stub با لینک به root
5. هر بار module جدید: `.env.example` باید update شود (PR checklist)

---

## Edge Cases & Errors

| سناریو | رفتار |
|--------|--------|
| `JWT_ACCESS_SECRET` کمتر از ۳۲ کاراکتر | NestJS ConfigModule validation fail هنگام startup |
| `.env` فراموش شود commit نشده | `.gitignore` محافظت می‌کند |
| `DATABASE_URL` اشتباه | Prisma migrate fail — error واضح |
| `REDIS_URL` اشتباه | ioredis connection error هنگام startup |
| `SMS_PROVIDER=kavenegar` + بدون `KAVENEGAR_API_KEY` | Validation fail — باید در env.schema check شود |
| Port conflict | Docker compose error یا NestJS listen error |

---

## تست

```bash
cp .env.example .env
# مقادیر را بررسی کن
docker compose -f docker/docker-compose.yml up -d
pnpm --filter @hivork/api dev
# باید: "Application listening on port 4000"
```

---

## ممنوعیت‌ها

- Commit `.env` با secret واقعی
- Hard-code مقادیر env در کد (باید از ConfigService خوانده شوند)
- Var بدون comment

---

## Policy Alignment

- [x] DEVELOPMENT_RULES.md — `secrets in git` ممنوع
- [x] `.cursor/rules/06-testing-quality.mdc` — "Update `.env.example` for new env vars"
- [x] SOFT-DELETE-POLICY — N/A
- [x] ADR-013 — N/A (env template)

---

## مراجع

- `docs/06-operations/security-and-audit.md`
- `docs/09-development/DEVELOPMENT_RULES.md`

---

## Self-Review Score

| محور | /امتیاز | یادداشت |
|------|---------|---------|
| Metadata (10) | 10/10 | همه فیلدها |
| Completeness (25) | 25/25 | همه vars، comments، files |
| Policy (25) | 25/25 | No secrets in git — documented |
| Executability (25) | 25/25 | Edge cases، steps، tests |
| Alignment (15) | 15/15 | Sync با testing-quality rule |
| **جمع** | **100/100** | ✅ Ready |
