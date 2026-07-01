# IFP-TASK-055: Prisma — Sale Extended Fields + Enterprise Status

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 04 — Contract Enterprise |
| Epic | Epic-01-Contract-Schema |
| ID | IFP-TASK-055 |
| Priority | P0 |
| Depends on | Phase 1 TASK-061, TASK-064 |
| Blocks | IFP-056, IFP-057, IFP-058, IFP-059 |
| Estimated | 6h |

---

## هدف

گسترش مدل Prisma `Sale` برای پوشش §۴ محصول: شماره قرارداد، شرایط اختصاصی، امضا، lineage (کپی/تمدید)، و وضعیت‌های Enterprise (فسخ، بستن، آرشیو) — بدون شکستن MVP موجود.

---

## معیار پذیرش

- [ ] فیلدهای جدید روی `Sale` با migration backward-compatible (nullable یا default)
- [ ] `SaleStatus` گسترش: `ACTIVE`, `COMPLETED`, `CANCELLED`, `TERMINATED`, `CLOSED`, `ARCHIVED`
- [ ] `contractNumber` unique per `(tenantId, contractNumber)` where `deletedAt IS NULL`
- [ ] `customTerms`, `signatureStatus`, `signedAt`, `signedByStaffId`
- [ ] Lineage: `extendedFromSaleId`, `copiedFromSaleId` (self-FK optional)
- [ ] Lifecycle timestamps: `terminatedAt/By/Reason`, `closedAt/By/Reason`, `archivedAt/By/Reason`
- [ ] `insuranceRial`, `insuranceProvider`, `insurancePolicyNumber` (bigint + strings)
- [ ] Indexes: `(tenantId, contractNumber)`, `(tenantId, archivedAt)`, `(tenantId, status)`
- [ ] `onDelete: Restrict` — ADR-013
- [ ] `pnpm prisma validate` pass

---

## مشخصات فنی

### Enum extension

```prisma
enum SaleStatus {
  ACTIVE
  COMPLETED
  CANCELLED
  TERMINATED   // فسخ — با مانده بدهی ممکن
  CLOSED       // بستن قرارداد — تسویه یا توافق
  ARCHIVED     // آرشیو — read-only در UI

  @@map("sale_status")
}

enum ContractSignatureStatus {
  UNSIGNED
  PENDING
  SIGNED

  @@map("contract_signature_status")
}
```

### New Sale fields (additive)

```prisma
model Sale {
  // ... existing Phase 1 fields ...

  contractNumber        String?                  @map("contract_number")
  customTerms           String?                  @map("custom_terms") @db.Text
  signatureStatus       ContractSignatureStatus  @default(UNSIGNED) @map("signature_status")
  signedAt              DateTime?                @map("signed_at") @db.Timestamptz
  signedByStaffId       String?                  @map("signed_by_staff_id") @db.Uuid

  extendedFromSaleId    String?                  @map("extended_from_sale_id") @db.Uuid
  copiedFromSaleId      String?                  @map("copied_from_sale_id") @db.Uuid

  terminatedAt          DateTime?                @map("terminated_at") @db.Timestamptz
  terminatedById        String?                  @map("terminated_by_id") @db.Uuid
  terminateReason       String?                  @map("terminate_reason")

  closedAt              DateTime?                @map("closed_at") @db.Timestamptz
  closedById            String?                  @map("closed_by_id") @db.Uuid
  closeReason           String?                  @map("close_reason")

  archivedAt            DateTime?                @map("archived_at") @db.Timestamptz
  archivedById          String?                  @map("archived_by_id") @db.Uuid
  archiveReason         String?                  @map("archive_reason")

  insuranceRial         BigInt?                  @map("insurance_rial")
  insuranceProvider     String?                  @map("insurance_provider")
  insurancePolicyNumber String?                  @map("insurance_policy_number")

  extendedFromSale      Sale?    @relation("SaleExtendedFrom", fields: [extendedFromSaleId], references: [id], onDelete: Restrict)
  extendedSales         Sale[]   @relation("SaleExtendedFrom")
  copiedFromSale        Sale?    @relation("SaleCopiedFrom", fields: [copiedFromSaleId], references: [id], onDelete: Restrict)
  copiedSales           Sale[]   @relation("SaleCopiedFrom")

  @@unique([tenantId, contractNumber], map: "sales_tenant_contract_number_unique")
  @@index([tenantId, archivedAt])
}
```

### Status semantics

| Status | معنی | List default |
|--------|------|--------------|
| ACTIVE | قرارداد جاری | visible |
| COMPLETED | همه اقساط تسویه | visible |
| CANCELLED | لغو قبل از تسویه (MVP) | visible |
| TERMINATED | فسخ قرارداد | visible |
| CLOSED | بستن رسمی | visible |
| ARCHIVED | آرشیو — فیلتر جدا | hidden unless `includeArchived` |

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Update | `prisma/schema.prisma` — Sale + enums |
| Create | `prisma/migrations/YYYYMMDD_sale_enterprise_fields/migration.sql` |
| Update | `docs/03-modules/installments/state-machines.md` — Sale Status §enterprise |

---

## مراحل پیاده‌سازی

1. Add enums `TERMINATED`, `CLOSED`, `ARCHIVED`, `ContractSignatureStatus`
2. Add columns با nullable/default — migration safe for existing rows
3. Self-relations `extendedFrom` / `copiedFrom` با Restrict
4. Unique partial index: contractNumber unique when not null and not deleted
5. Staff FK relations برای signed/terminated/closed/archived by
6. `prisma validate` + generate
7. Update state-machines.md diagram

---

## Edge Cases & Errors

| سناریو | رفتار |
|--------|--------|
| Existing sales بدون contractNumber | null OK — backfill optional job |
| Duplicate contractNumber same tenant | DB unique violation → `CONTRACT_NUMBER_DUPLICATE` |
| contractNumber on soft-deleted sale | unique allows reuse after soft delete (partial index `deletedAt IS NULL`) |
| Set ARCHIVED without close/terminate | allowed — business rule in domain (IFP-059) |

---

## تست

- [ ] Integration: migration on DB with existing sales — no data loss
- [ ] Integration: create sale with contractNumber — unique enforce
- [ ] Integration: duplicate contractNumber → fail
- [ ] Unit: generated types include new status enum values

---

## UX

N/A — schema task.

---

## Flow

N/A — transitions در IFP-059.

---

## Policy Alignment

- [ ] EXCELLENCE-STANDARDS §2.1 — base fields unchanged
- [ ] EXCELLENCE-STANDARDS §8 — Sale extended fields
- [ ] SOFT-DELETE-POLICY — status change ≠ delete
- [ ] ADR-007 — insuranceRial BigInt
- [ ] ADR-013 — Restrict FKs
- [ ] ADR-015 — branchId remains NOT NULL

---

## مراجع

- `docs/01-product/installment-module-features.md` §۴
- `Phases/Phase-1-Seller-Panel/Epic-02-Installments-Database/TASK-061-prisma-sale.md`
- `docs/03-modules/installments/domain.md` § Sale

---

## Self-Review Score

| محور | سقف | امتیاز |
|------|-----|--------|
| Metadata | 10 | 10 |
| Completeness | 25 | 25 |
| Policy | 25 | 25 |
| Executability | 25 | 24 |
| Alignment | 15 | 15 |
| **جمع** | **100** | **99** |
