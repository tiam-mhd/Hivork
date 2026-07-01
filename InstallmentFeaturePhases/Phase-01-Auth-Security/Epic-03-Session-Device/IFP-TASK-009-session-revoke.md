# IFP-TASK-009: List / Revoke Sessions + Logout All Devices

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 01 — Auth & Security |
| Epic | Epic-03-Session-Device |
| ID | IFP-009 |
| Priority | P0 |
| Depends on | IFP-008, TASK-037 |
| Blocks | IFP-010, IFP-015, IFP-017, IFP-006, IFP-007 |
| Estimated | 8h |

---

## هدف

API و use caseهای **مدیریت نشست**: لیست نشست‌های فعال staff، لغو تک نشست، خروج از همه دستگاه‌ها — همگام با Redis refresh blacklist.

---

## معیار پذیرش

- [ ] `GET /api/v1/staff/me/sessions` — cursor pagination
- [ ] `DELETE /api/v1/staff/me/sessions/:sessionId` — revoke one
- [ ] `POST /api/v1/staff/me/sessions/revoke-all` — revoke all except current (optional query `includeCurrent`)
- [ ] Current session flagged `isCurrent: true` (match refresh jti from cookie)
- [ ] Revoke → `revokedAt`, Redis blacklist refresh token
- [ ] `POST /api/v1/auth/logout` updated — revoke current StaffSession
- [ ] Permission: `core.security.session.manage` (self) — all staff default
- [ ] Audit: `security.session.revoked` / `revoked_all`

---

## مشخصات فنی

### GET /api/v1/staff/me/sessions

```
Query: ?cursor=&limit=20&status=active
Auth: @RequireAuth staff
Permission: core.security.session.view
```

Response:
```json
{
  "items": [
    {
      "id": "uuid",
      "deviceLabel": "Chrome — Windows",
      "ipAddress": "1.2.3.4",
      "lastActiveAt": "2026-06-30T08:00:00Z",
      "createdAt": "2026-06-29T10:00:00Z",
      "rememberMe": true,
      "isCurrent": true,
      "status": "active"
    }
  ],
  "nextCursor": "..."
}
```

Filter: `tenantId` from JWT + `staffId` from JWT — **never** other staff.

### DELETE /api/v1/staff/me/sessions/:sessionId

```
Permission: core.security.session.manage
Response: { success: true }
```

404 if session not found or not owned.

### POST /api/v1/staff/me/sessions/revoke-all

```typescript
Body: { includeCurrent?: boolean }  // default false
Response: { revokedCount: number }
```

### Revoke Implementation

```typescript
async revokeSession(sessionId: string, actorId: string, reason: string) {
  // 1. Load session — verify tenantId + staffId
  // 2. Set revokedAt, status=revoked, revokedById=actorId
  // 3. Redis blacklist refreshTokenHash
  // 4. Audit
}
```

### Logout Update (TASK-037)

`POST /api/v1/auth/logout` — additionally revoke matching StaffSession by refresh jti.

### Permissions (seed)

```typescript
'core.security.session.view',
'core.security.session.manage',
```

Default: all roles — self-scoped only in use case.

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/src/auth/list-staff-sessions.use-case.ts` |
| Create | `packages/application/src/auth/revoke-staff-session.use-case.ts` |
| Create | `packages/contracts/src/auth/staff-session.schema.ts` |
| Create | `apps/api/src/staff/staff-sessions.controller.ts` |
| Update | `packages/application/src/auth/logout.use-case.ts` |
| Update | `prisma/seed/permissions.ts` |

---

## مراحل پیاده‌سازی

1. Contracts + list query cursor
2. List use case — map to DTO hide refreshTokenHash
3. Revoke single + revoke all
4. Wire logout
5. Controller + guards
6. Integration tests + RBAC deny other staff's session

---

## Edge Cases & Errors

| سناریو | Code | رفتار |
|--------|------|--------|
| Revoke already revoked | 409 `SESSION_ALREADY_REVOKED` | idempotent 200 OK |
| Revoke current session | 200 | user logged out — clear cookie |
| Session not found | 404 `SESSION_NOT_FOUND` | |
| Cross-staff session ID | 404 | IDOR safe |
| revoke-all includeCurrent | — | logout response |

---

## تست

- [ ] Integration: list returns only own sessions
- [ ] Integration: revoke → refresh fails 401
- [ ] RBAC: cannot list another staff's sessions (wrong staffId in token only)
- [ ] Integration: revoke-all leaves current if includeCurrent=false

---

## UX

UI in IFP-015/017 — API spec here.

---

## Flow

```
Security Settings → Active Sessions
  → list → Revoke one → confirm dialog
  → Logout all → confirm → redirect login
```

---

## Policy Alignment

- [ ] Tenant isolation — tenantId filter
- [ ] Audit on revoke
- [ ] SOFT-DELETE — revoke state not hard delete
- [ ] ADR-015 — staff context from JWT

---

## مراجع

- [IFP-TASK-008-staff-session-schema.md](./IFP-TASK-008-staff-session-schema.md)
- [rbac.md](../../../docs/02-architecture/rbac.md)

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
