# Epic-06 — Contract Frontend

> **Phase:** 04 — Contract Enterprise  
> **تسک‌ها:** IFP-076 → IFP-077  
> **Priority:** P0

---

## هدف Epic

UI فارسی RTL برای **قرارداد Enterprise**: جزئیات کامل، نسخه‌ها، پیوست، ضامن/وثیقه، اقلام، actions lifecycle، و صفحه تنظیمات اقساط §۱۵.

---

## Tasks

| ID | فایل | عنوان | Depends | Priority |
|----|------|--------|---------|----------|
| IFP-076 | [IFP-TASK-076-frontend-contract-detail-enterprise.md](./IFP-TASK-076-frontend-contract-detail-enterprise.md) | Frontend — Contract detail enterprise tabs | IFP-064, 067, 071, IFP-058 | P0 |
| IFP-077 | [IFP-TASK-077-frontend-contract-lifecycle-settings.md](./IFP-TASK-077-frontend-contract-lifecycle-settings.md) | Frontend — Lifecycle actions + Installment settings §۱۵ | IFP-076, IFP-075 | P0 |

---

## Dependency داخلی Epic

```
IFP-064 + IFP-067 + IFP-071 + IFP-058
              │
              ▼
           IFP-076
              │
              ▼
           IFP-077
```

---

## Policy notes

- Excellence §5–7: form، page states، permission-based UI (UX only)
- Zod از `@hivork/contracts` — React Hook Form
- چاپ قرارداد: hook به print template — PDF generation در Phase 10

---

*Epic-06 — Phase 04*
