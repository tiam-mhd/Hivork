# IFP-TASK-008: Prisma StaffSession + Device Fingerprint

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 01 — Auth & Security |
| Epic | Epic-03-Session-Device |
| ID | IFP-008 |
| Priority | P0 |
| Depends on | IFP-002, Phase 0 TASK-037 |
| Blocks | IFP-009, IFP-010, IFP-011, IFP-004 |
| Estimated | 8h |

---

## هدف

ایجاد مدل **`StaffSession`** برای ردیابی نشست‌های فعال staff per tenant: device fingerprint، IP، User-Agent، refresh token hash، و expiry — پایه revoke، Remember Me، و نمایش دستگاه‌ها.

---

## معیار پذیرش

- [ ] Prisma model `StaffSession` با base fields + `tenantId`
- [ ] ایجاد session در هر login موفق (password، OTP، MFA)
- [ ] `refreshTokenHash` = SHA-256(jti) — نه JWT کامل
- [ ] Client `X-Device-Id` header (UUID) ذخیره در `deviceId`
- [ ] Server-side UA parse → `deviceLabel` (e.g. «Chrome — Windows 10»)
- [ ] `expiresAt` از refresh TTL — کوتاه‌تر اگر `rememberMe=false`
- [ ] Index `(tenantId, staffId, revokedAt)` + `(expiresAt)`
- [ ] Prisma extension: default `revokedAt: null` برای active queries

---

## مشخصات فنی

### Prisma Schema

```prisma
enum SessionStatus {
  active
  revoked
  expired
}

model StaffSession {
  id                String        @id @default(uuid()) @db.Uuid
  tenantId          String        @map("tenant_id") @db.Uuid
  staffId           String        @map("staff_id") @db.Uuid
  userId            String        @map("user_id") @db.Uuid
  refreshTokenHash  String        @unique @map("refresh_token_hash") @db.VarChar(64)
  deviceId          String?       @map("device_id") @db.VarChar(36)
  deviceFingerprint String?       @map("device_fingerprint") @db.VarChar(128)
  deviceLabel       String?       @map("device_label") @db.VarChar(120)
  userAgent         String?       @map("user_agent") @db.Text
  ipAddress         String?       @map("ip_address") @db.VarChar(45)
  rememberMe        Boolean       @default(false) @map("remember_me")
  status            SessionStatus @default(active)
  lastActiveAt      DateTime      @default(now()) @map("last_active_at") @db.Timestamptz
  expiresAt         DateTime      @map("expires_at") @db.Timestamptz
  revokedAt         DateTime?     @map("revoked_at") @db.Timestamptz
  revokedById       String?       @map("revoked_by_id") @db.Uuid
  revokeReason      String?       @map("revoke_reason")
  createdAt         DateTime      @default(now()) @map("created_at") @db.Timestamptz
  updatedAt         DateTime      @updatedAt @map("updated_at") @db.Timestamptz
  createdById       String?       @map("created_by_id") @db.Uuid
  updatedById       String?       @map("updated_by_id") @db.Uuid
  deletedAt         DateTime?     @map("deleted_at") @db.Timestamptz
  deletedById       String?       @map("deleted_by_id") @db.Uuid
  deleteReason      String?       @map("delete_reason")
  version           Int           @default(1)
  metadata          Json?         @db.JsonB

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Restrict)
  staff  Staff  @relation(fields: [staffId], references: [id], onDelete: Restrict)
  user   User   @relation(fields: [userId], references: [id], onDelete: Restrict)

  @@index([tenantId, staffId, status])
  @@index([tenantId, staffId, revokedAt])
  @@index([expiresAt])
  @@index([userId])
  @@map("staff_sessions")
}
```

### Session Creation Service

```typescript
interface CreateStaffSessionInput {
  tenantId: string;
  staffId: string;
  userId: string;
  refreshTokenJti: string;
  rememberMe: boolean;
  deviceId?: string;
  userAgent?: string;
  ipAddress?: string;
}

// TTL:
// rememberMe=false → 24h session cookie (sliding on refresh)
// rememberMe=true  → 30d (JWT_REFRESH_TTL)
```

### Device Fingerprint (client)

```typescript
// apps/web/lib/auth/device-id.ts
const DEVICE_ID_KEY = 'hivork_device_id';
export function getOrCreateDeviceId(): string; // crypto.randomUUID()
```

Header on all auth requests: `X-Device-Id: {uuid}`

### Device Label Parser

`ua-parser-js` → `{ browser.name, os.name }` → fa-friendly label

### JWT Refresh Extension

Add `jti` claim to refresh token (TASK-037 update) for session correlation.

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `prisma/schema.prisma` — StaffSession |
| Create | `packages/domain/core/auth/staff-session.entity.ts` |
| Create | `packages/infrastructure/persistence/staff-session.repository.ts` |
| Create | `packages/application/src/auth/create-staff-session.service.ts` |
| Update | `packages/infrastructure/auth/jwt-token.service.ts` — jti |
| Create | `apps/web/lib/auth/device-id.ts` |
| Update | login use cases — call create session |

---

## مراحل پیاده‌سازی

1. Schema + migration
2. Add `jti` to refresh JWT
3. Domain + repository
4. `CreateStaffSessionService` — hook into login flows
5. Device ID client helper
6. UA parser infrastructure
7. Cron job: mark `expired` sessions where `expiresAt < now()` (scheduler app)

---

## Edge Cases & Errors

| سناریو | رفتار |
|--------|--------|
| Missing X-Device-Id | session created — deviceId null |
| Duplicate refresh hash | 409 internal — regenerate jti |
| Staff soft-deleted | revoke all sessions on delete |
| Tenant suspended | block new sessions — revoke active |
| Max sessions per staff | tenant setting `security.max_sessions` default 20 — revoke oldest |

---

## تست

- [ ] Unit: TTL calculation rememberMe true/false
- [ ] Integration: login creates StaffSession row
- [ ] Integration: refresh updates lastActiveAt
- [ ] Integration: tenant filter — cross-tenant fail

---

## UX

Device ID transparent to user — no UI in this task.

---

## Flow

```
Login success → CreateStaffSession(refresh jti, device, ip)
  → return tokens
Refresh → update lastActiveAt
```

---

## Policy Alignment

- [ ] EXCELLENCE §8 — tenantId + base fields
- [ ] SOFT-DELETE — revoke via revokedAt؛ cleanup job soft-deletes old expired
- [ ] ADR-017 — userId denormalized for cross-tenant revoke
- [ ] onDelete: Restrict

---

## مراجع

- [TASK-037-auth-jwt-tokens.md](../../../Phases/Phase-0-Foundation/Epic-06-Auth/TASK-037-auth-jwt-tokens.md)
- [SOFT-DELETE-POLICY.md](../../../docs/09-development/SOFT-DELETE-POLICY.md)

---

## Self-Review Score

| محور | سقف | امتیاز |
|------|-----|--------|
| Metadata | /10 | 10 |
| Completeness | /25 | 25 |
| Policy | /25 | 25 |
| Executability | /25 | 24 |
| Alignment | /15 | 14 |
| **جمع** | **/100** | **98** |
