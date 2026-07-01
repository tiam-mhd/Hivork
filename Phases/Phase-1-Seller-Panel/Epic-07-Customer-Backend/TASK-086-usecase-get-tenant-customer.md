# TASK-086: Use Case — Get TenantCustomer

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 1 |
| Epic | Epic-07-Customer-Backend |
| ID | TASK-086 |
| Priority | P0 |
| Depends on | TASK-085, TASK-045 |
| Blocks | TASK-088 |
| Estimated | 4h |

---

## هدف

`GetTenantCustomerUseCase` — جزئیات کامل مشتری شامل `globalCustomer` و آمار فروش اختیاری (`?include=salesSummary`). Data scope enforced.

---

## معیار پذیرش

- [ ] Return all EXCELLENCE §8 fields
- [ ] Nested `globalCustomer` full profile
- [ ] Query `include=salesSummary` → `{ activeSalesCount, completedSalesCount, totalOverdueRial, lastSaleAt }`
- [ ] Not found / out of scope → 404 `CUSTOMER_NOT_FOUND`
- [ ] Soft-deleted → 404 `RECORD_DELETED`

---

## Input

```typescript
export type GetTenantCustomerInput = {
  tenantId: string;
  tenantCustomerId: string;
  include?: ('salesSummary')[];
  staffContext: DataScopeStaffContext;
};
```

---

## Response

```json
{
  "id": "uuid",
  "version": 3,
  "globalCustomer": {
    "id": "uuid",
    "phone": "09121234567",
    "name": "حسین احمدی",
    "email": null,
    "nationalId": null,
    "birthDate": null,
    "gender": "unspecified",
    "address": null
  },
  "localCode": "C-001",
  "tags": ["vip"],
  "notes": "مشتری قدیمی",
  "internalNotes": "تماس ترجیحی صبح",
  "creditScore": 85,
  "overdueCount": 1,
  "totalPurchaseRial": "15000000",
  "lastPurchaseAt": "2025-01-10T00:00:00.000Z",
  "preferredContactChannel": "telegram",
  "marketingOptIn": true,
  "defaultBranchId": "uuid",
  "metadata": {},
  "createdAt": "2024-06-01T08:00:00.000Z",
  "updatedAt": "2025-01-12T10:00:00.000Z",
  "salesSummary": {
    "activeSalesCount": 2,
    "completedSalesCount": 3,
    "totalOverdueRial": "2000000",
    "lastSaleAt": "2025-01-10T00:00:00.000Z"
  }
}
```

---

## Data Scope (ADR-015)

Same rules as TASK-084 — out of scope returns 404 (not 403).

---

## Error Codes

| سناریو | HTTP | Code |
|--------|------|------|
| Not found | 404 | `CUSTOMER_NOT_FOUND` |
| Soft-deleted | 404 | `RECORD_DELETED` |
| Invalid include param | 400 | `VALIDATION_ERROR` |

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/src/customers/get-tenant-customer.use-case.ts` |
| Create | `packages/application/src/customers/get-tenant-customer.use-case.spec.ts` |
| Update | `packages/contracts/src/customers/tenant-customer-detail.schema.ts` |

---

## مراحل پیاده‌سازی

1. Load TenantCustomer + GlobalCustomer join
2. Assert scope access
3. If `include` has `salesSummary` — aggregate query scoped
4. Map to detail DTO
5. Tests

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| include omitted | 200 | no salesSummary field |
| Customer no sales | 200 | salesSummary zeros |
| Cross-tenant id | 404 | CUSTOMER_NOT_FOUND |

---

## تست

- [ ] Unit: full detail mapping
- [ ] Unit: salesSummary optional
- [ ] Unit: scope denied → 404
- [ ] Integration: get after create
- [ ] Integration: cross-tenant fail

---

## Policy Alignment

- [ ] EXCELLENCE-STANDARDS §8
- [ ] ADR-015
- [ ] SOFT-DELETE-POLICY

---

## مراجع

- `docs/02-architecture/api-contracts.md`
- `TASK-084`, `TASK-085`

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
