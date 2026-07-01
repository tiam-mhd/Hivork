# Epic-12 — Frontend Sales & Installments

## هدف Epic

صفحات فروش و اقساط: لیست فروش، ایجاد با پیش‌نمایش اقساط (BR-005)، جزئیات فروش + لغو، گزارش معوقات و سررسید امروز — مطابق SF-002, SF-003, SF-006 و REPORTS.md.

## Tasks

| ID | فایل | عنوان | Priority | Depends on | Blocks |
|----|------|--------|----------|------------|--------|
| 109 | [TASK-109-frontend-sale-list.md](./TASK-109-frontend-sale-list.md) | Sale List | P0 | TASK-104, TASK-087 | 110, 111 |
| 110 | [TASK-110-frontend-sale-create-preview.md](./TASK-110-frontend-sale-create-preview.md) | Sale Create + Installment Preview | P0 | TASK-109, TASK-088, TASK-093, TASK-107 | 111 |
| 111 | [TASK-111-frontend-sale-detail.md](./TASK-111-frontend-sale-detail.md) | Sale Detail + Cancel | P0 | TASK-109, TASK-089 | — |
| 112 | [TASK-112-frontend-overdue-report.md](./TASK-112-frontend-overdue-report.md) | Overdue Report | P0 | TASK-104, TASK-091 | — |
| 113 | [TASK-113-frontend-today-due-report.md](./TASK-113-frontend-today-due-report.md) | Today Due Report | P0 | TASK-105, TASK-090 | — |

## ترتیب اجرا (Dependency داخلی Epic)

```
TASK-109 (sale list) ──→ TASK-110 (create) ──→ TASK-111 (detail)
TASK-112 (overdue) — موازی
TASK-113 (today due) — بعد از TASK-105
```

## Policy Notes

- **Installment preview:** client-side با همان الگوریتم BR-005 — shared از `@hivork/domain` یا `@hivork/contracts`
- **Cancel sale:** modal با دلیل اجباری — BR-012 (no paid installments)
- **Export:** دکمه Excel در TASK-112 — **disabled P1** (permission `installments.report.export` — Phase 5+)
- **Status badges:** رنگ‌ها از design tokens — consistent با state-machines.md

## وابستگی Backend (Phase 1)

| Backend Task | API |
|--------------|-----|
| TASK-087 | `GET /api/v1/sales` |
| TASK-088 | `POST /api/v1/sales` |
| TASK-089 | `GET /api/v1/sales/:id`, `POST /api/v1/sales/:id/cancel` |
| TASK-091 | `GET /api/v1/reports/overdue` |
| TASK-090 | `GET /api/v1/reports/today-due` |
| TASK-093 | Shared `calculateInstallmentSchedule` (domain) |

## مراجع

- `docs/03-modules/installments/STAFF-FLOWS.md` — SF-002, SF-003, SF-006
- `docs/03-modules/installments/BUSINESS-RULES.md` — BR-005, BR-012
- `docs/03-modules/installments/REPORTS.md` — §1, §2
- `docs/03-modules/installments/state-machines.md`
