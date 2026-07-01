# IFP-TASK-058: Contracts — Sale Enterprise Zod Schemas

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 04 — Contract Enterprise |
| Epic | Epic-01-Contract-Schema |
| ID | IFP-TASK-058 |
| Priority | P0 |
| Depends on | IFP-TASK-055, IFP-TASK-056, IFP-TASK-057, Phase 1 TASK-068 |
| Blocks | IFP-059–064, IFP-067, IFP-071, IFP-076 |
| Estimated | 8h |

---

## هدف

Zod schemas در `packages/contracts/installments/` برای DTOهای Enterprise قرارداد — extended Sale، ContractVersion، ContractAttachment، lifecycle requests — 100% هم‌تراز API و EXCELLENCE §8.

---

## معیار پذیرش

- [ ] `SaleStatusSchema` — all 6 statuses
- [ ] `SaleDetailEnterpriseSchema` extends Phase 1 `SaleDetailSchema`
- [ ] `ContractVersionSchema`, `ListContractVersionsQuerySchema`
- [ ] `ContractAttachmentSchema`, `CreateContractAttachmentSchema`
- [ ] Lifecycle DTOs: `ExtendContractSchema`, `CopyContractSchema`, `TerminateContractSchema`, `CloseContractSchema`, `ArchiveContractSchema`, `ChangeSaleStatusSchema`
- [ ] `bigintRial` as string — ADR-007
- [ ] Unit tests per schema
- [ ] No NestJS/Prisma imports

---

## مشخصات فنی

### Extended Sale Detail

```typescript
export const SaleStatusSchema = z.enum([
  'active', 'completed', 'cancelled', 'terminated', 'closed', 'archived',
]);

export const SaleDetailEnterpriseSchema = SaleDetailSchema.extend({
  contractNumber: z.string().max(50).nullable(),
  customTerms: z.string().max(10000).nullable(),
  signatureStatus: z.enum(['unsigned', 'pending', 'signed']),
  signedAt: z.string().datetime().nullable(),
  insuranceRial: bigintRialNonNegativeSchema.nullable(),
  insuranceProvider: z.string().max(200).nullable(),
  extendedFromSaleId: z.string().uuid().nullable(),
  copiedFromSaleId: z.string().uuid().nullable(),
  terminatedAt: z.string().datetime().nullable(),
  closedAt: z.string().datetime().nullable(),
  archivedAt: z.string().datetime().nullable(),
  versions: z.array(ContractVersionSummarySchema).optional(),
  attachments: z.array(ContractAttachmentSchema).optional(),
});
```

### Lifecycle Schemas

```typescript
export const ExtendContractSchema = z.object({
  newLastDueDate: dateOnlySchema,
  additionalInstallmentCount: z.number().int().min(0).max(120).optional(),
  reason: z.string().min(3).max(500),
  regenerateSchedule: z.boolean().default(false),
});

export const CopyContractSchema = z.object({
  tenantCustomerId: z.string().uuid().optional(), // default same customer
  branchId: z.string().uuid().optional(),
  contractDate: dateOnlySchema,
  firstDueDate: dateOnlySchema,
  copyAttachments: z.boolean().default(false),
  copyGuarantors: z.boolean().default(true),
  reason: z.string().min(3).max(500),
});

export const TerminateContractSchema = z.object({
  reason: z.string().min(3).max(500),
  effectiveDate: dateOnlySchema.optional(),
});

export const CloseContractSchema = z.object({
  reason: z.string().min(3).max(500),
  waiveRemaining: z.boolean().default(false),
});

export const ArchiveContractSchema = z.object({
  reason: z.string().min(3).max(500),
});

export const ChangeSaleStatusSchema = z.object({
  targetStatus: SaleStatusSchema,
  reason: z.string().min(3).max(500),
});
```

### ContractVersion / Attachment

```typescript
export const ContractVersionSchema = z.object({
  id: z.string().uuid(),
  saleId: z.string().uuid(),
  versionNumber: z.number().int().positive(),
  changeType: z.enum(['create','update','extend','copy_source','terminate','close','financial_recalc']),
  changeReason: z.string(),
  createdAt: z.string().datetime(),
  createdById: z.string().uuid().nullable(),
});

export const CreateContractAttachmentSchema = z.object({
  fileId: z.string().uuid(),
  attachmentType: z.enum(['contract_scan','signed_contract','identity_doc','collateral_doc','other']),
  label: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
});
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/contracts/src/installments/sale-enterprise.schema.ts` |
| Create | `packages/contracts/src/installments/contract-version.schema.ts` |
| Create | `packages/contracts/src/installments/contract-attachment.schema.ts` |
| Create | `*.schema.spec.ts` for each |
| Update | `packages/contracts/src/installments/index.ts` |

---

## مراحل پیاده‌سازی

1. Extend Sale schemas from TASK-068 base
2. Add lifecycle request/response schemas
3. ContractVersion + Attachment schemas
4. Export types `z.infer`
5. Unit tests: valid/invalid lifecycle payloads
6. JSON examples in task comments for API tasks

---

## Edge Cases & Errors

| سناریو | Code | رفتار |
|--------|------|--------|
| reason < 3 chars | validation | 400 |
| targetStatus invalid transition | — | use case; schema only validates enum |
| insuranceRial negative | `AMOUNT_INVALID` | refine fail |

---

## تست

- [ ] Unit: SaleDetailEnterpriseSchema full payload
- [ ] Unit: ExtendContractSchema bounds
- [ ] Unit: CopyContractSchema defaults
- [ ] Unit: CreateContractAttachmentSchema types
- [ ] Unit: ChangeSaleStatusSchema all statuses

---

## UX

N/A — consumed by IFP-076, IFP-077 forms.

---

## Flow

N/A

---

## Policy Alignment

- [ ] EXCELLENCE-STANDARDS §8 Sale fields
- [ ] ADR-007 bigint strings
- [ ] ADR-016 `/api/v1/sales/:id/*` paths
- [ ] Sync Phase 1 TASK-068 — no breaking changes to CreateSaleSchema

---

## مراجع

- Phase 1 `TASK-068-contracts-sale.md`
- `docs/02-architecture/api-contracts.md`
- IFP-TASK-055, 056, 057

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
