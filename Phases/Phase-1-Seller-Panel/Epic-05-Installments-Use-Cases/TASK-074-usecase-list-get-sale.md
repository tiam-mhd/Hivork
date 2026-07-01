# TASK-074: Use Case — List & Get Sale

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 1 |
| Epic | Epic-05-Installments-Use-Cases |
| ID | TASK-074 |
| Priority | P0 |
| Depends on | TASK-065, TASK-066, TASK-068, TASK-072 |
| Blocks | TASK-080, TASK-109, TASK-111, TASK-120 |
| Estimated | 6h |

---

## هدف

`ListSalesUseCase` و `GetSaleUseCase` — لیست cursor-paginated فروش‌ها با فیلتر status/branch/search/date و جزئیات فروش با installments + customer embed. Data scope ADR-015 روی همه queryها.

---

## معیار پذیرش

- [ ] `ListSalesUseCase` — cursor pagination، sort، filters
- [ ] `GetSaleUseCase` — sale by id + installments ordered by sequenceNumber
- [ ] Permission context: `installments.sale.view` (controller)
- [ ] Data scope `all`: all branches in tenant
- [ ] Data scope `branch`: `branchId IN assignedBranchIds`
- [ ] Data scope `own`: `createdByStaffId = actorId`
- [ ] `X-Branch-Id` header intersects with scope for default list filter
- [ ] Exclude soft-deleted sales (`deletedAt IS NULL`)
- [ ] List includes customer embed (phone, name) + paidCount aggregate
- [ ] Get returns 404 `SALE_NOT_FOUND` for wrong tenant / out of scope / deleted
- [ ] Search: title، invoiceNumber، customer name/phone
- [ ] Response shapes match `SaleSummarySchema` / `SaleDetailSchema` (TASK-068)

---

## مشخصات فنی

### ListSalesInput

```typescript
export type ListSalesInput = {
  tenantId: string;
  actorId: string;
  staffContext: DataScopeStaffContext;
  cursor?: string;
  limit: number;
  sort: 'createdAt:desc' | 'createdAt:asc' | 'contractDate:desc';
  status?: 'active' | 'completed' | 'cancelled';
  branchId?: string;
  search?: string;
  from?: Date;
  to?: Date;
  activeBranchId?: string; // from X-Branch-Id header
};
```

### List Query (Repository)

```sql
-- Pseudocode — Prisma where builder
WHERE tenant_id = :tenantId
  AND deleted_at IS NULL
  AND (:status IS NULL OR status = :status)
  AND branch_id IN (:allowedBranchIds)  -- from data scope
  AND (:branchId IS NULL OR branch_id = :branchId)
  AND (created_at BETWEEN :from AND :to OR both null)
  AND (search ILIKE title OR customer name/phone)
ORDER BY created_at DESC, id DESC
LIMIT :limit + 1
```

### GetSaleInput

```typescript
export type GetSaleInput = {
  tenantId: string;
  saleId: string;
  staffContext: DataScopeStaffContext;
};
```

### Get Response (installments)

```json
{
  "data": {
    "id": "uuid",
    "customer": { "id": "uuid", "phone": "09121234567", "name": "حسین احمدی" },
    "branchId": "uuid",
    "title": "موبایل سامسونگ S23",
    "totalAmountRial": "25000000",
    "installments": [
      {
        "id": "uuid",
        "sequenceNumber": 1,
        "dueDate": "2025-02-01T00:00:00.000Z",
        "amountRial": "2000000",
        "status": "paid",
        "paidAt": "2025-02-02T10:00:00.000Z"
      }
    ],
    "status": "active"
  }
}
```

### paidCount Calculation

```typescript
paidCount = installments.filter(i => i.status === 'paid').length;
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/src/installments/sales/list-sales.use-case.ts` |
| Create | `packages/application/src/installments/sales/get-sale.use-case.ts` |
| Create | `packages/application/src/installments/sales/list-sales.use-case.spec.ts` |
| Create | `packages/application/src/installments/sales/get-sale.use-case.spec.ts` |
| Update | `packages/application/src/ports/sale.repository.port.ts` |
| Update | `packages/infrastructure/persistence/sale.repository.ts` |

---

## مراحل پیاده‌سازی

1. Build `resolveBranchFilter(staffContext, activeBranchId)` helper
2. Implement cursor encoder/decoder (id + createdAt composite)
3. `ListSalesUseCase` with repo query + customer join
4. `GetSaleUseCase` with scope check + installments load
5. Mapper to contract DTOs
6. Unit tests: scope filters
7. Integration: list pagination + get detail

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Empty list | 200 | `data: []`, hasNext: false |
| Invalid cursor | 400 | `INVALID_CURSOR` |
| Sale other tenant | 404 | `SALE_NOT_FOUND` |
| Sale soft-deleted | 404 | `SALE_NOT_FOUND` |
| Branch staff views other branch sale | 404 | scope mask |
| limit > 100 | 400 | validation at controller |
| Cancelled sale in list | 200 | visible if status filter allows |

---

## تست

- [ ] Unit: list applies branch scope filter
- [ ] Unit: list applies own scope (sellerId)
- [ ] Unit: get sale out of scope → NotFound
- [ ] Unit: cursor pagination hasNext correct
- [ ] Unit: paidCount aggregate
- [ ] Integration: create sale → list contains it
- [ ] Integration: get returns installments ordered
- [ ] Integration: cross-tenant get → 404

---

## UX

N/A — TASK-109 list، TASK-111 detail.

---

## Flow

```
List: filters + scope → repo query → map summaries → cursor meta
Get:  saleId + scope → load sale + installments → map detail
```

---

## Policy Alignment

- [ ] EXCELLENCE-STANDARDS §3 — cursor pagination، search، filters
- [ ] SOFT-DELETE-POLICY — deletedAt null filter
- [ ] ADR-015 — data scope on every query
- [ ] tenantId on every query

---

## مراجع

- `docs/02-architecture/api-contracts.md` § GET sales
- `docs/02-architecture/rbac.md` — data scope
- `docs/09-development/EXCELLENCE-STANDARDS.md` §3
- `Phases/Phase-1-Seller-Panel/Epic-06-Installments-API/TASK-080-api-sales-controller.md`

---

## Self-Review Score

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata | 10 | 10 | ✓ |
| Completeness | 25 | 25 | List + get، filters، cursor |
| Policy | 25 | 25 | scope، soft delete |
| Executability | 25 | 25 | 8 tests |
| Alignment | 15 | 15 | TASK-068، TASK-080 |
| **جمع** | **100** | **100** | ≥95 ✅ |
