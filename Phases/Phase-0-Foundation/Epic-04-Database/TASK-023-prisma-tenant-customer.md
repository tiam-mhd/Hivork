# TASK-023: Prisma Schema — TenantCustomer

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 0 |
| Epic | Epic-04-Database |
| ID | TASK-023 |
| Priority | P0 |
| Depends on | TASK-018, TASK-022 |
| Blocks | TASK-027, TASK-033, TASK-054, TASK-058 |
| Estimated | 3h |

---

## هدف

تعریف مدل Prisma برای `TenantCustomer` — رابطه بین Tenant و GlobalCustomer. این entity داده tenant-specific مشتری را نگه می‌دارد (localCode، tags، creditScore، totalPurchaseRial). Customer زیر Branch نیست (ADR-002) — اما `defaultBranchId` اختیاری دارد.

---

## معیار پذیرش

- [ ] مدل `TenantCustomer` با تمام فیلدهای base (EXCELLENCE §2.1)
- [ ] فیلدهای کامل EXCELLENCE §8: `localCode`, `tags`, `notes`, `internalNotes`, `creditScore`, `overdueCount`, `totalPurchaseRial` (BigInt)، `lastPurchaseAt`, `marketingOptIn`, `preferredContactChannel`, `defaultBranchId`
- [ ] Unique: `(tenantId, globalCustomerId)`
- [ ] Indexes: `(tenantId)`, `(tenantId, deletedAt)`, `(tenantId, localCode)`, `(tenantId, defaultBranchId)`
- [ ] `onDelete: Restrict` روی `tenantId` و `globalCustomerId`
- [ ] `onDelete: SetNull` روی `defaultBranchId` (branch soft delete نباید customer را block کند)
- [ ] `totalPurchaseRial BigInt` — هرگز number/float

---

## مشخصات فنی

### Schema

```prisma
model TenantCustomer {
  id                      String                   @id @default(uuid()) @db.Uuid
  tenantId                String                   @map("tenant_id") @db.Uuid
  globalCustomerId        String                   @map("global_customer_id") @db.Uuid
  localCode               String?                  @map("local_code")
  tags                    String[]                 @default([])
  notes                   String?
  internalNotes           String?                  @map("internal_notes")
  defaultBranchId         String?                  @map("default_branch_id") @db.Uuid
  creditScore             Int                      @default(100) @map("credit_score")
  overdueCount            Int                      @default(0) @map("overdue_count")
  totalPurchaseRial       BigInt                   @default(0) @map("total_purchase_rial")
  lastPurchaseAt          DateTime?                @map("last_purchase_at") @db.Timestamptz
  preferredContactChannel PreferredContactChannel? @map("preferred_contact_channel")
  marketingOptIn          Boolean?                 @map("marketing_opt_in")
  createdAt               DateTime                 @default(now()) @map("created_at") @db.Timestamptz
  updatedAt               DateTime                 @updatedAt @map("updated_at") @db.Timestamptz
  createdById             String?                  @map("created_by_id") @db.Uuid
  updatedById             String?                  @map("updated_by_id") @db.Uuid
  deletedAt               DateTime?                @map("deleted_at") @db.Timestamptz
  deletedById             String?                  @map("deleted_by_id") @db.Uuid
  deleteReason            String?                  @map("delete_reason")
  version                 Int                      @default(1)
  metadata                Json?                    @db.JsonB

  tenant         Tenant         @relation(fields: [tenantId], references: [id], onDelete: Restrict)
  globalCustomer GlobalCustomer @relation(fields: [globalCustomerId], references: [id], onDelete: Restrict)
  defaultBranch  Branch?        @relation(fields: [defaultBranchId], references: [id], onDelete: SetNull)

  @@unique([tenantId, globalCustomerId])
  @@index([tenantId])
  @@index([tenantId, deletedAt])
  @@index([tenantId, localCode])
  @@index([tenantId, defaultBranchId])
  @@map("tenant_customers")
}
```

### Validation (ADR-015)

- `defaultBranchId` اگر set → branch باید `tenantId` یکسان داشته باشد و `deletedAt IS NULL`
- این validation در use case/domain انجام می‌شود (نه FK تنها)

### Create Flow (TASK-058)

```
1. User findOrCreateByPhone (phone روی User — ADR-017)
2. GlobalCustomer find/create by userId
2. TenantCustomer.findFirst({tenantId, globalCustomerId})
   - وجود دارد و deleted → restore
   - وجود ندارد → link جدید
3. Audit log: customer.link
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Update | `prisma/schema.prisma` |
| Create | `packages/domain/src/core/customer/tenant-customer.entity.ts` — TASK-033 |
| Migration | TASK-027 |

---

## مراحل پیاده‌سازی

1. اضافه کردن مدل `TenantCustomer` به schema.prisma
2. تأیید `totalPurchaseRial BigInt`
3. تأیید FK relations با `Restrict` و `SetNull`
4. تأیید indexes
5. `pnpm prisma validate`

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| link تکراری (tenantId, globalCustomerId) | 409 `CUSTOMER_ALREADY_LINKED` | unique constraint |
| link soft-deleted customer → restore | — | TASK-058 use case |
| `defaultBranchId` متعلق به tenant دیگر | 422 | use case validation |
| soft delete TenantCustomer | — | Sales/Installments باقی (SOFT-DELETE-POLICY §5) |
| `totalPurchaseRial` overflow | — | BigInt در DB و domain |

---

## تست

- [ ] Unit: `TenantCustomer.link()` + soft delete + restore
- [ ] Integration: link تکراری → 409
- [ ] Integration: soft delete → not in list; restore → visible
- [ ] Integration: `defaultBranchId` tenant دیگر → use case reject
- [ ] RBAC: cross-tenant TenantCustomer access → fail

---

## Policy Alignment

- [ ] EXCELLENCE-STANDARDS §8 GlobalCustomer/TenantCustomer — تمام فیلدها
- [ ] EXCELLENCE-STANDARDS §2.1 — base fields کامل
- [ ] SOFT-DELETE-POLICY §5 — soft delete customer؛ sales history باقی
- [ ] ADR-002 — TenantCustomer زیر Branch نیست
- [ ] ADR-013 — no Cascade hard delete
- [ ] ADR-015 — `defaultBranchId` validation same tenant

---

## مراجع

- `docs/02-architecture/tenancy-and-entities.md` §TenantCustomer
- `docs/09-development/SOFT-DELETE-POLICY.md` §5
- `docs/08-decisions/adr-log.md` — ADR-002, ADR-015

---

## Self-Review Score

| محور | /25 | یادداشت |
|------|-----|---------|
| Metadata | 10/10 | ID, Priority, Depends, Blocks, Estimate ✓ |
| Completeness | 25/25 | Schema کامل، EXCELLENCE §8، BigInt، acceptance criteria ✓ |
| Policy | 25/25 | Base fields، SetNull، Restrict، ADR-002/013/015 ✓ |
| Executability | 25/25 | Steps، create flow، edge cases، tests ✓ |
| Alignment | 15/15 | Sync با TASK-033 domain، TASK-058 use case ✓ |
| **جمع** | **100/100** | ≥95 required ✓ |
