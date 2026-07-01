# استک تکنولوژی — Hivork

> **وضعیت:** Approved — v1.0  
> **نسخه:** 1.0 — 1405/04/08  
> **ADR مرتبط:** ADR-010  
> **تغییر stack:** نیاز به ADR جدید دارد

## خلاصه

```
pnpm monorepo + Turborepo
TypeScript strict everywhere
NestJS (api + workers) │ Next.js (web)
PostgreSQL + Prisma │ Redis + BullMQ
grammY (Telegram) │ Bale HTTP adapter
Zod contracts │ shadcn/ui │ TanStack Query
Docker │ GitHub Actions │ Arvan Iran hosting
Sentry │ Pino logs │ OpenAPI
```

---

## Core Stack

| لایه | انتخاب | دلیل |
|------|--------|------|
| Language | **TypeScript (strict)** | type safety مالی، end-to-end |
| Monorepo | **pnpm + Turborepo** | استاندارد، سریع |
| API Framework | **NestJS** | DI، modules، guards، testing |
| ORM | **Prisma** | migration، schema as code |
| Database | **PostgreSQL 16+** | relational، JSONB، RLS |
| Cache/Queue | **Redis 7 + BullMQ** | reminder، rate limit |
| Web | **Next.js 15 App Router** | SSR + SPA |
| UI | **Tailwind + shadcn/ui** | ownership، RTL |
| Validation | **Zod** | shared API + frontend |
| Telegram | **grammY** | TypeScript-native |
| Bale | HTTP API + adapter | |
| Auth | OTP + JWT + Refresh (httpOnly) | استاندارد ایران |
| SMS | کاوه‌نگار / قاصدک / ملی‌پیامک | |
| Object Storage | Arvan S3-compatible | رسید، export |
| Logs | **Pino** (structured JSON) | |
| Errors | **Sentry** | |
| API Docs | **OpenAPI 3.1** | |
| CI/CD | GitHub Actions + Docker | |
| Hosting | **Arvan Cloud / سرور ایران** | latency، trust |

---

## عمداً انتخاب نمی‌شود (فعلاً)

| تکنولوژی | دلیل |
|----------|------|
| MongoDB | relational transactional |
| GraphQL | complexity بی‌مورد |
| Firebase/Supabase full | lock-in، hosting خارج |
| Microservices | زود است |
| Kubernetes | تا scale بالا لازم نیست |
| Float برای پول | دقت مالی |

---

## Money & Date

### Money

```typescript
// DB & API: BIGINT ریال
amountRial: bigint  // 1_500_000 = 150,000 Toman

// UI display: Toman (divide by 10) — based on setting
```

### Date

```typescript
// DB: timestamptz UTC
dueDate: DateTime

// Display: Asia/Tehran + Jalali
// Libraries: dayjs + jalali plugin | @persian-tools/persian-tools
```

---

## Auth Flow

```
1. POST /auth/otp/request  { phone }
2. SMS 5-digit OTP (TTL 2min, rate limit 3/min)
3. POST /auth/otp/verify   { phone, code }
4. Response: access_token (15min) + refresh (httpOnly cookie, 30d)
5. Staff vs Customer: different issuers/claims
```

---

## API Conventions

- REST `/api/v1/...`
- Pagination: **cursor-based**
- Idempotency-Key header برای POST مالی
- Error format: `{ code, message, details? }`

---

## Search (آینده)

- سال ۱–۲: PostgreSQL FTS
- سال ۳+: Meilisearch (در صورت نیاز)

---

## Real-time (آینده)

- SSE یا WebSocket برای نوتیف لحظه‌ای پنل فروشنده — فاز ۲

---

## مراجع

- [`docs/04-technology/monorepo-structure.md`](./monorepo-structure.md) — ساختار کد
- [`docs/09-development/ENVIRONMENT-CONFIG.md`](../09-development/ENVIRONMENT-CONFIG.md) — پیکربندی
- [`docs/06-operations/DEPLOYMENT.md`](../06-operations/DEPLOYMENT.md) — استقرار
- ADR-010

---

*نسخه 1.0 — 1405/04/08*
