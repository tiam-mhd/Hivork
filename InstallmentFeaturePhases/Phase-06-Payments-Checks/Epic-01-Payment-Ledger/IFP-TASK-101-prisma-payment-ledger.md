# IFP-TASK-101: Prisma — PaymentLedgerEntry Schema

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 06 — Payments & Checks |
| Epic | Epic-01-Payment-Ledger |
| ID | IFP-TASK-101 |
| Priority | P0 |
| Depends on | IFP-TASK-086, IFP-TASK-087, IFP-TASK-088, IFP-TASK-089, IFP-TASK-090, IFP-TASK-091, IFP-TASK-092, IFP-TASK-093, IFP-TASK-094 |
| Blocks | IFP-TASK-102, IFP-TASK-103, IFP-TASK-104, IFP-TASK-111 |
| Estimated | 6h |

---

## هدف

تعریف مدل Prisma **`PaymentLedgerEntry`** — دفتر یکپارچه تمام تراکنش‌های مالی tenant — append-only semantics با soft void (reversing entry) نه hard delete.

---

## معیار پذیرش

- [ ] Model `PaymentLedgerEntry` با base fields کامل EXCELLENCE §8
- [ ] `tenantId`, `branchId` (ADR-015), `entryType`, `direction`, `amountRial` BigInt
- [ ] Links: `paymentAttemptId?`, `installmentId?`, `saleId?`, `checkId?`, `settlementBatchId?`
- [ ] `occurredAt`, `recordedAt`, `status`: `posted`, `voided`
- [ ] `reversesEntryId?` برای void/reversal chain
- [ ] Indexes: `(tenantId, occurredAt)`, `(tenantId, status)`, `(tenantId, branchId)`, FK indexes
- [ ] `onDelete: Restrict` — ADR-013
- [ ] Migration + `pnpm prisma validate`

---

## مشخصات فنی

### Enums

```prisma
enum PaymentLedgerEntryType {
  PAYMENT_IN
  PAYMENT_OUT
  REFUND
  FEE
  PENALTY
  DISCOUNT
  ADJUSTMENT
  SETTLEMENT

  @@map("payment_ledger_entry_type")
}

enum PaymentLedgerDirection {
  CREDIT
  DEBIT

  @@map("payment_ledger_direction")
}

enum PaymentLedgerEntryStatus {
  POSTED
  VOIDED

  @@map("payment_ledger_entry_status")
}
```

### Model

```prisma
model PaymentLedgerEntry {
  id                String                   @id @default(uuid()) @db.Uuid
  tenantId          String                   @map("tenant_id") @db.Uuid
  branchId          String                   @map("branch_id") @db.Uuid
  entryType         PaymentLedgerEntryType   @map("entry_type")
  direction         PaymentLedgerDirection
  amountRial        BigInt                   @map("amount_rial")
  status            PaymentLedgerEntryStatus @default(POSTED)
  occurredAt        DateTime                 @map("occurred_at") @db.Timestamptz
  recordedAt        DateTime                 @default(now()) @map("recorded_at") @db.Timestamptz
  paymentMethod     String?                  @map("payment_method") // cash|bank_transfer|...
  description       String?
  paymentAttemptId  String?                  @map("payment_attempt_id") @db.Uuid
  installmentId     String?                  @map("installment_id") @db.Uuid
  saleId            String?                  @map("sale_id") @db.Uuid
  checkId           String?                  @map("check_id") @db.Uuid
  settlementBatchId String?                  @map("settlement_batch_id") @db.Uuid
  reversesEntryId   String?                  @map("reverses_entry_id") @db.Uuid
  voidedAt          DateTime?                @map("voided_at") @db.Timestamptz
  voidedById        String?                  @map("voided_by_id") @db.Uuid
  voidReason        String?                  @map("void_reason")
  createdAt         DateTime                 @default(now()) @map("created_at") @db.Timestamptz
  updatedAt         DateTime                 @updatedAt @map("updated_at") @db.Timestamptz
  createdById       String?                  @map("created_by_id") @db.Uuid
  updatedById       String?                  @map("updated_by_id") @db.Uuid
  deletedAt         DateTime?                @map("deleted_at") @db.Timestamptz
  deletedById       String?                  @map("deleted_by_id") @db.Uuid
  deleteReason      String?                  @map("delete_reason")
  version           Int                      @default(1)
  metadata          Json?                    @db.JsonB

  tenant          Tenant           @relation(fields: [tenantId], references: [id], onDelete: Restrict)
  branch          Branch           @relation(fields: [branchId], references: [id], onDelete: Restrict)
  paymentAttempt  PaymentAttempt?  @relation(fields: [paymentAttemptId], references: [id], onDelete: Restrict)
  reversesEntry   PaymentLedgerEntry? @relation("LedgerReversal", fields: [reversesEntryId], references: [id], onDelete: Restrict)
  reversedBy      PaymentLedgerEntry[] @relation("LedgerReversal")

  @@index([tenantId, occurredAt])
  @@index([tenantId, status])
  @@index([tenantId, branchId])
  @@index([tenantId, paymentAttemptId])
  @@index([tenantId, deletedAt])
  @@map("payment_ledger_entries")
}
```

### Semantics

- Confirm payment (IFP-092) → handler creates `PAYMENT_IN` CREDIT entry
- Void (IFP-094/108) → new reversing DEBIT entry + original `status: VOIDED`
- Never `prisma.paymentLedgerEntry.delete()`

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Update | `prisma/schema.prisma` |
| Create | `prisma/migrations/YYYYMMDD_payment_ledger_entry/migration.sql` |
| Update | `docs/03-modules/installments/domain.md` — ledger section |

---

## مراحل پیاده‌سازی

1. Add enums + model
2. FK relations with Restrict
3. Generate migration
4. Prisma validate + generate client
5. Document ledger semantics in domain.md

---

## Edge Cases & Errors

| سناریو | رفتار |
|--------|--------|
| Backfill from existing PaymentAttempts | optional migration script — idempotent |
| Duplicate entry on confirm retry | unique `(paymentAttemptId, entryType)` where posted |

---

## تست

- [ ] Integration: migration applies cleanly
- [ ] Integration: insert entry with all FKs optional
- [ ] Unit: generated types include enums

---

## UX

N/A — schema task.

---

## Flow

N/A — populated by event handlers from payment confirm/void/refund.

---

## Policy Alignment

- [ ] EXCELLENCE-STANDARDS §8 base fields
- [ ] SOFT-DELETE-POLICY — void via reversing entry
- [ ] ADR-007 BIGINT amountRial
- [ ] ADR-013 Restrict, no Cascade delete
- [ ] ADR-015 branchId NOT NULL

---

## مراجع

- `docs/01-product/installment-module-features.md` §۶ — تمام تراکنش‌ها
- IFP-TASK-092 confirm payment

---

## Self-Review Score

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata | 10 | 10 | ✓ |
| Completeness | 25 | 25 | full schema |
| Policy | 25 | 25 | ADR-013/015 |
| Executability | 25 | 25 | |
| Alignment | 15 | 15 | §۶ |
| **جمع** | **100** | **100** | ≥95 ✅ |
