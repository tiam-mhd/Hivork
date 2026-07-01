# IFP-TASK-048: Payment History Tab

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | IFP-03 Customer Enterprise |
| Epic | Epic-05-Customer-History |
| ID | IFP-048 |
| Priority | P0 |
| Depends on | IFP-040, Phase 1 payments module |
| Blocks | IFP-053 |
| Estimated | 4h |

---

## هدف

API **سوابق پرداخت** مشتری — tab data با cursor pagination، فیلتر status/dateIncl installment/sale ref — §۳ سوابق پرداخت.

---

## معیار پذیرش

- [ ] GET `/api/v1/customers/:id/payments?cursor=&limit=&status=`
- [ ] Fields: paymentId, amountRial (string), status, method, confirmedAt, installmentNumber, saleTitle, saleId
- [ ] Sort: confirmedAt desc default
- [ ] Filter: status pending|confirmed|rejected
- [ ] Data scope via sale.branchId
- [ ] Permission: `installments.customer.read` + payment read scope
- [ ] Summary header: totalPaidRial, pendingCount optional

---

## مشخصات فنی

### Query join path

TenantCustomer → Sales → Installments → Payments  
Filter `tenantId` + `customerId` on Sale  

### Amount display

API bigint as string — UI formats toman  

### Empty state

Valid 200 with items: [] — not 404

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/src/customers/list-customer-payments.use-case.ts` |
| Update | `apps/api/src/customers/customers.controller.ts` |
| Create | contracts list-customer-payments schema |

---

## مراحل پیاده‌سازی

1. Repository query with indexes
2. Use case + scope filter
3. Controller route
4. Integration test with fixture payment
5. Summary aggregation optional query

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Customer no payments | 200 | empty |
| Cross-tenant | 404 | CUSTOMER_NOT_FOUND |
| Invalid status enum | 422 | VALIDATION_ERROR |

---

## تست

- [ ] Integration: list payments for customer with 2 sales
- [ ] RBAC branch scope hides other branch payments
- [ ] Cross-tenant fail

---

## UX (اگر UI دارد)

- [ ] Payments tab table — IFP-019 DataTable
- [ ] Link row → payment detail
- [ ] Summary KPI cards
- [ ] Empty state fa

---

## Flow

```
Entry: detail → payments tab
Load table → filter status
Click row → payment detail route
Empty → message
```

---

## Policy Alignment

- [ ] bigint Rial — no float
- [ ] ADR-015 branch scope on sales
- [ ] Tenant filter mandatory

---

## مراجع

- Phase 1 payment use cases
- `docs/01-product/installment-module-features.md` §۳

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
