# IFP-TASK-051: Transfer Ownership Use Case

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | IFP-03 Customer Enterprise |
| Epic | Epic-06-Customer-Advanced |
| ID | IFP-051 |
| Priority | P1 |
| Depends on | IFP-037 |
| Blocks | IFP-053 |
| Estimated | 4h |

---

## هدف

Use case **انتقال مالکیت/مسئولیت** مشتری بین staff — تغییر `assignedStaffId` با audit و optional notification — §۳ انتقال مالکیت.

---

## معیار پذیرش

- [ ] POST `/api/v1/customers/:id/transfer-ownership` — `{ newStaffId, note? }`
- [ ] Permission: `installments.customer.transfer` — owner or manager
- [ ] Validate newStaffId active staff same tenant
- [ ] Data scope: actor must access customer and target staff
- [ ] Update assignedStaffId + metadata transferHistory[]
- [ ] Audit `customer.transfer` oldStaffId → newStaffId
- [ ] Optional in-app notification to new assignee (stub event)
- [ ] Response: updated customer detail

---

## مشخصات فنی

### Transfer history metadata shape

Array of `{ fromStaffId, toStaffId, at, byStaffId, note }` appended on each transfer — max 50 entries trim oldest

### Bulk transfer (P2)

Not in scope — single customer only

### Relationship to sales

Does **not** change historical sale.sellerId — only future assignment UX default

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/src/customers/transfer-customer-ownership.use-case.ts` |
| Update | `apps/api/src/customers/customers.controller.ts` |
| Create | contracts transfer schema |

---

## مراحل پیاده‌سازی

1. Use case validation
2. Metadata history append
3. Audit
4. Controller
5. Integration test transfer chain A→B→C

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Same staff | 422 | NOOP_TRANSFER |
| Staff suspended | 422 | STAFF_INACTIVE |
| Customer archived | 409 | CUSTOMER_ARCHIVED |
| Out of scope | 404 | CUSTOMER_NOT_FOUND |

---

## تست

- [ ] Integration: transfer updates assignedStaffId
- [ ] Integration: audit entry
- [ ] RBAC deny cashier

---

## UX (اگر UI دارد)

- [ ] Action menu «انتقال مسئولیت» — staff picker — IFP-053
- [ ] Show current assignee in detail header
- [ ] Optional note field

---

## Flow

```
Entry: detail → actions → transfer
Pick staff from dropdown
Optional note → confirm
Success toast + header updates
```

---

## Policy Alignment

- [ ] ADR-015 staff same tenant
- [ ] Audit required

---

## مراجع

- `docs/01-product/installment-module-features.md` §۳ — انتقال مالکیت

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
