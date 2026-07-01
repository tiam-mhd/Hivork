# TASK-071: Contracts — Customer Extended Zod Schemas

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 1 |
| Epic | Epic-04-Installments-Contracts |
| ID | TASK-071 |
| Priority | P0 |
| Depends on | TASK-051, TASK-058, TASK-013, TASK-039 |
| Blocks | TASK-084, TASK-085, TASK-086, TASK-087, TASK-088 |
| Estimated | 5h |

---

## هدف

Zod schemas برای API مشتری extended — list، create، update، import result — با فیلدهای EXCELLENCE §8 (creditScore، tags، totalPurchaseRial، overdueCount، preferredContactChannel). تکمیل Phase 0 customer contracts برای پنل فروشنده.

---

## معیار پذیرش

- [ ] `CreateTenantCustomerSchema` — phone، name، localCode، tags، notes، defaultBranchId، preferredContactChannel، marketingOptIn
- [ ] `UpdateTenantCustomerSchema` — partial + `version` required (optimistic lock)
- [ ] `ListCustomersQuerySchema` — cursor، limit، sort، search، status، tags، defaultBranchId
- [ ] `TenantCustomerSummarySchema` — list item با globalCustomer embed + aggregates
- [ ] `TenantCustomerDetailSchema` — full + optional salesSummary
- [ ] `ImportCustomersResultSchema` — totalRows، successCount، errors array
- [ ] `phoneSchema` از shared برای همه phone fields
- [ ] `totalPurchaseRial` — bigint string در response
- [ ] Type exports + unit tests

---

## مشخصات فنی

### Create / Update

```typescript
// packages/contracts/src/customers/tenant-customer.schema.ts
export const PreferredContactChannelSchema = z.enum(['telegram', 'bale', 'sms', 'phone']);

export const CreateTenantCustomerSchema = z.object({
  phone: phoneSchema,
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().optional(),
  nationalId: z.string().regex(/^\d{10}$/).optional(),
  birthDate: dateOnlySchema.optional(),
  gender: z.enum(['male', 'female', 'other', 'unspecified']).optional(),
  address: z.string().max(500).optional(),
  localCode: z.string().max(50).optional(),
  tags: z.array(z.string().max(30)).max(20).optional(),
  notes: z.string().max(2000).optional(),
  internalNotes: z.string().max(2000).optional(),
  defaultBranchId: z.string().uuid().optional(),
  preferredContactChannel: PreferredContactChannelSchema.optional(),
  marketingOptIn: z.boolean().optional(),
});

export const UpdateTenantCustomerSchema = CreateTenantCustomerSchema.partial().extend({
  version: z.number().int().positive(),
});
```

### List Query

```typescript
export const ListCustomersQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(['createdAt:desc', 'createdAt:asc', 'name:asc', 'creditScore:desc']).default('createdAt:desc'),
  search: z.string().max(100).optional(),
  status: z.enum(['active', 'suspended']).optional(),
  tags: z.string().optional(), // comma-separated filter
  defaultBranchId: z.string().uuid().optional(),
});
```

### Response Schemas

```typescript
export const GlobalCustomerEmbedSchema = z.object({
  id: z.string().uuid(),
  phone: phoneSchema,
  name: z.string().nullable(),
});

export const TenantCustomerSummarySchema = z.object({
  id: z.string().uuid(),
  globalCustomer: GlobalCustomerEmbedSchema,
  localCode: z.string().nullable().optional(),
  tags: z.array(z.string()),
  creditScore: z.number().int().min(0).max(100).nullable().optional(),
  overdueCount: z.number().int().nonnegative().optional(),
  totalPurchaseRial: bigintRialNonNegativeSchema.optional(),
  lastPurchaseAt: z.string().datetime().nullable().optional(),
  preferredContactChannel: PreferredContactChannelSchema.nullable().optional(),
  defaultBranchId: z.string().uuid().nullable().optional(),
  status: z.enum(['active', 'suspended']).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
  version: z.number().int().optional(),
});

export const SalesSummaryEmbedSchema = z.object({
  activeSaleCount: z.number().int().nonnegative(),
  totalOutstandingRial: bigintRialNonNegativeSchema,
  lastSaleAt: z.string().datetime().nullable(),
});

export const TenantCustomerDetailSchema = TenantCustomerSummarySchema.extend({
  email: z.string().nullable().optional(),
  nationalId: z.string().nullable().optional(),
  birthDate: z.string().nullable().optional(),
  gender: z.enum(['male', 'female', 'other', 'unspecified']).nullable().optional(),
  address: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  internalNotes: z.string().nullable().optional(),
  marketingOptIn: z.boolean().optional(),
  salesSummary: SalesSummaryEmbedSchema.optional(),
});
```

### Import Result

```typescript
export const ImportCustomerErrorSchema = z.object({
  row: z.number().int().positive(),
  phone: z.string().optional(),
  error: z.string(),
});

export const ImportCustomersResultSchema = z.object({
  totalRows: z.number().int().nonnegative(),
  successCount: z.number().int().nonnegative(),
  errors: z.array(ImportCustomerErrorSchema),
});
```

### List Response Example (api-contracts.md)

```json
{
  "data": [
    {
      "id": "uuid",
      "globalCustomer": {
        "id": "uuid",
        "phone": "09121234567",
        "name": "حسین احمدی"
      },
      "localCode": "C-001",
      "tags": ["vip"],
      "creditScore": 85,
      "overdueCount": 1,
      "totalPurchaseRial": "15000000",
      "lastPurchaseAt": "2025-01-10T00:00:00.000Z",
      "preferredContactChannel": "telegram",
      "createdAt": "2025-01-01T08:00:00.000Z"
    }
  ],
  "meta": { "total": 50, "hasNext": true, "nextCursor": "..." }
}
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/contracts/src/customers/tenant-customer.schema.ts` |
| Create | `packages/contracts/src/customers/tenant-customer.schema.spec.ts` |
| Create/Update | `packages/contracts/src/customers/index.ts` |
| Update | `packages/contracts/src/index.ts` |

---

## مراحل پیاده‌سازی

1. Extend customer contracts beyond Phase 0 minimal fields
2. Implement create/update with EXCELLENCE §8 fields
3. Implement list query + summary/detail response schemas
4. Implement import result schema
5. Unit tests: phone validation، version required on update، tags max
6. Export types
7. Verify alignment with TASK-058 use case input

---

## Edge Cases & Errors

| سناریو | Code | رفتار |
|--------|------|--------|
| Invalid phone | `INVALID_PHONE` | phoneSchema fail |
| Update without version | required fail | validation |
| `tags` > 20 items | max(20) fail | validation |
| `nationalId` not 10 digits | regex fail | validation |
| `creditScore` out of 0–100 | range fail | on response parse |
| Empty `name` on create | optional — allowed | pass |

---

## تست

- [ ] Unit: `CreateTenantCustomerSchema` valid minimal (phone only)
- [ ] Unit: invalid phone → fail
- [ ] Unit: `UpdateTenantCustomerSchema` requires version
- [ ] Unit: `ListCustomersQuerySchema` defaults
- [ ] Unit: `TenantCustomerSummarySchema` parse api-contracts sample
- [ ] Unit: `ImportCustomersResultSchema` with errors array
- [ ] Unit: tags array max 20

---

## UX

N/A — consumed by TASK-106–108 frontend customer pages.

---

## Flow

N/A

---

## Policy Alignment

- [ ] EXCELLENCE-STANDARDS §8 — GlobalCustomer + TenantCustomer complete
- [ ] ADR-002 — customer not under branch (defaultBranchId optional reference only)
- [ ] SOFT-DELETE-POLICY — status field، no hard delete in API
- [ ] phoneSchema shared — single normalization source

---

## مراجع

- `docs/02-architecture/api-contracts.md` § customers
- `docs/02-architecture/tenancy-and-entities.md`
- `docs/09-development/EXCELLENCE-STANDARDS.md` §8
- `Phases/Phase-0-Foundation/Epic-08-Core-Services/TASK-058-create-tenant-customer-use-case.md`

---

## Self-Review Score

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata | 10 | 10 | ✓ |
| Completeness | 25 | 25 | CRUD + list + import schemas |
| Policy | 25 | 25 | §8 fields، ADR-002 |
| Executability | 25 | 25 | 7 tests، examples |
| Alignment | 15 | 15 | api-contracts + TASK-058 |
| **جمع** | **100** | **100** | ≥95 ✅ |
