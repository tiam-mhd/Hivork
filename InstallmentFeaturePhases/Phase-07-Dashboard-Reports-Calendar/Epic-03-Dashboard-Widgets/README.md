# Epic-03-Dashboard-Widgets — Dashboard Widgets

> **Phase:** 07 — Dashboard, Reports & Calendar  
> **وضعیت:** Ready for implementation  
> **منبع محصول:** `docs/01-product/installment-module-features.md`

---

## هدف Epic

۷ ویجت داشبورد با cursor pagination.

---

## Tasks

| ID | فایل | عنوان | Depends | Priority |
|----|------|--------|---------|----------|
| 123 | [IFP-TASK-123-dashboard-widget-providers.md](./IFP-TASK-123-dashboard-widget-providers.md) | Use Case — Dashboard Widgets (۷ ویجت) | IFP-TASK-119 | P0 |
| 124 | [IFP-TASK-124-dashboard-widget-api.md](./IFP-TASK-124-dashboard-widget-api.md) | API — Dashboard Widgets | IFP-TASK-123 | P0 |

---

## Dependency Graph

```mermaid
flowchart TD
  T123[IFP-123]
  T124[IFP-124]
```

---

## Policy Notes

| موضوع | قانون |
|-------|--------|
| Pagination | Cursor default limit 10 |
| Activity | AuditLog tenant-scoped read |

---

## مراجع

- `docs/01-product/installment-module-features.md §2`
