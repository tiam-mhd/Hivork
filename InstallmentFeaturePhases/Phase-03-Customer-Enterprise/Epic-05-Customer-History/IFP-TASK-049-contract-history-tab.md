# IFP-TASK-049: Contract History Tab

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | IFP-03 Customer Enterprise |
| Epic | Epic-05-Customer-History |
| ID | IFP-049 |
| Priority | P0 |
| Depends on | IFP-040, Phase 1 sales module |
| Blocks | IFP-053 |
| Estimated | 4h |

---

## هدف

API **سوابق قرارداد** (Sales) مشتری — list با status، مبلغ، اقساط، branch — §۳ سوابق قرارداد.

---

## معیار پذیرش

- [ ] GET `/api/v1/customers/:id/contracts?cursor=&limit=&status=`
- [ ] Fields: saleId, title, status, totalAmountRial, paidAmountRial, installmentCount, contractDate, branchName, sellerName
- [ ] Sort: contractDate desc
- [ ] Filter: status active|cancelled|closed|overdue aggregate
- [ ] Data scope branch/own
- [ ] Permission: `installments.customer.read`
- [ ] Link to sale detail route id

---

## مشخصات فنی

### Status filter mapping

Domain sale statuses mapped to UI-friendly buckets per state-machines.md

### Computed fields

paidAmountRial — sum confirmed payments  
overdueCount — installments past due unpaid  

### Performance

Index Sale `(tenantId, customerId, contractDate)`

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/src/customers/list-customer-contracts.use-case.ts` |
| Update | `apps/api/src/customers/customers.controller.ts` |
| Create | contracts list-customer-contracts schema |

---

## مراحل پیاده‌سازی

1. Query sales by tenantCustomerId
2. Join branch, staff seller
3. Aggregate paid/overdue
4. Cursor pagination
5. Integration tests

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| No contracts | 200 | empty |
| Cancelled sales included | default | filter optional exclude |
| Soft-deleted customer | 404 | CUSTOMER_NOT_FOUND |

---

## تست

- [ ] Integration: 3 sales various status
- [ ] RBAC scope
- [ ] Cross-tenant fail

---

## UX (اگر UI دارد)

- [ ] Contracts tab — IFP-019 DataTable
- [ ] Status badges colored
- [ ] Row click → sale detail
- [ ] Empty CTA «ثبت قرارداد» if permission

---

## Flow

```
Entry: detail → contracts tab
Table load
Filter status
Navigate to sale
Empty → CTA new sale
```

---

## Policy Alignment

- [ ] state-machines.md sale statuses
- [ ] bigint amounts
- [ ] ADR-015 scope

---

## مراجع

- `docs/03-modules/installments/state-machines.md`
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
