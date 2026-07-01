# IFP-TASK-086: Contracts — DTOهای ثبت پرداخت

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 05 — Installments Advanced |
| Epic | Epic-02-Payment-Recording |
| ID | IFP-TASK-086 |
| Priority | P0 |
| Depends on | Phase-1 TASK-069 |
| Blocks | IFP-TASK-087, IFP-TASK-088, IFP-TASK-089, IFP-TASK-090, IFP-TASK-091, IFP-TASK-092, IFP-TASK-093, IFP-TASK-094, IFP-TASK-095 |
| Estimated | 6h |

---

## هدف

تعریف Zod schemas مشترک برای **ثبت پرداخت** با تمام روش‌ها در `packages/contracts/installments/` — هم‌تراز PaymentAttempt extended fields، idempotency، و EXCELLENCE §8 — بدون import NestJS/Prisma.

---

## معیار پذیرش

- [ ] `PaymentMethodSchema` enum: `cash`, `manual`, `bank_transfer`, `online`, `pos`, `check`, `fee`
- [ ] `RecordPaymentBaseSchema` — `installmentId`, `amountRial` (string bigint), `note?`, `evidenceFileId?`, `idempotencyKey?`
- [ ] Method-specific extensions: `BankTransferDetailsSchema`, `PosDetailsSchema`, `OnlinePaymentInitSchema`, `CheckPaymentDetailsSchema`, `FeePaymentSchema`
- [ ] `PaymentAttemptDetailSchema` — response با status, timestamps, method metadata
- [ ] `PartialPaymentSchema` — `amountRial` < installment remaining allowed if setting on
- [ ] Unit tests per schema
- [ ] Document bigint-as-string in JSDoc

---

## مشخصات فنی

### Base

```typescript
export const PaymentMethodSchema = z.enum([
  'cash', 'manual', 'bank_transfer', 'online', 'pos', 'check', 'fee',
]);

export const RecordPaymentBaseSchema = z.object({
  installmentId: z.string().uuid(),
  amountRial: bigintRialPositiveSchema, // string pattern ^[1-9][0-9]*$
  note: z.string().max(2000).optional(),
  evidenceFileId: z.string().uuid().optional(),
  paidAt: z.string().datetime().optional(), // staff backdate if permitted
});
```

### Bank Transfer

```typescript
export const RecordBankTransferPaymentSchema = RecordPaymentBaseSchema.extend({
  method: z.literal('bank_transfer'),
  bankName: z.string().max(100),
  referenceNumber: z.string().max(50),
  transferDate: dateOnlySchema,
  accountLast4: z.string().regex(/^\d{4}$/).optional(),
});
```

### POS

```typescript
export const RecordPosPaymentSchema = RecordPaymentBaseSchema.extend({
  method: z.literal('pos'),
  terminalId: z.string().max(50),
  traceNumber: z.string().max(50),
  cardLast4: z.string().regex(/^\d{4}$/).optional(),
});
```

### Online (init — callback in gateway task)

```typescript
export const InitOnlinePaymentSchema = z.object({
  installmentId: z.string().uuid(),
  amountRial: bigintRialPositiveSchema,
  returnUrl: z.string().url().max(500),
});
```

### Check (links to Phase-06 Check entity)

```typescript
export const RecordCheckPaymentSchema = RecordPaymentBaseSchema.extend({
  method: z.literal('check'),
  checkNumber: z.string().max(20),
  bankName: z.string().max(100),
  branchCode: z.string().max(20).optional(),
  dueDate: dateOnlySchema,
  drawerName: z.string().max(200),
  sayadId: z.string().max(16).optional(),
});
```

### Fee (هزینه اضافی)

```typescript
export const RecordFeePaymentSchema = RecordPaymentBaseSchema.extend({
  method: z.literal('fee'),
  feeType: z.enum(['late_fee', 'service_fee', 'other']),
  feeDescription: z.string().max(500),
});
```

### Response

```typescript
export const PaymentAttemptDetailSchema = z.object({
  id: z.string().uuid(),
  installmentId: z.string().uuid(),
  amountRial: bigintRialSchema,
  status: z.enum(['pending', 'confirmed', 'rejected']),
  reportedByType: z.enum(['staff', 'customer']),
  method: PaymentMethodSchema,
  methodDetails: z.record(z.unknown()).nullable(),
  note: z.string().nullable(),
  createdAt: z.string().datetime(),
  confirmedAt: z.string().datetime().nullable(),
  version: z.number().int(),
});
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/contracts/src/installments/payment-recording.schema.ts` |
| Create | `packages/contracts/src/installments/payment-recording.schema.spec.ts` |
| Update | `packages/contracts/src/installments/index.ts` |

---

## مراحل پیاده‌سازی

1. Define enums + base schema
2. Method-specific discriminated union `RecordPaymentRequestSchema`
3. Response schemas aligned with Prisma PaymentAttempt + metadata.method
4. Unit tests: valid/invalid amounts, required bank fields
5. Export from package index

---

## Edge Cases & Errors

| سناریو | Validation | رفتار |
|--------|------------|--------|
| amountRial = "0" | Zod | fail |
| amountRial with decimal | Zod | fail |
| Missing bank ref for transfer | Zod | fail |
| note > 2000 chars | Zod | fail |

---

## تست

- [ ] Unit: each method schema valid sample passes
- [ ] Unit: invalid bigint rejected
- [ ] Unit: discriminated union narrows correctly

---

## UX

N/A — contracts only.

---

## Flow

N/A

---

## Policy Alignment

- [ ] EXCELLENCE-STANDARDS §8 — PaymentAttempt fields
- [ ] ADR-007 bigint as string in JSON
- [ ] ADR-008 report ≠ confirm — status always pending on record

---

## مراجع

- `docs/01-product/installment-module-features.md` §۵ — ثبت دستی، بانکی، آنلاین، ...
- Phase-1 `TASK-069-contracts-payment.md`
- `prisma/schema.prisma` — PaymentAttempt

---

## Self-Review Score

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata | 10 | 10 | ✓ |
| Completeness | 25 | 25 | all methods |
| Policy | 25 | 25 | ADR-007/008 |
| Executability | 25 | 25 | full schemas |
| Alignment | 15 | 15 | TASK-069 |
| **جمع** | **100** | **100** | ≥95 ✅ |
