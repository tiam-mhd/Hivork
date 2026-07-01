# ADR-019: User Platform Credential (Password)

**وضعیت:** ✅ Accepted  
**تاریخ:** 1405/04/10  
**مرتبط:** ADR-017, ADR-013, IFP-TASK-001

> **توجه:** ADR-018 قبلاً برای Notification Channel Abstraction رزرو شده — credential platform = **ADR-019**.

---

## زمینه

Phase 0 فقط OTP login دارد. محصول Enterprise (§۱ ورود) نیاز به:

- ورود با رمز عبور
- reset password / forgot password
- MFA step-up (IFP-004+)
- lockout پس از تلاش ناموفق (IFP-013)

Credential نباید روی `Staff` duplicate شود — یک `User` می‌تواند Staff چند tenant باشد (ADR-017).

---

## تصمیم

### محل ذخیره

```
User (platform identity — phone unique)
 └── UserCredential (1:1) — passwordHash, lockout, mustChangePassword
```

| Entity | Scope | tenantId |
|--------|-------|----------|
| `UserCredential` | Platform | **ندارد** |

### Hash

- **Primary:** Argon2id (`memory: 65536`, `timeCost: 3`, `parallelism: 4`)
- **Fallback:** bcrypt cost 12 — فقط اگر `PASSWORD_HASHER=bcrypt` در env (legacy deploy)

### Lifecycle

| Event | رفتار |
|-------|--------|
| Register (Flow A) | OTP verify → `verifiedToken` → `POST /auth/password/set-initial` → credential |
| Invite staff | random password + `mustChangePassword=true` |
| Login | password → resolve `User` → Staff memberships (IFP-002) |
| Soft delete | `deletedAt` روی credential — restore توسط platform admin |

### Lockout

فیلدهای `failedLoginCount`, `lockedUntil`, `lastFailedLoginAt` روی `UserCredential` — policy در IFP-013.

---

## پیامد

- OTP-only login همچنان معتبر — credential اختیاری تا set-initial
- `verifiedToken` برای set-initial **consume نمی‌شود** — register بعداً همان token را consume می‌کند
- Audit: `security.password.set_initial`, `security.credential.soft_delete`
- Index: `(status)`, `(lockedUntil)`

---

## مراجع

- [ADR-017-user-platform-identity.md](./ADR-017-user-platform-identity.md)
- [SOFT-DELETE-POLICY.md](../09-development/SOFT-DELETE-POLICY.md)
- IFP-TASK-001
