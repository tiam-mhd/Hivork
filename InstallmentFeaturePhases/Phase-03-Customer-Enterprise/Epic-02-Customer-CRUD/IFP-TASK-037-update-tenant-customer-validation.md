# IFP-TASK-037: UpdateTenantCustomer + Validation

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | IFP-03 Customer Enterprise |
| Epic | Epic-02-Customer-CRUD |
| ID | IFP-037 |
| Priority | P0 |
| Depends on | IFP-033, IFP-035, IFP-036, Phase 1 TASK-084 |
| Blocks | IFP-038, IFP-039, IFP-045, IFP-050, IFP-051, IFP-052 |
| Estimated | 8h |

---

## هدف

گسترش `UpdateTenantCustomerUseCase` برای partial update فیلدهای Enterprise، مدیریت nested addresses/emergencyContacts/contactPhones (replace-or-patch strategy)، optimistic locking، immutable phone، data scope، و audit `customer.update`.

---

## معیار پذیرش

- [ ] PATCH `/api/v1/customers/:id` — version required
- [ ] Partial update — unset fields unchanged
- [ ] Phone change rejected → 400 VALIDATION_ERROR
- [ ] Nested arrays: addresses/contacts/phones — upsert by id, soft-delete removed items
- [ ] categoryId, assignedStaffId, tags, blacklist fields updatable with permissions
- [ ] internalNotes legacy field + CustomerNote separate (IFP-047)
- [ ] 409 OPTIMISTIC_LOCK_CONFLICT on version mismatch
- [ ] 404 CUSTOMER_NOT_FOUND for out-of-scope (IDOR)
- [ ] Audit with old/new diff (PII masked in log storage)

---

## مشخصات فنی

### Endpoint

| Item | Value |
|------|-------|
| Method / Path | PATCH `/api/v1/customers/:tenantCustomerId` |
| Permission | installments.customer.update |
| Blacklist fields | installments.customer.blacklist |

### Updatable fields

GlobalCustomer: name, email, nationalId, birthDate, gender (not phone)  
TenantCustomer: localCode, tags, notes, categoryId, defaultBranchId, preferredContactChannel, marketingOptIn, assignedStaffId, metadata  
Nested: addresses[], emergencyContacts[], contactPhones[]  
Blacklist: isBlacklisted, blacklistReason (permission gated)

### Data scope (ADR-015)

| Scope | Rule |
|-------|------|
| all | any customer in tenant |
| branch | defaultBranchId ∈ assigned OR has sales in assigned branches |
| own | has sale with sellerId = actor |

Out of scope → 404 CUSTOMER_NOT_FOUND

### Version conflict

Client sends `version` from last read — server increments on success — mismatch → 409

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Update | `packages/application/src/customers/update-tenant-customer.use-case.ts` |
| Update | `packages/application/src/customers/update-tenant-customer.use-case.spec.ts` |
| Update | repository implementations for nested entities |
| Update | `apps/api/src/customers/customers.controller.ts` |

---

## مراحل پیاده‌سازی

1. Extend UpdateInput + validation
2. Load customer with lock or version check
3. Apply partial GlobalCustomer + TenantCustomer updates
4. Nested entity sync algorithm (id present → update; no id → create; missing from payload → soft delete)
5. Audit diff builder
6. Integration tests: version conflict, scope deny, nested sync

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Version mismatch | 409 | OPTIMISTIC_LOCK_CONFLICT |
| Phone in payload | 400 | VALIDATION_ERROR |
| Soft-deleted customer | 404 | RECORD_DELETED |
| Remove last primary address | 422 | require new primary |
| Blacklist without permission | 403 | PERMISSION_DENIED |
| archived customer update | 409 | CUSTOMER_ARCHIVED |

---

## تست

- [ ] Integration: partial update single field
- [ ] Integration: nested address add/remove
- [ ] Integration: optimistic lock 409
- [ ] RBAC: branch scope 404
- [ ] Unit: audit diff masking

---

## UX (اگر UI دارد)

- [ ] Unsaved changes warning — IFP-053
- [ ] Version stale → refresh prompt on 409

---

## Flow

```
Entry: detail → ویرایش
Load customer + version
Edit fields → Save
Success → toast + refresh detail
409 → dialog «اطلاعات توسط کاربر دیگر تغییر کرد»
Exit: detail view updated
```

---

## Policy Alignment

- [ ] EXCELLENCE §3
- [ ] SOFT-DELETE-POLICY — nested soft delete
- [ ] ADR-015, ADR-017

---

## مراجع

- `Phases/Phase-1-Seller-Panel/Epic-07-Customer-Backend/TASK-084-usecase-update-tenant-customer.md`

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
