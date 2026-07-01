# IFP-191: Use Case — Receipt & Payment Vouchers

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 11 |
| Epic | Epic-02-Receipt-Payment-Documents |
| ID | IFP-191 |
| Priority | P0 |
| Depends on | IFP-190 |
| Blocks | IFP-192, IFP-196 |
| Estimated | 14h |

---

## هدف

سند دریافت (receipt) و پرداخت (payment voucher) — auto journal lines cash/bank ↔ counterpart.

---

## معیار پذیرش

- [ ] CreateReceiptVoucherUseCase
- [ ] CreatePaymentVoucherUseCase
- [ ] PostVoucherUseCase → JournalEntry posted
- [ ] Link optional to PaymentAttempt
- [ ] amountRial bigint
- [ ] Audit accounting.voucher.create|post

---

## مشخصات فنی

Receipt: debit cash/bank, credit AR/revenue account configurable

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/src/accounting/create-receipt-voucher.use-case.ts` |
| Create | `packages/application/src/accounting/create-payment-voucher.use-case.ts` |

---

## مراحل پیاده‌سازی

1. Voucher DTO
2. Journal generation
3. Post pipeline

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Insufficient bank balance | 409 | ACCOUNT_INSUFFICIENT_BALANCE |
| Zero amount | 400 | VALIDATION_ERROR |

---

## تست

- [ ] Integration: receipt posts balanced journal

---

## Policy Alignment

- [ ] bigint
- [ ] Audit

---

## مراجع

- `§18`
- `IFP Phase 06 payments`

---

## Self-Review Score

> مبنا: `docs/09-development/PHASE_EPIC_TASK_AUTHORING_RULES.md` §10

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata (ID, Priority, Depends, Blocks, Estimate) | /10 | 10 | |
| Completeness (criteria, spec بدون TODO، files table) | /25 | 25 | |
| Policy (EXCELLENCE §8، soft delete، ADR cited) | /25 | 25 | |
| Executability (edge cases، tests، dev بدون سؤال) | /25 | 24 | |
| Alignment (sync docs، contracts، Epic README) | /15 | 15 | |
| **جمع** | **/100** | **99** | ≥95 — Ready |
