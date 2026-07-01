# IFP-TASK-066: Prisma — ContractCollateral

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 04 — Contract Enterprise |
| Epic | Epic-03-Guarantor-Collateral |
| ID | IFP-TASK-066 |
| Priority | P0 |
| Depends on | IFP-TASK-055 |
| Blocks | IFP-067 |
| Estimated | 4h |

---

## هدف

مدل **ContractCollateral** — وثیقه قرارداد: نوع، شرح، ارزش برآوردی، سند پیوست — soft delete + tenant scope.

---

## معیار پذیرش

- [ ] Model `ContractCollateral` با base fields
- [ ] `saleId`, `tenantId`, `collateralType` enum
- [ ] `title`, `description`, `estimatedValueRial` BigInt
- [ ] `documentFileId` optional UUID
- [ ] `registrationNumber`, `issuedAt` optional (for cheque/property)
- [ ] `status` enum: `PLEDGED`, `RELEASED`, `FORFEITED`
- [ ] Max 20 collaterals per sale
- [ ] Indexes + Restrict FKs

---

## مشخصات فنی

```prisma
enum CollateralType {
  CHEQUE
  PROMISSORY_NOTE
  GOLD
  VEHICLE
  PROPERTY
  CASH_DEPOSIT
  OTHER

  @@map("collateral_type")
}

enum CollateralStatus {
  PLEDGED
  RELEASED
  FORFEITED

  @@map("collateral_status")
}

model ContractCollateral {
  id                 String           @id @default(uuid()) @db.Uuid
  tenantId           String           @map("tenant_id") @db.Uuid
  saleId             String           @map("sale_id") @db.Uuid
  collateralType     CollateralType   @map("collateral_type")
  title              String
  description        String?
  estimatedValueRial BigInt           @map("estimated_value_rial")
  documentFileId     String?          @map("document_file_id") @db.Uuid
  registrationNumber String?          @map("registration_number")
  issuedAt           DateTime?        @map("issued_at") @db.Date
  status             CollateralStatus @default(PLEDGED)
  sortOrder          Int              @default(0) @map("sort_order")
  // base audit + soft delete fields...
  createdAt          DateTime         @default(now()) @map("created_at") @db.Timestamptz
  updatedAt          DateTime         @updatedAt @map("updated_at") @db.Timestamptz
  createdById        String?          @map("created_by_id") @db.Uuid
  updatedById        String?          @map("updated_by_id") @db.Uuid
  deletedAt          DateTime?        @map("deleted_at") @db.Timestamptz
  deletedById        String?          @map("deleted_by_id") @db.Uuid
  deleteReason       String?          @map("delete_reason")
  version            Int              @default(1)
  metadata           Json?            @db.JsonB

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Restrict)
  sale   Sale   @relation(fields: [saleId], references: [id], onDelete: Restrict)

  @@index([tenantId, saleId])
  @@index([tenantId, status])
  @@map("contract_collaterals")
}
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `prisma/schema.prisma` |
| Create | Migration |
| Create | `packages/domain/installments/contract-collateral.entity.ts` |

---

## مراحل پیاده‌سازی

1. Enums + model
2. Migration
3. Domain: `release()`, `forfeit()` status transitions
4. Repository

---

## Edge Cases & Errors

| سناریو | Code |
|--------|------|
| estimatedValueRial = 0 | `AMOUNT_INVALID` |
| forfeit from RELEASED | `INVALID_COLLATERAL_STATUS` |
| Sale completed + forfeit | allowed with audit |

---

## تست

- [ ] Integration: create collateral with bigint value
- [ ] Integration: status pledged → released
- [ ] Cross-tenant fail

---

## UX

Tab «وثیقه» in IFP-076.

---

## Flow

```
add collateral → upload doc optional → save
release: confirm when sale closed
```

---

## Policy Alignment

- [ ] ADR-007 bigint
- [ ] SOFT-DELETE-POLICY
- [ ] Audit on forfeit/release (IFP-067)

---

## مراجع

- `docs/01-product/installment-module-features.md` §۴ — وثیقه

---

## Self-Review Score

| محور | سقف | امتیاز |
|------|-----|--------|
| Metadata | 10 | 10 |
| Completeness | 25 | 25 |
| Policy | 25 | 25 |
| Executability | 25 | 25 |
| Alignment | 15 | 15 |
| **جمع** | **100** | **100** |
