# Epic-05-Reports-Export — Reports Export

> **Phase:** 07 — Dashboard, Reports & Calendar  
> **وضعیت:** Ready for implementation  
> **منبع محصول:** `docs/01-product/installment-module-features.md`

---

## هدف Epic

گزارش دوره‌ای، Pivot، خروجی Excel و PDF.

---

## Tasks

| ID | فایل | عنوان | Depends | Priority |
|----|------|--------|---------|----------|
| 130 | [IFP-TASK-130-reports-periodic-pivot.md](./IFP-TASK-130-reports-periodic-pivot.md) | Reports — Periodic (Daily/Weekly/Monthly/Yearly) + Pivot | IFP-TASK-126, IFP-TASK-127, IFP-TASK-128 | P0 |
| 131 | [IFP-TASK-131-reports-excel-pdf-export.md](./IFP-TASK-131-reports-excel-pdf-export.md) | Reports — Excel & PDF Export Engine | IFP-TASK-130 | P0 |

---

## Dependency Graph

```mermaid
flowchart TD
  T130[IFP-130]
  T131[IFP-131]
```

---

## Policy Notes

| موضوع | قانون |
|-------|--------|
| Async | BullMQ for large exports |
| Download | Signed URL expiry 1h |

---

## مراجع

- `docs/01-product/installment-module-features.md §10`
