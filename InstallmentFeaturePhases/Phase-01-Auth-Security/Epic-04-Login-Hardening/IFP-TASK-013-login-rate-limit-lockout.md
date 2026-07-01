# IFP-TASK-013: Login Rate Limiting + Lockout Policy

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 01 — Auth & Security |
| Epic | Epic-04-Login-Hardening |
| ID | IFP-013 |
| Priority | P0 |
| Depends on | IFP-002, IFP-001, Phase 0 TASK-040 |
| Blocks | IFP-018 |
| Estimated | 6h |

---

## هدف

تعریف **محدودیت دفعات ورود** برای password login: rate limit per IP/phone و **account lockout** پس از N تلاش ناموفق — هماهنگ با فیلدهای `UserCredential` (IFP-001).

---

## معیار پذیرش

- [ ] IP rate limit: 20 attempts / 15 min per IP → 429 `AUTH_LOGIN_RATE_LIMITED`
- [ ] Phone rate limit: 10 attempts / 15 min per phone
- [ ] Account lockout: 5 failed password → lock 30 min → 423 `AUTH_ACCOUNT_LOCKED`
- [ ] Lockout stored on `UserCredential.lockedUntil` + `failedLoginCount`
- [ ] Successful login resets `failedLoginCount`
- [ ] Redis sliding window for IP/phone (reuse TASK-040 pattern)
- [ ] Response `details.lockedUntil` ISO + `retryAfterSeconds`
- [ ] Audit: `auth.lockout_triggered`

---

## مشخصات فنی

### Redis Keys

```
ratelimit:login:ip:{ip}        — sliding window 15min
ratelimit:login:phone:{phone}  — sliding window 15min
```

### Lockout Policy (defaults — tenant overridable via settings)

| Setting key | Default |
|-------------|---------|
| `security.lockout.max_attempts` | 5 |
| `security.lockout.duration_minutes` | 30 |
| `security.lockout.reset_after_success` | true |

### UserCredential Fields (IFP-001)

```typescript
onFailedPassword():
  failedLoginCount++
  lastFailedLoginAt = now()
  if failedLoginCount >= maxAttempts:
    lockedUntil = now() + duration
    status = locked

onSuccess():
  failedLoginCount = 0
  lockedUntil = null
  status = active (unless must_change_password)
```

### Integration Points

- `PasswordLoginUseCase` — check lock before verify
- Optional: extend to OTP verify failures (separate counter on Redis — not credential)

### HTTP 423 Locked Response

```json
{
  "code": "AUTH_ACCOUNT_LOCKED",
  "message": "حساب به دلیل تلاش‌های ناموفق موقتاً قفل شده است",
  "details": {
    "lockedUntil": "2026-06-30T12:30:00Z",
    "retryAfterSeconds": 1800
  }
}
```

### Admin Unlock (future IFP-09 Users phase)

`POST /api/v1/staff/:id/unlock` — out of scope; document hook for tenant owner.

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/infrastructure/auth/login-rate-limiter.service.ts` |
| Update | `packages/application/src/auth/password-login.use-case.ts` |
| Update | `packages/domain/core/auth/user-credential.entity.ts` |
| Update | `docs/09-development/ERROR-CODES.md` |
| Update | `modules/core/src/settings.schema.ts` — lockout keys |

---

## مراحل پیاده‌سازی

1. LoginRateLimiter Redis service
2. Wire credential lockout logic
3. Integrate password login
4. Settings schema defaults
5. Error response formatter
6. Integration tests

---

## Edge Cases & Errors

| سناریو | Code | رفتار |
|--------|------|--------|
| Locked account login | 423 `AUTH_ACCOUNT_LOCKED` | |
| Lock expired | — | auto unlock on check |
| Rate limit IP | 429 `AUTH_LOGIN_RATE_LIMITED` | |
| Uniform invalid creds | 401 | still increment counters |
| Forgot password while locked | — | allowed (IFP-006) |
| Multi-tenant same user | — | lock blocks all tenants |

---

## تست

- [ ] Integration: 5 fails → locked
- [ ] Integration: wait/unlock time → success
- [ ] Integration: IP rate limit 429
- [ ] Unit: credential entity lockout math

---

## UX

- [ ] Login form shows countdown when 423
- [ ] fa message with minutes remaining
- [ ] Link to forgot password when locked

---

## Flow

```
Failed login → increment → 5th fail → lock 30min
Success → reset counter
IP flood → 429 before password check
```

---

## Policy Alignment

- [ ] Align TASK-040 patterns
- [ ] Audit lockout events
- [ ] No password in logs/redis

---

## مراجع

- [TASK-040-auth-otp-rate-limit.md](../../../Phases/Phase-0-Foundation/Epic-06-Auth/TASK-040-auth-otp-rate-limit.md)
- [IFP-TASK-001-adr-user-credential-schema.md](../Epic-01-Password-Credentials/IFP-TASK-001-adr-user-credential-schema.md)

---

## Self-Review Score

| محور | سقف | امتیاز |
|------|-----|--------|
| Metadata | /10 | 10 |
| Completeness | /25 | 25 |
| Policy | /25 | 24 |
| Executability | /25 | 25 |
| Alignment | /15 | 14 |
| **جمع** | **/100** | **98** |
