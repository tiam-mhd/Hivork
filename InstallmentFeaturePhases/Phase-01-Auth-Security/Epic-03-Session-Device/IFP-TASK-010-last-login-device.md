# IFP-TASK-010: Last Login Display + Device Detection

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 01 — Auth & Security |
| Epic | Epic-03-Session-Device |
| ID | IFP-010 |
| Priority | P0 |
| Depends on | IFP-008, IFP-009 |
| Blocks | IFP-003, IFP-015, IFP-017 |
| Estimated | 5h |

---

## هدف

نمایش **آخرین ورود موفق** (زمان، IP، دستگاه) در صفحه login پس از ورود و در dashboard/security — با ذخیره `lastLogin` snapshot در `User` و `Staff`.

---

## معیار پذیرش

- [ ] فیلدهای `lastLoginAt`, `lastLoginIp`, `lastLoginDeviceLabel` روی `Staff` (tenant-scoped display)
- [ ] فیلدهای `lastLoginAt`, `lastLoginIp` روی `User` (platform)
- [ ] به‌روزرسانی در هر login موفق (password، OTP، MFA)
- [ ] `previousLogin` در login response — snapshot **قبل از** update
- [ ] `GET /api/v1/staff/me/security/last-login` — for settings page
- [ ] Alert در dashboard اگر IP جدید (tenant setting `security.alert_new_ip`)

---

## مشخصات فنی

### Schema Extension — Staff

```prisma
// Add to Staff model:
lastLoginAt         DateTime? @map("last_login_at") @db.Timestamptz
lastLoginIp         String?   @map("last_login_ip") @db.VarChar(45)
lastLoginDeviceLabel String?  @map("last_login_device_label") @db.VarChar(120)
previousLoginAt     DateTime? @map("previous_login_at") @db.Timestamptz
previousLoginIp     String?   @map("previous_login_ip") @db.VarChar(45)
previousLoginDeviceLabel String? @map("previous_login_device_label") @db.VarChar(120)
```

Migration backfill: null OK.

### Update Service

```typescript
async recordLogin(staffId: string, userId: string, ctx: LoginContext) {
  // 1. Read current lastLogin* as previous
  // 2. Set new lastLogin* from ctx (ip, deviceLabel, now)
  // 3. Update User.lastLoginAt, User.lastLoginIp
  // 4. Return previous for API response
}
```

### Login Response Extension

```json
"lastLogin": {
  "at": "2026-06-28T09:00:00Z",
  "ip": "5.6.7.8",
  "deviceLabel": "Safari — iOS"
}
```
`lastLogin` = **previous** session info (not current).

### GET /api/v1/staff/me/security/last-login

```json
{
  "current": { "at": "...", "ip": "...", "deviceLabel": "..." },
  "previous": { "at": "...", "ip": "...", "deviceLabel": "..." }
}
```

### New IP Detection

```typescript
const isNewIp = previousLoginIp && previousLoginIp !== currentIp;
// Return flag in login response: { newIpAlert: true }
```

### Device Detection (client)

Reuse `device-id.ts` + match against StaffSession list for "recognized device".

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Update | `prisma/schema.prisma` — Staff fields |
| Create | `packages/application/src/auth/record-login.service.ts` |
| Update | all login use cases — call recordLogin |
| Create | `apps/api/src/staff/staff-security.controller.ts` |
| Update | `apps/web/components/auth/password-login-form.tsx` — last login banner |
| Create | `apps/web/components/dashboard/new-ip-alert.tsx` |

---

## مراحل پیاده‌سازی

1. Migration Staff login fields
2. RecordLoginService
3. Hook login flows
4. API endpoint
5. Login page banner (IFP-003)
6. Dashboard alert component

---

## Edge Cases & Errors

| سناریو | رفتار |
|--------|--------|
| First login ever | lastLogin null — no banner |
| IPv6 address | store full 45 chars |
| VPN IP change | may trigger new IP alert — expected |
| Privacy | never log phone in last login API |

---

## تست

- [ ] Integration: two logins — previous populated correctly
- [ ] Integration: last-login endpoint matches DB
- [ ] Unit: new IP detection logic

---

## UX

- [ ] Login success banner: «آخرین ورود شما: {jalali} از {device} ({ip masked})»
- [ ] IP masking: `1.2.*.*` for display
- [ ] Dashboard dismissible alert for new IP
- [ ] Excellence §7

---

## Flow

```
Login → record previous → show banner
Dashboard → new IP alert (first visit after login)
Settings → Security → last login details
```

---

## Policy Alignment

- [ ] No PII in logs — IP in audit only structured
- [ ] tenant-scoped Staff fields
- [ ] ADR-017 User.lastLoginAt sync

---

## مراجع

- [installment-module-features.md §1](../../../docs/01-product/installment-module-features.md)
- [IFP-TASK-008-staff-session-schema.md](./IFP-TASK-008-staff-session-schema.md)

---

## Self-Review Score

| محور | سقف | امتیاز |
|------|-----|--------|
| Metadata | /10 | 10 |
| Completeness | /25 | 24 |
| Policy | /25 | 23 |
| Executability | /25 | 24 |
| Alignment | /15 | 14 |
| **جمع** | **/100** | **95** |
