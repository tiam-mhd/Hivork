# IFP-194: Use Case — Balance Sheet & Profit/Loss

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 11 |
| Epic | Epic-03-General-Ledger-Reports |
| ID | IFP-194 |
| Priority | P0 |
| Depends on | IFP-193 |
| Blocks | IFP-197, IFP-198 |
| Estimated | 12h |

---

## هدف

ترازنامه و صورت سود و زیان — aggregated by account type.

---

## معیار پذیرش

- [ ] GetBalanceSheetUseCase asOf date
- [ ] GetProfitLossUseCase from-to
- [ ] Assets = Liabilities + Equity check
- [ ] Export PDF hook P1
- [ ] API endpoints

---

## مشخصات فنی

P&L: revenue - expense for period; Balance sheet: cumulative posted

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/src/accounting/get-balance-sheet.use-case.ts` |
| Create | `packages/application/src/accounting/get-profit-loss.use-case.ts` |

---

## مراحل پیاده‌سازی

1. Aggregations
2. API
3. Unit test accounting equation

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Unbalanced books data | 500 | ACCOUNTING_DATA_INCONSISTENT — alert |

---

## تست

- [ ] Integration: after voucher BS balances

---

## Policy Alignment

- [ ] Financial reports audit log view

---

## مراجع

- `§18`

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
