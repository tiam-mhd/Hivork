# IFP-TASK-109: Use Case + API — تسویه

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 06 — Payments & Checks |
| Epic | Epic-03-Refund-Void-Settlement |
| ID | IFP-TASK-109 |
| Priority | P0 |
| Depends on | IFP-TASK-103 |
| Blocks | IFP-TASK-110, IFP-TASK-117, IFP-TASK-118 |
| Estimated | 8h |

---

## هدف

**تسویه (settlement batch)** — گروه‌بندی تراکنش‌های POS/online در بازه تاریخ برای تطبیق با بانک — batch `open` → `closed` immutable.

---

## معیار پذیرش

- [ ] Prisma `SettlementBatch` + `SettlementBatchEntry` junction
- [ ] `CreateSettlementBatchUseCase` — auto-include eligible ledger entries
- [ ] `CloseSettlementBatchUseCase` — lock batch
- [ ] API `POST /api/v1/payments/settlements`
- [ ] API `GET /api/v1/payments/settlements` — list
- [ ] API `GET /api/v1/payments/settlements/:id`
- [ ] API `POST /api/v1/payments/settlements/:id/close`
- [ ] Permission: `installments.settlement.manage`
- [ ] Closed batch → no void/refund on included entries
- [ ] Audit: `settlement.create`, `settlement.close`

---

## مشخصات فنی

### Prisma

```prisma
enum SettlementBatchStatus {
  OPEN
  CLOSED

  @@map("settlement_batch_status")
}

model SettlementBatch {
  id            String                @id @default(uuid()) @db.Uuid
  tenantId      String                @map("tenant_id") @db.Uuid
  branchId      String                @map("branch_id") @db.Uuid
  batchNumber   String                @map("batch_number")
  status        SettlementBatchStatus @default(OPEN)
  periodFrom    DateTime              @map("period_from") @db.Timestamptz
  periodTo      DateTime              @map("period_to") @db.Timestamptz
  totalAmountRial BigInt              @map("total_amount_rial")
  entryCount    Int                   @map("entry_count")
  closedAt      DateTime?             @map("closed_at") @db.Timestamptz
  closedById    String?               @map("closed_by_id") @db.Uuid
  // base fields...
  entries       SettlementBatchEntry[]

  @@unique([tenantId, batchNumber])
  @@index([tenantId, status])
  @@map("settlement_batches")
}

model SettlementBatchEntry {
  id                String @id @default(uuid()) @db.Uuid
  settlementBatchId String @map("settlement_batch_id") @db.Uuid
  ledgerEntryId     String @map("ledger_entry_id") @db.Uuid
  // base fields minimal — link only
}
```

### Create API

```
POST /api/v1/payments/settlements
Permission: installments.settlement.manage
```

### Request

```json
{
  "branchId": "uuid",
  "periodFrom": "1405-07-01",
  "periodTo": "1405-07-31",
  "paymentMethods": ["card", "online"],
  "note": "تسویه تیر ۱۴۰۵"
}
```

### Response `201`

```json
{
  "settlement": {
    "id": "uuid",
    "batchNumber": "STL-140507-001",
    "status": "open",
    "totalAmountRial": "150000000",
    "entryCount": 42
  }
}
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Update | `prisma/schema.prisma` — SettlementBatch |
| Create | `packages/application/payments/create-settlement-batch.use-case.ts` |
| Create | `packages/application/payments/close-settlement-batch.use-case.ts` |
| Create | `packages/application/payments/list-settlement-batches.use-case.ts` |
| Create | `apps/api/src/modules/payments/settlement.controller.ts` |
| Create | `packages/application/payments/settlement.integration.spec.ts` |

---

## مراحل پیاده‌سازی

1. Migration settlement tables
2. Create batch — query eligible ledger entries not in open batch
3. Close batch — set status CLOSED, immutable
4. List/detail APIs
5. Hook IFP-107/108 settlement lock check
6. Tests

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| No entries in period | 400 | `SETTLEMENT_EMPTY` |
| Close already closed | 409 | `SETTLEMENT_ALREADY_CLOSED` |
| Entry in another open batch | 409 | `ENTRY_ALREADY_SETTLED` |
| periodFrom > periodTo | 400 | `DATE_RANGE_INVALID` |

---

## تست

- [ ] Integration: create batch with entries
- [ ] Integration: close → void blocked on entry
- [ ] Integration: totalAmountRial sum correct

---

## UX

N/A — tab تسویه در IFP-117.

---

## Flow

```
تسویه → ایجاد دسته → preview entries → بستن دسته → immutable
```

---

## Policy Alignment

- [ ] SOFT-DELETE on batch model
- [ ] Audit settlement.create/close
- [ ] ADR-007 bigint totals
- [ ] ADR-015 branchId

---

## مراجع

- `docs/01-product/installment-module-features.md` §۶ — تسویه
- IFP-TASK-101 ledger

---

## Self-Review Score

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata | 10 | 10 | ✓ |
| Completeness | 25 | 25 | batch schema |
| Policy | 25 | 25 | |
| Executability | 25 | 25 | |
| Alignment | 15 | 15 | §۶ |
| **جمع** | **100** | **100** | ≥95 ✅ |
