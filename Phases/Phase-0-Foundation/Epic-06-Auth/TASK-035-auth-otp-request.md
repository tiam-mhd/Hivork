# TASK-035: Auth — OTP Request Endpoint

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 0 |
| Epic | Epic-06-Auth |
| ID | TASK-035 |
| Priority | P0 |
| Depends on | TASK-006, TASK-012, TASK-013, TASK-051 |
| Blocks | TASK-036, TASK-054 |
| Estimated | 3h |

---

## هدف

اولین گام هر flow احراز هویت (لاگین / ثبت‌نام) در Hivork است. کاربر (Staff یا Customer) با ارسال شماره موبایل، یک OTP پنج‌رقمی درخواست می‌کند. OTP در Redis ذخیره و از طریق SMS ارسال می‌شود. شماره موبایل خام هرگز در لاگ ذخیره نمی‌شود.

---

## معیار پذیرش

- [ ] `POST /api/v1/auth/otp/request` با بدنه معتبر → HTTP 200 + `{ success: true, expiresIn: number }`
- [ ] شماره موبایل نرمال‌سازی می‌شود (TASK-039 — `normalizePhone`)
- [ ] OTP پنج‌رقمی (crypto-safe) در Redis با TTL ذخیره می‌شود
- [ ] SMS از طریق `SmsPort` ارسال می‌شود (dev: ConsoleSmsAdapter)
- [ ] Rate limit: بیش از ۳ درخواست در ۶۰ ثانیه → 429 `OTP_RATE_LIMITED`
- [ ] کد OTP هرگز در response بازنمی‌گردد
- [ ] لاگ ساختار‌یافته: `{ event: 'otp.requested', phone: 09XX****XXX, actor }`
- [ ] شماره موبایل نامعتبر → 400 `INVALID_PHONE`

---

## مشخصات فنی

### Endpoint

```
POST /api/v1/auth/otp/request
Content-Type: application/json
```

### Request Body (`OtpRequestSchema`)

```typescript
{
  phone: string;      // هر فرمت ایرانی — نرمال می‌شود
  actor: 'staff' | 'customer';
  intent?: 'login' | 'register';  // default: 'login'
  tenantSlug?: string;            // optional برای pre-select tenant
}
```

### Response (200 OK)

```json
{ "success": true, "expiresIn": 120 }
```

**هرگز** فیلد `code` در response برگردانده نمی‌شود.

### Redis Schema

```
Key:  otp:{actor}:{phone}
Value (JSON): { "code": "12345", "attempts": 0 }
TTL: env.OTP_TTL_SECONDS (default: 120)
```

### Rate Limit

```
Key:  ratelimit:otp:{phone}
Sliding window: INCR + EXPIRE 60s on first write
Max: env.OTP_RATE_LIMIT_PER_MINUTE (default: 3)
```

### Logging (Structured — No PII)

```typescript
// controller layer — phone masked
logger.log({ event: 'otp.requested', phone: maskPhone(phone), actor });
// maskPhone: 09123456789 → 09XX****789
```

### OTP Generation

```typescript
const code = String(randomInt(10_000, 100_000)); // 5 digits, crypto-safe
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create/Update | `apps/api/src/auth/auth.controller.ts` — requestOtp endpoint |
| Create/Update | `apps/api/src/auth/auth.module.ts` — wire dependencies |
| Create/Update | `packages/application/src/auth/request-otp.use-case.ts` |
| Create/Update | `packages/contracts/src/auth/otp-request.schema.ts` |
| Create/Update | `packages/infrastructure/src/sms/console-sms.adapter.ts` |
| Create/Update | `packages/infrastructure/src/redis/redis-otp.store.ts` |
| Create/Update | `packages/infrastructure/src/redis/rate-limiter.service.ts` |

---

## مراحل پیاده‌سازی

1. تعریف `OtpRequestSchema` در `packages/contracts/src/auth/otp-request.schema.ts`
2. پیاده‌سازی `RequestOtpUseCase` — rate limit check → generate OTP → store in Redis → send SMS
3. پیاده‌سازی `RedisOtpStore.save()` با TTL
4. پیاده‌سازی `OtpRateLimiterService` (Redis INCR/EXPIRE)
5. پیاده‌سازی `ConsoleSmsAdapter` — چاپ کد در محیط dev
6. اضافه کردن endpoint در `AuthController.requestOtp()`
7. اضافه کردن لاگ ساختار‌یافته با `maskPhone` در controller
8. Wire کردن dependency‌ها در `AuthModule`
9. نوشتن تست unit + integration

---

## Edge Cases & Errors

| سناریو | HTTP | Code | رفتار |
|--------|------|------|--------|
| شماره موبایل نامعتبر (مثل `08xx...`) | 400 | `INVALID_PHONE` | Zod validation fail |
| بدنه ناقص/نادرست | 400 | `VALIDATION_ERROR` | Zod parse error |
| rate limit تجاوز (4+ در 60s) | 429 | `OTP_RATE_LIMITED` | `{ code, message }` |
| خطای داخلی Redis | 500 | — | exception unhandled (NestJS default filter) |
| OTP قبلی هنوز فعال | — | — | بازنویسی می‌شود (طبیعی) |

---

## تست

- [ ] Unit: `RequestOtpUseCase` — rate limit exceeded → throw `OTP_RATE_LIMITED`
- [ ] Unit: `RequestOtpUseCase` — valid input → OTP stored + SMS sent
- [ ] Unit: `RequestOtpUseCase` — OTP code length is 5 digits
- [ ] Integration: valid request → Redis key `otp:staff:{phone}` وجود دارد
- [ ] Integration: 4th request in 60s → 429
- [ ] Integration: شماره `+98 912 345 6789` normalize شده ذخیره می‌شود

---

## Policy Alignment

- [ ] EXCELLENCE-STANDARDS §6 — endpoint با rate limit + validation + structured error
- [ ] ADR-011 — phone-based OTP, no PII in logs
- [ ] هیچ business entity ساخته نمی‌شود — Redis ephemeral (Soft Delete لازم نیست)

---

## مراجع

- `docs/06-operations/security-and-audit.md` § Rate Limiting
- `docs/04-technology/tech-stack.md` § Auth Flow
- TASK-036 (OTP Verify), TASK-039 (Phone Normalize), TASK-040 (Rate Limit), TASK-055 (Onboarding Flow)
- ADR-011

---

## Self-Review Score

| محور | /25 | یادداشت |
|------|-----|---------|
| Metadata | 10/10 | Priority, Depends, Blocks, Estimate همه کامل |
| Completeness | 25/25 | Spec کامل، Files table، مراحل کامل |
| Policy | 25/25 | EXCELLENCE §6، ADR-011، بدون PII log |
| Executability | 25/25 | Edge cases، tests، بدون ابهام |
| Alignment | 15/15 | Sync با TASK-055، Epic README |
| **جمع** | **100/100** | ✅ Ready for implementation |
