# Epic-01 — Password Credentials

> **Phase:** 01 — Auth & Security  
> **منبع محصول:** §۱ ورود با رمز عبور

---

## هدف Epic

افزودن **رمز عبور platform-level** به هویت `User` (ADR-017): ADR-018، schema `UserCredential`، API ورود staff با password، و تب رمز در صفحه login. OTP Phase 0 همچنان برای OTP-only login و step-up باقی می‌ماند.

---

## Tasks

| ID | فایل | عنوان | Depends | Priority |
|----|------|--------|---------|----------|
| IFP-001 | [IFP-TASK-001-adr-user-credential-schema.md](./IFP-TASK-001-adr-user-credential-schema.md) | ADR-018 + Prisma UserCredential | Phase 0 TASK-017, TASK-055 | P0 |
| IFP-002 | [IFP-TASK-002-password-login-api.md](./IFP-TASK-002-password-login-api.md) | Use case + API password login (staff) | IFP-001 | P0 |
| IFP-003 | [IFP-TASK-003-login-page-password-tab.md](./IFP-TASK-003-login-page-password-tab.md) | Frontend login page — password tab | IFP-002 | P0 |

---

## Dependency داخلی Epic

```
IFP-001 → IFP-002 → IFP-003
```

---

## Policy notes

- `UserCredential` روی `User` — **نه** `Staff` (یک رمز برای همه membershipهای staff همان User)
- Hash: **Argon2id** (preferred) یا bcrypt cost ≥ 12 — هرگز plain text
- Soft delete: `UserCredential` business entity — base fields + `deletedAt`
- `mustChangePassword`: اجبار تغییر رمز پس از reset یا invite
- Register tenant (TASK-055): پس از `verifiedToken` → set password → credential create

---

## مراجع

- [ADR-017-user-platform-identity.md](../../../docs/08-decisions/ADR-017-user-platform-identity.md)
- [TASK-055-onboarding-auth-flow.md](../../../Phases/Phase-0-Foundation/Epic-06-Auth/TASK-055-onboarding-auth-flow.md)
