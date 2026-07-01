# Phase 02 — Cross-Cutting UI

> **وضعیت:** Approved — v1.0  
> **نسخه:** 1.0 — 1405/04/10  
> **ADRهای مرتبط:** ADR-004, ADR-007, ADR-013, ADR-015, ADR-016  
> **منبع محصول:** [`installment-module-features.md`](../../docs/01-product/installment-module-features.md) — بخش «قابلیت‌های عمومی»  
> **قوانین:** [`PHASE_EPIC_TASK_AUTHORING_RULES.md`](../../docs/09-development/PHASE_EPIC_TASK_AUTHORING_RULES.md)

---

## هدف فاز

تحویل **زیرساخت UI/Backend مشترک** که در تقریباً تمام صفحات پنل فروشنده استفاده می‌شود: موتور جدول (DataTable)، فیلتر پیشرفته، جستجوی لحظه‌ای، خروجی Excel/PDF، نماهای ذخیره‌شده، تم تاریک/روشن، i18n، اعلان لحظه‌ای، و الگوی Undo. این فاز **قبل از** فازهای دامنه‌ای Enterprise (مشتری، قرارداد، اقساط) اجرا می‌شود تا صفحات بعدی روی یک پایه یکسان بنا شوند.

---

## Exit Criteria (فاز کامل شد وقتی…)

- [ ] همه تسک‌های **P0** (IFP-TASK-019 → IFP-TASK-030) وضعیت Done دارند
- [ ] DataTable در حداقل **یک** صفحه Phase 1 (مثلاً مشتریان) migrate شده و vertical slice pass
- [ ] List API pattern (cursor + sort whitelist + search + filter) در contracts مستند و یک نمونه endpoint پیاده شده
- [ ] `StaffSavedFilter` و `StaffSavedView` — CRUD + soft delete + restore
- [ ] Excel export streaming با tenant scope تست integration
- [ ] Theme toggle (dark/light) + RTL polish در admin shell
- [ ] i18n fa-IR/en scaffold + date picker شمسی/میلادی
- [ ] P1 tasks (IFP-TASK-031, IFP-TASK-032) — shell آماده؛ پیاده‌سازی کامل Undo روی عملیات مالی در فازهای بعدی
- [ ] self-review ≥ **95/100** روی همه task specs
- [ ] `TRACEABILITY-MATRIX.md` — bullets cross-cutting tick شده

---

## Epics (جدول)

| Epic | ID Range | عنوان | Priority |
|------|----------|--------|----------|
| [Epic-01-DataTable-Engine](./Epic-01-DataTable-Engine/) | IFP-TASK-019 → 021 | موتور DataTable | P0 |
| [Epic-02-Filter-Search](./Epic-02-Filter-Search/) | IFP-TASK-022 → 024 | فیلتر و جستجو | P0 |
| [Epic-03-Export-Print](./Epic-03-Export-Print/) | IFP-TASK-025 → 026 | خروجی Excel و PDF | P0 |
| [Epic-04-Saved-Views](./Epic-04-Saved-Views/) | IFP-TASK-027 → 028 | نماهای ذخیره‌شده | P0 / P1 |
| [Epic-05-Theme-i18n-a11y](./Epic-05-Theme-i18n-a11y/) | IFP-TASK-029 → 030 | تم، i18n، دسترسی‌پذیری | P0 |
| [Epic-06-Realtime-Undo](./Epic-06-Realtime-Undo/) | IFP-TASK-031 → 032 | Realtime و Undo | P1 |

**مجموع:** ۱۴ تسک (IFP-TASK-019 → IFP-TASK-032)

---

## ترتیب اجرا (dependency graph)

```
Phase 1 Shell (TASK-101→104) + IFP Phase 01 Auth (IFP-TASK-001→018)
         │
         ├──────────────────────────────┐
         ▼                              ▼
   IFP-TASK-029 (Theme)          IFP-TASK-019 (DataTable core)
         │                              │
         ▼                              ├──► IFP-TASK-020 (bulk select)
   IFP-TASK-030 (i18n)                   ├──► IFP-TASK-021 (columns)
         │                              │
         │                              ▼
         │                        IFP-TASK-022 (filter builder)
         │                              │
         │                              ├──► IFP-TASK-023 (search API)
         │                              └──► IFP-TASK-024 (saved filters)
         │                                       │
         │                              ┌────────┘
         │                              ▼
         │                        IFP-TASK-027 (saved views)
         │                              │
         │                              └──► IFP-TASK-028 (view sharing) [P1]
         │
         ▼
   IFP-TASK-023 ──► IFP-TASK-025 (Excel) ──► IFP-TASK-026 (PDF)
         │
         ▼
   IFP-TASK-031 (realtime shell) [P1]
         │
         └──► IFP-TASK-032 (undo + shortcuts) [P1]
```

**موازی‌سازی پیشنهادی:**

| موج | تسک‌ها | پیش‌نیاز |
|-----|--------|----------|
| A | IFP-TASK-019, IFP-TASK-029 | Phase 1 shell |
| B | IFP-TASK-020, IFP-TASK-021, IFP-TASK-022, IFP-TASK-030 | موج A |
| C | IFP-TASK-023, IFP-TASK-024 | IFP-TASK-022 |
| D | IFP-TASK-025, IFP-TASK-027 | IFP-TASK-023 + 021 + 024 |
| E | IFP-TASK-026, IFP-TASK-028, IFP-TASK-031 | موج D |
| F | IFP-TASK-032 | IFP-TASK-031 + domain hooks (فازهای بعد) |

---

## وابستگی به فاز قبل

| فاز | چرا لازم است |
|-----|--------------|
| Phase 0 Foundation | Auth، RBAC، Prisma base fields، tenant context |
| Phase 1 Seller Panel (TASK-101→104) | Admin layout، sidebar، TanStack Query shell |
| IFP Phase 01 Auth-Security (IFP-TASK-001→018) | Session پایدار، permission guards، branch header |

**Blocks:** IFP Phase 03 (Customer Enterprise) و تمام فازهای UI دامنه‌ای بعدی — همه لیست‌ها باید از DataTable + filter/search/export استفاده کنند.

---

## پوشش محصول (cross-cutting)

| قابلیت محصول | Task |
|--------------|------|
| جستجوی لحظه‌ای | IFP-TASK-023 |
| فیلتر پیشرفته چندشرطی | IFP-TASK-022 |
| مرتب‌سازی + صفحه‌بندی | IFP-TASK-019 |
| انتخاب چندتایی + عملیات گروهی | IFP-TASK-020 |
| خروجی Excel | IFP-TASK-025 |
| خروجی PDF + چاپ | IFP-TASK-026 |
| شخصی‌سازی ستون‌ها + Drag & Drop | IFP-TASK-021 |
| ذخیره فیلترهای دلخواه | IFP-TASK-024 |
| ذخیره نما (View) | IFP-TASK-027, IFP-TASK-028 |
| حالت تاریک و روشن | IFP-TASK-029 |
| چندزبانه + تاریخ شمسی/میلادی | IFP-TASK-030 |
| اعلان‌های لحظه‌ای | IFP-TASK-031 |
| Undo + میانبرهای صفحه‌کلید | IFP-TASK-032 |
| RBAC در UI | در هر task — permission-based hide (backend همیشه guard) |
| واکنش‌گرایی | IFP-TASK-019, IFP-TASK-029 |

---

## قوانین

- [`PHASE_EPIC_TASK_AUTHORING_RULES.md`](../../docs/09-development/PHASE_EPIC_TASK_AUTHORING_RULES.md)
- [`EXCELLENCE-STANDARDS.md`](../../docs/09-development/EXCELLENCE-STANDARDS.md) — §3.2 List API، §6.4 جداول، §7 صفحات
- [`SOFT-DELETE-POLICY.md`](../../docs/09-development/SOFT-DELETE-POLICY.md) — StaffSavedFilter/View
- [`DEVELOPMENT_RULES.md`](../../docs/09-development/DEVELOPMENT_RULES.md) — §6 Frontend

---

## مراجع

| موضوع | سند |
|--------|-----|
| تحلیل فیچرها | [FEATURE-ANALYSIS.md](../FEATURE-ANALYSIS.md) |
| Theme package | [packages/theme](../../packages/theme/) |
| List API pattern | [EXCELLENCE-STANDARDS.md](../../docs/09-development/EXCELLENCE-STANDARDS.md) §3.2 |
| Data flow | [data-flow.md](../../docs/02-architecture/data-flow.md) |

---

*آخرین به‌روزرسانی: 1405/04/10*
