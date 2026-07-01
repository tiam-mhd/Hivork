# IFP-TASK-005: TOTP 2FA Setup / Verify / Disable

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 01 — Auth & Security |
| Epic | Epic-02-OTP-MFA |
| ID | IFP-005 |
| Priority | P0 |
| Depends on | IFP-001, IFP-004 |
| Blocks | IFP-015, IFP-018 |
| Estimated | 10h |

---

## هدف

پیاده‌سازی **Authenticator app TOTP** (RFC 6238) برای staff: setup با QR code، verify، disable، backup codes — ذخیره secret رمزنگاری‌شده روی `User` platform.

---

## معیار پذیرش

- [ ] Prisma model `UserMfaTotp` با base fields + soft delete
- [ ] `POST /api/v1/staff/me/mfa/totp/setup` — generate secret + otpauth URL
- [ ] `POST /api/v1/staff/me/mfa/totp/verify` — confirm setup → enabled
- [ ] `DELETE /api/v1/staff/me/mfa/totp` — disable (soft delete) + password reconfirm
- [ ] `GET /api/v1/staff/me/mfa/totp/backup-codes` — regenerate (10 codes, single use)
- [ ] Secret encrypted at rest (`AES-256-GCM` — key `MFA_ENCRYPTION_KEY`)
- [ ] Backup codes: bcrypt hash array — never plain store
- [ ] Used in IFP-004 `method: totp` verify
- [ ] Audit: `security.mfa.totp_enabled` / `disabled` / `backup_regenerated`

---

## مشخصات فنی

### Prisma Schema

```prisma
model UserMfaTotp {
  id              String    @id @default(uuid()) @db.Uuid
  userId          String    @unique @map("user_id") @db.Uuid
  secretEncrypted String    @map("secret_encrypted") @db.Text
  enabledAt       DateTime? @map("enabled_at") @db.Timestamptz
  lastUsedAt      DateTime? @map("last_used_at") @db.Timestamptz
  backupCodesHash Json?     @map("backup_codes_hash") @db.JsonB
  createdAt       DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt       DateTime  @updatedAt @map("updated_at") @db.Timestamptz
  createdById     String?   @map("created_by_id") @db.Uuid
  updatedById     String?   @map("updated_by_id") @db.Uuid
  deletedAt       DateTime? @map("deleted_at") @db.Timestamptz
  deletedById     String?   @map("deleted_by_id") @db.Uuid
  deleteReason    String?   @map("delete_reason")
  version         Int       @default(1)
  metadata        Json?     @db.JsonB

  user User @relation(fields: [userId], references: [id], onDelete: Restrict)

  @@index([enabledAt])
  @@map("user_mfa_totp")
}
```

### API Endpoints

| Method | Path | Permission | Body |
|--------|------|------------|------|
| POST | `/api/v1/staff/me/mfa/totp/setup` | `@RequireAuth` staff | — |
| POST | `/api/v1/staff/me/mfa/totp/verify` | `@RequireAuth` staff | `{ code: string }` |
| DELETE | `/api/v1/staff/me/mfa/totp` | `@RequireAuth` staff | `{ password: string }` |
| POST | `/api/v1/staff/me/mfa/totp/backup-codes` | `@RequireAuth` staff | `{ password: string }` |

**Note:** Self-service — permission implicit via `@RequireAuth` + own `userId`. Optional explicit: `core.security.mfa.manage` (self only).

### Setup Response

```json
{
  "secret": "BASE32SECRET",
  "otpauthUrl": "otpauth://totp/Hivork:user@phone?secret=...&issuer=Hivork",
  "qrCodeDataUrl": "data:image/png;base64,...",
  "pendingExpiresAt": "2026-06-30T12:10:00Z"
}
```

Setup pending stored Redis `mfa:totp:setup:{userId}` TTL 600s until verify.

### TOTP Validation

- Algorithm: SHA1, 6 digits, 30s step
- Window: ±1 interval
- Prevent replay: update `lastUsedAt` — reject same window reuse

### Backup Codes

- Format: `XXXX-XXXX` (8 alphanumeric)
- 10 codes per generation
- Verify: hash match + mark used in JSON array
- Audit on each backup code use

### Disable Flow

1. Verify current password (UserCredential)
2. Soft delete `UserMfaTotp` — `deletedAt`, `deleteReason: 'user_disabled'`
3. Clear Redis setup keys

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `prisma/schema.prisma` — UserMfaTotp |
| Create | `packages/domain/core/auth/user-mfa-totp.entity.ts` |
| Create | `packages/application/src/auth/totp/*.use-case.ts` |
| Create | `packages/infrastructure/auth/totp.service.ts` |
| Create | `packages/infrastructure/auth/mfa-encryption.service.ts` |
| Create | `packages/contracts/src/auth/totp.schema.ts` |
| Update | `apps/api/src/staff/staff-mfa.controller.ts` |
| Update | `.env.example` — `MFA_ENCRYPTION_KEY` |

---

## مراحل پیاده‌سازی

1. Schema + migration
2. TOTP service (otplib) + encryption
3. Setup → pending Redis → verify → persist
4. Integrate with IFP-004 mfa verify
5. Backup codes generation
6. Disable with password confirm
7. Unit + integration tests

---

## Edge Cases & Errors

| سناریو | Code | رفتار |
|--------|------|--------|
| Setup without verify | — | pending expires — restart setup |
| Already enabled | 409 `AUTH_MFA_ALREADY_ENABLED` | |
| Wrong TOTP code | 400 `AUTH_TOTP_INVALID` | |
| Disable wrong password | 401 `AUTH_INVALID_CREDENTIALS` | |
| Backup code reused | 400 `AUTH_BACKUP_CODE_USED` | |
| MFA encryption key missing | 500 | startup fail-fast |
| Clock skew > 90s | 400 `AUTH_TOTP_INVALID` | hint sync time |

---

## تست

- [ ] Unit: TOTP generate/verify window
- [ ] Unit: backup code hash + single use
- [ ] Integration: setup → verify → login MFA with totp
- [ ] Integration: disable → totp login fails

---

## UX

UI در IFP-015 — این task API + domain:
- QR display component spec: min 200px, manual secret copy
- Backup codes download `.txt` + print warning

---

## Flow

```
Settings → Security → Enable 2FA
  → setup API → show QR
  → enter code → verify
  → show backup codes (one-time)
  → enabled
```

---

## Policy Alignment

- [ ] EXCELLENCE §8 — full base fields
- [ ] SOFT-DELETE-POLICY — disable = soft delete
- [ ] ADR-017 — User-level MFA
- [ ] Secrets never in logs/audit plaintext

---

## مراجع

- RFC 6238 TOTP
- [IFP-TASK-004-otp-mfa-step-up.md](./IFP-TASK-004-otp-mfa-step-up.md)

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
