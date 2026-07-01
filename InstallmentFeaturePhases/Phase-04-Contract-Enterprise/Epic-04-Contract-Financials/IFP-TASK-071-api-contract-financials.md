# IFP-TASK-071: API — Contract Financials CRUD & Recalculate

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 04 — Contract Enterprise |
| Epic | Epic-04-Contract-Financials |
| ID | IFP-TASK-071 |
| Priority | P0 |
| Depends on | IFP-TASK-068, IFP-TASK-069, IFP-TASK-070, IFP-TASK-058 |
| Blocks | IFP-076, IFP-078 |
| Estimated | 8h |

---

## هدف

API و use cases برای مدیریت **اقلام قرارداد**، به‌روزرسانی مالیات/بیمه، و **recalculate** با ContractVersion snapshot.

---

## معیار پذیرش

- [ ] Zod: `SaleLineItemSchema`, `CreateSaleLineItemSchema`, `BulkUpsertLineItemsSchema`, `UpdateSaleFinancialsSchema`
- [ ] Endpoints under `/api/v1/sales/:saleId/line-items` and `/financials`
- [ ] `POST /sales/:saleId/financials/recalculate` — recalc totals + optional schedule regen flag
- [ ] Permission: `installments.sale.edit_financials`
- [ ] ContractVersion on recalculate: `FINANCIAL_RECALC`
- [ ] Audit: `sale.financials.update`, `sale.line_item.*`
- [ ] Returns updated enterprise sale DTO with line items array

---

## مشخصات فنی

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/sales/:saleId/line-items` | List items |
| POST | `/sales/:saleId/line-items` | Create one |
| PUT | `/sales/:saleId/line-items` | Bulk upsert (replace all) |
| PATCH | `/sales/:saleId/line-items/:id` | Update one |
| DELETE | `/sales/:saleId/line-items/:id` | Soft delete |
| PATCH | `/sales/:saleId/financials` | Update tax/insurance header |
| POST | `/sales/:saleId/financials/recalculate` | Recalculate totals |

### BulkUpsertLineItemsSchema

```typescript
export const BulkUpsertLineItemsSchema = z.object({
  items: z.array(CreateSaleLineItemSchema).min(1).max(100),
  expectedVersion: z.number().int().positive(),
  regenerateInstallments: z.boolean().default(false),
});
```

### Recalculate response

```json
{
  "data": {
    "totalAmountRial": "25000000",
    "subtotalRial": "23000000",
    "taxRial": "2070000",
    "insuranceRial": "500000",
    "requiresScheduleRegeneration": true,
    "version": 4
  }
}
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/contracts/src/installments/sale-line-item.schema.ts` |
| Create | `packages/application/installments/*-line-item*.ts` |
| Create | `packages/application/installments/recalculate-sale-financials.use-case.ts` |
| Create | `apps/api/src/modules/installments/sale-financials.controller.ts` |
| Update | `docs/02-architecture/api-contracts.md` |

---

## مراحل پیاده‌سازی

1. Contracts schemas + tests
2. CRUD use cases with `assertCanModifyFinancials`
3. Recalculate use case + version snapshot
4. Controller + RBAC
5. Integration tests including sum invariant

---

## Edge Cases & Errors

| سناریو | HTTP | Code |
|--------|------|------|
| Bulk upsert on archived sale | 409 | `SALE_ARCHIVED_READONLY` |
| Version conflict | 409 | `VERSION_CONFLICT` |
| Sum mismatch without regen flag | 409 | `INSTALLMENT_SUM_MISMATCH` |
| > 100 items | 400 | validation |

---

## تست

- [ ] Integration: bulk upsert 3 items → total updated
- [ ] Integration: recalculate creates version
- [ ] Integration: edit with paid installment → 409
- [ ] RBAC deny

---

## UX

IFP-076 — editable grid, recalculate button, mismatch warning.

---

## Flow

```
financials tab → edit lines → save → optional regenerate installments modal
```

---

## Policy Alignment

- [ ] Audit + version snapshot
- [ ] ADR-007 bigint in JSON
- [ ] Optimistic locking

---

## مراجع

- IFP-TASK-068–070
- IFP-TASK-056 ContractVersion

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
