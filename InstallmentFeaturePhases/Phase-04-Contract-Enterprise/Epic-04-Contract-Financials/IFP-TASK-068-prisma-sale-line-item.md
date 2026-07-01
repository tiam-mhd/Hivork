# IFP-TASK-068: Prisma — SaleLineItem (اقلام قرارداد)

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 04 — Contract Enterprise |
| Epic | Epic-04-Contract-Financials |
| ID | IFP-TASK-068 |
| Priority | P0 |
| Depends on | IFP-TASK-055 |
| Blocks | IFP-069, IFP-070, IFP-071 |
| Estimated | 5h |

---

## هدف

مدل **SaleLineItem** — اقلام قرارداد با quantity، unit price، discount، tax per line — soft delete + sum reconciliation به `Sale.totalAmountRial`.

---

## معیار پذیرش

- [ ] Model `SaleLineItem` با base fields
- [ ] `saleId`, `tenantId`, `title`, `sku` optional
- [ ] `quantity` int min 1, `unitPriceRial` BigInt
- [ ] `discountRial`, `taxRial` BigInt default 0
- [ ] `lineTotalRial` BigInt computed/stored — `quantity * unitPrice - discount + tax`
- [ ] `sortOrder` int
- [ ] Index `(tenantId, saleId)`
- [ ] Max 100 line items per sale

---

## مشخصات فنی

```prisma
model SaleLineItem {
  id            String    @id @default(uuid()) @db.Uuid
  tenantId      String    @map("tenant_id") @db.Uuid
  saleId        String    @map("sale_id") @db.Uuid
  title         String
  sku           String?
  quantity      Int       @default(1)
  unitPriceRial BigInt    @map("unit_price_rial")
  discountRial  BigInt    @default(0) @map("discount_rial")
  taxRial       BigInt    @default(0) @map("tax_rial")
  lineTotalRial BigInt    @map("line_total_rial")
  sortOrder     Int       @default(0) @map("sort_order")
  createdAt     DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt     DateTime  @updatedAt @map("updated_at") @db.Timestamptz
  createdById   String?   @map("created_by_id") @db.Uuid
  updatedById   String?   @map("updated_by_id") @db.Uuid
  deletedAt     DateTime? @map("deleted_at") @db.Timestamptz
  deletedById   String?   @map("deleted_by_id") @db.Uuid
  deleteReason  String?   @map("delete_reason")
  version       Int       @default(1)
  metadata      Json?     @db.JsonB

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Restrict)
  sale   Sale   @relation(fields: [saleId], references: [id], onDelete: Restrict)

  @@index([tenantId, saleId])
  @@map("sale_line_items")
}
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `prisma/schema.prisma` |
| Create | Migration |
| Create | `packages/domain/installments/sale-line-item.entity.ts` |

---

## مراحل پیاده‌سازی

1. Model + migration
2. Domain: `computeLineTotal()` pure function
3. Repository listBySale ordered by sortOrder

---

## Edge Cases & Errors

| سناریو | Code |
|--------|------|
| quantity = 0 | validation fail |
| discount > line subtotal | `DISCOUNT_EXCEEDS_LINE_TOTAL` |
| Edit when paid installments | `SALE_HAS_PAID_INSTALLMENT` |

---

## تست

- [ ] Unit: line total calculation
- [ ] Integration: create line items batch

---

## UX

Line items table in IFP-076 financials tab.

---

## Flow

N/A

---

## Policy Alignment

- [ ] ADR-007 bigint
- [ ] SOFT-DELETE-POLICY

---

## مراجع

- `docs/01-product/installment-module-features.md` §۴ — اقلام قرارداد
- BUSINESS-RULES BR-001, BR-005

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
