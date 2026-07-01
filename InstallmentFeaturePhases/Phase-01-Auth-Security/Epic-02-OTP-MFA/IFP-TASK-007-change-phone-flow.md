# IFP-TASK-007: Change Phone Number Flow (Staff)

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 01 — Auth & Security |
| Epic | Epic-02-OTP-MFA |
| ID | IFP-007 |
| Priority | P1 |
| Depends on | IFP-001, TASK-035, TASK-036 |
| Blocks | — |
| Estimated | 8h |

---

## هدف

امکان **تغییر شماره موبایل** برای staff authenticated: تأیید OTP روی شماره فعلی، تأیید OTP روی شماره جدید، به‌روزرسانی `User.phone` (ADR-017) — با بررسی unique و revoke sessions.

---

## معیار پذیرش

- [ ] `POST /api/v1/staff/me/phone/change/request-current` — OTP به شماره فعلی
- [ ] `POST /api/v1/staff/me/phone/change/verify-current` — code → `phoneChangeToken`
- [ ] `POST /api/v1/staff/me/phone/change/request-new` — phoneChangeToken + newPhone → OTP جدید
- [ ] `POST /api/v1/staff/me/phone/change/confirm` — code → update User.phone
- [ ] Re-verify password required at start: `{ password }`
- [ ] شماره جدید unique — 409 `PHONE_ALREADY_IN_USE`
- [ ] پس از تغییر: revoke all sessions except current (optional keep current)
- [ ] Audit: `security.phone.changed` — old/new hashed in metadata

---

## مشخصات فنی

### Endpoints (all `@RequireAuth` staff)

| Step | Method | Path | Body |
|------|--------|------|------|
| 0 | POST | `/api/v1/staff/me/phone/change/init` | `{ password: string }` |
| 1 | POST | `/api/v1/staff/me/phone/change/request-current` | `{ changeSessionId: string }` |
| 2 | POST | `/api/v1/staff/me/phone/change/verify-current` | `{ changeSessionId, code }` |
| 3 | POST | `/api/v1/staff/me/phone/change/request-new` | `{ changeSessionId, newPhone }` |
| 4 | POST | `/api/v1/staff/me/phone/change/confirm` | `{ changeSessionId, code }` |

### changeSessionId

Redis `phone:change:{uuid}` TTL 1800s:
```typescript
{
  userId: string;
  staffId: string;
  step: 'current_verified' | 'new_sent';
  newPhone?: string;
  currentVerifiedAt?: string;
}
```

### phoneChangeToken (alternative to session)

JWT between step 2–3 — این task از Redis session استفاده می‌کند برای simplicity.

### Business Rules

- `newPhone` normalize `09xxxxxxxxx`
- Cannot change to same phone
- If `newPhone` belongs to another User with Staff memberships → 409 — contact support
- If `newPhone` has only GlobalCustomer → merge policy: block — manual support (document in ADR note)
- Update `User.phone` — Staff/GlobalCustomer unchanged (join User)
- Invalidate OTP caches for old phone

### Permission

`core.security.phone.change` — default grant to all staff for self (`@RequireAuth` + own userId check).

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/src/auth/change-phone.use-case.ts` |
| Create | `packages/contracts/src/auth/change-phone.schema.ts` |
| Create | `apps/api/src/staff/staff-phone.controller.ts` |
| Create | `apps/web/app/(dashboard)/settings/security/change-phone/page.tsx` |
| Update | `prisma/seed/permissions.ts` — `core.security.phone.change` |

---

## مراحل پیاده‌سازی

1. Redis change session store
2. Multi-step use case orchestrator
3. Password verify gate
4. User.phone update transaction
5. Session revoke (IFP-009 integration)
6. UI wizard 4 steps
7. Integration tests

---

## Edge Cases & Errors

| سناریو | Code | رفتار |
|--------|------|--------|
| Wrong password at init | 401 `AUTH_INVALID_CREDENTIALS` | |
| Session expired | 401 `AUTH_PHONE_CHANGE_EXPIRED` | restart |
| newPhone invalid | 400 `INVALID_PHONE` | |
| newPhone in use | 409 `PHONE_ALREADY_IN_USE` | |
| OTP wrong | 400 `AUTH_OTP_INVALID` | |
| User soft-deleted | 403 | |
| Concurrent change | 409 `AUTH_PHONE_CHANGE_IN_PROGRESS` | |

---

## تست

- [ ] Integration: full change flow
- [ ] Integration: duplicate phone → 409
- [ ] Integration: login with new phone works
- [ ] Cross-tenant: same user staff in 2 tenants — phone change affects both

---

## UX

- [ ] Wizard: Password → OTP فعلی → شماره جدید → OTP جدید → Success
- [ ] Warning: «تمام دستگاه‌ها به جز این دستگاه خارج می‌شوند»
- [ ] Progress stepper 4 steps
- [ ] Excellence §5/§7

---

## Flow

```
Settings → Security → Change phone
  → password → OTP current → new phone → OTP new → done
```

---

## Policy Alignment

- [ ] ADR-017 — User.phone canonical
- [ ] Audit with pseudonymized phones in log
- [ ] No hard delete

---

## مراجع

- [ADR-017-user-platform-identity.md](../../../docs/08-decisions/ADR-017-user-platform-identity.md)
- [IFP-TASK-009-session-revoke.md](../Epic-03-Session-Device/IFP-TASK-009-session-revoke.md)

---

## Self-Review Score

| محور | سقف | امتیاز |
|------|-----|--------|
| Metadata | /10 | 10 |
| Completeness | /25 | 24 |
| Policy | /25 | 24 |
| Executability | /25 | 24 |
| Alignment | /15 | 14 |
| **جمع** | **/100** | **96** |
