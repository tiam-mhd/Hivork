# IFP-TASK-104: Contracts — Unified Payment Methods

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 06 — Payments & Checks |
| Epic | Epic-02-Payment-Methods-Unified |
| ID | IFP-TASK-104 |
| Priority | P0 |
| Depends on | IFP-TASK-086, IFP-TASK-101 |
| Blocks | IFP-TASK-105, IFP-TASK-106 |
| Estimated | 5h |

---

## هدف

Zod contracts **یکپارچه** برای API روش‌های پرداخت — discriminated union روی `method` — هم‌تراز IFP-086 + ledger fields و تنظیمات فعال‌سازی per tenant.

---

## معیار پذیرش

- [ ] `UnifiedPaymentMethodSchema` — ۷ روش: `online`, `in_person`, `cash`, `card`, `check`, `bank_transfer`, `wallet`
- [ ] `CreateUnifiedPaymentSchema` — discriminated union با method-specific payloads
- [ ] `UnifiedPaymentResponseSchema` — attempt + ledgerEntryId optional
- [ ] `PaymentMethodConfigSchema` — enabled, displayOrder, planRequired
- [ ] `ListEnabledPaymentMethodsResponseSchema`
- [ ] Map internal methods (pos → card, manual → cash) documented
- [ ] Unit tests all variants

---

## مشخصات فنی

### Method enum (product-facing)

```typescript
export const UnifiedPaymentMethodSchema = z.enum([
  'online', 'in_person', 'cash', 'card', 'check', 'bank_transfer', 'wallet',
]);
```

### Discriminated union

```typescript
export const CreateUnifiedPaymentSchema = z.discriminatedUnion('method', [
  z.object({ method: z.literal('cash'), installmentId: z.string().uuid(), amountRial: bigintRialPositiveSchema, note: z.string().optional() }),
  z.object({ method: z.literal('bank_transfer'), installmentId: z.string().uuid(), amountRial: bigintRialPositiveSchema, bankName: z.string(), referenceNumber: z.string(), transferDate: dateOnlySchema }),
  z.object({ method: z.literal('card'), installmentId: z.string().uuid(), amountRial: bigintRialPositiveSchema, terminalId: z.string(), traceNumber: z.string() }),
  z.object({ method: z.literal('online'), installmentId: z.string().uuid(), amountRial: bigintRialPositiveSchema, returnUrl: z.string().url() }),
  z.object({ method: z.literal('check'), installmentId: z.string().uuid(), amountRial: bigintRialPositiveSchema, checkNumber: z.string(), bankName: z.string(), dueDate: dateOnlySchema, drawerName: z.string() }),
  z.object({ method: z.literal('wallet'), installmentId: z.string().uuid(), amountRial: bigintRialPositiveSchema, walletProvider: z.string() }),
  z.object({ method: z.literal('in_person'), installmentId: z.string().uuid(), amountRial: bigintRialPositiveSchema, receivedAt: z.string().datetime() }),
]);
```

### Config schema

```typescript
export const PaymentMethodConfigSchema = z.object({
  method: UnifiedPaymentMethodSchema,
  enabled: z.boolean(),
  displayOrder: z.number().int().min(0),
  labelFa: z.string().max(50),
  requiresPlan: z.enum(['basic', 'pro', 'enterprise']).optional(),
});
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/contracts/src/payments/unified-payment.schema.ts` |
| Create | `packages/contracts/src/payments/payment-method-config.schema.ts` |
| Create | `packages/contracts/src/payments/unified-payment.schema.spec.ts` |
| Update | `packages/contracts/src/payments/index.ts` |

---

## مراحل پیاده‌سازی

1. Define unified method enum + mapping table to internal IFP-086 methods
2. Discriminated union create schema
3. Response + config schemas
4. Unit tests
5. Export

---

## Edge Cases & Errors

| سناریو | Validation |
|--------|------------|
| Unknown method | Zod discriminated union fail |
| wallet without provider | Zod fail |
| amountRial invalid | bigintRial schema fail |

---

## تست

- [ ] Unit: each method variant valid/invalid
- [ ] Unit: config schema

---

## UX

N/A — contracts.

---

## Flow

N/A

---

## Policy Alignment

- [ ] ADR-007 bigint string
- [ ] 100% alignment with IFP-086 + IFP-105 API

---

## مراجع

- `docs/01-product/installment-module-features.md` §۶
- IFP-TASK-086

---

## Self-Review Score

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata | 10 | 10 | ✓ |
| Completeness | 25 | 25 | 7 methods |
| Policy | 25 | 25 | |
| Executability | 25 | 25 | |
| Alignment | 15 | 15 | |
| **جمع** | **100** | **100** | ≥95 ✅ |
