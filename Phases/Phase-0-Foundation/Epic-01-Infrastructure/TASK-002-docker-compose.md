# TASK-002: Docker Compose (PostgreSQL 16 + Redis 7)

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 0 |
| Epic | Epic-01-Infrastructure |
| ID | TASK-002 |
| Priority | P0 |
| Depends on | TASK-001 |
| Blocks | TASK-017, TASK-035, TASK-041 |
| Estimated | 1h |
| Status | ✅ Done |

---

## هدف

محیط local development با PostgreSQL 16 و Redis 7 + Mailhog برای mock SMS/Email. این سرویس‌ها پیش‌نیاز اجرای migration، seed، و integration tests هستند.

---

## معیار پذیرش

- [x] `docker compose up -d` بدون خطا
- [x] PostgreSQL روی `localhost:5432` — healthcheck pass
- [x] Redis روی `localhost:6379` — ping OK
- [x] Mailhog UI روی `localhost:8025`، SMTP روی `localhost:1025`
- [x] Volume persistence برای `postgres_data`
- [x] `DATABASE_URL` و `REDIS_URL` در `.env.example` match
- [x] Root `package.json` شامل `docker:up`, `docker:down`, `docker:ps`, `docker:logs`

---

## مشخصات فنی

### `docker/docker-compose.yml`

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: hivork-postgres
    environment:
      POSTGRES_USER: hivork
      POSTGRES_PASSWORD: hivork_dev
      POSTGRES_DB: hivork
    ports: ['5432:5432']
    volumes: [postgres_data:/var/lib/postgresql/data]
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U hivork -d hivork']
      interval: 5s
      timeout: 5s
      retries: 5
      start_period: 10s
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    container_name: hivork-redis
    ports: ['6379:6379']
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 5s
      timeout: 5s
      retries: 5
      start_period: 5s
    restart: unless-stopped

  mailhog:
    image: mailhog/mailhog:latest
    container_name: hivork-mailhog
    ports: ['1025:1025', '8025:8025']
    restart: unless-stopped

volumes:
  postgres_data:
```

### Connection strings

```
DATABASE_URL=postgresql://hivork:hivork_dev@127.0.0.1:5432/hivork?schema=public
REDIS_URL=redis://localhost:6379
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `docker/docker-compose.yml` |
| Update | Root `package.json` scripts: `docker:up`, `docker:down`, `docker:ps`, `docker:logs` |

---

## مراحل پیاده‌سازی

1. `mkdir docker` در root
2. `docker/docker-compose.yml` را با تمام سرویس‌ها ایجاد کن
3. npm scripts در root `package.json` اضافه کن
4. `docker compose up -d` بزن و healthcheck را تأیید کن
5. Connection string را در `.env.example` document کن (TASK-005)

---

## Edge Cases & Errors

| سناریو | رفتار |
|--------|--------|
| Port 5432 قبلاً در حال استفاده | `docker compose up` fail — پیام: `address already in use` |
| Docker نصب نشده | command not found — نیاز به نصب Docker Desktop |
| Healthcheck شکست | Container unhealthy — بررسی logs: `docker logs hivork-postgres` |
| Volume پر شد | `no space left on device` — نیاز به `docker volume prune` |
| `postgres_data` corrupt | اجرای `docker volume rm hivork_postgres_data` و restart |
| Redis memory limit | در dev: کافی است؛ در prod: `maxmemory-policy` تنظیم شود |

---

## تست

```bash
docker compose -f docker/docker-compose.yml up -d
docker compose -f docker/docker-compose.yml ps
# باید همه سرویس‌ها healthy باشند
psql postgresql://hivork:hivork_dev@127.0.0.1:5432/hivork -c "SELECT 1"
redis-cli -u redis://localhost:6379 ping  # → PONG
curl http://localhost:8025  # Mailhog UI
```

---

## ممنوعیت‌ها

- PostgreSQL < 16 (ADR نقض)
- Redis بدون healthcheck در dev
- Volume نداشتن برای postgres_data (از دست رفتن داده در restart)

---

## Policy Alignment

- [x] DEVELOPMENT_RULES.md §1 — Stack ثابت: PostgreSQL + Redis
- [x] SOFT-DELETE-POLICY — N/A (container configuration)
- [x] EXCELLENCE-STANDARDS.md — هیچ business entity ندارد

---

## مراجع

- `docs/04-technology/monorepo-structure.md`
- `docs/04-technology/tech-stack.md` § Database / Redis
- `docs/09-development/DEVELOPMENT_RULES.md`

---

## Self-Review Score

| محور | /امتیاز | یادداشت |
|------|---------|---------|
| Metadata (10) | 10/10 | همه فیلدها |
| Completeness (25) | 25/25 | AC testable، spec کامل، files |
| Policy (25) | 22/25 | Stack confirmed؛ soft-delete N/A |
| Executability (25) | 25/25 | Steps، edge cases، tests |
| Alignment (15) | 15/15 | Sync با tech-stack.md |
| **جمع** | **97/100** | ✅ Ready |
