# IFP-TASK-110: Use Case + API — مغایرت‌گیری

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 06 — Payments & Checks |
| Epic | Epic-03-Refund-Void-Settlement |
| ID | IFP-TASK-110 |
| Priority | P0 |
| Depends on | IFP-TASK-109 |
| Blocks | IFP-TASK-117, IFP-TASK-118 |
| Estimated | 6h |

---

## هدف

**مغایرت‌گیری (reconciliation)** — مقایسه `SettlementBatch` با فایل/ورودی بانک — ثبت اختلاف‌ها و resolve با audit `reconciliation.resolve`.

---

## معیار پذیرش

- [ ] Prisma `ReconciliationReport` + `ReconciliationDiscrepancy`
- [ ] `ImportBankStatementUseCase` — CSV upload parse
- [ ] `RunReconciliationUseCase` — match by reference/trace
- [ ] `ResolveDiscrepancyUseCase` — mark resolved with note
- [ ] API `POST /api/v1/payments/settlements/:id/reconcile`
- [ ] API `GET /api/v1/payments/reconciliations/:id`
- [ ] API `POST /api/v1/payments/reconciliations/discrepancies/:id/resolve`
- [ ] Permission: `installments.reconciliation.manage`
- [ ] Discrepancy types: `missing_in_system`, `missing_in_bank`, `amount_mismatch`
- [ ] Audit: `reconciliation.resolve`

---

## مشخصات فنی

### Prisma

```prisma
enum ReconciliationDiscrepancyType {
  MISSING_IN_SYSTEM
  MISSING_IN_BANK
  AMOUNT_MISMATCH

  @@map("reconciliation_discrepancy_type")
}

enum ReconciliationDiscrepancyStatus {
  OPEN
  RESOLVED
  IGNORED

  @@map("reconciliation_discrepancy_status")
}

model ReconciliationReport {
  id                 String   @id @default(uuid()) @db.Uuid
  tenantId           String   @map("tenant_id") @db.Uuid
  settlementBatchId  String   @map("settlement_batch_id") @db.Uuid
  matchedCount       Int      @map("matched_count")
  discrepancyCount   Int      @map("discrepancy_count")
  bankTotalRial      BigInt   @map("bank_total_rial")
  systemTotalRial    BigInt   @map("system_total_rial")
  // base fields...
  discrepancies      ReconciliationDiscrepancy[]
}

model ReconciliationDiscrepancy {
  id                     String                        @id @default(uuid()) @db.Uuid
  tenantId               String                        @map("tenant_id") @db.Uuid
  reconciliationReportId String                        @map("reconciliation_report_id") @db.Uuid
  discrepancyType        ReconciliationDiscrepancyType @map("discrepancy_type")
  status                 ReconciliationDiscrepancyStatus @default(OPEN)
  bankReference          String?                       @map("bank_reference")
  bankAmountRial         BigInt?                       @map("bank_amount_rial")
  ledgerEntryId          String?                       @map("ledger_entry_id") @db.Uuid
  systemAmountRial       BigInt?                       @map("system_amount_rial")
  resolveNote            String?                       @map("resolve_note")
  resolvedAt             DateTime?                     @map("resolved_at") @db.Timestamptz
  resolvedById           String?                       @map("resolved_by_id") @db.Uuid
  // base fields...
}
```

### Reconcile API

```
POST /api/v1/payments/settlements/:settlementBatchId/reconcile
Content-Type: multipart/form-data
Permission: installments.reconciliation.manage
```

### Form fields

- `bankStatementFile` — CSV columns: `date, reference, amountRial, description`
- `encoding` — utf-8 default

### Response `201`

```json
{
  "report": {
    "id": "uuid",
    "matchedCount": 38,
    "discrepancyCount": 4,
    "bankTotalRial": "150000000",
    "systemTotalRial": "149500000"
  },
  "discrepancies": [
    { "id": "uuid", "discrepancyType": "amount_mismatch", "bankAmountRial": "5000000", "systemAmountRial": "4500000" }
  ]
}
```

### Matching algorithm

1. Normalize bank reference (trim, Persian digits → Latin)
2. Match ledger entries in batch by `metadata.referenceNumber` or POS trace
3. Amount compare bigint exact
4. Unmatched bank rows → MISSING_IN_SYSTEM
5. Unmatched ledger → MISSING_IN_BANK

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Update | `prisma/schema.prisma` |
| Create | `packages/application/payments/run-reconciliation.use-case.ts` |
| Create | `packages/application/payments/resolve-discrepancy.use-case.ts` |
| Create | `packages/infrastructure/parsers/bank-statement-csv.parser.ts` |
| Create | `apps/api/src/modules/payments/reconciliation.controller.ts` |
| Create | `packages/application/payments/reconciliation.integration.spec.ts` |

---

## مراحل پیاده‌سازی

1. Migration reconciliation tables
2. CSV parser with validation
3. Matching engine
4. Resolve use case + audit
5. Controller multipart upload
6. Tests with fixture CSV

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Settlement not closed | 409 | `SETTLEMENT_NOT_CLOSED` |
| Invalid CSV format | 400 | `BANK_STATEMENT_INVALID` |
| Empty file | 400 | `BANK_STATEMENT_EMPTY` |
| Resolve already resolved | 409 | `DISCREPANCY_ALREADY_RESOLVED` |

---

## تست

- [ ] Integration: reconcile with fixture — 2 discrepancies
- [ ] Integration: resolve discrepancy
- [ ] Unit: CSV parser edge cases
- [ ] RBAC deny

---

## UX

N/A — tab مغایرت در IFP-117.

---

## Flow

```
تسویه بسته → آپلود صورتحساب بانک → اجرای مغایرت‌گیری
→ لیست اختلاف‌ها → resolve با یادداشت
```

---

## Policy Alignment

- [ ] ADR-007 bigint compare
- [ ] Audit reconciliation.resolve
- [ ] SOFT-DELETE on report/discrepancy models
- [ ] No PII from bank CSV in logs

---

## مراجع

- `docs/01-product/installment-module-features.md` §۶ — مغایرت
- IFP-TASK-109

---

## Self-Review Score

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata | 10 | 10 | ✓ |
| Completeness | 25 | 25 | CSV + matching |
| Policy | 25 | 25 | |
| Executability | 25 | 25 | |
| Alignment | 15 | 15 | §۶ |
| **جمع** | **100** | **100** | ≥95 ✅ |
