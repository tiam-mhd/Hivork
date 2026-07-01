# Epic-01 — DataTable Engine

> **Phase:** 02 — Cross-Cutting UI  
> **Priority:** P0  
> **ADR:** ADR-004 (RBAC UI gates), ADR-007 (money display), ADR-016 (API v1)

---

## هدف Epic

موتور **DataTable** قابل استفاده مجدد برای تمام لیست‌های پنل فروشنده — cursor pagination، sort با whitelist، skeleton/empty/error states، multi-select با bulk action bar، و شخصی‌سازی ستون با drag-drop. تمام صفحات Enterprise بعدی **باید** از این کامپوننت استفاده کنند؛ جدول ad-hoc ممنوع.

---

## Tasks

| ID | فایل | عنوان | Depends | Priority |
|----|------|--------|---------|----------|
| IFP-TASK-019 | [IFP-TASK-019-datatable-core-component.md](./IFP-TASK-019-datatable-core-component.md) | DataTable core (cursor pagination, sort whitelist) | TASK-101, IFP-TASK-018 | P0 |
| IFP-TASK-020 | [IFP-TASK-020-multi-select-bulk-action-bar.md](./IFP-TASK-020-multi-select-bulk-action-bar.md) | Multi-select + bulk action bar pattern | IFP-TASK-019 | P0 |
| IFP-TASK-021 | [IFP-TASK-021-column-personalization-drag-drop.md](./IFP-TASK-021-column-personalization-drag-drop.md) | Column personalization + drag-drop reorder | IFP-TASK-019 | P0 |

---

## Dependency داخلی Epic

```
IFP-TASK-019 (core)
    ├──► IFP-TASK-020 (bulk)
    └──► IFP-TASK-021 (columns)
```

IFP-TASK-020 و IFP-TASK-021 **موازی** پس از 019 قابل اجرا هستند.

---

## Policy notes

- **EXCELLENCE §6.4** — search/filter bar، sort، pagination، bulk، empty/loading/error
- **EXCELLENCE §7** — page states در wrapper صفحه consuming
- **ADR-007** — ستون‌های مالی: `formatRial()` / تومان — bigint-safe string از API
- Permission: bulk actions فقط با permission مربوط — UI hide ≠ security
- **بدون business logic** در DataTable — فقط presentation + callback props

---

## Blocks

- Epic-02 Filter-Search (filter bar slot در DataTable)
- Epic-03 Export (export از toolbar DataTable)
- Epic-04 Saved-Views (column state از IFP-TASK-021)
- IFP Phase 03+ — تمام لیست‌های Enterprise
