# IFP-TASK-004: OTP MFA Step-Up After Password

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 01 — Auth & Security |
| Epic | Epic-02-OTP-MFA |
| ID | IFP-004 |
| Priority | P0 |
| Depends on | IFP-002, Phase 0 TASK-035, TASK-036 |
| Blocks | IFP-005, IFP-018 |
| Estimated | 8h |

---

## هدف

پیاده‌سازی **ورود دو مرحله‌ای**: پس از password صحیح، اگر MFA فعال باشد session کامل صادر نشود — کاربر باید OTP (SMS) یا TOTP را تأیید کند. این task OTP path را پوشش می‌دهد؛ TOTP در IFP-005.

---

## معیار پذیرش

- [ ] Password login با MFA enabled → `kind: mfa_required` + `mfaToken` (IFP-002)
- [ ] `POST /api/v1/auth/mfa/otp/request` — ارسال OTP با `mfaToken` auth
- [ ] `POST /api/v1/auth/mfa/verify` — OTP یا TOTP → full session
- [ ] `mfaToken` TTL 300s — single purpose `mfa_pending`
- [ ] OTP intent جدید: `mfa_step_up` — جدا از login/register
- [ ] پس از verify موفق → StaffSession + refresh cookie (IFP-008)
- [ ] Audit: `auth.mfa_success` / `auth.mfa_failed`

---

## مشخصات فنی

### MFA Policy (per User)

```typescript
// UserMfaSettings in metadata or UserMfaTotp model (IFP-005)
{
  otpEnabled: boolean;      // SMS step-up — default true when any MFA on
  totpEnabled: boolean;     // IFP-005
  requireMfaOnLogin: boolean;
}
```

**Default:** tenant setting `security.mfa_required` — اگر true، همه staff باید MFA setup کنند (IFP-005).

### Endpoints

#### POST /api/v1/auth/mfa/otp/request

```
Authorization: Bearer <mfaToken>
Body: { method: 'otp' }
Response: { expiresIn: 120, cooldownSeconds: 60 }
```

Rate: TASK-040 — 3/min per phone.

#### POST /api/v1/auth/mfa/verify

```
Authorization: Bearer <mfaToken>
Body: {
  method: 'otp' | 'totp';
  code: string;           // 5-digit OTP or 6-digit TOTP
}
Response: { kind: 'session', accessToken, expiresIn, staff, tenant }
```

### mfaToken Payload

```typescript
{
  sub: string;        // userId
  staffId: string;
  tenantId: string;
  actor: 'staff';
  type: 'mfa_pending';
  rememberMe?: boolean;
}
```

### OTP Store Key

```
otp:mfa_step_up:staff:{phone}
```

### Verify Logic

1. Verify mfaToken signature + TTL
2. If method=otp: validate against OtpStore (5 attempts lockout)
3. If method=totp: validate TOTP window ±1 (IFP-005 secret)
4. Issue access + refresh — same as TASK-036 loginStaff
5. Update `User.lastLoginAt`, `Staff.lastLoginAt`
6. Create StaffSession record

### Error Codes

| Code | HTTP |
|------|------|
| `AUTH_MFA_TOKEN_INVALID` | 401 |
| `AUTH_MFA_TOKEN_EXPIRED` | 401 |
| `AUTH_OTP_INVALID` | 400 |
| `AUTH_OTP_EXPIRED` | 400 |
| `AUTH_OTP_TOO_MANY_ATTEMPTS` | 429 |
| `AUTH_TOTP_INVALID` | 400 |

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/src/auth/mfa-request-otp.use-case.ts` |
| Create | `packages/application/src/auth/mfa-verify.use-case.ts` |
| Create | `packages/contracts/src/auth/mfa-verify.schema.ts` |
| Update | `apps/api/src/auth/auth.controller.ts` |
| Create | `apps/web/app/(auth)/login/mfa/page.tsx` |
| Create | `apps/web/components/auth/mfa-verify-form.tsx` |
| Update | `docs/09-development/ERROR-CODES.md` |

---

## مراحل پیاده‌سازی

1. Extend OTP store for `mfa_step_up` intent
2. `MfaRequestOtpUseCase` — validate mfaToken → send OTP
3. `MfaVerifyUseCase` — otp/totp branches → issue session
4. API endpoints + contracts
5. Frontend `/login/mfa` page
6. Integration tests

---

## Edge Cases & Errors

| سناریو | رفتار |
|--------|--------|
| mfaToken expired mid-flow | redirect /login — «نشست منقضی شد» |
| User disables MFA between steps | 403 `AUTH_MFA_NOT_ENABLED` — allow password-only retry |
| TOTP only (no SMS) | skip OTP request — direct TOTP input |
| rememberMe in mfaToken | pass to session creation (IFP-011) |
| Concurrent mfaToken use | second verify → 401 token consumed |

---

## تست

- [ ] Integration: password → mfa_required → otp verify → session
- [ ] Integration: invalid OTP 5x → lockout
- [ ] Integration: expired mfaToken → 401
- [ ] E2E: full MFA login in IFP-018

---

## UX

- [ ] `/login/mfa` — method tabs OTP / Authenticator
- [ ] Countdown resend OTP
- [ ] 6-digit OTP input با auto-advance
- [ ] Back → /login (clears mfaToken)
- [ ] Excellence §5/§7

---

## Flow

```
Password login → mfa_required
  → /login/mfa
  → (OTP) request OTP → enter code → verify
  → (TOTP) enter 6-digit → verify
  → /dashboard
```

---

## Policy Alignment

- [ ] TASK-040 rate limits reused
- [ ] ADR-017 — User phone for OTP
- [ ] Audit mandatory
- [ ] No session until MFA complete

---

## مراجع

- [IFP-TASK-002-password-login-api.md](../Epic-01-Password-Credentials/IFP-TASK-002-password-login-api.md)
- [TASK-036-auth-otp-verify.md](../../../Phases/Phase-0-Foundation/Epic-06-Auth/TASK-036-auth-otp-verify.md)

---

## Self-Review Score

| محور | سقف | امتیاز |
|------|-----|--------|
| Metadata | /10 | 10 |
| Completeness | /25 | 25 |
| Policy | /25 | 24 |
| Executability | /25 | 24 |
| Alignment | /15 | 14 |
| **جمع** | **/100** | **97** |
