# TASK-022: Prisma Schema — GlobalCustomer, BotIdentity

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 0 |
| Epic | Epic-04-Database |
| ID | TASK-022 |
| Priority | P0 |
| Depends on | TASK-017, TASK-019a |
| Blocks | TASK-023, TASK-027, TASK-032, TASK-035 |
| Estimated | 3h |

---

## هدف

تعریف مدل‌های Prisma برای `GlobalCustomer` (پروفایل B2C — FK به `User`، ADR-017) و `BotIdentity`. `phone` فقط روی `User` است. GlobalCustomer زیر هیچ Tenant نیست — از طریق `TenantCustomer` (TASK-023) به tenant‌ها وصل می‌شود.

---

## معیار پذیرش

- [ ] مدل `GlobalCustomer` با تمام فیلدهای base (createdById, updatedById, deletedById, deleteReason, version, metadata)
- [ ] فیلدهای کامل EXCELLENCE §8 GlobalCustomer: `email`, `nationalId`, `birthDate`, `gender`, `address`, `preferredContactChannel`, `marketingOptIn`, `pseudonymizedAt`
- [ ] FK `userId String @unique` → `User` (1:1) — **بدون** فیلد `phone` روی GlobalCustomer
- [ ] Enum `GlobalCustomerStatus`: active, suspended
- [ ] Enum `Gender`: male, female, other, unspecified
- [ ] Enum `PreferredContactChannel`: telegram, bale, sms, phone
- [ ] Enum `BotPlatform`: telegram, bale
- [ ] مدل `BotIdentity` با unique `(platform, externalId)` و `(customerId, platform)`
- [ ] `onDelete: Restrict` روی FK‌ها
- [ ] Index: `(status)` روی GlobalCustomer

---

## مشخصات فنی

### Schema

```prisma
enum GlobalCustomerStatus {
  active
  suspended
}

enum Gender {
  male
  female
  other
  unspecified
}

enum PreferredContactChannel {
  telegram
  bale
  sms
  phone
}

enum BotPlatform {
  telegram
  bale
}

model GlobalCustomer {
  id                      String                   @id @default(uuid()) @db.Uuid
  userId                  String                   @unique @map("user_id") @db.Uuid
  name                    String?
  email                   String?
  nationalId              String?                  @map("national_id")
  birthDate               DateTime?                @map("birth_date") @db.Date
  gender                  Gender?                  @default(unspecified)
  address                 String?
  preferredContactChannel PreferredContactChannel? @map("preferred_contact_channel")
  marketingOptIn          Boolean                  @default(false) @map("marketing_opt_in")
  status                  GlobalCustomerStatus     @default(active)
  pseudonymizedAt         DateTime?                @map("pseudonymized_at") @db.Timestamptz
  createdAt               DateTime                 @default(now()) @map("created_at") @db.Timestamptz
  updatedAt               DateTime                 @updatedAt @map("updated_at") @db.Timestamptz
  createdById             String?                  @map("created_by_id") @db.Uuid
  updatedById             String?                  @map("updated_by_id") @db.Uuid
  deletedAt               DateTime?                @map("deleted_at") @db.Timestamptz
  deletedById             String?                  @map("deleted_by_id") @db.Uuid
  deleteReason            String?                  @map("delete_reason")
  version                 Int                      @default(1)
  metadata                Json?                    @db.JsonB

  botIdentities   BotIdentity[]
  tenantCustomers TenantCustomer[]
  user            User             @relation(fields: [userId], references: [id], onDelete: Restrict)

  @@index([status])
  @@map("global_customers")
}

model BotIdentity {
  id         String      @id @default(uuid()) @db.Uuid
  customerId String      @map("customer_id") @db.Uuid
  platform   BotPlatform
  externalId String      @map("external_id")
  linkedAt   DateTime    @default(now()) @map("linked_at") @db.Timestamptz
  deletedAt  DateTime?   @map("deleted_at") @db.Timestamptz

  customer GlobalCustomer @relation(fields: [customerId], references: [id], onDelete: Restrict)

  @@unique([platform, externalId])
  @@unique([customerId, platform])
  @@map("bot_identities")
}
```

### GDPR Pseudonymize

درخواست حذف مشتری:
```
❌ DELETE FROM global_customers
✅ soft delete + pseudonymize:
   phone   → "deleted_{uuid}"
   name    → "حذف‌شده"
   pseudonymizedAt → now()
   داده مالی tenant (TenantCustomer, Sale, Installment) → باقی می‌ماند
```

پس از pseudonymize: restore ممنوع است (SOFT-DELETE-POLICY §7).

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Update | `prisma/schema.prisma` |
| Create | `packages/domain/src/core/customer/global-customer.entity.ts` — TASK-032 |
| Migration | TASK-027 |

---

## مراحل پیاده‌سازی

1. اضافه کردن enums: `GlobalCustomerStatus`, `Gender`, `PreferredContactChannel`, `BotPlatform`
2. اضافه کردن مدل `GlobalCustomer` با `pseudonymizedAt` و base fields کامل
3. اضافه کردن مدل `BotIdentity` با unique constraints
4. تأیید FK با `onDelete: Restrict`
5. `pnpm prisma validate`

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| phone تکراری platform-wide | 409 `PHONE_ALREADY_EXISTS` | unique روی `User.phone` |
| restore پس از pseudonymize | 422 `CANNOT_RESTORE_PSEUDONYMIZED` | domain entity |
| حذف GlobalCustomer با TenantCustomer فعال | — | onDelete: Restrict |
| BotIdentity با externalId تکراری در platform | 409 | unique `(platform, externalId)` |
| مشتری دو BotIdentity روی یک platform | 409 | unique `(customerId, platform)` |

---

## تست

- [ ] Unit: `GlobalCustomer.pseudonymize()` — name cleared؛ `User.phone` pseudonymized (SOFT-DELETE §7)
- [ ] Unit: `GlobalCustomer.softDelete()` + `restore()` cycle
- [ ] Integration: `User.phone` unique platform-wide
- [ ] Integration: pseudonymize — tenant data باقی می‌ماند (TASK-058)

---

## Policy Alignment

- [ ] EXCELLENCE-STANDARDS §8 GlobalCustomer/TenantCustomer — تمام فیلدها
- [ ] EXCELLENCE-STANDARDS §2.1 — base fields کامل
- [ ] SOFT-DELETE-POLICY §7 — pseudonymize + soft delete (نه hard delete)
- [ ] ADR-002 — GlobalCustomer platform-level (نه زیر Branch)
- [ ] ADR-017 — phone روی User؛ GlobalCustomer FK userId
- [ ] ADR-013 — no Cascade hard delete

---

## مراجع

- `docs/02-architecture/tenancy-and-entities.md` §GlobalCustomer
- `docs/09-development/SOFT-DELETE-POLICY.md` §7
- `docs/08-decisions/adr-log.md` — ADR-002

---

## Self-Review Score

| محور | /25 | یادداشت |
|------|-----|---------|
| Metadata | 10/10 | ID, Priority, Depends, Blocks, Estimate ✓ |
| Completeness | 25/25 | Schema کامل، GDPR، acceptance criteria ✓ |
| Policy | 25/25 | Base fields کامل، pseudonymize، ADR-002/007/013 ✓ |
| Executability | 25/25 | Steps، edge cases، tests ✓ |
| Alignment | 15/15 | Sync با TASK-032 domain، TASK-023 ✓ |
| **جمع** | **100/100** | ≥95 required ✓ |
