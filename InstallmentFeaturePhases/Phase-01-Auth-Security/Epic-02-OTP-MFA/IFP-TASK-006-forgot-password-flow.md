# IFP-TASK-006: Forgot Password Flow (OTP + Reset)

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 01 — Auth & Security |
| Epic | Epic-02-OTP-MFA |
| ID | IFP-006 |
| Priority | P0 |
| Depends on | IFP-001, Phase 0 TASK-035, TASK-036, IFP-012 (captcha) |
| Blocks | IFP-003 (link), IFP-018 |
| Estimated | 8h |

---

## هدف

پیاده‌سازی **فراموشی رمز عبور** برای staff: درخواست OTP به شماره ثبت‌شده، تأیید OTP، صدور `resetToken` کوتاه‌مدت، و تنظیم رمز جدید — با captcha و rate limit.

---

## معیار پذیرش

- [ ] `POST /api/v1/auth/password/forgot/request` — phone + captcha
- [ ] `POST /api/v1/auth/password/forgot/verify-otp` — phone + code → `resetToken`
- [ ] `POST /api/v1/auth/password/reset` — resetToken + new password
- [ ] فقط اگر `UserCredential` exists — در غیر این صورت پاسخ یکسان (anti-enumeration)
- [ ] پس از reset: `mustChangePassword=false`، revoke all StaffSessions (IFP-009)
- [ ] OTP intent: `password_reset`
- [ ] Audit: `security.password.reset_requested` / `reset_completed`

---

## مشخصات فنی

### Endpoints

#### POST /api/v1/auth/password/forgot/request

```typescript
Body: { phone: string; captchaToken: string }
Response: { expiresIn: 120, message: 'در صورت وجود حساب، کد ارسال شد' }
// Always 200 — even if phone unknown
```

#### POST /api/v1/auth/password/forgot/verify-otp

```typescript
Body: { phone: string; code: string }
Response: { resetToken: string; expiresIn: 600 }
```

#### POST /api/v1/auth/password/reset

```typescript
Body: {
  resetToken: string;
  password: string;
  passwordConfirm: string;
}
Response: { success: true }
```

### resetToken Payload

```typescript
{
  sub: userId;
  actor: 'staff';
  purpose: 'password_reset';
  type: 'reset';
}
```
TTL: 600s — single use — Redis `reset:token:{jti}` consumed on success

### Password Policy

همان IFP-001 — cannot equal last 3 hashes (store hash history in `metadata.passwordHistory` max 3)

### Side Effects on Reset

1. Update `passwordHash`, `passwordChangedAt`
2. `failedLoginCount = 0`, `lockedUntil = null`
3. Revoke all `StaffSession` for user across tenants
4. Blacklist all refresh tokens in Redis
5. Optional email/SMS notification (future — log only)

### Rate Limits

| Action | Limit |
|--------|-------|
| forgot/request | 3/hour per phone + 10/hour per IP |
| verify-otp | TASK-040 OTP rules |
| reset | 5/hour per IP |

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/src/auth/forgot-password/*.use-case.ts` |
| Create | `packages/contracts/src/auth/forgot-password.schema.ts` |
| Update | `apps/api/src/auth/auth.controller.ts` |
| Create | `apps/web/app/(auth)/forgot-password/page.tsx` |
| Create | `apps/web/app/(auth)/reset-password/page.tsx` |
| Create | `apps/web/components/auth/forgot-password-form.tsx` |

---

## مراحل پیاده‌سازی

1. Contracts + OTP intent `password_reset`
2. Request use case — captcha + uniform response
3. Verify OTP → sign resetToken
4. Reset use case — password update + session revoke
5. Frontend 2-step wizard
6. Integration + E2E tests

---

## Edge Cases & Errors

| سناریو | Code | رفتار |
|--------|------|--------|
| Phone not registered | 200 | same message — no OTP sent |
| OTP invalid | 400 `AUTH_OTP_INVALID` | |
| resetToken expired | 401 `AUTH_RESET_TOKEN_EXPIRED` | |
| resetToken reused | 401 `AUTH_RESET_TOKEN_INVALID` | |
| Weak password | 400 `AUTH_PASSWORD_TOO_WEAK` | |
| Same as recent password | 400 `AUTH_PASSWORD_REUSED` | |
| Account locked | still allow reset via OTP | clears lock on success |
| MFA enabled | reset allowed — sessions revoked |

---

## تست

- [ ] Integration: full flow request → verify → reset → login new password
- [ ] Integration: unknown phone → 200 no leak
- [ ] Integration: old sessions invalid after reset
- [ ] E2E in IFP-018

---

## UX

- [ ] `/auth/forgot-password` — phone + captcha
- [ ] Step 2: OTP input — resend countdown
- [ ] `/auth/reset-password?token=` — new password + confirm + strength meter
- [ ] Success → redirect `/login?reset=1`
- [ ] Excellence §5/§7 — multi-step progress indicator

---

## Flow

```
/login → Forgot password
  → enter phone → captcha → OTP sent
  → enter OTP → resetToken
  → new password page → submit
  → success → login
```

---

## Policy Alignment

- [ ] Anti-enumeration
- [ ] SOFT-DELETE — credential restore N/A
- [ ] ADR-017 — User phone
- [ ] Audit all steps

---

## مراجع

- [IFP-TASK-001-adr-user-credential-schema.md](../Epic-01-Password-Credentials/IFP-TASK-001-adr-user-credential-schema.md)
- [TASK-035-auth-otp-request.md](../../../Phases/Phase-0-Foundation/Epic-06-Auth/TASK-035-auth-otp-request.md)

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
