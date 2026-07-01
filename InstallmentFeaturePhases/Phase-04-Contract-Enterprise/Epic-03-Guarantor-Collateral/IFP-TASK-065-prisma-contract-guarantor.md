# IFP-TASK-065: Prisma — ContractGuarantor

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 04 — Contract Enterprise |
| Epic | Epic-03-Guarantor-Collateral |
| ID | IFP-TASK-065 |
| Priority | P0 |
| Depends on | IFP-TASK-055 |
| Blocks | IFP-067 |
| Estimated | 4h |

---

## هدف

مدل **ContractGuarantor** — ضامن قرارداد: مشتری موجود یا شخص ثالث با اطلاعات هویتی — soft delete + tenant scope.

---

## معیار پذیرش

- [ ] Model `ContractGuarantor` با base fields
- [ ] `saleId`, `tenantId`, `sortOrder`
- [ ] `tenantCustomerId` optional — FK TenantCustomer
- [ ] External person: `fullName`, `nationalId`, `phone` (when no tenantCustomerId)
- [ ] `relationship` enum: `PARENT`, `SPOUSE`, `SIBLING`, `EMPLOYER`, `OTHER`
- [ ] `note` optional
- [ ] Constraint: `tenantCustomerId` OR (`fullName` + `phone`) required
- [ ] Max 10 guarantors per sale (enforced in domain)
- [ ] Indexes `(tenantId, saleId)`, soft delete index

---

## مشخصات فنی

```prisma
enum GuarantorRelationship {
  PARENT
  SPOUSE
  SIBLING
  EMPLOYER
  OTHER

  @@map("guarantor_relationship")
}

model ContractGuarantor {
  id               String               @id @default(uuid()) @db.Uuid
  tenantId         String               @map("tenant_id") @db.Uuid
  saleId           String               @map("sale_id") @db.Uuid
  tenantCustomerId String?              @map("tenant_customer_id") @db.Uuid
  fullName         String?              @map("full_name")
  nationalId       String?              @map("national_id")
  phone            String?
  relationship     GuarantorRelationship
  note             String?
  sortOrder        Int                  @default(0) @map("sort_order")
  // base fields...
  createdAt        DateTime             @default(now()) @map("created_at") @db.Timestamptz
  updatedAt        DateTime             @updatedAt @map("updated_at") @db.Timestamptz
  createdById      String?              @map("created_by_id") @db.Uuid
  updatedById      String?              @map("updated_by_id") @db.Uuid
  deletedAt        DateTime?            @map("deleted_at") @db.Timestamptz
  deletedById      String?              @map("deleted_by_id") @db.Uuid
  deleteReason     String?              @map("delete_reason")
  version          Int                  @default(1)
  metadata         Json?                @db.JsonB

  tenant         Tenant         @relation(fields: [tenantId], references: [id], onDelete: Restrict)
  sale           Sale           @relation(fields: [saleId], references: [id], onDelete: Restrict)
  tenantCustomer TenantCustomer? @relation(fields: [tenantCustomerId], references: [id], onDelete: Restrict)

  @@index([tenantId, saleId])
  @@index([tenantId, deletedAt])
  @@map("contract_guarantors")
}
```

Phone validation: normalized `09xxxxxxxxx` at use case layer (ADR-017 join when tenantCustomerId set).

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `prisma/schema.prisma` |
| Create | Migration |
| Create | `packages/domain/installments/contract-guarantor.entity.ts` |

---

## مراحل پیاده‌سازی

1. Enum + model
2. Migration
3. Domain entity with validation `assertIdentity()`
4. Repository interface

---

## Edge Cases & Errors

| سناریو | Code |
|--------|------|
| Neither customer nor external identity | `GUARANTOR_IDENTITY_REQUIRED` |
| tenantCustomerId cross-tenant | `CUSTOMER_NOT_FOUND` |
| > 10 guarantors | `GUARANTOR_LIMIT_EXCEEDED` |
| Sale archived | `SALE_ARCHIVED_READONLY` |

---

## تست

- [ ] Integration: guarantor linked to tenant customer
- [ ] Integration: external guarantor with phone
- [ ] Integration: soft delete guarantor

---

## UX

Tab «ضامنین» in IFP-076.

---

## Flow

N/A

---

## Policy Alignment

- [ ] EXCELLENCE §2.1 base fields
- [ ] SOFT-DELETE-POLICY
- [ ] ADR-017 phone on User when linked customer

---

## مراجع

- `docs/01-product/installment-module-features.md` §۴ — ضامن
- IFP Phase 03 customer enterprise

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
