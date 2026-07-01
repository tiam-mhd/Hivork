# Epic-02 — لاگ سیستم

## هدف Epic

لاگ کاربر، API، خطا، امنیت + Audit viewer §۱۹.

## Tasks

| ID | فایل | عنوان | Depends | Priority |
|----|------|--------|---------|----------|
| IFP-177 | [IFP-TASK-177-infrastructure-system-logs-pipeline.md](./IFP-TASK-177-infrastructure-system-logs-pipeline.md) | Infrastructure — System Logs Pipeline | Phase-0 TASK-024 | P0 |
| IFP-178 | [IFP-TASK-178-api-system-logs-viewer.md](./IFP-TASK-178-api-system-logs-viewer.md) | API — System Logs Viewer | IFP-177 | P0 |
| IFP-179 | [IFP-TASK-179-frontend-system-logs-viewer.md](./IFP-TASK-179-frontend-system-logs-viewer.md) | Frontend — System Logs Viewer | IFP-178, IFP-002 | P0 |


## Dependency داخلی Epic

Tasks به ترتیب جدول برای Depends زنجیره‌ای داخل epic رعایت شده است.

## Policy notes

- AuditLog append-only; operational logs retention policy.
- EXCELLENCE-STANDARDS · SOFT-DELETE-POLICY · ADR-004/005/013/015/017

## مراجع

- `docs/01-product/installment-module-features.md`
- `docs/09-development/PHASE_EPIC_TASK_AUTHORING_RULES.md`
