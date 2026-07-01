# Epic-02 — Filter & Search

> **Phase:** 02 — Cross-Cutting UI  
> **Priority:** P0  
> **ADR:** ADR-013 (soft delete), ADR-015 (branch scope), ADR-016

---

## هدف Epic

فیلتر پیشرفته **چندشرطی** با UI builder، جستجوی لحظه‌ای با debounce و الگوی backend search API، و **ذخیره فیلترهای دلخواه** per staff (`StaffSavedFilter`). این Epic الگوی استاندارد list query را برای تمام resourceها تعریف می‌کند.

---

## Tasks

| ID | فایل | عنوان | Depends | Priority |
|----|------|--------|---------|----------|
| IFP-TASK-022 | [IFP-TASK-022-advanced-filter-builder.md](./IFP-TASK-022-advanced-filter-builder.md) | Advanced multi-condition filter builder | IFP-TASK-019 | P0 |
| IFP-TASK-023 | [IFP-TASK-023-instant-search-debounce-api.md](./IFP-TASK-023-instant-search-debounce-api.md) | Instant search debounce + backend search API pattern | IFP-TASK-019, IFP-TASK-022 | P0 |
| IFP-TASK-024 | [IFP-TASK-024-saved-filters-persistence.md](./IFP-TASK-024-saved-filters-persistence.md) | Saved filters persistence (StaffSavedFilter schema) | IFP-TASK-022 | P0 |

---

## Dependency داخلی Epic

```
IFP-TASK-019
    └──► IFP-TASK-022 (filter builder UI + AST)
              ├──► IFP-TASK-023 (search + list query contract)
              └──► IFP-TASK-024 (persist filters)
```

IFP-TASK-023 و IFP-TASK-024 موازی پس از 022.

---

## Policy notes

- **EXCELLENCE §3.2** — cursor pagination، sort whitelist، filter، search
- **StaffSavedFilter** — full base fields + soft delete + restore API
- `tenantId` از JWT؛ `staffId` از session — هرگز از body
- Branch filter: respect `X-Branch-Id` + data scope (ADR-015)
- Filter AST serialized as JSON — validated با Zod در contracts

---

## Blocks

- Epic-03 Export (export با همان filter state)
- Epic-04 Saved-Views (view می‌تواند filterId داشته باشد)
- تمام list APIهای فازهای 03–11
