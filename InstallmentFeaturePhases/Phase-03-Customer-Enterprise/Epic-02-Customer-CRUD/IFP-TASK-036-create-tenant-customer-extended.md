# IFP-TASK-036: CreateTenantCustomer Extended Use Case

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | IFP-03 Customer Enterprise |
| Epic | Epic-02-Customer-CRUD |
| ID | IFP-036 |
| Priority | P0 |
| Depends on | IFP-033, IFP-035, Phase 0 TASK-058 |
| Blocks | IFP-037, IFP-038, IFP-039, IFP-041 |
| Estimated | 8h |
| UI dependency note | فرم ثبت مشتری Enterprise در IFP-053 به **IFP-019 DataTable** (navigation/list) وابسته است |

---

## هدف

گسترش `CreateTenantCustomerUseCase` (TASK-058) برای پذیرش فیلدهای Enterprise: category، addresses، emergency contacts، secondary phones، assignedStaffId — با همان flow User→GlobalCustomer→TenantCustomer، plan limit، restore soft-deleted link، و audit.

---

## معیار پذیرش

- [ ] Input شامل: categoryId?, addresses[], emergencyContacts[], contactPhones[], assignedStaffId?, tags, status (default active)
- [ ] Nested create transactional — rollback on any validation fail
- [ ] Plan customer limit قبل از link جدید (نه restore)
- [ ] Blacklist at create: optional `isBlacklisted` + reason — permission `installments.customer.blacklist`
- [ ] defaultBranchId + data scope validation (ADR-015)
- [ ] Audit `customer.create` با nested summary
- [ ] Response: full TenantCustomerDetailRecord با nested relations
- [ ] Permission: `installments.customer.create` + `@RequireModule('installments')`

---

## مشخصات فنی

### Endpoint

| Item | Value |
|------|-------|
| Method / Path | POST `/api/v1/customers` |
| Auth | Staff JWT — `hivork_staff` cookie |
| Module | installments |
| Permission | installments.customer.create |
| Data scope | ApplyDataScope — branch via defaultBranchId / sales context |

### Input fields (EXCELLENCE §8 + Enterprise)

| Field | Required | Notes |
|-------|----------|-------|
| phone | Yes | normalize 09xxxxxxxxx — User findOrCreate |
| name | Yes | min 2 chars |
| email, nationalId, birthDate, gender | No | GlobalCustomer |
| localCode, tags, notes | No | TenantCustomer |
| categoryId | No | must exist in tenant |
| assignedStaffId | No | same tenant staff |
| defaultBranchId | No | branch scope check |
| preferredContactChannel, marketingOptIn | No | |
| addresses | No | array max 10 |
| emergencyContacts | No | array max 5 |
| contactPhones | No | array max 5 — IFP-035 |
| isBlacklisted, blacklistReason | No | requires blacklist permission |

### Logic flow

Entry: API receives create payload  
→ Normalize phone  
→ Validate branch/category/staff scope  
→ User findOrCreateByPhone  
→ GlobalCustomer find/create/restore  
→ TenantCustomer link find — active → 409; soft-deleted → restore  
→ Else plan limit check → create link  
→ Create nested addresses, contacts, phones  
→ Audit  
Exit: 201 + detail record  

Errors: 409 CUSTOMER_EXISTS, 403 PLAN_LIMIT, 422 validation, 403 BRANCH_NOT_ALLOWED

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Update | `packages/application/src/customers/create-tenant-customer.use-case.ts` |
| Update | `packages/application/src/customers/create-tenant-customer.use-case.spec.ts` |
| Update | `packages/infrastructure/persistence/repositories/tenant-customer.repository.ts` |
| Create | repositories for address, emergency contact, contact phone |
| Update | `apps/api/src/customers/customers.controller.ts` |

---

## مراحل پیاده‌سازی

1. Extend input type + validation schema (IFP-039 sync)
2. Transaction wrapper for nested creates
3. Integrate CustomerContactPhone upsert
4. Address primary uniqueness in same transaction
5. Extend audit payload
6. Integration tests: full nested create, restore path
7. RBAC deny test

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Customer exists active in tenant | 409 | CUSTOMER_EXISTS |
| Restore soft-deleted link | 201 | restored: true — no plan limit |
| categoryId wrong tenant | 422 | CATEGORY_NOT_FOUND |
| Blacklist without permission | 403 | PERMISSION_DENIED |
| Duplicate secondary phone in tenant | 409 | CUSTOMER_PHONE_EXISTS |
| Empty addresses with isPrimary | 422 | validation |

---

## تست

- [ ] Integration: nested create all child entities
- [ ] Integration: restore soft-deleted customer
- [ ] Integration: plan limit 403
- [ ] RBAC: deny without permission
- [ ] RBAC: cross-tenant create → fail

---

## UX (اگر UI دارد)

- [ ] Form fields map — IFP-053
- [ ] Loading state on submit
- [ ] Server error display per field

---

## Flow

```
Entry: مشتریان → جدید → فرم
Step 1: phone + name (required)
Step 2: optional tabs — addresses, contacts, documents (later)
Submit → API → success → redirect to detail
Error 409 → show existing customer link
Error 403 plan → upgrade CTA
Exit: detail page / list refresh
Recovery: fix validation → retry
```

---

## Policy Alignment

- [ ] EXCELLENCE-STANDARDS §3 backend checklist
- [ ] EXCELLENCE-STANDARDS §8 entity fields
- [ ] SOFT-DELETE-POLICY — restore not delete
- [ ] ADR-017 phone on User
- [ ] ADR-015 data scope

---

## مراجع

- `Phases/Phase-0-Foundation/Epic-08-Core-Services/TASK-058-create-tenant-customer-use-case.md`
- `docs/03-modules/installments/STAFF-FLOWS.md` SF-007.1

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
