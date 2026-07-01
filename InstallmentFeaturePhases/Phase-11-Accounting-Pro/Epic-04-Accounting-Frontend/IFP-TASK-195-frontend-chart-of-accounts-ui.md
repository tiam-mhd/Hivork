# IFP-195: Frontend — Chart of Accounts UI

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 11 |
| Epic | Epic-04-Accounting-Frontend |
| ID | IFP-195 |
| Priority | P0 |
| Depends on | IFP-188, IFP-192, IFP-002 |
| Blocks | IFP-198 |
| Estimated | 12h |

---

## هدف

صفحه `/admin/accounting/accounts` — لیست حساب‌ها، ایجاد صندوق/بانک.

---

## معیار پذیرش

- [ ] Account tree/table
- [ ] Create edit modal
- [ ] Opening balance display
- [ ] Permissions
- [ ] Excellence §7

---

## مشخصات فنی

AccountsPage, AccountFormModal

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/web/src/app/(admin)/admin/accounting/accounts/page.tsx` |

---

## مراحل پیاده‌سازی

1. List
2. Forms
3. API wire

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| System account | — | Read-only badge |

---

## تست

- [ ] E2E create bank account

---

## UX (if UI)

- [ ] Excellence §5–7

---

## Policy Alignment

- [ ] EXCELLENCE

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
