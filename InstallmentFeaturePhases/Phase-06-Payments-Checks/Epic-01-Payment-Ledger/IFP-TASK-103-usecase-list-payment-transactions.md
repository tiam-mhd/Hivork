# IFP-TASK-103: Use Case + API — لیست تمام تراکنش‌ها

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 06 — Payments & Checks |
| Epic | Epic-01-Payment-Ledger |
| ID | IFP-TASK-103 |
| Priority | P0 |
| Depends on | IFP-TASK-102 |
| Blocks | IFP-TASK-105, IFP-TASK-107, IFP-TASK-108, IFP-TASK-109, IFP-TASK-117, IFP-TASK-118 |
| Estimated | 6h |

---

## هدف

API **لیست cursor-paginated** تمام تراکنش‌های `PaymentLedgerEntry` با فیلتر روش پرداخت، وضعیت، مشتری، قرارداد و بازه تاریخ — برای صفحه «پرداخت‌ها» §۶ محصول.

---

## معیار پذیرش

- [ ] `ListPaymentTransactionsUseCase`
- [ ] API `GET /api/v1/payments/transactions`
- [ ] Permission: `installments.payment.read`
- [ ] Cursor pagination: `cursor`, `limit` (max 100)
- [ ] Filters: `status`, `entryType`, `paymentMethod`, `branchId`, `saleId`, `tenantCustomerId`, `occurredFrom`, `occurredTo`, `search`
- [ ] Sort: `occurredAt` desc default
- [ ] Response includes customer/sale summary joins
- [ ] `@ApplyDataScope()` branch filter
- [ ] Integration test: filter + pagination + cross-tenant deny

---

## مشخصات فنی

### API

```
GET /api/v1/payments/transactions?cursor=&limit=20&status=posted&paymentMethod=cash&occurredFrom=1405-01-01&occurredTo=1405-12-29
Permission: installments.payment.read
Module: installments
Headers: X-Branch-Id
```

### Response `200`

```json
{
  "items": [
    {
      "id": "uuid",
      "entryType": "payment_in",
      "direction": "credit",
      "amountRial": "5000000",
      "status": "posted",
      "paymentMethod": "cash",
      "occurredAt": "2025-06-30T10:00:00.000Z",
      "customer": { "id": "uuid", "displayName": "علی احمدی" },
      "sale": { "id": "uuid", "contractNumber": "C-1405-001" },
      "installment": { "id": "uuid", "sequenceNumber": 2 }
    }
  ],
  "nextCursor": "eyJ...",
  "hasMore": true
}
```

### Query schema (contracts)

```typescript
export const ListPaymentTransactionsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['posted', 'voided']).optional(),
  entryType: z.enum(['payment_in', 'refund', 'fee', ...]).optional(),
  paymentMethod: PaymentMethodSchema.optional(),
  branchId: z.string().uuid().optional(),
  saleId: z.string().uuid().optional(),
  tenantCustomerId: z.string().uuid().optional(),
  occurredFrom: dateOnlySchema.optional(),
  occurredTo: dateOnlySchema.optional(),
  search: z.string().max(100).optional(), // ref number, description
});
```

### Repository query

- Always `tenantId` + `deletedAt: null`
- Branch scope via `branchId IN accessibleBranches`
- Cursor on `(occurredAt, id)` tuple

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/payments/list-payment-transactions.use-case.ts` |
| Create | `packages/contracts/src/payments/list-payment-transactions.schema.ts` |
| Create | `packages/infrastructure/persistence/payment-ledger.repository.ts` |
| Create | `apps/api/src/modules/payments/payment-transactions.controller.ts` |
| Create | `packages/application/payments/list-payment-transactions.integration.spec.ts` |

---

## مراحل پیاده‌سازی

1. Ledger repository with cursor pagination
2. Query use case + joins (customer via sale)
3. Zod query contract
4. Controller + guards
5. Integration tests

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Invalid cursor | 400 | `CURSOR_INVALID` |
| occurredFrom > occurredTo | 400 | `DATE_RANGE_INVALID` |
| Cross-tenant filter saleId | 404 | empty or not found |
| Branch out of scope | 403 | `BRANCH_ACCESS_DENIED` |

---

## تست

- [ ] Integration: list returns posted entries
- [ ] Integration: filter by paymentMethod
- [ ] Integration: pagination cursor stable
- [ ] RBAC deny
- [ ] Cross-tenant deny

---

## UX

N/A — consumed by IFP-117.

---

## Flow

```
صفحه تراکنش‌ها → فیلتر → infinite scroll / next page
```

---

## Policy Alignment

- [ ] ADR-015 data scope
- [ ] Cursor pagination per EXCELLENCE
- [ ] tenantId from JWT only

---

## مراجع

- `docs/01-product/installment-module-features.md` §۶ — تمام تراکنش‌ها
- IFP-TASK-101, IFP-TASK-102

---

## Self-Review Score

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata | 10 | 10 | ✓ |
| Completeness | 25 | 25 | full filters |
| Policy | 25 | 25 | |
| Executability | 25 | 25 | |
| Alignment | 15 | 15 | §۶ |
| **جمع** | **100** | **100** | ≥95 ✅ |
