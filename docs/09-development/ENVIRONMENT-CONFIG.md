# راهنمای پیکربندی محیط — Hivork

> **وضعیت:** Approved — v1.0  
> **نسخه:** 1.0 — 1405/04/08  
> **مرجع:** `.env.example` در root پروژه  

---

## ۱. اصول

- **هرگز** secret را در git commit نکن
- `.env` فایل در `.gitignore` است — فقط `.env.example` در مخزن
- هر محیط فایل جدا دارد: `.env` (local)، `.env.staging`، `.env.production`
- Secrets را حداقل فصلی rotate کن

---

## ۲. محیط‌ها

| محیط | فایل | کاربرد |
|------|------|---------|
| `local` | `.env` | توسعه محلی با Docker |
| `staging` | سرور — inject از CI/CD | pre-production |
| `production` | سرور — inject از CI/CD | live |

---

## ۳. متغیرهای محیطی

### ۳.۱ پایگاه داده

```env
# PostgreSQL connection string
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE

# مثال local:
DATABASE_URL=postgresql://hivork:hivork_dev_pass@localhost:5432/hivork_dev

# مثال production (Arvan):
DATABASE_URL=postgresql://hivork_prod:STRONG_PASS@db-host:5432/hivork_prod?sslmode=require
```

| متغیر | اجباری | توضیح |
|-------|--------|--------|
| `DATABASE_URL` | ✅ | connection string PostgreSQL با کانکشن pool پشتیبانی |

### ۳.۲ Redis

```env
# Redis connection
REDIS_URL=redis://localhost:6379

# با رمز (production):
REDIS_URL=redis://:REDIS_PASS@redis-host:6379/0
```

| متغیر | اجباری | توضیح |
|-------|--------|--------|
| `REDIS_URL` | ✅ | BullMQ + rate limit + session active branch |

### ۳.۳ JWT و احراز هویت

```env
# Access token (کوتاه‌مدت — ۱۵ دقیقه)
JWT_ACCESS_SECRET=your-very-long-random-secret-here
JWT_ACCESS_EXPIRES_IN=15m

# Refresh token (بلندمدت — ۳۰ روز)
JWT_REFRESH_SECRET=another-very-long-random-different-secret
JWT_REFRESH_EXPIRES_IN=30d

# محیط
NODE_ENV=development   # development | staging | production
APP_PORT=3001
```

| متغیر | اجباری | پیش‌فرض | توضیح |
|-------|--------|---------|--------|
| `JWT_ACCESS_SECRET` | ✅ | — | حداقل ۳۲ کاراکتر تصادفی |
| `JWT_ACCESS_EXPIRES_IN` | ✅ | `15m` | TTL access token |
| `JWT_REFRESH_SECRET` | ✅ | — | متفاوت از access secret |
| `JWT_REFRESH_EXPIRES_IN` | ✅ | `30d` | TTL refresh token |
| `NODE_ENV` | ✅ | `development` | تعیین behavior امنیتی |
| `APP_PORT` | ❌ | `3001` | پورت NestJS API |

> **تولید secret امن:**
> ```bash
> node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
> ```

### ۳.۴ OTP و SMS

```env
# محیط dev: OTP در log کنسول چاپ می‌شود (نیازی به SMS)
OTP_PROVIDER=mock   # mock | kaveneghar | ghasedak | melipayamak

# کاوه‌نگار (provider پیش‌فرض production)
KAVENEGHAR_API_KEY=your-kaveneghar-api-key
KAVENEGHAR_SENDER=30004646xxxx

# قاصدک (جایگزین)
GHASEDAK_API_KEY=your-ghasedak-api-key

# Rate limit OTP (ثانیه بین دو درخواست)
OTP_COOLDOWN_SECONDS=60
OTP_TTL_SECONDS=120        # ۲ دقیقه
OTP_MAX_ATTEMPTS=5         # حداکثر تلاش قبل از block
```

| متغیر | اجباری | پیش‌فرض | توضیح |
|-------|--------|---------|--------|
| `OTP_PROVIDER` | ✅ | `mock` | `mock` فقط برای development |
| `KAVENEGHAR_API_KEY` | ⚠️ | — | اجباری اگر provider = kaveneghar |
| `OTP_TTL_SECONDS` | ❌ | `120` | TTL کد OTP در Redis |

### ۳.۵ ربات تلگرام

```env
# Telegram Bot Token از @BotFather
TELEGRAM_BOT_TOKEN=1234567890:ABC-...

# Webhook URL (باید HTTPS باشد)
TELEGRAM_WEBHOOK_URL=https://api.hivork.ir/webhooks/telegram

# Secret token برای verify کردن webhook
TELEGRAM_WEBHOOK_SECRET=random-secret-token

# Bot username (بدون @)
TELEGRAM_BOT_USERNAME=HivorkBot
```

| متغیر | اجباری | توضیح |
|-------|--------|--------|
| `TELEGRAM_BOT_TOKEN` | ✅ | از @BotFather دریافت می‌شود |
| `TELEGRAM_WEBHOOK_URL` | ✅ production | باید HTTPS باشد |
| `TELEGRAM_WEBHOOK_SECRET` | ✅ production | برای verify امنیت webhook |

### ۳.۶ ربات بله

```env
# Bale Bot Token
BALE_BOT_TOKEN=your-bale-bot-token

# Bale webhook URL
BALE_WEBHOOK_URL=https://api.hivork.ir/webhooks/bale
BALE_WEBHOOK_SECRET=random-bale-secret
```

### ۳.۷ Object Storage (Arvan S3-compatible)

```env
# آپلود فایل (رسید پرداخت، Export Excel)
S3_ENDPOINT=https://s3.ir-thr-at1.arvanstorage.ir
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
S3_BUCKET=hivork-files
S3_REGION=ir-thr-at1

# Signed URL TTL (ثانیه) برای دانلود فایل
S3_SIGNED_URL_TTL=3600
```

### ۳.۸ Sentry (Error Tracking)

```env
# در production و staging فعال
SENTRY_DSN=https://xxxx@sentry.io/project-id

# محیط برای Sentry
SENTRY_ENVIRONMENT=production   # staging | production
SENTRY_TRACES_SAMPLE_RATE=0.1  # 10% sampling در production
```

### ۳.۹ Frontend (Next.js)

```env
# در apps/web/.env.local یا root .env

# آدرس API backend
NEXT_PUBLIC_API_URL=http://localhost:3001

# آدرس bot link (برای deep link ربات)
NEXT_PUBLIC_TELEGRAM_BOT_URL=https://t.me/HivorkBot
NEXT_PUBLIC_BALE_BOT_URL=https://ble.ir/HivorkBot

# Sentry (frontend)
NEXT_PUBLIC_SENTRY_DSN=https://xxxx@sentry.io/frontend-project-id
```

### ۳.۱۰ BullMQ و Scheduler

```env
# تعداد concurrent workers
SCHEDULER_CONCURRENCY=5

# timezone برای cron jobs
TZ=Asia/Tehran

# ساعت اجرای reminder schedule (local Tehran time)
REMINDER_SCHEDULE_HOUR=6   # 06:00 تهران
```

---

## ۴. فایل `.env.example`

```env
# === Database ===
DATABASE_URL=postgresql://hivork:hivork_dev_pass@localhost:5432/hivork_dev

# === Redis ===
REDIS_URL=redis://localhost:6379

# === App ===
NODE_ENV=development
APP_PORT=3001
TZ=Asia/Tehran

# === JWT ===
JWT_ACCESS_SECRET=change-me-to-long-random-string-min-32-chars
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=different-change-me-to-long-random-string
JWT_REFRESH_EXPIRES_IN=30d

# === OTP ===
OTP_PROVIDER=mock
OTP_COOLDOWN_SECONDS=60
OTP_TTL_SECONDS=120
OTP_MAX_ATTEMPTS=5
# KAVENEGHAR_API_KEY=
# KAVENEGHAR_SENDER=

# === Telegram Bot ===
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_URL=
TELEGRAM_WEBHOOK_SECRET=
TELEGRAM_BOT_USERNAME=HivorkBot

# === Bale Bot ===
BALE_BOT_TOKEN=
BALE_WEBHOOK_URL=
BALE_WEBHOOK_SECRET=

# === Object Storage ===
S3_ENDPOINT=
S3_ACCESS_KEY=
S3_SECRET_KEY=
S3_BUCKET=hivork-files
S3_REGION=ir-thr-at1
S3_SIGNED_URL_TTL=3600

# === Sentry ===
# SENTRY_DSN=
# SENTRY_ENVIRONMENT=development

# === Scheduler ===
SCHEDULER_CONCURRENCY=5
REMINDER_SCHEDULE_HOUR=6

# === Frontend (Next.js) ===
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_TELEGRAM_BOT_URL=https://t.me/HivorkBot
```

---

## ۵. تأیید پیکربندی

```bash
# بررسی اتصال DB
pnpm --filter api exec prisma db execute --stdin <<< "SELECT 1"

# بررسی اتصال Redis
redis-cli -u "$REDIS_URL" ping  # باید PONG برگرداند

# Health check کامل
curl http://localhost:3001/health
# { "status": "ok", "db": "ok", "redis": "ok" }
```

---

## ۶. چرخه Rotate کردن Secret‌ها

| Secret | دوره Rotate | نحوه |
|--------|------------|------|
| `JWT_ACCESS_SECRET` | فصلی | deploy جدید + invalidate همه tokens |
| `JWT_REFRESH_SECRET` | فصلی | logout همه + deploy |
| `TELEGRAM_WEBHOOK_SECRET` | در صورت لو رفتن | bot re-register webhook |
| `S3_SECRET_KEY` | فصلی | ایجاد key جدید + حذف قدیمی |
| DB Password | سالانه | migration connection string |
| OTP API Key | طبق provider | بررسی vendor |

---

## ۷. امنیت محیط‌ها

```
Production / Staging secrets:
  ✅ Inject از CI/CD (GitHub Actions Secrets)
  ✅ نه در فایل روی سرور
  ✅ دسترسی محدود به DevOps team
  ❌ هرگز در git
  ❌ هرگز در log
  ❌ هرگز در Sentry payload
```

---

*نسخه 1.0 — 1405/04/08*
