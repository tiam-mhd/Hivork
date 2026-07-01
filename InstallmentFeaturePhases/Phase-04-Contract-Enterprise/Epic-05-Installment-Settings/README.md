# Epic-05 — Installment Settings (§۱۵)

> **Phase:** 04 — Contract Enterprise  
> **تسک‌ها:** IFP-072 → IFP-075  
> **Priority:** P0

---

## هدف Epic

گسترش **تنظیمات ماژول اقساط** مطابق §۱۵ محصول: فرمول محاسبه، جریمه، سود، گرد کردن، روزهای تعطیل، تقویم شمسی/میلادی، روش شماره‌گذاری قرارداد.

---

## Tasks

| ID | فایل | عنوان | Depends | Priority |
|----|------|--------|---------|----------|
| IFP-072 | [IFP-TASK-072-settings-penalty-interest.md](./IFP-TASK-072-settings-penalty-interest.md) | Settings schema — Penalty + Interest + Formula | Phase 1 TASK-070 | P0 |
| IFP-073 | [IFP-TASK-073-settings-rounding-holidays.md](./IFP-TASK-073-settings-rounding-holidays.md) | Settings schema — Rounding + Holiday calendar | IFP-072 | P0 |
| IFP-074 | [IFP-TASK-074-settings-numbering-calendar.md](./IFP-TASK-074-settings-numbering-calendar.md) | Settings — Contract numbering + Jalali/Gregorian | IFP-072 | P0 |
| IFP-075 | [IFP-TASK-075-usecase-api-installment-settings-enterprise.md](./IFP-TASK-075-usecase-api-installment-settings-enterprise.md) | Use Case + API — Enterprise settings GET/PATCH | IFP-072–074, Phase 1 TASK-078 | P0 |

---

## Dependency داخلی Epic

```
Phase 1 TASK-070
       │
       ▼
    IFP-072
    ├── IFP-073
    └── IFP-074
           │
           ▼
        IFP-075
```

---

## Policy notes

- Keys **فقط** از schema — free-form ممنوع (settings vs invariants)
- شماره قرارداد: atomic sequence per tenant — race-safe (DB sequence یا row lock)
- تعطیلات: merge تقویم رسمی + لیست سفارشی tenant
- Domain algorithm (Phase 5) مصرف‌کننده این settings — این Epic فقط persist + validation

---

*Epic-05 — Phase 04*
