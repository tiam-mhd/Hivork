# Epic-04 — Saved Views

> **Phase:** 02 — Cross-Cutting UI  
> **Priority:** P0 (027) / P1 (028)  
> **ADR:** ADR-013, ADR-004

---

## هدف Epic

ذخیره **نما (View)** per staff — ترکیب ستون‌ها، sort، و فیلتر — با CRUD API (`StaffSavedView`). نماهای پیش‌فرض tenant و اشتراک‌گذاری اختیاری within tenant (IFP-TASK-028).

---

## Tasks

| ID | فایل | عنوان | Depends | Priority |
|----|------|--------|---------|----------|
| IFP-TASK-027 | [IFP-TASK-027-saved-views-crud-api.md](./IFP-TASK-027-saved-views-crud-api.md) | Saved views (StaffSavedView schema + CRUD API) | IFP-TASK-019, IFP-TASK-021, IFP-TASK-022, IFP-TASK-024 | P0 |
| IFP-TASK-028 | [IFP-TASK-028-view-sharing-within-tenant.md](./IFP-TASK-028-view-sharing-within-tenant.md) | View sharing within tenant (optional) | IFP-TASK-027 | P1 |

---

## Dependency داخلی Epic

```
IFP-TASK-021 (columns) + IFP-TASK-024 (filters)
    └──► IFP-TASK-027 (saved views CRUD)
              └──► IFP-TASK-028 (sharing) [P1]
```

---

## Policy notes

- **StaffSavedView** — full base fields + soft delete
- `resourceKey` enum: `customers`, `sales`, `installments`, `payments`, … — extendable
- View فقط متعلق به `staffId` creator — مگر shared (028)
- Default view: یک per `(staffId, resourceKey)` — unique partial index
- Restore API برای platform admin / tenant owner

---

## Blocks

- تمام صفحات لیست Enterprise — view selector در toolbar
