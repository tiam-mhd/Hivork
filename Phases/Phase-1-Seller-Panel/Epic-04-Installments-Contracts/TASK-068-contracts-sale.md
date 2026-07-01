# TASK-068: Contracts — Sale Zod Schemas

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 1 |
| Epic | Epic-04-Installments-Contracts |
| ID | TASK-068 |
| Priority | P0 |
| Depends on | TASK-065, TASK-013, TASK-039 |
| Blocks | TASK-072, TASK-073, TASK-074, TASK-080 |
| Estimated | 5h |

---

## هدف

Zod schemas در `packages/contracts/installments/` برای تمام DTOهای فروش — Create، Cancel، List query، Sale summary/detail — 100% هم‌تراز با `api-contracts.md` §۵ و فیلدهای EXCELLENCE §8 Sale. Single source of truth برای API controller و frontend forms.

---

## معیار پذیرش

- [ ] `CreateSaleSchema` — request body با validation BR-001 تا BR-007 (amounts، count، dates)
- [ ] `CancelSaleSchema` — `reason` min 3 chars
- [ ] `ListSalesQuerySchema` — cursor، limit، sort، status، branchId، search، from، to
- [ ] `SaleSummarySchema` — list item با customer embed، paidCount
- [ ] `SaleDetailSchema` — full sale + installments array
- [ ] `InstallmentInSaleSchema` — nested installment در sale response
- [ ] `bigintRialSchema` — string pattern `/^\d+$/` + transform to bigint در server
- [ ] `dateOnlySchema` — `YYYY-MM-DD` برای firstDueDate، contractDate
- [ ] Type exports: `type X = z.infer<typeof XSchema>` برای هر schema
- [ ] هیچ NestJS/Prisma import در contracts package
- [ ] Unit tests: valid، invalid amounts، count bounds، date format

---

## مشخصات فنی

### Shared Helpers

```typescript
// packages/contracts/src/shared/money.schema.ts
export const bigintRialStringSchema = z
  .string()
  .regex(/^\d+$/, 'AMOUNT_INVALID')
  .refine((v) => BigInt(v) > 0n, { message: 'AMOUNT_INVALID' });

export const bigintRialNonNegativeSchema = z
  .string()
  .regex(/^\d+$/, 'AMOUNT_INVALID');

export const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'INVALID_DATE_FORMAT');
```

### CreateSaleSchema

```typescript
// packages/contracts/src/installments/sale.schema.ts
export const CreateSaleSchema = z.object({
  tenantCustomerId: z.string().uuid(),
  branchId: z.string().uuid(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  invoiceNumber: z.string().max(50).optional(),
  totalAmountRial: bigintRialStringSchema,           // BR-001
  downPaymentRial: bigintRialNonNegativeSchema.default('0'), // BR-002
  discountRial: bigintRialNonNegativeSchema.optional(),
  taxRial: bigintRialNonNegativeSchema.optional(),
  installmentCount: z.number().int().min(1).max(120),  // BR-003
  firstDueDate: dateOnlySchema,                        // BR-006 (future — UC validates)
  contractDate: dateOnlySchema,
  intervalDays: z.number().int().min(1).max(365).default(30), // BR-007
}).superRefine((val, ctx) => {
  const total = BigInt(val.totalAmountRial);
  const down = BigInt(val.downPaymentRial);
  if (down > total) {
    ctx.addIssue({ code: 'custom', message: 'AMOUNT_EXCEEDS_TOTAL', path: ['downPaymentRial'] });
  }
});

export type CreateSaleDto = z.infer<typeof CreateSaleSchema>;
```

### CancelSaleSchema

```typescript
export const CancelSaleSchema = z.object({
  reason: z.string().min(3).max(500),
});
export type CancelSaleDto = z.infer<typeof CancelSaleSchema>;
```

### ListSalesQuerySchema

```typescript
export const ListSalesQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(['createdAt:desc', 'createdAt:asc', 'contractDate:desc']).default('createdAt:desc'),
  status: z.enum(['active', 'completed', 'cancelled']).optional(),
  branchId: z.string().uuid().optional(),
  search: z.string().max(100).optional(),
  from: dateOnlySchema.optional(),
  to: dateOnlySchema.optional(),
});
export type ListSalesQueryDto = z.infer<typeof ListSalesQuerySchema>;
```

### Response Schemas

```typescript
export const InstallmentInSaleSchema = z.object({
  id: z.string().uuid(),
  sequenceNumber: z.number().int().positive(),
  dueDate: z.string().datetime(),
  amountRial: bigintRialNonNegativeSchema,
  status: z.enum(['pending', 'overdue', 'paid', 'waived']),
  paidAt: z.string().datetime().nullable().optional(),
  confirmedBy: z.string().uuid().nullable().optional(),
});

export const SaleCustomerEmbedSchema = z.object({
  id: z.string().uuid(),
  phone: phoneSchema,
  name: z.string().nullable(),
});

export const SaleSummarySchema = z.object({
  id: z.string().uuid(),
  tenantCustomerId: z.string().uuid(),
  customer: SaleCustomerEmbedSchema.optional(),
  branchId: z.string().uuid(),
  title: z.string().nullable(),
  totalAmountRial: bigintRialNonNegativeSchema,
  downPaymentRial: bigintRialNonNegativeSchema,
  installmentCount: z.number().int(),
  status: z.enum(['active', 'completed', 'cancelled']),
  paidCount: z.number().int().nonnegative().optional(),
  contractDate: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
});

export const SaleDetailSchema = SaleSummarySchema.extend({
  description: z.string().nullable().optional(),
  invoiceNumber: z.string().nullable().optional(),
  discountRial: bigintRialNonNegativeSchema.nullable().optional(),
  taxRial: bigintRialNonNegativeSchema.nullable().optional(),
  firstDueDate: z.string().datetime().optional(),
  intervalDays: z.number().int().optional(),
  cancelledAt: z.string().datetime().nullable().optional(),
  cancelReason: z.string().nullable().optional(),
  installments: z.array(InstallmentInSaleSchema),
  version: z.number().int().optional(),
});

export const CancelSaleResponseSchema = z.object({
  status: z.literal('cancelled'),
  cancelledAt: z.string().datetime(),
});
```

### JSON Examples (aligned api-contracts.md)

**CreateSale request:**

```json
{
  "tenantCustomerId": "uuid",
  "branchId": "uuid",
  "title": "موبایل سامسونگ S23",
  "totalAmountRial": "25000000",
  "downPaymentRial": "5000000",
  "installmentCount": 10,
  "firstDueDate": "2025-02-01",
  "contractDate": "2025-01-15"
}
```

**SaleDetail response:**

```json
{
  "data": {
    "id": "uuid",
    "customer": { "id": "uuid", "phone": "09121234567", "name": "حسین احمدی" },
    "branchId": "uuid",
    "title": "موبایل سامسونگ S23",
    "totalAmountRial": "25000000",
    "downPaymentRial": "5000000",
    "installmentCount": 10,
    "status": "active",
    "installments": [
      {
        "id": "uuid",
        "sequenceNumber": 1,
        "dueDate": "2025-02-01T00:00:00.000Z",
        "amountRial": "2000000",
        "status": "pending"
      }
    ],
    "createdAt": "2025-01-15T10:30:00.000Z"
  },
  "meta": { "requestId": "uuid" }
}
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/contracts/src/installments/sale.schema.ts` |
| Create | `packages/contracts/src/installments/sale.schema.spec.ts` |
| Create/Update | `packages/contracts/src/shared/money.schema.ts` |
| Update | `packages/contracts/src/installments/index.ts` |
| Update | `packages/contracts/src/index.ts` |

---

## مراحل پیاده‌سازی

1. ایجاد `bigintRialStringSchema` و `dateOnlySchema` در shared
2. پیاده‌سازی `CreateSaleSchema` با `superRefine` برای BR-002
3. پیاده‌سازی `CancelSaleSchema`، `ListSalesQuerySchema`
4. پیاده‌سازی response schemas (`SaleSummarySchema`, `SaleDetailSchema`, `InstallmentInSaleSchema`)
5. Export types از هر schema
6. Unit tests: valid create، down > total، count=0/121، invalid date
7. Update `installments/index.ts` exports

---

## Edge Cases & Errors

| سناریو | Zod / Code | رفتار |
|--------|------------|--------|
| `totalAmountRial` = "0" | `AMOUNT_INVALID` | refine fail |
| `downPaymentRial` > total | `AMOUNT_EXCEEDS_TOTAL` | superRefine fail |
| `installmentCount` = 0 | `INSTALLMENT_COUNT_INVALID` | min(1) fail |
| `installmentCount` = 121 | `INSTALLMENT_COUNT_INVALID` | max(120) fail |
| `firstDueDate` = "2025/02/01" | `INVALID_DATE_FORMAT` | regex fail |
| `reason` = "ab" (cancel) | min(3) fail | validation error |
| `totalAmountRial` = "12.5" | regex fail | no float |

---

## تست

- [ ] Unit: `CreateSaleSchema` valid payload → pass
- [ ] Unit: downPayment > total → `AMOUNT_EXCEEDS_TOTAL`
- [ ] Unit: installmentCount=0 → fail
- [ ] Unit: installmentCount=121 → fail
- [ ] Unit: invalid date format → fail
- [ ] Unit: `CancelSaleSchema` reason min 3 chars
- [ ] Unit: `ListSalesQuerySchema` limit default 20, max 100
- [ ] Unit: `SaleDetailSchema` parse full API response sample

---

## UX

N/A — contracts only. Frontend forms (TASK-110) consume these schemas.

---

## Flow

N/A

---

## Policy Alignment

- [ ] EXCELLENCE-STANDARDS §8 — Sale fields complete in response schemas
- [ ] ADR-007 — bigint as string in JSON
- [ ] ADR-016 — aligned with `/api/v1/sales` paths
- [ ] BUSINESS-RULES BR-001–BR-007 reflected in CreateSale validation

---

## مراجع

- `docs/02-architecture/api-contracts.md` § POST/GET sales
- `docs/03-modules/installments/BUSINESS-RULES.md` — BR-001 to BR-010
- `docs/09-development/EXCELLENCE-STANDARDS.md` §8 Sale
- `docs/08-decisions/adr-log.md` — ADR-007, ADR-016

---

## Self-Review Score

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata | 10 | 10 | Depends, Blocks, Estimate |
| Completeness | 25 | 25 | All schemas + JSON examples |
| Policy | 25 | 25 | BR refs، bigint، §8 fields |
| Executability | 25 | 25 | Edge table، 8 unit tests |
| Alignment | 15 | 15 | sync api-contracts.md |
| **جمع** | **100** | **100** | ≥95 ✅ |
