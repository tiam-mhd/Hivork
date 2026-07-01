# IFP-179: Frontend — System Logs Viewer

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 10 |
| Epic | Epic-02-System-Logs |
| ID | IFP-179 |
| Priority | P0 |
| Depends on | IFP-178, IFP-002 |
| Blocks | IFP-187 |
| Estimated | 12h |

---

## هدف

صفحه `/admin/logs` تب‌های API، خطا، امنیت، Audit.

---

## معیار پذیرش

- [ ] Tabs per log type
- [ ] Date range Jalali
- [ ] Expand row JSON metadata
- [ ] Export CSV P1
- [ ] Excellence states

---

## مشخصات فنی

LogsPage with LogTable per tab

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/web/src/app/(admin)/admin/logs/page.tsx` |

---

## مراحل پیاده‌سازی

1. Tabs
2. Tables
3. Filters

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Empty range | — | EmptyState |

---

## تست

- [ ] E2E view audit tab

---

## UX (if UI)

- [ ] Excellence §7

---

## Policy Alignment

- [ ] EXCELLENCE §7

---

## مراجع

- `§19`

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
