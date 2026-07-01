# TASK-069: Contracts — Installment & Payment Zod Schemas

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 1 |
| Epic | Epic-04-Installments-Contracts |
| ID | TASK-069 |
| Priority | P0 |
| Depends on | TASK-066, TASK-067, TASK-068, TASK-013 |
| Blocks | TASK-075, TASK-076, TASK-077, TASK-081 |
| Estimated | 5h |

---

## هدف

Zod schemas برای Installment list/detail، Payment report/confirm/reject — هم‌تراز `api-contracts.md` §۵ و state-machines.md. پوشش query filters برای today/overdue reports و payment DTOs برای Phase 2 prep (schemas now، API Phase 2).

---

## معیار پذیرش

- [ ] `ListInstallmentsQuerySchema` — status، branchId، saleId، from، to، cursor، limit
- [ ] `InstallmentSummarySchema` — list item با customer embed
- [ ] `InstallmentDetailSchema` — full با sale reference
- [ ] `ReportPaymentSchema` — installmentId، amountRial، note
- [ ] `ConfirmPaymentSchema` — empty body `{}`
- [ ] `RejectPaymentSchema` — reason min 3 chars
- [ ] `PaymentAttemptSchema` — response با status enum
- [ ] Status enums sync با state-machines: `pending|overdue|paid|waived` (installment)، `pending|confirmed|rejected` (payment)
- [ ] `TodayInstallmentsQuerySchema` — branchId optional
- [ ] `OverdueInstallmentsQuerySchema` — branchId، minDaysOverdue optional
- [ ] Type exports برای همه schemas
- [ ] Unit tests per schema

---

## مشخصات فنی

### List Installments

```typescript
// packages/contracts/src/installments/installment.schema.ts
export const InstallmentStatusSchema = z.enum(['pending', 'overdue', 'paid', 'waived']);

export const ListInstallmentsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(['dueDate:asc', 'dueDate:desc', 'sequenceNumber:asc']).default('dueDate:asc'),
  status: InstallmentStatusSchema.optional(),
  branchId: z.string().uuid().optional(),
  saleId: z.string().uuid().optional(),
  tenantCustomerId: z.string().uuid().optional(),
  from: dateOnlySchema.optional(),
  to: dateOnlySchema.optional(),
});

export const InstallmentCustomerEmbedSchema = z.object({
  id: z.string().uuid(),
  phone: phoneSchema,
  name: z.string().nullable(),
});

export const InstallmentSummarySchema = z.object({
  id: z.string().uuid(),
  saleId: z.string().uuid(),
  tenantId: z.string().uuid().optional(),
  customer: InstallmentCustomerEmbedSchema,
  branchId: z.string().uuid(),
  sequenceNumber: z.number().int().positive(),
  dueDate: z.string().datetime(),
  amountRial: bigintRialNonNegativeSchema,
  status: InstallmentStatusSchema,
  paidAt: z.string().datetime().nullable().optional(),
  daysOverdue: z.number().int().nonnegative().optional(),
});
```

### Today / Overdue Query Schemas

```typescript
export const TodayInstallmentsQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const OverdueInstallmentsQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
  minDaysOverdue: z.coerce.number().int().min(0).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(['dueDate:asc', 'daysOverdue:desc']).default('daysOverdue:desc'),
});
```

### Payment Schemas

```typescript
// packages/contracts/src/installments/payment.schema.ts
export const PaymentAttemptStatusSchema = z.enum(['pending', 'confirmed', 'rejected']);

export const ReportPaymentSchema = z.object({
  installmentId: z.string().uuid(),
  amountRial: bigintRialStringSchema,
  note: z.string().max(500).optional(),
});

export const ConfirmPaymentSchema = z.object({}).strict();

export const RejectPaymentSchema = z.object({
  reason: z.string().min(3).max(500),
});

export const PaymentAttemptSchema = z.object({
  id: z.string().uuid(),
  installmentId: z.string().uuid(),
  saleId: z.string().uuid().optional(),
  reportedByType: z.enum(['customer', 'staff']),
  reportedById: z.string().uuid(),
  amountRial: bigintRialNonNegativeSchema,
  note: z.string().nullable().optional(),
  status: PaymentAttemptStatusSchema,
  confirmedAt: z.string().datetime().nullable().optional(),
  rejectedAt: z.string().datetime().nullable().optional(),
  rejectReason: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
});
```

### API Response Example (List Installments)

```json
{
  "data": [
    {
      "id": "uuid",
      "saleId": "uuid",
      "customer": { "id": "uuid", "phone": "09121234567", "name": "حسین احمدی" },
      "branchId": "uuid",
      "sequenceNumber": 3,
      "dueDate": "2025-03-01T00:00:00.000Z",
      "amountRial": "2000000",
      "status": "overdue",
      "daysOverdue": 5
    }
  ],
  "meta": { "total": 23, "hasNext": true, "nextCursor": "..." }
}
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/contracts/src/installments/installment.schema.ts` |
| Create | `packages/contracts/src/installments/payment.schema.ts` |
| Create | `packages/contracts/src/installments/installment.schema.spec.ts` |
| Create | `packages/contracts/src/installments/payment.schema.spec.ts` |
| Update | `packages/contracts/src/installments/index.ts` |

---

## مراحل پیاده‌سازی

1. Define `InstallmentStatusSchema` sync state-machines.md
2. Implement list query + summary/detail schemas
3. Implement today/overdue query schemas
4. Implement payment report/confirm/reject schemas
5. Export all types
6. Unit tests: status enum، query defaults، payment reason min length
7. Cross-check with `InstallmentInSaleSchema` from TASK-068 (shared status enum)

---

## Edge Cases & Errors

| سناریو | Code | رفتار |
|--------|------|--------|
| Invalid status filter | Zod enum fail | 400 validation |
| `amountRial` = "0" on report | `AMOUNT_INVALID` | refine fail |
| `reason` < 3 chars on reject | min(3) fail | validation |
| Unknown status string | enum fail | reject at parse |
| `limit` = 101 | max(100) fail | validation |

---

## تست

- [ ] Unit: `ListInstallmentsQuerySchema` defaults (limit=20, sort=dueDate:asc)
- [ ] Unit: `InstallmentSummarySchema` parse overdue item
- [ ] Unit: `ReportPaymentSchema` valid + amount=0 fail
- [ ] Unit: `RejectPaymentSchema` reason min 3
- [ ] Unit: `PaymentAttemptStatusSchema` rejects invalid status
- [ ] Unit: `TodayInstallmentsQuerySchema` branchId optional
- [ ] Unit: `OverdueInstallmentsQuerySchema` minDaysOverdue coerce

---

## UX

N/A — consumed by TASK-081, TASK-112, TASK-113.

---

## Flow

N/A

---

## Policy Alignment

- [ ] EXCELLENCE-STANDARDS §8 — Installment + PaymentAttempt fields
- [ ] state-machines.md — status enums exact match
- [ ] ADR-007 — bigint as string
- [ ] ADR-008 — payment amounts bigint only

---

## مراجع

- `docs/02-architecture/api-contracts.md` § installments + payments
- `docs/03-modules/installments/state-machines.md`
- `docs/03-modules/installments/domain.md`
- `docs/08-decisions/adr-log.md` — ADR-007, ADR-008

---

## Self-Review Score

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata | 10 | 10 | ✓ |
| Completeness | 25 | 25 | Installment + payment + query schemas |
| Policy | 25 | 25 | state machine sync، §8 |
| Executability | 25 | 25 | 7 unit tests، edge table |
| Alignment | 15 | 15 | api-contracts sync |
| **جمع** | **100** | **100** | ≥95 ✅ |
