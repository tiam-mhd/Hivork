# Epic-05 — Theme, i18n & a11y

> **Phase:** 02 — Cross-Cutting UI  
> **Priority:** P0  
> **ADR:** ADR-010 (shadcn/ui + theme tokens)

---

## هدف Epic

یکپارچه‌سازی **packages/theme** با admin shell — toggle تاریک/روشن، polish RTL، scaffold **i18n** fa-IR/en، و date picker **شمسی/میلادی** قابل سوئیچ. پایه دسترسی‌پذیری (focus ring، aria) در تم و کامپوننت‌های مشترک.

---

## Tasks

| ID | فایل | عنوان | Depends | Priority |
|----|------|--------|---------|----------|
| IFP-TASK-029 | [IFP-TASK-029-dark-light-theme-rtl.md](./IFP-TASK-029-dark-light-theme-rtl.md) | Dark/light theme + RTL polish (packages/theme) | TASK-101 | P0 |
| IFP-TASK-030 | [IFP-TASK-030-i18n-date-picker-jalali.md](./IFP-TASK-030-i18n-date-picker-jalali.md) | i18n fa-IR/en scaffold + Jalali/Gregorian date picker | IFP-TASK-029 | P0 |

---

## Dependency داخلی Epic

```
TASK-101 (admin layout)
    └──► IFP-TASK-029 (theme + RTL)
              └──► IFP-TASK-030 (i18n + dates)
```

IFP-TASK-029 **موازی** با Epic-01 قابل شروع است.

---

## Policy notes

- Theme preference: `localStorage` + optional staff metadata sync
- `ThemeDefinition` از `@hivork/contracts/theme` — no hardcoded colors in pages
- fa-IR default؛ en secondary — keys در `packages/i18n` یا `apps/web/messages`
- Date: tenant `timezone` + user `calendarPreference` (jalali | gregorian)
- WCAG AA contrast در semantic tokens — verify dark mode

---

## Blocks

- تمام فرم‌ها و فیلترهای تاریخ در فازهای بعد
