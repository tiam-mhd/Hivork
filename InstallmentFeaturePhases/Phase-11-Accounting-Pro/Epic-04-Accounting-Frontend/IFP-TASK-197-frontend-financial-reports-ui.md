# IFP-197: Frontend — Balance Sheet & P&L Reports

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 11 |
| Epic | Epic-04-Accounting-Frontend |
| ID | IFP-197 |
| Priority | P0 |
| Depends on | IFP-194, IFP-196 |
| Blocks | IFP-199 |
| Estimated | 12h |

---

## هدف

صفحات تراز و سود و زیان با date picker شمسی.

---

## معیار پذیرش

- [ ] Routes /accounting/reports/balance-sheet, /profit-loss
- [ ] Jalali date range
- [ ] Print-friendly layout
- [ ] Export Excel P1
- [ ] Excellence §7

---

## مشخصات فنی

ReportTable grouped by account type

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/web/src/app/(admin)/admin/accounting/reports/` |

---

## مراحل پیاده‌سازی

1. Report pages
2. Date filters
3. Print CSS

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| No data | — | EmptyState |

---

## تست

- [ ] E2E view P&L

---

## UX (if UI)

- [ ] Excellence §7

---

## Policy Alignment

- [ ] EXCELLENCE §7

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
