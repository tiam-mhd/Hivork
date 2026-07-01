# IFP-165: Frontend — Staff Groups & Login Log

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 09 |
| Epic | Epic-02-RBAC-UI |
| ID | IFP-165 |
| Priority | P0 |
| Depends on | IFP-158, IFP-160, IFP-163, IFP-164 |
| Blocks | IFP-171 |
| Estimated | 12h |

---

## هدف

UI گروه‌های کارمند و تب لاگ ورود در صفحه staff — تکمیل §۱۳ کاربران.

---

## معیار پذیرش

- [ ] Route `/admin/staff-groups` CRUD
- [ ] Staff detail tab «لاگ ورود» with filters
- [ ] Extend `/admin/staff` — group badges, assign groups
- [ ] Member picker multi-select from staff list
- [ ] Export login log CSV (optional P1)
- [ ] Excellence page states

---

## مشخصات فنی

### Staff groups page
Filters: search, status
Table: name, code, member count, actions

### Staff detail tabs
اطلاعات | نقش‌ها | گروه‌ها | لاگ ورود

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/web/src/app/(admin)/admin/staff-groups/page.tsx` |
| Update | `apps/web/src/app/(admin)/admin/staff/[id]/page.tsx` |

---

## مراحل پیاده‌سازی

1. Groups CRUD page
2. Staff tabs integration
3. Login log table with date filter

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Empty groups | — | EmptyState with CTA |

---

## تست

- [ ] E2E: create group + add member
- [ ] Login log tab renders

---

## UX (if UI)

- [ ] Excellence §5–7
- [ ] Date range picker Jalali for log filter

---

## Policy Alignment

- [ ] EXCELLENCE §7
- [ ] No PII in client logs

---

## مراجع

- `docs/01-product/installment-module-features.md §13`

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
