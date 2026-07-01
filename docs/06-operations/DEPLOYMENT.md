# راهنمای Deployment — Hivork

> **وضعیت:** Approved — v1.0  
> **نسخه:** 1.0 — 1405/04/08  
> **مخاطب:** DevOps، Backend Lead  
> **محیط‌های موجود:** `local`, `staging`, `production`

---

## ۱. مرور کلی

```
[GitHub] --push main--> [GitHub Actions CI]
                               |
                    ┌──────────┴──────────┐
                    | lint + typecheck    |
                    | unit tests          |
                    | integration tests   |
                    | build Docker images |
                    └──────────┬──────────┘
                               |
                         deploy to staging
                               |
                    (manual approve gate)
                               |
                         deploy to production
```

---

## ۲. زیرساخت Production

| سرویس | پلتفرم | توضیح |
|-------|--------|--------|
| **API** | Arvan Cloud (VPS) | Docker container، NestJS |
| **Web** | Arvan Cloud یا Vercel | Next.js — SSR |
| **PostgreSQL** | Arvan Managed DB | نسخه ۱۶+ |
| **Redis** | Arvan Managed Redis | نسخه ۷+ |
| **Object Storage** | Arvan S3 | فایل‌ها، export |
| **Domain** | `.ir` + Arvan DNS | SSL از Arvan |

**سیاست hosting:** همه سرویس‌ها داخل ایران — latency، trust، data sovereignty.

---

## ۳. پیش‌نیازهای Production

### ۳.۱ Secret‌ها

تمام secrets از طریق environment variables inject می‌شوند (نه فایل):

```bash
# اجباری در production
DATABASE_URL         # PostgreSQL با SSL
REDIS_URL            # Redis با رمز
JWT_ACCESS_SECRET    # حداقل ۴۸ کاراکتر random
JWT_REFRESH_SECRET   # متفاوت از access — حداقل ۴۸ کاراکتر
TELEGRAM_BOT_TOKEN
TELEGRAM_WEBHOOK_URL
TELEGRAM_WEBHOOK_SECRET
SENTRY_DSN
S3_ACCESS_KEY
S3_SECRET_KEY
```

مرجع کامل: [`docs/09-development/ENVIRONMENT-CONFIG.md`](../09-development/ENVIRONMENT-CONFIG.md)

### ۳.۲ Infrastructure Prerequisites

```bash
# PostgreSQL: user + database
CREATE USER hivork_prod WITH PASSWORD 'STRONG_PASSWORD';
CREATE DATABASE hivork_prod OWNER hivork_prod;
GRANT ALL PRIVILEGES ON DATABASE hivork_prod TO hivork_prod;
```

---

## ۴. Dockerfiles

### ۴.۱ API (`apps/api`)

```dockerfile
# docker/Dockerfile.api
FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
RUN npm install -g pnpm && pnpm install --frozen-lockfile
RUN pnpm build --filter api

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3001
CMD ["node", "dist/main.js"]
```

### ۴.۲ Web (`apps/web`)

```dockerfile
# docker/Dockerfile.web
FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
RUN npm install -g pnpm && pnpm install --frozen-lockfile
RUN pnpm build --filter web

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/web/.next ./.next
COPY --from=builder /app/apps/web/public ./public
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "server.js"]
```

---

## ۵. CI/CD Pipeline (GitHub Actions)

### ۵.۱ PR Pipeline

```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
    branches: [main, staging]

jobs:
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck

  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: hivork
          POSTGRES_PASSWORD: test_pass
          POSTGRES_DB: hivork_test
        ports: ['5432:5432']
      redis:
        image: redis:7
        ports: ['6379:6379']
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - run: pnpm install --frozen-lockfile
      - run: pnpm db:migrate
        env:
          DATABASE_URL: postgresql://hivork:test_pass@localhost:5432/hivork_test
      - run: pnpm test
        env:
          DATABASE_URL: postgresql://hivork:test_pass@localhost:5432/hivork_test
          REDIS_URL: redis://localhost:6379
          JWT_ACCESS_SECRET: test-secret-for-ci-only
          JWT_REFRESH_SECRET: test-refresh-secret-for-ci-only

  security-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - run: pnpm install --frozen-lockfile
      # بررسی hard delete ممنوع
      - name: Check no hard delete
        run: |
          if rg "\.delete\(" apps/ packages/ modules/ --include="*.ts" --exclude="*.spec.ts" -l; then
            echo "ERROR: Hard delete detected in codebase!"
            exit 1
          fi
      # اعتبارسنجی Prisma schema
      - run: pnpm exec prisma validate
```

### ۵.۲ Deploy Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  build-and-deploy-staging:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build Docker images
        run: |
          docker build -f docker/Dockerfile.api -t hivork-api:${{ github.sha }} .
          docker build -f docker/Dockerfile.web -t hivork-web:${{ github.sha }} .
      - name: Push to Registry
        run: |
          docker tag hivork-api:${{ github.sha }} registry.arvan.ir/hivork/api:staging
          docker push registry.arvan.ir/hivork/api:staging
      - name: Deploy to Staging
        run: |
          ssh staging-server "docker-compose pull && docker-compose up -d --no-deps api web"

  deploy-production:
    needs: build-and-deploy-staging
    runs-on: ubuntu-latest
    environment: production  # نیاز به approve دستی
    steps:
      - name: Run Migrations
        run: |
          ssh production-server "cd /app && DATABASE_URL=${{ secrets.DATABASE_URL }} pnpm exec prisma migrate deploy"
      - name: Deploy Production
        run: |
          docker tag hivork-api:${{ github.sha }} registry.arvan.ir/hivork/api:production
          docker push registry.arvan.ir/hivork/api:production
          ssh production-server "docker-compose pull && docker-compose up -d --no-deps api web"
```

---

## ۶. روش Deploy

### ۶.۱ اولین Deployment (از صفر)

```bash
# ۱. روی سرور production
ssh production-server

# ۲. کلون کد
git clone https://github.com/YOUR_ORG/hivork.git /app
cd /app

# ۳. inject environment variables
# (از secrets management یا manual)
cp .env.example .env
# ویرایش .env با مقادیر production

# ۴. Migration اولیه
DATABASE_URL="..." pnpm exec prisma migrate deploy

# ۵. Seed پلن‌ها و نقش‌های سیستمی
DATABASE_URL="..." pnpm exec tsx prisma/seed-production.ts

# ۶. راه‌اندازی سرویس‌ها
docker-compose -f docker/docker-compose.prod.yml up -d
```

### ۶.۲ Deploy جدید (rolling update)

```bash
# از CI/CD اجرا می‌شود — دستی فقط برای emergency

# ۱. اعمال Migration
pnpm exec prisma migrate deploy

# ۲. Pull image جدید و restart
docker-compose pull api
docker-compose up -d --no-deps --scale api=0 api
docker-compose up -d --no-deps api

# ۳. Smoke test
curl https://api.hivork.ir/health
```

### ۶.۳ Rollback

```bash
# برگشت به image قبلی
docker pull registry.arvan.ir/hivork/api:PREVIOUS_SHA
docker-compose up -d --no-deps api

# اگر migration داشته → rollback migration اول
pnpm exec prisma migrate resolve --rolled-back MIGRATION_NAME
```

---

## ۷. Migration در Production

### قوانین سخت

```
✅ فقط: prisma migrate deploy
❌ هرگز: prisma db push در production/staging
❌ هرگز: drop column بدون deprecation period
❌ هرگز: change type ستون مالی بدون ADR + migration plan
```

### روال Migration حساس

**مثال: rename کردن ستون (breaking)**

```
فاز ۱: ستون جدید اضافه کن (backward compatible) — deploy
فاز ۲: کد هر دو ستون را پر کن — deploy  
فاز ۳: کد فقط ستون جدید را بخواند — deploy
فاز ۴: ستون قدیمی را drop کن — deploy
```

---

## ۸. Health Checks و Monitoring

### Health Endpoint

```bash
# بررسی API
curl https://api.hivork.ir/health
# { "status": "ok", "db": "ok", "redis": "ok", "queue_depth": 5 }
```

### Alerting (تنظیم با Arvan یا UptimeRobot)

| شرط | Action |
|-----|--------|
| `/health` → 5xx برای ۳ دقیقه | Alert به تلگرام team |
| Queue depth > 1000 | Alert — بررسی scheduler |
| Error rate API > 1% | Alert — بررسی Sentry |
| Disk < 20% | Alert — cleanup یا resize |

### Sentry

```bash
# تأیید Sentry production
curl -X POST https://api.hivork.ir/v1/test-error  # فقط در staging
# → باید در Sentry ظاهر شود
```

---

## ۹. Backup و Restore

### Backup خودکار PostgreSQL

```bash
# Cron daily روی سرور (یا managed DB scheduler)
0 2 * * * pg_dump $DATABASE_URL | gzip > /backups/hivork_$(date +%Y%m%d).sql.gz

# آپلود به S3
0 3 * * * s3cmd put /backups/hivork_$(date +%Y%m%d).sql.gz s3://hivork-backups/daily/
```

| نوع | زمان‌بندی | نگهداری |
|-----|----------|---------|
| Full dump | روزانه ۲ شب تهران | ۹۰ روز |
| WAL archiving | پیوسته | ۷ روز |
| Pre-deploy snapshot | قبل از هر deploy | ۳۰ روز |

### تست Restore (ماهانه — اجباری)

```bash
# در محیط staging — نه production
pg_restore -d hivork_restore_test hivork_YYYYMMDD.sql.gz
# بررسی یکپارچگی داده
```

---

## ۱۰. Secrets Rotation

```bash
# تولید secret جدید
openssl rand -hex 48

# JWT Secret Rotation:
# ۱. JWT_REFRESH_SECRET جدید را اضافه کن (dual-key validation)
# ۲. Deploy — همه token‌های جدید با secret جدید
# ۳. صبر تا TTL قدیمی (۳۰ روز) تمام شود
# ۴. secret قدیمی را حذف کن
```

---

## ۱۱. Telegram Webhook Setup

```bash
# Set webhook (یک بار یا بعد از تغییر domain)
curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{
    \"url\": \"https://api.hivork.ir/webhooks/telegram\",
    \"secret_token\": \"$TELEGRAM_WEBHOOK_SECRET\",
    \"allowed_updates\": [\"message\", \"callback_query\"]
  }"

# تأیید webhook
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getWebhookInfo"
```

---

## ۱۲. Checklist قبل از Deploy Production

```
[ ] همه tests در CI pass هستند
[ ] Migration review شده (ستون drop، type change)
[ ] DB backup قبل از deploy گرفته شده
[ ] Sentry release tagged
[ ] Staging smoke test OK
[ ] CHANGELOG یا PR approved
[ ] On-call مطلع است (در صورت deploy در ساعات غیر کاری)
```

---

*نسخه 1.0 — 1405/04/08*
