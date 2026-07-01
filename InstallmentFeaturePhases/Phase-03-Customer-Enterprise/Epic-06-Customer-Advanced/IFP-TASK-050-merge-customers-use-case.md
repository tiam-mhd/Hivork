# IFP-TASK-050: Merge Customers Use Case (with Audit)

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | IFP-03 Customer Enterprise |
| Epic | Epic-06-Customer-Advanced |
| ID | IFP-050 |
| Priority | P0 |
| Depends on | IFP-038, IFP-037 |
| Blocks | IFP-054 |
| Estimated | 10h |

---

## هدف

Use case **ادغام دو مشتری** tenant — source → target: re-link Sales، merge tags/notes/documents، soft-delete source، audit کامل irreversible — §۳ ادغام مشتری.

---

## معیار پذیرش

- [ ] POST `/api/v1/customers/merge` — `{ sourceTenantCustomerId, targetTenantCustomerId, reason }`
- [ ] Permission: `installments.customer.merge` — typically owner only
- [ ] Preconditions: both active, same tenant, source ≠ target, neither blacklisted merge lock optional
- [ ] Actions: re-point all Sales customerId to target; merge tags unique; copy documents/notes optional policy; sum totalPurchaseRial; max creditScore/overdue rules documented
- [ ] Soft-delete source TenantCustomer with deleteReason «merged into {targetId}»
- [ ] Target metadata records merge history
- [ ] Audit `customer.merge` with full JSON payload ids + counts
- [ ] Idempotency-Key header — duplicate merge attempt → 409
- [ ] Response: target detail + `{ mergedSalesCount, mergedDocumentsCount }`
- [ ] Cannot merge if source has pending payment approval blocking — 409

---

## مشخصات فنی

### Merge algorithm (transaction)

1. Lock both rows version check  
2. Validate tenant + scope  
3. Update Sale.customerId source → target where tenantId match  
4. Merge TenantCustomer fields (tags union, notes append to metadata, totalPurchaseRial add)  
5. Re-link CustomerDocument, CustomerNote, addresses (dedupe primary)  
6. Soft-delete source  
7. Audit  

### GlobalCustomer handling

If source and target different GlobalCustomer — **keep target GlobalCustomer**; source User link orphaned only if no other tenant links — document platform rule: do not delete User

### Reversibility

No automatic unmerge — platform admin manual SQL forbidden — restore source from soft-delete only if no sale moved (guard)

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/src/customers/merge-tenant-customers.use-case.ts` |
| Create | `packages/domain/src/core/customer/customer-merge.service.ts` |
| Update | `apps/api/src/customers/customers.controller.ts` |
| Create | contracts MergeCustomersSchema |

---

## مراحل پیاده‌سازی

1. Domain merge service pure logic
2. Use case transaction
3. Sale repository bulk update
4. Audit payload
5. Controller + idempotency
6. Integration test full merge
7. Unit test edge validations

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Same source and target | 422 | VALIDATION_ERROR |
| Source already deleted | 404 | CUSTOMER_NOT_FOUND |
| Different tenants | 404 | IDOR |
| Active duplicate phone after merge | — | N/A same User unlikely |
| Permission deny | 403 | PERMISSION_DENIED |

---

## تست

- [ ] Integration: merge reassigns sales count
- [ ] Integration: source soft-deleted not in list
- [ ] Integration: audit log entry exists
- [ ] RBAC: cashier cannot merge
- [ ] Cross-tenant merge attempt → fail

---

## UX (اگر UI دارد)

- [ ] Merge wizard: select source from duplicate search — IFP-053
- [ ] Summary preview counts
- [ ] Reason required textarea
- [ ] Confirm irreversible dialog

---

## Flow

```
Entry: detail → actions → ادغام
Select duplicate customer (search)
Preview: N contracts, M payments move
Enter reason → confirm
API merge
Success → redirect target detail
Error 409 → message
Exit: source gone from list
```

---

## Policy Alignment

- [ ] SOFT-DELETE-POLICY — source soft delete not hard
- [ ] Audit immutable
- [ ] ADR-002 tenant isolation
- [ ] Financial integrity — sales not deleted

---

## مراجع

- `docs/01-product/installment-module-features.md` §۳ — ادغام
- `docs/09-development/SOFT-DELETE-POLICY.md`

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
