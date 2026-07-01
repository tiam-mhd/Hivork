# TASK-019a: Prisma Schema — User (Platform Identity)

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 0 |
| Epic | Epic-04-Database |
| ID | TASK-019a |
| Priority | P0 |
| Depends on | TASK-017 |
| Blocks | TASK-020, TASK-022, TASK-027, TASK-035 |
| Estimated | 2h |

---

## هدف

تعریف مدل Prisma برای `User` — هویت platform با `phone` unique (ADR-017). `Staff` و `GlobalCustomer` هر دو به `User` FK می‌زنند؛ `TenantCustomer` **مستقیم** به User وصل نمی‌شود.

---

## معیار پذیرش

- [ ] مدل `User` با base fields (EXCELLENCE §2.1) + soft delete
- [ ] `phone String @unique @db.VarChar(11)` — تنها محل ذخیره phone برای B2B/B2C actors
- [ ] Enum `UserStatus`: active, suspended
- [ ] Relations: `staffMemberships Staff[]`, `globalCustomer GlobalCustomer?`
- [ ] Indexes: `(status)`
- [ ] Migration backfill از distinct phones در staff/global_customers (TASK-027)
- [ ] `pnpm prisma validate` pass

---

## مشخصات فنی

### Schema

```prisma
enum UserStatus {
  active
  suspended
}

model User {
  id           String     @id @default(uuid()) @db.Uuid
  phone        String     @unique @db.VarChar(11)
  name         String?
  avatarUrl    String?    @map("avatar_url")
  status       UserStatus @default(active)
  lastLoginAt  DateTime?  @map("last_login_at") @db.Timestamptz
  createdAt    DateTime   @default(now()) @map("created_at") @db.Timestamptz
  updatedAt    DateTime   @updatedAt @map("updated_at") @db.Timestamptz
  createdById  String?    @map("created_by_id") @db.Uuid
  updatedById  String?    @map("updated_by_id") @db.Uuid
  deletedAt    DateTime?  @map("deleted_at") @db.Timestamptz
  deletedById  String?    @map("deleted_by_id") @db.Uuid
  deleteReason String?    @map("delete_reason")
  version      Int        @default(1)
  metadata     Json?      @db.JsonB

  staffMemberships Staff[]
  globalCustomer   GlobalCustomer?

  @@index([status])
  @@map("users")
}
```

---

## Edge Cases

| سناریو | رفتار |
|--------|--------|
| همان phone در tenant دوم register | مجاز — `User` موجود، `Staff` جدید با `(tenantId, userId)` |
| Staff + GlobalCustomer same phone | مجاز — یک `User`، actor/session جدا (ADR-011) |
| Pseudonymize customer | `User.phone` → hash/deleted prefix + GlobalCustomer fields |
| Soft delete User | rare — معمولاً pseudonymize؛ staff memberships باقی برای audit |

---

## Policy Alignment

- [ ] ADR-017 — User platform identity
- [ ] SOFT-DELETE-POLICY — User در لیست business entities
- [ ] EXCELLENCE §2.1 — base fields

---

## مراجع

- `docs/08-decisions/ADR-017-user-platform-identity.md`
- `docs/02-architecture/tenancy-and-entities.md` §User
- TASK-020 (Staff), TASK-022 (GlobalCustomer)
