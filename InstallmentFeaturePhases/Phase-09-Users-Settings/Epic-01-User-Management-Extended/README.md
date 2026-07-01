# Epic-01 — مدیریت کاربران توسعه‌یافته

## هدف Epic

گروه‌بندی Staff و ثبت/نمایش لاگ ورود برای audit و امنیت.

## Tasks

| ID | فایل | عنوان | Depends | Priority |
|----|------|--------|---------|----------|
| IFP-157 | [IFP-TASK-157-prisma-staff-group-schema.md](./IFP-TASK-157-prisma-staff-group-schema.md) | Prisma — StaffGroup و StaffGroupMember | IFP-001, Phase-0 TASK-020 | P0 |
| IFP-158 | [IFP-TASK-158-usecase-staff-groups-crud-api.md](./IFP-TASK-158-usecase-staff-groups-crud-api.md) | Use Case + API — Staff Groups CRUD | IFP-157 | P0 |
| IFP-159 | [IFP-TASK-159-prisma-staff-login-log-schema.md](./IFP-TASK-159-prisma-staff-login-log-schema.md) | Prisma — StaffLoginLog (append-only) | IFP-001, Phase-0 TASK-019a | P0 |
| IFP-160 | [IFP-TASK-160-usecase-api-staff-login-log.md](./IFP-TASK-160-usecase-api-staff-login-log.md) | Use Case + API — Staff Login Log List | IFP-159, IFP-001 | P0 |


## Dependency داخلی Epic

Tasks به ترتیب جدول برای Depends زنجیره‌ای داخل epic رعایت شده است.

## Policy notes

- Soft delete روی StaffGroup؛ StaffLoginLog append-only.
- EXCELLENCE-STANDARDS · SOFT-DELETE-POLICY · ADR-004/005/013/015/017

## مراجع

- `docs/01-product/installment-module-features.md`
- `docs/09-development/PHASE_EPIC_TASK_AUTHORING_RULES.md`
