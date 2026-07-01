# Epic-05 — Installment Frontend

## هدف Epic

UI Enterprise اقساط: **لیست** با فیلتر/رنگ‌بندی وضعیت، **جزئیات** قسط با timeline عملیات و پرداخت‌ها، **یادداشت داخلی** و **بارگذاری فایل** پیوست.

## Tasks

| ID | فایل | عنوان | Depends | Priority |
|----|------|--------|---------|----------|
| IFP-099 | [IFP-TASK-099-frontend-installments-advanced.md](./IFP-TASK-099-frontend-installments-advanced.md) | Frontend — لیست، جزئیات، یادداشت، فایل | IFP-080–098 | P0 |

## Dependency داخلی Epic

```
IFP-080–098 (backend) → IFP-099 (frontend)
```

## Policy notes

- Excellence §5 (forms) + §7 (page states)
- Permission-based actions — UX only
- RTL + mobile input types
- رنگ‌بندی: pending=آبی، overdue=قرمز، paid=سبز، waived=خاکستری
