# IFP-TASK-061: Use Case — Copy Contract (کپی)

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 04 — Contract Enterprise |
| Epic | Epic-02-Contract-Lifecycle |
| ID | IFP-TASK-061 |
| Priority | P0 |
| Depends on | IFP-TASK-059, IFP-TASK-058, Phase 1 TASK-072 |
| Blocks | IFP-064 |
| Estimated | 8h |

---

## هدف

`CopyContractUseCase` — ایجاد قرارداد جدید از روی قرارداد موجود با lineage `copiedFromSaleId`، کپی اختیاری ضامن/پیوست، شماره قرارداد جدید از settings (IFP-074).

---

## معیار پذیرش

- [ ] `CopyContractUseCase.execute({ sourceSaleId, ...dto })`
- [ ] Permission: `installments.sale.copy`
- [ ] New sale `ACTIVE` with new `contractNumber` (atomic sequence)
- [ ] `copiedFromSaleId` = source
- [ ] Copy financials: line items, tax, insurance amounts (not payment history)
- [ ] Optional `copyGuarantors`, `copyAttachments` (file refs duplicated as new attachment rows)
- [ ] Source gets ContractVersion `COPY_SOURCE` snapshot
- [ ] New sale gets ContractVersion `CREATE` with snapshot
- [ ] Audit: `sale.copy` on source + `sale.create` on new
- [ ] Regenerate installment schedule via CreateSale algorithm (new dates)

---

## مشخصات فنی

### Input

```typescript
type CopyContractInput = {
  tenantId: string;
  staffId: string;
  branchId: string;
  sourceSaleId: string;
  tenantCustomerId?: string;
  branchIdTarget?: string;
  contractDate: string;
  firstDueDate: string;
  copyAttachments: boolean;
  copyGuarantors: boolean;
  reason: string;
};
```

### Output

```typescript
{ newSaleId: string; contractNumber: string; sale: SaleDetailEnterpriseDto }
```

### Copy rules

| Data | Copied? |
|------|---------|
| Line items | Yes (new IDs) |
| Guarantors | If flag |
| Collaterals | No (manual re-entry) |
| Attachments | If flag — same fileId, new attachment row |
| Installments | No — regenerated |
| Payments | Never |

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/installments/copy-contract.use-case.ts` |
| Create | Integration test file |
| Update | Reuse `CreateSaleUseCase` internals or shared `SaleFactory` |

---

## مراحل پیاده‌سازی

1. Load source sale + related entities (tenant scoped)
2. Validate source not soft-deleted
3. Allocate contract number via `ContractNumberService` (IFP-074)
4. Transaction: create new sale + line items + optional guarantors/attachments
5. Generate installments (reuse create sale logic)
6. Append versions on source and new sale
7. Audit both entities

---

## Edge Cases & Errors

| سناریو | HTTP | Code |
|--------|------|------|
| Source archived | 409 | `SALE_ARCHIVED_READONLY` |
| Invalid customerId | 404 | `CUSTOMER_NOT_FOUND` |
| Branch mismatch tenant | 422 | `BRANCH_TENANT_MISMATCH` |
| Contract number exhaustion | 500 | `CONTRACT_NUMBER_GENERATION_FAILED` |

---

## تست

- [ ] Integration: copy sale — new sale with copiedFromSaleId
- [ ] Integration: copyGuarantors true — guarantor count matches
- [ ] Integration: installments not copied — new schedule generated
- [ ] RBAC: deny without permission

---

## UX

IFP-077 — wizard: select customer/branch override, dates, copy options.

---

## Flow

```
entry: sale detail → «کپی قرارداد»
steps: form → preview summary → confirm
errors: customer not found
exit: redirect to new sale detail
```

---

## Policy Alignment

- [ ] No payment data copy — financial integrity
- [ ] Audit on source and target
- [ ] ADR-007 bigint preserved

---

## مراجع

- IFP-TASK-058 `CopyContractSchema`
- Phase 1 `TASK-072-usecase-create-sale.md`
- `docs/01-product/installment-module-features.md` §۴ — کپی

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
