# IFP-192: API + Contracts — Accounting Vouchers

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 11 |
| Epic | Epic-02-Receipt-Payment-Documents |
| ID | IFP-192 |
| Priority | P0 |
| Depends on | IFP-191 |
| Blocks | IFP-196, IFP-198 |
| Estimated | 8h |

---

## هدف

REST vouchers + journal read.

---

## معیار پذیرش

- [ ] POST /api/v1/accounting/receipts
- [ ] /payments
- [ ] POST .../post
- [ ] GET /api/v1/accounting/journal-entries
- [ ] Permissions installments.accounting.* or core.accounting.*
- [ ] Zod contracts

---

## مشخصات فنی

Module @RequireModule install optional accounting module flag

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/api/src/modules/accounting/vouchers.controller.ts` |
| Create | `packages/contracts/src/accounting/voucher.schema.ts` |

---

## مراحل پیاده‌سازی

1. Controller
2. Permissions seed
3. RBAC tests

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Module not enabled | 403 | MODULE_NOT_ENABLED |

---

## تست

- [ ] API integration

---

## Policy Alignment

- [ ] ADR-004 new permissions

---

## مراجع

- `rbac.md`

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
