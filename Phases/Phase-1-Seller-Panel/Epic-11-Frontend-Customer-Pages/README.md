# Epic-11 — Frontend Customer Pages

## هدف Epic

صفحات مدیریت مشتری tenant در پنل فروشنده: داشبورد KPI، لیست مشتریان، ایجاد/ویرایش (EXCELLENCE §8)، و import Excel — مطابق SF-007 و SF-010.

## Tasks

| ID | فایل | عنوان | Priority | Depends on | Blocks |
|----|------|--------|----------|------------|--------|
| 105 | [TASK-105-frontend-dashboard-page.md](./TASK-105-frontend-dashboard-page.md) | Dashboard — KPI + Today Due | P0 | TASK-102, TASK-104, TASK-083, TASK-090 | 113 |
| 106 | [TASK-106-frontend-customer-list.md](./TASK-106-frontend-customer-list.md) | Customer List | P0 | TASK-104, TASK-084 | 107, 108 |
| 107 | [TASK-107-frontend-customer-create-edit.md](./TASK-107-frontend-customer-create-edit.md) | Customer Create / Edit | P0 | TASK-106, TASK-084, TASK-085 | 110 |
| 108 | [TASK-108-frontend-customer-import-excel.md](./TASK-108-frontend-customer-import-excel.md) | Customer Import Excel | P0 | TASK-106, TASK-086 | — |

## ترتیب اجرا (Dependency داخلی Epic)

```
TASK-105 (dashboard) — موازی با 106
TASK-106 (list) ──→ TASK-107 (create/edit)
                 └──→ TASK-108 (import)
```

## Policy Notes

- **Entity fields:** همه فیلدهای EXCELLENCE §8 برای TenantCustomer در فرم create/edit
- **Phone edit:** read-only در حالت edit — تغییر شماره = entity جدید (domain rule)
- **Import:** permission `installments.customer.import` — audit `customer.import`
- **Money display:** تومان در UI؛ API bigint ریال به صورت string
- **Pagination:** cursor-based — نه offset

## وابستگی Backend (Phase 1)

| Backend Task | API |
|--------------|-----|
| TASK-083 | `GET /api/v1/reports/dashboard` |
| TASK-090 | `GET /api/v1/reports/today-due` |
| TASK-084 | `GET /api/v1/customers`, `POST /api/v1/customers` |
| TASK-085 | `GET /api/v1/customers/:id`, `PATCH /api/v1/customers/:id` |
| TASK-086 | `POST /api/v1/customers/import` |

## مراجع

- `docs/03-modules/installments/STAFF-FLOWS.md` — SF-007, SF-010
- `docs/03-modules/installments/REPORTS.md` — §1 Dashboard
- `docs/09-development/EXCELLENCE-STANDARDS.md` — §5, §7, §8 TenantCustomer
