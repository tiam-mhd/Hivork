# TASK-040: Auth — OTP Rate Limit (Redis)

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 0 |
| Epic | Epic-06-Auth |
| ID | TASK-040 |
| Priority | P0 |
| Depends on | TASK-002, TASK-035 |
| Blocks | — |
| Estimated | 2h |

---

## هدف

جلوگیری از حملات brute-force به endpoint OTP با محدود کردن تعداد درخواست OTP به ۳ بار در هر ۶۰ ثانیه per phone. این rate limit مستقل از lockout تعداد تلاش verify (TASK-036) است. پیاده‌سازی با Redis INCR/EXPIRE برای sliding window.

---

## معیار پذیرش

- [ ] حداکثر ۳ درخواست OTP per phone per ۶۰ ثانیه (env `OTP_RATE_LIMIT_PER_MINUTE`)
- [ ] درخواست چهارم → HTTP 429 با `{ code: 'OTP_RATE_LIMITED', message: '...' }`
- [ ] Redis key: `ratelimit:otp:{phone}` با INCR + EXPIRE 60s روی اولین write
- [ ] `IOtpRateLimiter` port در application layer برای تزریق در use case
- [ ] `OtpRateLimiterService` قابل تنظیم با `OTP_RATE_LIMIT_PER_MINUTE` env var
- [ ] Integration test: ۴ درخواست متوالی → درخواست چهارم 429

---

## مشخصات فنی

### Redis Pattern

```
Key:    ratelimit:otp:{phone}    (مثال: ratelimit:otp:09123456789)
Value:  integer count
TTL:    60 seconds (بعد از اولین increment)
```

### الگوریتم

```typescript
async checkOtpRateLimit(phone: string): Promise<boolean> {
  const key = `ratelimit:otp:${phone}`;
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, OTP_RATE_LIMIT_WINDOW_SECONDS); // 60s
  }
  return count <= this.limitPerMinute;  // default: 3
}
```

**نکته:** اگر `count > limit` → `false` برمی‌گرداند. Use case باید 429 throw کند.

### IOtpRateLimiter Port

```typescript
// packages/application/src/ports/otp.port.ts
export interface IOtpRateLimiter {
  checkOtpRateLimit(phone: string): Promise<boolean>;
}
```

### Error Response (429)

```json
{ "code": "OTP_RATE_LIMITED", "message": "Too many OTP requests. Try again in a minute." }
```

### Env Variables

```env
OTP_RATE_LIMIT_PER_MINUTE=3    # default: 3
OTP_TTL_SECONDS=120            # default: 120
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/infrastructure/src/redis/rate-limiter.service.ts` |
| Update | `packages/application/src/ports/otp.port.ts` — `IOtpRateLimiter` |
| Update | `apps/api/src/auth/auth.module.ts` — wire `OtpRateLimiterService` |
| Update | `.env.example` — `OTP_RATE_LIMIT_PER_MINUTE=3` |

---

## مراحل پیاده‌سازی

1. اضافه کردن `IOtpRateLimiter` به `packages/application/src/ports/otp.port.ts`
2. پیاده‌سازی `OtpRateLimiterService` در infrastructure با Redis INCR/EXPIRE
3. تنظیم `limitPerMinute` از constructor (inject از config)
4. Wire در `AuthModule` با `OTP_RATE_LIMIT_PER_MINUTE` از AppConfigService
5. اضافه کردن env var به `.env.example`
6. نوشتن integration test

---

## Edge Cases & Errors

| سناریو | رفتار |
|--------|--------|
| اولین درخواست | INCR → 1، EXPIRE 60s → true |
| درخواست‌های ۲ و ۳ | INCR → 2, 3 → true |
| درخواست چهارم | INCR → 4 → false → use case throws 429 |
| بعد از 60 ثانیه | TTL expire → key حذف، شروع مجدد |
| Redis down | error propagates → 500 (graceful degradation در phase بعد) |
| Rate limit تنها phone-based است (نه IP-based) | طبق spec فعلی |

---

## تست

- [ ] Unit: `checkOtpRateLimit` — mock Redis, count=3 → true
- [ ] Unit: `checkOtpRateLimit` — mock Redis, count=4 → false
- [ ] Unit: `RequestOtpUseCase` — rate limiter false → `OTP_RATE_LIMITED` throw
- [ ] Integration: `otp-rate-limit.integration.spec.ts` — ۴ call متوالی → چهارم 429
- [ ] Integration: ۳ call → wait 61s → ۱ call → OK (window reset)

---

## Policy Alignment

- [ ] EXCELLENCE-STANDARDS §6 — rate limiting security endpoint
- [ ] `docs/06-operations/security-and-audit.md` § Rate Limiting
- [ ] OTP Redis key ephemeral — soft delete لازم نیست (not a business entity)
- [ ] تنها phone-based — IP-based در phase بعد (ADR نیاز دارد)

---

## مراجع

- `docs/06-operations/security-and-audit.md` § Rate Limiting
- TASK-035 (استفاده می‌کند)
- TASK-036 (lockout attempts — مستقل از rate limit)
- ADR-011

---

## Self-Review Score

| محور | /25 | یادداشت |
|------|-----|---------|
| Metadata | 10/10 | همه فیلدها |
| Completeness | 25/25 | Redis pattern، algorithm، port، env |
| Policy | 25/25 | Ephemeral Redis، no soft delete |
| Executability | 25/25 | Edge cases، tests، env var |
| Alignment | 15/15 | Sync با TASK-035، Epic README |
| **جمع** | **100/100** | ✅ Ready for implementation |
