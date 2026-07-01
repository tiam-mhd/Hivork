# IFP-TASK-056: Prisma — ContractVersion

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 04 — Contract Enterprise |
| Epic | Epic-01-Contract-Schema |
| ID | IFP-TASK-056 |
| Priority | P0 |
| Depends on | IFP-TASK-055 |
| Blocks | IFP-058, IFP-059, IFP-060 |
| Estimated | 4h |

---

## هدف

مدل **ContractVersion** — تاریخچه نسخه‌های قرارداد (snapshot immutable) برای audit، چاپ، و مقایسه تغییرات مطابق §۴ «نسخه‌ها» و «تاریخچه تغییرات».

---

## معیار پذیرش

- [ ] مدل `ContractVersion` با base fields (بدون soft delete — append-only)
- [ ] `saleId`, `tenantId`, `versionNumber` (int, 1-based per sale)
- [ ] `snapshot` JsonB — full sale + line items + settings hash at point in time
- [ ] `changeReason` string required min 3 chars
- [ ] `changeType` enum: `CREATE`, `UPDATE`, `EXTEND`, `COPY_SOURCE`, `TERMINATE`, `CLOSE`, `FINANCIAL_RECALC`
- [ ] Unique `(saleId, versionNumber)`
- [ ] Index `(tenantId, saleId)`, `(tenantId, createdAt)`
- [ ] **No** `deletedAt` — versions never deleted (policy exception documented)
- [ ] `onDelete: Restrict` on saleId

---

## مشخصات فنی

```prisma
enum ContractVersionChangeType {
  CREATE
  UPDATE
  EXTEND
  COPY_SOURCE
  TERMINATE
  CLOSE
  FINANCIAL_RECALC

  @@map("contract_version_change_type")
}

model ContractVersion {
  id            String                    @id @default(uuid()) @db.Uuid
  tenantId      String                    @map("tenant_id") @db.Uuid
  saleId        String                    @map("sale_id") @db.Uuid
  versionNumber Int                       @map("version_number")
  changeType    ContractVersionChangeType @map("change_type")
  changeReason  String                    @map("change_reason")
  snapshot      Json                      @db.JsonB
  createdAt     DateTime                  @default(now()) @map("created_at") @db.Timestamptz
  createdById   String?                   @map("created_by_id") @db.Uuid

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Restrict)
  sale   Sale   @relation(fields: [saleId], references: [id], onDelete: Restrict)

  @@unique([saleId, versionNumber])
  @@index([tenantId, saleId])
  @@index([tenantId, createdAt])
  @@map("contract_versions")
}
```

### Snapshot schema (documented shape)

```typescript
type ContractVersionSnapshot = {
  sale: Record<string, unknown>;      // serialized Sale fields
  lineItems?: Record<string, unknown>[];
  guarantors?: Record<string, unknown>[];
  collaterals?: Record<string, unknown>[];
  installmentSchedule?: Record<string, unknown>[];
  settingsHash?: string;              // SHA-256 of relevant settings keys
};
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `prisma/schema.prisma` — ContractVersion |
| Create | Migration SQL |
| Create | `packages/domain/installments/contract-version.types.ts` |

---

## مراحل پیاده‌سازی

1. Define enum `ContractVersionChangeType`
2. Create model without soft-delete fields (explicit exception)
3. FK to Sale + Tenant Restrict
4. Migration
5. Document snapshot JSON shape in domain types
6. Repository interface: `appendVersion()` only — no update/delete

---

## Edge Cases & Errors

| سناریو | رفتار |
|--------|--------|
| versionNumber race on concurrent update | DB unique constraint + retry in use case |
| Sale soft-deleted | versions remain readable for audit |
| Snapshot > 1MB | warn in use case; trim large blobs to file refs |

---

## تست

- [ ] Integration: append version 1 on create, version 2 on update
- [ ] Integration: unique (saleId, versionNumber) violation
- [ ] Unit: snapshot type documents required keys

---

## UX

N/A

---

## Flow

```
create sale → version 1 (CREATE)
edit financials → version N (FINANCIAL_RECALC)
extend → version N (EXTEND)
```

---

## Policy Alignment

- [ ] Append-only exception — like AuditLog (SOFT-DELETE-POLICY)
- [ ] ADR-013 — no cascade delete
- [ ] tenantId on all queries

---

## مراجع

- `docs/01-product/installment-module-features.md` §۴ — نسخه‌ها، تاریخچه
- `docs/06-operations/security-and-audit.md`

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
