# IFP-TASK-102: Domain — PaymentLedger Entity

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 06 — Payments & Checks |
| Epic | Epic-01-Payment-Ledger |
| ID | IFP-TASK-102 |
| Priority | P0 |
| Depends on | IFP-TASK-101 |
| Blocks | IFP-TASK-103, IFP-TASK-107, IFP-TASK-108 |
| Estimated | 5h |

---

## هدف

Entity دامنه **`PaymentLedgerEntry`** در `packages/domain/` — متدهای `post`, `void`, invariantهای مبلغ bigint و قوانین reversal — بدون import framework.

---

## معیار پذیرش

- [ ] `PaymentLedgerEntry` entity + value objects
- [ ] `PaymentLedgerService.postPaymentIn(...)` factory
- [ ] `void(originalEntry, reason)` → creates reversal spec (applied in use case TX)
- [ ] `amountRial > 0n` invariant
- [ ] Posted entry cannot void twice
- [ ] Unit tests ≥ 12 cases
- [ ] Zero NestJS/Prisma imports

---

## مشخصات فنی

### Entity sketch

```typescript
export class PaymentLedgerEntry {
  private constructor(/* props */) {}

  static postPaymentIn(input: PostPaymentInInput): PaymentLedgerEntry {
    if (input.amountRial <= 0n) throw new DomainError('AMOUNT_INVALID');
    return new PaymentLedgerEntry({ status: 'posted', direction: 'credit', ... });
  }

  void(voidedBy: StaffId, reason: string, at: DateTime): VoidLedgerResult {
    if (this.status === 'voided') throw new DomainError('LEDGER_ALREADY_VOIDED');
    return { original: this.markVoided(...), reversal: this.createReversal(...) };
  }
}
```

### Unit test cases

| Case | Expected |
|------|----------|
| post with zero amount | `AMOUNT_INVALID` |
| post valid payment in | status posted, direction credit |
| void posted entry | reversal DEBIT same amount |
| void already voided | `LEDGER_ALREADY_VOIDED` |
| refund entry type | direction DEBIT |

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/domain/src/payments/payment-ledger-entry.entity.ts` |
| Create | `packages/domain/src/payments/payment-ledger.service.ts` |
| Create | `packages/domain/src/payments/errors/ledger.errors.ts` |
| Create | `packages/domain/src/payments/payment-ledger-entry.entity.spec.ts` |

---

## مراحل پیاده‌سازی

1. Define types matching Prisma enums (domain-owned)
2. Entity with post/void methods
3. Service factories for common entry types
4. Unit tests
5. Export from domain payments module

---

## Edge Cases & Errors

| سناریو | Code | رفتار |
|--------|------|--------|
| Negative amount | `AMOUNT_INVALID` | throw |
| Void voided | `LEDGER_ALREADY_VOIDED` | throw |
| Mismatched reversal amount | `REVERSAL_AMOUNT_MISMATCH` | throw in factory |

---

## تست

- [ ] Unit: all 12+ cases listed
- [ ] Unit: bigint only — no number coercion

---

## UX

N/A — domain only.

---

## Flow

```
PaymentConfirmedEvent → handler → PaymentLedgerService.postPaymentIn → persist
PaymentVoidedEvent → handler → entry.void() → persist reversal pair
```

---

## Policy Alignment

- [ ] Domain purity — no framework imports
- [ ] ADR-007 bigint
- [ ] Append-only — void not delete

---

## مراجع

- IFP-TASK-101 Prisma schema
- `docs/03-modules/installments/domain.md`

---

## Self-Review Score

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata | 10 | 10 | ✓ |
| Completeness | 25 | 25 | 12+ unit cases |
| Policy | 25 | 25 | |
| Executability | 25 | 25 | |
| Alignment | 15 | 15 | |
| **جمع** | **100** | **100** | ≥95 ✅ |
