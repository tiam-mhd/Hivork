# IFP-TASK-001: ADR-018 + Prisma UserCredential

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 01 — Auth & Security |
| Epic | Epic-01-Password-Credentials |
| ID | IFP-001 |
| Priority | P0 |
| Depends on | Phase 0 TASK-017 (User model), TASK-055 (onboarding) |
| Blocks | IFP-002, IFP-005, IFP-006, IFP-016 |
| Estimated | 6h |

---

## هدف

ثبت تصمیم معماری **ADR-018** برای ذخیره credential رمز عبور در سطح platform (`User`) و پیاده‌سازی schema Prisma `UserCredential` با فیلدهای EXCELLENCE §8 و soft delete. این پایه ورود با رمز، reset password، و MFA است — بدون تکرار phone روی Staff (ADR-017).

---

## معیار پذیرش

- [ ] ADR-018 در `docs/08-decisions/ADR-018-user-credential.md` با وضعیت Accepted
- [ ] ADR-018 در `docs/08-decisions/adr-log.md` ثبت شده
- [ ] مدل `UserCredential` در `prisma/schema.prisma` با migration
- [ ] Relation `User` 1:1 `UserCredential` — `onDelete: Restrict`
- [ ] Seed: credential برای demo user (password: env `SEED_DEMO_PASSWORD`)
- [ ] Register flow (TASK-055): endpoint set-password پس از verifiedToken credential می‌سازد
- [ ] `prisma validate` pass — بدون hard delete

---

## مشخصات فنی

### ADR-018 — خلاصه تصمیم

| موضوع | تصمیم |
|--------|--------|
| محل credential | `UserCredential.userId` — platform-wide |
| Staff vs User | Staff فقط membership؛ login password → resolve User → Staff در tenant |
| Hash algorithm | Argon2id (`argon2` npm) — params: memory 65536, time 3, parallelism 4 |
| Fallback | bcrypt cost 12 اگر Argon2 unavailable در env قدیمی |
| Initial password | Register: user sets؛ Invite staff: random + `mustChangePassword=true` |
| Lockout fields | روی `UserCredential` — هماهنگ با IFP-013 |

### Prisma Schema

```prisma
enum CredentialStatus {
  active
  locked
  must_change_password
}

model UserCredential {
  id                 String           @id @default(uuid()) @db.Uuid
  userId             String           @unique @map("user_id") @db.Uuid
  passwordHash       String           @map("password_hash") @db.VarChar(255)
  passwordChangedAt  DateTime?        @map("password_changed_at") @db.Timestamptz
  mustChangePassword Boolean          @default(false) @map("must_change_password")
  status             CredentialStatus @default(active)
  failedLoginCount   Int              @default(0) @map("failed_login_count")
  lockedUntil        DateTime?        @map("locked_until") @db.Timestamptz
  lastFailedLoginAt  DateTime?        @map("last_failed_login_at") @db.Timestamptz
  createdAt          DateTime         @default(now()) @map("created_at") @db.Timestamptz
  updatedAt          DateTime         @updatedAt @map("updated_at") @db.Timestamptz
  createdById        String?          @map("created_by_id") @db.Uuid
  updatedById        String?          @map("updated_by_id") @db.Uuid
  deletedAt          DateTime?        @map("deleted_at") @db.Timestamptz
  deletedById        String?          @map("deleted_by_id") @db.Uuid
  deleteReason       String?          @map("delete_reason")
  version            Int              @default(1)
  metadata           Json?              @db.JsonB

  user User @relation(fields: [userId], references: [id], onDelete: Restrict)

  @@index([status])
  @@index([lockedUntil])
  @@map("user_credentials")
}
```

**توجه:** `UserCredential` **tenantId ندارد** — platform entity (مثل `User`).

### Domain — `packages/domain/core/auth/user-credential.entity.ts`

```typescript
export class UserCredential {
  verifyPassword(plain: string, hasher: IPasswordHasher): Promise<boolean>;
  markPasswordChanged(hash: string): void;
  recordFailedLogin(maxAttempts: number, lockoutMinutes: number): void;
  clearFailedLogins(): void;
  isLocked(now: Date): boolean;
  softDelete(actorId: string, reason?: string): void;
  restore(): void;
}
```

### Repository Port

```typescript
interface IUserCredentialRepository {
  findByUserId(userId: string): Promise<UserCredential | null>;
  findByPhone(phone: string): Promise<UserCredential | null>; // join User
  create(input: CreateCredentialInput): Promise<UserCredential>;
  update(credential: UserCredential): Promise<void>;
  softDelete(userId: string, actorId: string, reason?: string): Promise<void>;
}
```

### API — Set Initial Password (register completion)

```
POST /api/v1/auth/password/set-initial
Auth: Bearer verifiedToken (purpose: register)
Body: { password: string, passwordConfirm: string }
Response: { success: true }
```

Password policy (Zod):
- حداقل ۸ کاراکتر
- حداقل یک حرف و یک عدد
- حداکثر ۱۲۸ کاراکتر

### Permission

Public endpoint (verifiedToken guard) — نه RBAC staff.

### Audit

| Action | When |
|--------|------|
| `security.password.set_initial` | register password set |
| `security.credential.soft_delete` | admin erasure (rare) |

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `docs/08-decisions/ADR-018-user-credential.md` |
| Update | `docs/08-decisions/adr-log.md` |
| Update | `prisma/schema.prisma` |
| Create | `prisma/migrations/YYYYMMDD_user_credential/migration.sql` |
| Create | `packages/domain/core/auth/user-credential.entity.ts` |
| Create | `packages/infrastructure/persistence/user-credential.repository.ts` |
| Create | `packages/infrastructure/auth/argon2-password-hasher.ts` |
| Create | `packages/contracts/src/auth/set-initial-password.schema.ts` |
| Create | `packages/application/src/auth/set-initial-password.use-case.ts` |
| Update | `prisma/seed/users.ts` — demo credential |
| Update | `docs/09-development/ERROR-CODES.md` — AUTH_PASSWORD_* |

---

## مراحل پیاده‌سازی

1. نوشتن ADR-018 + ثبت در adr-log
2. افزودن enum + model به schema + migration
3. پیاده‌سازی `Argon2PasswordHasher` + port `IPasswordHasher`
4. Domain entity + repository
5. `SetInitialPasswordUseCase` — verify verifiedToken → hash → create credential
6. Controller endpoint + contract Zod
7. Seed demo user credential
8. Unit tests: hash verify, lockout logic, soft delete

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| verifiedToken نامعتبر/منقضی | 401 `AUTH_TOKEN_INVALID` | رد |
| password ضعیف | 400 `AUTH_PASSWORD_TOO_WEAK` | details: rules failed |
| passwordConfirm mismatch | 400 `VALIDATION_ERROR` | رد |
| credential از قبل exists | 409 `AUTH_CREDENTIAL_ALREADY_EXISTS` | رد — use login |
| User soft-deleted | 404 `PHONE_NOT_FOUND` | رد |
| Argon2 verify timing attack | — | constant-time compare via library |

---

## تست

- [ ] Unit: `UserCredential.recordFailedLogin` — lock after N attempts
- [ ] Unit: password policy Zod — edge passwords
- [ ] Integration: set-initial → credential in DB → hash not plain
- [ ] Integration: duplicate set-initial → 409
- [ ] Regression: existing OTP login unaffected

---

## UX (اگر UI دارد)

- [ ] صفحه set-password در register flow (TASK-055 extension) — Excellence §5
- [ ] نمایش قوانین رمز در real-time checklist
- [ ] loading + server error states

---

## Flow

```
Register OTP verify → verifiedToken
  → POST /auth/password/set-initial
  → success → redirect /login?registered=1
  → error → retry / contact support
```

---

## Policy Alignment

- [ ] EXCELLENCE-STANDARDS §8 — base fields کامل
- [ ] SOFT-DELETE-POLICY — soft delete only؛ restore برای platform admin
- [ ] ADR-017 — credential on User
- [ ] ADR-013 — no hard delete
- [ ] ADR-018 — new decision documented

---

## مراجع

- [ADR-017-user-platform-identity.md](../../../docs/08-decisions/ADR-017-user-platform-identity.md)
- [SOFT-DELETE-POLICY.md](../../../docs/09-development/SOFT-DELETE-POLICY.md)
- [TASK-055-onboarding-auth-flow.md](../../../Phases/Phase-0-Foundation/Epic-06-Auth/TASK-055-onboarding-auth-flow.md)
- [security-and-audit.md](../../../docs/06-operations/security-and-audit.md)

---

## Self-Review Score

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata | /10 | 10 | Depends/Blocks کامل |
| Completeness | /25 | 24 | schema + API + domain |
| Policy | /25 | 25 | ADR + soft delete |
| Executability | /25 | 24 | edge cases + tests |
| Alignment | /15 | 14 | ADR-017 sync |
| **جمع** | **/100** | **97** | Ready |
