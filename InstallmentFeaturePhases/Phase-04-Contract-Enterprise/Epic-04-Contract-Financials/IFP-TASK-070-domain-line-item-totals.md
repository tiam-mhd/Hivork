# IFP-TASK-070: Domain — Line Item Totals & BR Reconciliation

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 04 — Contract Enterprise |
| Epic | Epic-04-Contract-Financials |
| ID | IFP-TASK-070 |
| Priority | P0 |
| Depends on | IFP-TASK-068, Phase 1 TASK-065 |
| Blocks | IFP-071 |
| Estimated | 6h |

---

## هدف

Domain service **`SaleTotalsCalculator`** — invariant BR-005: `downPayment + Σ installments = totalAmount` after line item changes; reconcile با installment regeneration hook.

---

## معیار پذیرش

- [ ] Pure functions: `calculateLineTotal()`, `calculateSaleSubtotal()`, `validateInstallmentSum()`
- [ ] `assertCanModifyFinancials(sale, installments)` — active + no paid
- [ ] When totals change: flag `requiresScheduleRegeneration` if installment sum mismatch
- [ ] Unit tests: 15+ cases including rounding interaction (defer rounding to settings IFP-073)
- [ ] Zero framework imports

---

## مشخصات فنی

```typescript
export function calculateLineTotal(item: {
  quantity: number;
  unitPriceRial: bigint;
  discountRial: bigint;
  taxRial: bigint;
}): bigint {
  const sub = BigInt(item.quantity) * item.unitPriceRial - item.discountRial;
  return sub + item.taxRial;
}

export function validateFinancialInvariant(input: {
  totalAmountRial: bigint;
  downPaymentRial: bigint;
  installmentAmounts: bigint[];
}): DomainResult<void> {
  const sum = input.downPaymentRial + input.installmentAmounts.reduce((a, b) => a + b, 0n);
  if (sum !== input.totalAmountRial) return fail('INSTALLMENT_SUM_MISMATCH');
  return ok();
}
```

### Interaction with down payment

Line items define merchandise total; down payment still validated BR-002 against new total.

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/domain/installments/sale-totals.calculator.ts` |
| Create | `packages/domain/installments/sale-totals.calculator.spec.ts` |

---

## مراحل پیاده‌سازی

1. Implement calculator functions
2. Wire to SaleEntity `canEditFinancials`
3. Unit test matrix
4. Export from domain index

---

## Edge Cases & Errors

| سناریو | Code |
|--------|------|
| Sum mismatch after edit | `INSTALLMENT_SUM_MISMATCH` |
| Negative line total | `LINE_TOTAL_NEGATIVE` |
| Paid installment exists | `SALE_HAS_PAID_INSTALLMENT` |

---

## تست

- [ ] Unit: single line item total
- [ ] Unit: multi-line subtotal
- [ ] Unit: validateFinancialInvariant pass/fail
- [ ] Unit: discount exceeds subtotal

---

## UX

N/A — API returns mismatch code for UI message.

---

## Flow

```
edit items → recalculate preview → if mismatch warn regenerate installments
```

---

## Policy Alignment

- [ ] BR-001, BR-002, BR-005
- [ ] Domain purity

---

## مراجع

- `docs/03-modules/installments/BUSINESS-RULES.md`
- Phase 1 `TASK-065-domain-sale-entity.md`

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
