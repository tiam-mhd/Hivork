# Epic-10 — Frontend Layout & Auth

## هدف Epic

پیاده‌سازی لایه احراز هویت Staff (OTP)، shell ادمین با sidebar/header، بومی‌سازی RTL/fa-IR، و منوی مبتنی بر permission — پیش‌نیاز تمام صفحات پنل فروشنده در Phase 1.

## Tasks

| ID | فایل | عنوان | Priority | Depends on | Blocks |
|----|------|--------|----------|------------|--------|
| 101 | [TASK-101-frontend-otp-login-staff.md](./TASK-101-frontend-otp-login-staff.md) | OTP Login — Staff (SF-001) | P0 | TASK-007, TASK-054, TASK-055, TASK-051, TASK-080 | 102, 104 |
| 102 | [TASK-102-frontend-admin-layout-sidebar.md](./TASK-102-frontend-admin-layout-sidebar.md) | Admin Layout + Sidebar + Header | P0 | TASK-101, TASK-007, TASK-081, TASK-082 | 104, 105 |
| 103 | [TASK-103-frontend-rtl-fa-ir.md](./TASK-103-frontend-rtl-fa-ir.md) | RTL + fa-IR + Formatters | P0 | TASK-007, TASK-015, TASK-014 | 104, 105–113 |
| 104 | [TASK-104-frontend-permission-menu.md](./TASK-104-frontend-permission-menu.md) | Permission-Based Sidebar Menu | P0 | TASK-102, TASK-103, TASK-081 | 105–113 |

## ترتیب اجرا (Dependency داخلی Epic)

```
TASK-103 (RTL/i18n) ──┐
                      ├──→ TASK-104 (permission menu) ──→ Epic-11/12
TASK-101 (login) ──→ TASK-102 (layout) ──┘
```

TASK-101 و TASK-103 می‌توانند **موازی** شروع شوند. TASK-102 بعد از TASK-101. TASK-104 آخر Epic-10.

## Policy Notes

- **Auth:** Refresh token فقط httpOnly cookie (`hivork_staff_refresh`) — access token در memory (React context) — ADR از TASK-055
- **Branch:** شعبه فعال در session + header `X-Branch-Id` — نه در JWT (ADR-015)
- **Permission UI:** فقط UX — backend guard منبع حقیقت (`.cursor/rules/02-security-rbac-audit.mdc`)
- **RTL:** logical properties (`ms-`/`me-`/`ps-`/`pe-`) — ممنوع `ml-`/`mr-` برای spacing
- **Soft delete:** N/A — UI فقط داده active از API می‌گیرد

## وابستگی Backend (Phase 1 — Epic-08+)

| Backend Task | API / قابلیت |
|--------------|--------------|
| TASK-080 | Staff OTP login + multi-tenant select |
| TASK-081 | `GET /api/v1/staff/me` (permissions, roles) |
| TASK-082 | `GET /api/v1/branches` |
| TASK-092 | `PATCH /api/v1/staff/me/active-branch` |

## مراجع

- `docs/03-modules/installments/STAFF-FLOWS.md` — SF-001
- `docs/02-architecture/rbac.md` — permission matrix
- `docs/02-architecture/api-contracts.md` — Auth + Active Branch
- `docs/09-development/EXCELLENCE-STANDARDS.md` — §5–7
