# Epic-03 — Session & Device

> **Phase:** 01 — Auth & Security  
> **منبع محصول:** §۱ نشست، دستگاه، آخرین ورود، Remember Me، خروج همه دستگاه‌ها

---

## هدف Epic

ردیابی **نشست‌های staff** در DB با device fingerprint، نمایش/لغو نشست‌ها، آخرین ورود، و سیاست **Remember Me** با refresh token rotation.

---

## Tasks

| ID | فایل | عنوان | Depends | Priority |
|----|------|--------|---------|----------|
| IFP-008 | [IFP-TASK-008-staff-session-schema.md](./IFP-TASK-008-staff-session-schema.md) | Prisma StaffSession + device fingerprint | IFP-002, TASK-037 | P0 |
| IFP-009 | [IFP-TASK-009-session-revoke.md](./IFP-TASK-009-session-revoke.md) | List/revoke sessions + logout all | IFP-008 | P0 |
| IFP-010 | [IFP-TASK-010-last-login-device.md](./IFP-TASK-010-last-login-device.md) | Last login display + device detection | IFP-008, IFP-009 | P0 |
| IFP-011 | [IFP-TASK-011-remember-me-rotation.md](./IFP-TASK-011-remember-me-rotation.md) | Remember Me refresh token rotation | IFP-008, TASK-037 | P0 |

---

## Dependency داخلی Epic

```
IFP-008 → IFP-009 → IFP-010
IFP-008 → IFP-011
```

---

## Policy notes

- `StaffSession` tenant-scoped (`tenantId` + `staffId`)
- Refresh token: store **hash only** (`refreshTokenHash`) — never plain JWT in DB
- Revoke = `revokedAt` set — soft state، not hard delete
- Device fingerprint: client sends `X-Device-Id` (UUID v4 in localStorage) + server parses User-Agent

---

## مراجع

- [TASK-037-auth-jwt-tokens.md](../../../Phases/Phase-0-Foundation/Epic-06-Auth/TASK-037-auth-jwt-tokens.md)
- [ADR-015](../../../docs/08-decisions/) — no branchId in session JWT
