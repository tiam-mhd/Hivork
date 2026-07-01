# Epic-04 — Login Hardening

> **Phase:** 01 — Auth & Security  
> **منبع محصول:** §۱ Captcha، محدودیت دفعات ورود؛ §۲۰ IPهای مجاز

---

## هدف Epic

سخت‌سازی سطح ورود و tenant: **Captcha**، **rate limiting + account lockout**، و **IP allowlist** اختیاری per tenant.

---

## Tasks

| ID | فایل | عنوان | Depends | Priority |
|----|------|--------|---------|----------|
| IFP-012 | [IFP-TASK-012-captcha-integration.md](./IFP-TASK-012-captcha-integration.md) | Captcha (login/register/forgot) | Phase 0 TASK-035 | P0 |
| IFP-013 | [IFP-TASK-013-login-rate-limit-lockout.md](./IFP-TASK-013-login-rate-limit-lockout.md) | Login rate limit + lockout | IFP-002, TASK-040 | P0 |
| IFP-014 | [IFP-TASK-014-ip-allowlist.md](./IFP-TASK-014-ip-allowlist.md) | IP allowlist tenant setting | IFP-002, core settings | P1 |

---

## Dependency داخلی Epic

```
IFP-012 — parallel with IFP-002 (integrate before production)
IFP-002 → IFP-013, IFP-014
```

---

## Policy notes

- Captcha provider: **hCaptcha** or **Cloudflare Turnstile** — env configurable
- Lockout on `UserCredential` — platform level blocks all staff logins for that User
- IP allowlist: tenant owner only — `core.settings.edit`

---

## مراجع

- [TASK-040-auth-otp-rate-limit.md](../../../Phases/Phase-0-Foundation/Epic-06-Auth/TASK-040-auth-otp-rate-limit.md)
- [security-and-audit.md](../../../docs/06-operations/security-and-audit.md)
