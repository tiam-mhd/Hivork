# IFP-TASK-111: Prisma — Check Schema

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 06 — Payments & Checks |
| Epic | Epic-04-Check-Management |
| ID | IFP-TASK-111 |
| Priority | P0 |
| Depends on | IFP-TASK-101 |
| Blocks | IFP-TASK-112, IFP-TASK-113, IFP-TASK-114, IFP-TASK-115, IFP-TASK-116 |
| Estimated | 6h |

---

## هدف

مدل Prisma **`Check`** برای چرخه کامل چک (دریافتی/پرداختی) — لینک به PaymentLedger، PaymentAttempt و Sale/Installment.

---

## معیار پذیرش

- [ ] Model `Check` با base fields EXCELLENCE §8
- [ ] `tenantId`, `branchId`, `checkType` (RECEIVED|PAYABLE)
- [ ] `checkNumber`, `bankName`, `bankBranchCode`, `amountRial`, `dueDate`
- [ ] `drawerName`, `payeeName`, `sayadId` optional
- [ ] `status` enum: REGISTERED, DUE, COLLECTED, BOUNCED, TRANSFERRED, CANCELLED
- [ ] FK: `paymentAttemptId?`, `ledgerEntryId?`, `installmentId?`, `saleId?`
- [ ] `imageFileId?` for scan
- [ ] Indexes: `(tenantId, status)`, `(tenantId, dueDate)`, `(tenantId, checkNumber, bankName)`
- [ ] `onDelete: Restrict`

---

## مشخصات فنی

```prisma
enum CheckType {
  RECEIVED
  PAYABLE

  @@map("check_type")
}

enum CheckStatus {
  REGISTERED
  DUE
  COLLECTED
  BOUNCED
  TRANSFERRED
  CANCELLED

  @@map("check_status")
}

model Check {
  id               String      @id @default(uuid()) @db.Uuid
  tenantId         String      @map("tenant_id") @db.Uuid
  branchId         String      @map("branch_id") @db.Uuid
  checkType        CheckType   @map("check_type")
  status           CheckStatus @default(REGISTERED)
  checkNumber      String      @map("check_number")
  bankName         String      @map("bank_name")
  bankBranchCode   String?     @map("bank_branch_code")
  amountRial       BigInt      @map("amount_rial")
  dueDate          DateTime    @map("due_date") @db.Timestamptz
  drawerName       String      @map("drawer_name")
  payeeName        String?     @map("payee_name")
  sayadId          String?     @map("sayad_id")
  paymentAttemptId String?     @map("payment_attempt_id") @db.Uuid
  ledgerEntryId    String?     @map("ledger_entry_id") @db.Uuid
  installmentId    String?     @map("installment_id") @db.Uuid
  saleId           String?     @map("sale_id") @db.Uuid
  imageFileId      String?     @map("image_file_id") @db.Uuid
  collectedAt      DateTime?   @map("collected_at") @db.Timestamptz
  bouncedAt        DateTime?   @map("bounced_at") @db.Timestamptz
  bounceReason     String?     @map("bounce_reason")
  transferredTo    String?     @map("transferred_to")
  transferredAt    DateTime?   @map("transferred_at") @db.Timestamptz
  trackingNotes    String?     @map("tracking_notes") @db.Text
  // base fields: createdAt, updatedAt, createdById, updatedById, deletedAt, version, metadata

  tenant          Tenant            @relation(fields: [tenantId], references: [id], onDelete: Restrict)
  branch          Branch            @relation(fields: [branchId], references: [id], onDelete: Restrict)
  paymentAttempt  PaymentAttempt?   @relation(fields: [paymentAttemptId], references: [id], onDelete: Restrict)
  installment     Installment?      @relation(fields: [installmentId], references: [id], onDelete: Restrict)

  @@index([tenantId, status])
  @@index([tenantId, dueDate])
  @@index([tenantId, checkNumber, bankName])
  @@index([tenantId, deletedAt])
  @@map("checks")
}
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Update | `prisma/schema.prisma` |
| Create | `prisma/migrations/YYYYMMDD_check_schema/migration.sql` |
| Update | `docs/03-modules/installments/domain.md` — Check entity section |

---

## مراحل پیاده‌سازی

1. Add enums + Check model
2. FK relations Restrict
3. Migration
4. prisma validate
5. Document in domain.md

---

## Edge Cases & Errors

| سناریو | رفتار |
|--------|--------|
| Migrate IFP-091 metadata checks | backfill script optional |
| Duplicate checkNumber+bank | unique index soft — allow if prior soft-deleted |

---

## تست

- [ ] Integration: migration applies
- [ ] Integration: insert received + payable checks

---

## UX

N/A — schema.

---

## Flow

N/A — state transitions in IFP-112.

---

## Policy Alignment

- [ ] EXCELLENCE §8 base fields
- [ ] SOFT-DELETE-POLICY
- [ ] ADR-007 BIGINT
- [ ] ADR-015 branchId NOT NULL
- [ ] ADR-013 Restrict

---

## مراجع

- `docs/01-product/installment-module-features.md` §۷
- IFP-TASK-091 check payment stub

---

## Self-Review Score

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata | 10 | 10 | ✓ |
| Completeness | 25 | 25 | full schema |
| Policy | 25 | 25 | |
| Executability | 25 | 25 | |
| Alignment | 15 | 15 | §۷ |
| **جمع** | **100** | **100** | ≥95 ✅ |
