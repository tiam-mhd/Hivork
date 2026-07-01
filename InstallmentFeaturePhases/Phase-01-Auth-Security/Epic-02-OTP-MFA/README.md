# Epic-02 — OTP & MFA

> **Phase:** 01 — Auth & Security  
> **منبع محصول:** §۱ OTP، ورود دو مرحله‌ای، فراموشی رمز، تغییر شماره

---

## هدف Epic

گسترش احراز هویت با **MFA step-up** پس از password، **TOTP 2FA**، **فراموشی رمز** (OTP + reset)، و **تغییر شماره موبایل staff** — همه روی `User` platform identity (ADR-017).

---

## Tasks

| ID | فایل | عنوان | Depends | Priority |
|----|------|--------|---------|----------|
| IFP-004 | [IFP-TASK-004-otp-mfa-step-up.md](./IFP-TASK-004-otp-mfa-step-up.md) | OTP MFA step-up after password | IFP-002, TASK-035/036 | P0 |
| IFP-005 | [IFP-TASK-005-totp-2fa-setup.md](./IFP-TASK-005-totp-2fa-setup.md) | TOTP 2FA setup/verify/disable | IFP-001, IFP-004 | P0 |
| IFP-006 | [IFP-TASK-006-forgot-password-flow.md](./IFP-TASK-006-forgot-password-flow.md) | Forgot password (OTP + reset) | IFP-001, TASK-035/036 | P0 |
| IFP-007 | [IFP-TASK-007-change-phone-flow.md](./IFP-TASK-007-change-phone-flow.md) | Change phone number (staff) | IFP-001, TASK-035/036 | P1 |

---

## Dependency داخلی Epic

```
IFP-002 → IFP-004 → IFP-005
IFP-001 → IFP-006, IFP-007
```

---

## Policy notes

- MFA secret روی `UserMfaTotp` — platform level
- OTP rate limits از TASK-040 — reuse `OtpStore`
- تغییر phone: unique constraint روی `User.phone` — audit + re-verify
- Soft delete: `UserMfaTotp` — disable = soft delete + clear secret

---

## مراجع

- [TASK-036-auth-otp-verify.md](../../../Phases/Phase-0-Foundation/Epic-06-Auth/TASK-036-auth-otp-verify.md)
- [security-and-audit.md](../../../docs/06-operations/security-and-audit.md)
