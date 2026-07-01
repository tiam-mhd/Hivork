# TASK-085: Use Case — List TenantCustomers

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 1 |
| Epic | Epic-07-Customer-Backend |
| ID | TASK-085 |
| Priority | P0 |
| Depends on | TASK-058, TASK-033, TASK-032, TASK-045 |
| Blocks | TASK-086, TASK-088 |
| Estimated | 5h |

---

## هدف

`ListTenantCustomersUseCase` — cursor pagination، جستجو name/phone، فیلتر tags، sort. شامل nested `globalCustomer` summary و آمار `overdueCount`, `totalPurchaseRial`.

---

## معیار پذیرش

- [ ] Cursor pagination (`cursor`, `limit` max 100)
- [ ] `search` — ILIKE on name + phone (normalized)
- [ ] `tags` — filter customers having ALL specified tags
- [ ] `sort` — `createdAt`, `name`, `lastPurchaseAt`, `overdueCount` (asc/desc)
- [ ] `status` filter: `active` (default, deletedAt null)
- [ ] Data scope filtering per ADR-015
- [ ] `total` count in meta (optional — expensive; cache 30s ok)

---

## Query Input

```typescript
export type ListTenantCustomersQuery = {
  tenantId: string;
  cursor?: string;
  limit?: number;           // default 20, max 100
  sort?: string;            // default createdAt:desc
  search?: string;
  tags?: string[];          // comma-separated in API
  status?: 'active';
  defaultBranchId?: string; // filter
  staffContext: DataScopeStaffContext;
};
```

---

## Response Item

```typescript
{
  id: string;               // TenantCustomer.id
  globalCustomer: {
    id: string;
    phone: string;
    name: string;
  };
  localCode: string | null;
  tags: string[];
  creditScore: number | null;
  overdueCount: number;
  totalPurchaseRial: string;  // bigint as string
  lastPurchaseAt: string | null;
  preferredContactChannel: string | null;
  createdAt: string;
}
```

---

## Data Scope (ADR-015)

| Scope | Filter |
|-------|--------|
| `all` | all active customers in tenant |
| `branch` | `defaultBranchId IN assigned` OR exists sale in assigned branch |
| `own` | exists sale with `sellerId = actorId` |

---

## Error Codes

| سناریو | HTTP | Code |
|--------|------|------|
| Invalid sort field | 400 | `VALIDATION_ERROR` |
| limit > 100 | 400 | `VALIDATION_ERROR` |
| Invalid cursor | 400 | `VALIDATION_ERROR` |

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/src/customers/list-tenant-customers.use-case.ts` |
| Create | `packages/application/src/customers/list-tenant-customers.use-case.spec.ts` |
| Update | `packages/infrastructure/src/persistence/tenant-customer.repository.ts` |
| Update | `packages/contracts/src/customers/customer-list.schema.ts` |

---

## مراحل پیاده‌سازی

1. Repository method `findManyPaginated` with cursor (id-based)
2. Phone search: normalize input to `09xxxxxxxxx`
3. Tags: JSON array contains / overlap per Prisma
4. Join aggregates for overdueCount, totalPurchaseRial (subquery or materialized)
5. Apply scope filter in repository layer
6. Unit + integration tests

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Empty list | 200 | `data: []`, `hasNext: false` |
| Search no match | 200 | empty |
| Soft-deleted excluded | — | `deletedAt: null` |
| Special chars in search | 200 | escaped ILIKE |

---

## تست

- [ ] Unit: pagination hasNext logic
- [ ] Unit: search by phone partial
- [ ] Unit: tags filter AND semantics
- [ ] Integration: list after create (TASK-058)
- [ ] Integration: cross-tenant isolation
- [ ] Integration: branch scope limits results

---

## Policy Alignment

- [ ] EXCELLENCE-STANDARDS §3 list API
- [ ] ADR-015 scope in repository
- [ ] SOFT-DELETE-POLICY

---

## مراجع

- `docs/02-architecture/api-contracts.md` § GET customers
- `docs/03-modules/installments/STAFF-FLOWS.md` — SF-007

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
