# Epic-02 — RBAC UI — نقش‌ها، مجوزها، Override

## هدف Epic

رابط کامل مدیریت نقش‌های tenant، ماتریس مجوزها، و override per-staff مطابق ADR-004.

## Tasks

| ID | فایل | عنوان | Depends | Priority |
|----|------|--------|---------|----------|
| IFP-161 | [IFP-TASK-161-usecase-tenant-roles-crud.md](./IFP-TASK-161-usecase-tenant-roles-crud.md) | Use Case — Tenant Roles CRUD | Phase-0 TASK-021, Phase-1 TASK-092 | P0 |
| IFP-162 | [IFP-TASK-162-usecase-permission-overrides.md](./IFP-TASK-162-usecase-permission-overrides.md) | Use Case — Staff Permission Overrides | IFP-161, Phase-0 TASK-047 | P0 |
| IFP-163 | [IFP-TASK-163-api-rbac-controller-contracts.md](./IFP-TASK-163-api-rbac-controller-contracts.md) | API Controller + Contracts — RBAC | IFP-161, IFP-162 | P0 |
| IFP-164 | [IFP-TASK-164-frontend-roles-permissions-ui.md](./IFP-TASK-164-frontend-roles-permissions-ui.md) | Frontend — Roles & Permissions UI | IFP-163, IFP-002 | P0 |
| IFP-165 | [IFP-TASK-165-frontend-staff-groups-login-log-ui.md](./IFP-TASK-165-frontend-staff-groups-login-log-ui.md) | Frontend — Staff Groups & Login Log | IFP-158, IFP-160, IFP-163, IFP-164 | P0 |


## Dependency داخلی Epic

Tasks به ترتیب جدول برای Depends زنجیره‌ای داخل epic رعایت شده است.

## Policy notes

- Owner-only role create/delete؛ system roles immutable permissions core.
- EXCELLENCE-STANDARDS · SOFT-DELETE-POLICY · ADR-004/005/013/015/017

## مراجع

- `docs/01-product/installment-module-features.md`
- `docs/09-development/PHASE_EPIC_TASK_AUTHORING_RULES.md`
