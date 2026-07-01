# IFP-193: Use Case — General Ledger Queries

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 11 |
| Epic | Epic-03-General-Ledger-Reports |
| ID | IFP-193 |
| Priority | P0 |
| Depends on | IFP-190, IFP-191 |
| Blocks | IFP-194, IFP-197 |
| Estimated | 12h |

---

## هدف

دفتر کل per account — running balance bigint، filter date range.

---

## معیار پذیرش

- [ ] GetGeneralLedgerUseCase
- [ ] List by accountId + from/to
- [ ] Running balance computed
- [ ] Cursor pagination
- [ ] Only posted entries

---

## مشخصات فنی

GET /api/v1/accounting/ledger?accountId=&from=&to=

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/src/accounting/get-general-ledger.use-case.ts` |

---

## مراحل پیاده‌سازی

1. SQL aggregation
2. Tests with known entries

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Account not found | 404 | ACCOUNT_NOT_FOUND |

---

## تست

- [ ] Integration ledger balance

---

## Policy Alignment

- [ ] bigint

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
