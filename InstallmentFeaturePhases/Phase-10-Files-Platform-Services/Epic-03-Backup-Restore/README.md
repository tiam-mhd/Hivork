# Epic-03 — نسخه پشتیبان

## هدف Epic

Backup، Restore، دانلود، آپلود، زمان‌بندی §۲۱.

## Tasks

| ID | فایل | عنوان | Depends | Priority |
|----|------|--------|---------|----------|
| IFP-180 | [IFP-TASK-180-usecase-backup-restore-scheduler.md](./IFP-TASK-180-usecase-backup-restore-scheduler.md) | Use Case + Scheduler — Backup & Restore | IFP-172, Phase-4 TASK-150 | P0 |
| IFP-181 | [IFP-TASK-181-api-frontend-backup-restore.md](./IFP-TASK-181-api-frontend-backup-restore.md) | API + Frontend — Backup & Restore UI | IFP-180 | P0 |


## Dependency داخلی Epic

Tasks به ترتیب جدول برای Depends زنجیره‌ای داخل epic رعایت شده است.

## Policy notes

- Tenant data export JSON+files; platform admin restore.
- EXCELLENCE-STANDARDS · SOFT-DELETE-POLICY · ADR-004/005/013/015/017

## مراجع

- `docs/01-product/installment-module-features.md`
- `docs/09-development/PHASE_EPIC_TASK_AUTHORING_RULES.md`
