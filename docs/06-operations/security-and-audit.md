# امنیت و Audit — Hivork

> **وضعیت:** Approved — v1.0  
> **نسخه:** 1.0 — 1405/04/08  
> **ADR مرتبط:** ADR-004, ADR-013, ADR-015, ADR-017  

## Authentication

| Actor | Method |
|-------|--------|
| Staff | Phone OTP → JWT |
| Customer | Phone OTP → JWT |
| Platform Admin | Phone OTP + optional 2FA (future) |
| Bot webhook | Secret token verification |
| Internal jobs | Service account token |

### Token Strategy

| Token | TTL | Storage |
|-------|-----|---------|
| Access | 15 min | memory / Authorization header |
| Refresh (remember me) | 30 days (default `JWT_REFRESH_TTL`) | httpOnly secure cookie |
| Refresh (session) | 24 hours (default `JWT_REFRESH_SESSION_TTL`) | httpOnly secure cookie |

**Remember me:** Login forms pass `rememberMe`. When `true`, refresh cookie `maxAge` matches `JWT_REFRESH_TTL`; when `false`, `JWT_REFRESH_SESSION_TTL`. Staff `StaffSession.expiresAt` follows the same TTL.

**Refresh rotation (staff):** Every `POST /api/v1/auth/refresh` issues a new refresh JWT, updates `StaffSession.refreshTokenHash`, and blacklists the previous hash in Redis. Reuse of a rotated refresh token (cryptographically valid but hash blacklisted) triggers `RevokeAllStaffSessions`, audit `security.token.reuse_detected`, and `401 AUTH_REFRESH_COMPROMISED`.

Separate cookie/issuer for staff vs customer.

### Platform Identity (ADR-017)

| Item | Rule |
|------|------|
| `User.phone` | unique platform-wide — canonical OTP identity |
| Staff login | resolve `User` by phone → `Staff` by `(tenantSlug, userId)` |
| Multi-tenant staff | same User → `NEED_TENANT_SLUG` if >1 membership |
| Customer login | `User.findOrCreateByPhone` → `GlobalCustomer` by `userId` |
| Register tenant | OTP verify always returns `verifiedToken` — no global phone block |
| JWT customer claim | `global_customer_id` (not raw phone) |

### Active Branch (Staff UX — ADR-015)

| Item | Rule |
|------|------|
| JWT | **فقط** `tenantId` — نه `branchId` |
| Session | Redis `staff:{staffId}:active_branch` یا cookie `hivork_active_branch` |
| Request | Header `X-Branch-Id: <uuid>` (optional؛ override session) |
| API | `PATCH /api/v1/staff/me/active-branch` `{ branchId }` |
| Guard | `activeBranch ∈ canAccessBranch`؛ else `403 BRANCH_NOT_ALLOWED` |
| Create sale | `branchId` = active ?? primary ?? tenant default branch |

---

## Authorization Layers

```
1. Authenticated?
2. Actor type correct?
3. Tenant context valid?
4. Active branch allowed? (staff — ADR-015)
5. Module enabled?
6. Permission granted? (RBAC)
7. Data scope applied?
```

**Deny by default.**

---

## Multi-Tenant Isolation

- Every query: `WHERE tenant_id = :current`
- Prisma middleware auto-inject
- Integration tests: cross-tenant access must fail
- RLS (PostgreSQL) — phase 2 defense in depth

---

## Audit Log

### Sensitive Actions (must audit)

```
- sale.create, sale.cancel
- installment.waive
- payment.confirm, payment.reject
- staff.create, staff.delete
- role.assign, permission.override
- settings.change
- customer.import
- login failures (threshold)
```

### Audit Record

```typescript
AuditLog {
  id: UUID
  tenant_id?: UUID
  actor_type: 'staff' | 'customer' | 'system' | 'platform'
  actor_id: UUID
  action: string              // 'installments.payment.confirm'
  entity_type: string         // 'Installment'
  entity_id: UUID
  old_value?: JSON
  new_value?: JSON
  ip?: string
  user_agent?: string
  created_at: timestamptz
}
```

**Immutable** — no update/delete.

---

## Data Protection

| Layer | Measure |
|-------|---------|
| Transit | TLS everywhere |
| Rest | Disk encryption (server) |
| Secrets | env vars — rotate quarterly |
| Files | private bucket + signed URLs |
| PII | phone masked in logs |

### Marketing Message

> «داده‌های مالی شما روی سرور ایران، رمزنگاری‌شده، با log دسترسی.»

---

## Rate Limiting (Redis)

| Endpoint | Limit |
|----------|-------|
| OTP request | 3/min per phone |
| OTP verify | 5/min per phone |
| API general | 100/min per user |
| Bot webhook | 1000/min global |

---

## Input Validation

- Zod on all inputs
- Phone normalize: `09xxxxxxxxx`
- File upload: mime whitelist, max 5MB, no executable
- SQL: Prisma parameterized only

---

## CSRF / XSS

- Refresh token: httpOnly + SameSite
- CSP headers on web
- Sanitize user-generated text in bot messages

---

## Disaster Scenarios

| Scenario | Response |
|----------|----------|
| Telegram bot banned | SMS fallback + PWA push (future) |
| OTP provider down | queue retry + status page |
| DB corruption | daily backup + WAL — monthly restore test |

---

## Privacy (Customer)

- Export own data (future GDPR-like)
- Request delete → **soft delete + pseudonymize** — never SQL DELETE (`SOFT-DELETE-POLICY.md`)
- Tenant cannot see other tenant's customer personal installments
- Deleted records invisible to users — recoverable by admin/owner only

---

## Penetration Test

- Before scale (year 2)
- Focus: tenant isolation, IDOR, OTP bypass

---

## مراجع

- [`docs/09-development/ERROR-CODES.md`](../09-development/ERROR-CODES.md) — کدهای خطای AUTH_*
- [`docs/02-architecture/rbac.md`](../02-architecture/rbac.md)
- [`docs/09-development/SOFT-DELETE-POLICY.md`](../09-development/SOFT-DELETE-POLICY.md)
- ADR-013, ADR-015

---

*نسخه 1.0 — 1405/04/08*
