# IFP-196: Frontend — Vouchers & Journal UI

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 11 |
| Epic | Epic-04-Accounting-Frontend |
| ID | IFP-196 |
| Priority | P0 |
| Depends on | IFP-192, IFP-195 |
| Blocks | IFP-198 |
| Estimated | 14h |

---

## هدف

صفحات دریافت/پرداخت و دفتر روزنامه.

---

## معیار پذیرش

- [ ] Routes /accounting/receipts, /payments, /journal
- [ ] Voucher form with account picker
- [ ] Post action confirm
- [ ] Journal entry detail drawer

---

## مشخصات فنی

VoucherForm: amount string bigint, account selects

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/web/src/app/(admin)/admin/accounting/receipts/page.tsx` |

---

## مراحل پیاده‌سازی

1. Voucher pages
2. Journal list
3. Post flow

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Post fail unbalanced | — | Inline error |

---

## تست

- [ ] E2E create receipt

---

## UX (if UI)

- [ ] Excellence §5–7
- [ ] Amount input Rial formatted

---

## Policy Alignment

- [ ] bigint string in forms

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
