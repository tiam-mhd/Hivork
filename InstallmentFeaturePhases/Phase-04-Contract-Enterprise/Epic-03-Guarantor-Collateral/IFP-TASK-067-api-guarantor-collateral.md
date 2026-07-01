# IFP-TASK-067: API — Guarantor & Collateral CRUD

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 04 — Contract Enterprise |
| Epic | Epic-03-Guarantor-Collateral |
| ID | IFP-TASK-067 |
| Priority | P0 |
| Depends on | IFP-TASK-065, IFP-TASK-066, IFP-TASK-058 |
| Blocks | IFP-076, IFP-078 |
| Estimated | 8h |

---

## هدف

Domain use cases + NestJS API برای CRUD ضامن و وثیقه — contracts Zod، RBAC، audit.

---

## معیار پذیرش

- [ ] Zod: `CreateGuarantorSchema`, `UpdateGuarantorSchema`, `GuarantorSchema`
- [ ] Zod: `CreateCollateralSchema`, `UpdateCollateralSchema`, `CollateralSchema`, `ReleaseCollateralSchema`
- [ ] Use cases: Create, Update, List, SoftDelete, Restore (guarantor); + Release/Forfeit (collateral)
- [ ] Controller routes under `/api/v1/sales/:saleId/guarantors` and `/collaterals`
- [ ] Permissions: `installments.sale.guarantor.*`, `installments.sale.collateral.*`
- [ ] Audit: `sale.guarantor.create|update|delete`, `sale.collateral.create|update|release|forfeit`

---

## مشخصات فنی

### Endpoints — Guarantors

| Method | Path | Action |
|--------|------|--------|
| GET | `/sales/:saleId/guarantors` | List |
| POST | `/sales/:saleId/guarantors` | Create |
| PATCH | `/sales/:saleId/guarantors/:id` | Update |
| DELETE | `/sales/:saleId/guarantors/:id` | Soft delete |
| POST | `/sales/:saleId/guarantors/:id/restore` | Restore |

### Endpoints — Collaterals

| Method | Path | Action |
|--------|------|--------|
| GET | `/sales/:saleId/collaterals` | List |
| POST | `/sales/:saleId/collaterals` | Create |
| PATCH | `/sales/:saleId/collaterals/:id` | Update |
| DELETE | `/sales/:saleId/collaterals/:id` | Soft delete |
| POST | `/sales/:saleId/collaterals/:id/release` | Release |
| POST | `/sales/:saleId/collaterals/:id/forfeit` | Forfeit |

### CreateGuarantorSchema example

```typescript
export const CreateGuarantorSchema = z.object({
  tenantCustomerId: z.string().uuid().optional(),
  fullName: z.string().min(2).max(200).optional(),
  nationalId: z.string().regex(/^\d{10}$/).optional(),
  phone: phoneSchema.optional(),
  relationship: z.enum(['parent','spouse','sibling','employer','other']),
  note: z.string().max(2000).optional(),
}).superRefine((v, ctx) => {
  if (!v.tenantCustomerId && !(v.fullName && v.phone)) {
    ctx.addIssue({ code: 'custom', message: 'GUARANTOR_IDENTITY_REQUIRED' });
  }
});
```

### CreateCollateralSchema

```typescript
export const CreateCollateralSchema = z.object({
  collateralType: z.enum(['cheque','promissory_note','gold','vehicle','property','cash_deposit','other']),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  estimatedValueRial: bigintRialStringSchema,
  documentFileId: z.string().uuid().optional(),
  registrationNumber: z.string().max(100).optional(),
  issuedAt: dateOnlySchema.optional(),
});
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/contracts/src/installments/guarantor.schema.ts` |
| Create | `packages/contracts/src/installments/collateral.schema.ts` |
| Create | `packages/application/installments/*-guarantor*.ts` |
| Create | `packages/application/installments/*-collateral*.ts` |
| Create | `apps/api/src/modules/installments/sale-guarantors.controller.ts` |
| Create | `apps/api/src/modules/installments/sale-collaterals.controller.ts` |

---

## مراحل پیاده‌سازی

1. Contracts Zod + tests
2. Domain entities (IFP-065, 066)
3. Use cases with sale `canEditFinancials()` check
4. Controllers + guards
5. Seed permissions
6. Integration + RBAC tests

---

## Edge Cases & Errors

| سناریو | HTTP | Code |
|--------|------|------|
| Edit on archived sale | 409 | `SALE_ARCHIVED_READONLY` |
| Guarantor limit | 409 | `GUARANTOR_LIMIT_EXCEEDED` |
| Invalid nationalId | 400 | validation |
| Forfeit without permission | 403 | `PERMISSION_DENIED` |

---

## تست

- [ ] Integration: CRUD guarantor roundtrip
- [ ] Integration: collateral release flow
- [ ] RBAC: deny create without permission
- [ ] Cross-tenant saleId → 404

---

## UX

IFP-076 tabs with inline edit tables, empty states.

---

## Flow

```
guarantor: add → pick customer OR manual entry
collateral: add → type-specific fields (cheque number)
```

---

## Policy Alignment

- [ ] RBAC + audit
- [ ] phoneSchema shared
- [ ] SOFT-DELETE restore

---

## مراجع

- IFP-TASK-065, IFP-TASK-066
- `docs/02-architecture/rbac.md`

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
