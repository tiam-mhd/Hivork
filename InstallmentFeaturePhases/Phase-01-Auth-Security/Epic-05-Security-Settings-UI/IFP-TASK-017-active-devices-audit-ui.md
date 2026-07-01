# IFP-TASK-017: Active Devices + Token Audit UI

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 01 — Auth & Security |
| Epic | Epic-05-Security-Settings-UI |
| ID | IFP-017 |
| Priority | P0 |
| Depends on | IFP-009, IFP-010, IFP-015 |
| Blocks | IFP-018 |
| Estimated | 8h |

---

## هدف

UI **دستگاه‌های فعال** و **تاریخچه توکن/نشست**: لیست نشست‌ها با revoke، نمایش last login، و فیلتر audit log رویدادهای امنیتی staff.

---

## معیار پذیرش

- [ ] Route `/settings/security/sessions` — session list از IFP-009
- [ ] Current device highlighted — badge «دستگاه فعلی»
- [ ] Revoke button per row + «خروج از همه دستگاه‌ها»
- [ ] Last login card از IFP-010 API
- [ ] Section Token Activity — `GET /api/v1/staff/me/security/audit-log?category=security`
- [ ] Cursor pagination + empty state
- [ ] Permission: `core.security.session.view` / `manage`
- [ ] Real-time count badge on security settings (optional)

---

## مشخصات فنی

### Routes

| Path | Component |
|------|-----------|
| `/settings/security/sessions` | `ActiveSessionsPage` |

### Session List UI

Data from `GET /api/v1/staff/me/sessions`:

| Column | Field |
|--------|-------|
| دستگاه | `deviceLabel` یا «نامشخص» |
| IP | masked `ipAddress` |
| آخرین فعالیت | `lastActiveAt` jalali relative |
| ایجاد | `createdAt` |
| وضعیت | `isCurrent` badge |
| عمل | Revoke button (disabled if current unless confirm) |

### Revoke Actions

```typescript
// Single
DELETE /api/v1/staff/me/sessions/:id

// All
POST /api/v1/staff/me/sessions/revoke-all
Body: { includeCurrent: false }
```

### Security Audit Log API

```
GET /api/v1/staff/me/security/audit-log
Query: ?cursor=&limit=20&category=security

Response items:
{
  id, action, createdAt, ipAddress,
  metadata: { deviceLabel?, sessionId?, method? }
}
```

Filtered actions:
- `auth.login_success`, `auth.login_failed`
- `auth.mfa_success`, `auth.mfa_failed`
- `security.session.revoked`, `security.session.revoked_all`
- `security.password.changed`, `security.password.reset_completed`
- `security.token.reuse_detected`

**Note:** Reuse existing AuditLog repository — filter `actorStaffId = me` + action prefix.

### Last Login Widget

Component `LastLoginCard` — data from `GET /api/v1/staff/me/security/last-login`

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/web/app/(dashboard)/settings/security/sessions/page.tsx` |
| Create | `apps/web/components/settings/security/session-list.tsx` |
| Create | `apps/web/components/settings/security/security-audit-log.tsx` |
| Create | `apps/web/components/settings/security/last-login-card.tsx` |
| Create | `packages/application/src/audit/list-staff-security-audit.use-case.ts` |
| Create | `apps/api/src/staff/staff-security-audit.controller.ts` |
| Create | `packages/contracts/src/audit/security-audit.schema.ts` |

---

## مراحل پیاده‌سازی

1. Security audit list use case — tenant + staff scope
2. API endpoint
3. Sessions page layout
4. Session list with revoke dialogs
5. Audit log table below fold
6. Last login card
7. E2E tests

---

## Edge Cases & Errors

| سناریو | UI |
|--------|-----|
| Revoke current session | confirm → redirect login |
| Empty sessions | empty state illustration |
| Revoke fails 404 | toast + refresh list |
| Audit log empty | «رویداد امنیتی ثبت نشده»
| No view permission | no-permission page |

---

## تست

- [ ] Component: session list renders isCurrent
- [ ] Integration: audit log returns only own staff events
- [ ] E2E: revoke session (IFP-018)
- [ ] RBAC: deny without session.view

---

## UX

- [ ] Excellence §7: breadcrumb «تنظیمات / امنیت / نشست‌ها»
- [ ] Confirm dialog revoke: «آیا از خروج این دستگاه مطمئن هستید؟»
- [ ] Revoke all: destructive red button + type confirm «خروج همه»
- [ ] Mobile: card layout instead of table
- [ ] Skeleton loading rows
- [ ] Jalali dates via shared formatter

---

## Flow

```
Security Settings → Active Sessions
  → view list → revoke one → toast
  → scroll audit log → load more
  → Logout all → confirm → redirect /login
```

---

## Policy Alignment

- [ ] Data scope: own staff only
- [ ] No refresh token hash in UI
- [ ] AuditLog append-only — read only
- [ ] ADR-013

---

## مراجع

- [IFP-TASK-009-session-revoke.md](../Epic-03-Session-Device/IFP-TASK-009-session-revoke.md)
- [IFP-TASK-010-last-login-device.md](../Epic-03-Session-Device/IFP-TASK-010-last-login-device.md)
- [security-and-audit.md](../../../docs/06-operations/security-and-audit.md)

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
