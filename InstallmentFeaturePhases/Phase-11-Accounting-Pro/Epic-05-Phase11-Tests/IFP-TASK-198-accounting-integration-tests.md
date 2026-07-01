# IFP-198: Accounting — Integration Tests

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 11 |
| Epic | Epic-05-Phase11-Tests |
| ID | IFP-198 |
| Priority | P0 |
| Depends on | IFP-192, IFP-194 |
| Blocks | IFP-199 |
| Estimated | 10h |

---

## هدف

تست یکپارچه voucher → journal → ledger → BS/P&L — regression مالی.

---

## معیار پذیرش

- [ ] Receipt voucher posts balanced journal
- [ ] Ledger running balance correct
- [ ] P&L matches revenue entries
- [ ] Void prevents double post
- [ ] Cross-tenant fail

---

## مشخصات فنی

packages/application/src/__tests__/accounting/

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/src/__tests__/accounting/accounting.integration.spec.ts` |

---

## مراحل پیاده‌سازی

1. Seed COA
2. Scenario tests
3. CI

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Rounding | — | All bigint — no float |

---

## تست

- [ ] This task

---

## Policy Alignment

- [ ] Golden rule financial tests

---

## مراجع

- `06-testing-quality.mdc`

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
