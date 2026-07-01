# TASK-058: Use Case — Create TenantCustomer

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 0 |
| Epic | Epic-08-Core-Services |
| ID | TASK-058 |
| Priority | P0 |
| Depends on | TASK-032 (GlobalCustomerRepo), TASK-033 (TenantCustomerRepo), TASK-046 (SoftDeletableRepo) |
| Blocks | TASK-054 |
| Estimated | 6h |

---

## هدف

`CreateTenantCustomerUseCase` — User findOrCreateByPhone → GlobalCustomer (by userId) → link TenantCustomer (ADR-017). اگر مشتری قبلاً soft-deleted شده، restore می‌کند.

---

## معیار پذیرش

- [ ] `POST /api/v1/customers` implemented با permission `installments.customer.create`
- [ ] Phone normalize (`09xxxxxxxxx` format) قبل از هر lookup
- [ ] User findOrCreateByPhone (phone normalize) → GlobalCustomer find/create by userId
- [ ] اگر GlobalCustomer soft-deleted → restore + update profile
- [ ] اگر TenantCustomer link (active) وجود دارد → 409 `CUSTOMER_EXISTS`
- [ ] اگر TenantCustomer link soft-deleted → restore + update fields
- [ ] Plan customer limit check قبل از create جدید → 403 `PLAN_LIMIT`
- [ ] `defaultBranchId` validation: branch باید در همان tenant و data scope staff باشد
- [ ] Audit: `customer.create` (شامل `restored: true/false`)
- [ ] Data scope enforced: اگر staff dataScope=branch، فقط assigned branches
- [ ] Return: `{ customer: TenantCustomerDetailRecord, globalCustomer, restored: boolean }`

---

## Input (EXCELLENCE §8 — تمام فیلدها)

```typescript
export type CreateTenantCustomerInput = {
  tenantId: string;
  actorId: string;
  phone: string;
  name?: string;
  email?: string;
  nationalId?: string;
  birthDate?: string;                           // ISO date
  gender?: 'male' | 'female' | 'other' | 'unspecified';
  address?: string;
  localCode?: string;
  tags?: string[];
  notes?: string;
  internalNotes?: string;                       // staff-only
  defaultBranchId?: string;
  preferredContactChannel?: 'telegram' | 'bale' | 'sms' | 'phone';
  marketingOptIn?: boolean;
  staffContext: DataScopeStaffContext;
  ip?: string;
  userAgent?: string;
};
```

## Logic Flow

```
1. Phone normalize (09xxxxxxxxx)
2. Validate defaultBranchId (if provided) — must exist + data scope
3. User findOrCreateByPhone (including soft-deleted User handling)
4. GlobalCustomer find/create by userId (including soft-deleted)
   a. If soft-deleted → restore + update profile
   b. If not found → create linked to User
   c. If active suspended → 403
   d. If active → update profile
5. Find TenantCustomer link by (tenantId, globalCustomerId)
   a. If soft-deleted → restore + update link fields (no plan limit check)
   b. If active → 409 CUSTOMER_EXISTS
   c. If not found → check plan limit → create link
6. Audit: customer.create (with restored flag)
7. Return full customer + globalCustomer + restored flag
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create/Update | `packages/application/src/customers/create-tenant-customer.use-case.ts` |
| Create/Update | `packages/application/src/customers/create-tenant-customer.use-case.spec.ts` |
| Update | `packages/application/src/ports/global-customer.repository.port.ts` |
| Update | `packages/application/src/ports/tenant-customer.repository.port.ts` |
| Update | `apps/api/src/customers/customers.controller.ts` |

---

## مراحل پیاده‌سازی

1. پیاده‌سازی `assertValidBranch` و `assertBranchDataScope`
2. GlobalCustomer upsert logic (including deleted case)
3. TenantCustomer link logic (restore or create)
4. Plan limit check (`tenantPlans.getMaxCustomers()`)
5. Audit log با `restored` flag
6. Unit tests با mock repositories

---

## Edge Cases & Errors

| سناریو | HTTP | Code |
|--------|------|------|
| Active TenantCustomer link وجود دارد | 409 | `CUSTOMER_EXISTS` |
| GlobalCustomer suspended | 403 | `CUSTOMER_SUSPENDED` |
| `defaultBranchId` invalid | 400 | `INVALID_BRANCH` |
| `defaultBranchId` not in staff scope | 403 | `BRANCH_NOT_ALLOWED` |
| Plan customer limit | 403 | `PLAN_LIMIT` |
| Phone format invalid | 400 | `INVALID_PHONE` (از Zod validation) |

---

## تست

- [ ] Unit: جدید GlobalCustomer + جدید link → create موفق + audit
- [ ] Unit: Active link → 409 `CUSTOMER_EXISTS`
- [ ] Unit: Soft-deleted link → restore + audit (no 409)
- [ ] Unit: Plan limit exceeded → 403 `PLAN_LIMIT`
- [ ] Unit: invalid defaultBranchId → 400
- [ ] Unit: staff dataScope=branch + branch not assigned → 403
- [ ] Integration: customer ایجاد می‌شود → در list دیده می‌شود
- [ ] Integration: cross-tenant → customer از tenant B در list tenant A نیست

---

## Policy Alignment

- [ ] EXCELLENCE-STANDARDS §8 (GlobalCustomer + TenantCustomer کامل)
- [ ] SOFT-DELETE-POLICY (restore soft-deleted link)
- [ ] ADR-002 (GlobalCustomer platform-level، نه زیر branch)
- [ ] ADR-015 (data scope enforcement)

---

## مراجع

- `docs/02-architecture/tenancy-and-entities.md`
- `docs/09-development/EXCELLENCE-STANDARDS.md` §8 (GlobalCustomer/TenantCustomer)
- `docs/09-development/SOFT-DELETE-POLICY.md`
- `docs/08-decisions/adr-log.md` — ADR-002, ADR-015

---

## Self-Review Score

| محور | /25 | یادداشت |
|------|-----|---------|
| Metadata | 10/10 | Priority, Depends, Blocks, Estimated |
| Completeness | 25/25 | Input کامل §8، Logic flow، Files، Steps |
| Policy | 25/25 | SOFT-DELETE restore، plan limit، data scope، audit |
| Executability | 25/25 | Logic flow numbered، edge cases table، unit tests |
| Alignment | 15/15 | sync با create-tenant-customer.use-case.ts |
| **جمع** | **100/100** | ≥95 ✅ |
