# Epic-01 — مدیریت فایل

## هدف Epic

تصاویر، اسناد، دسته‌بندی، جستجو — tenant-scoped storage.

## Tasks

| ID | فایل | عنوان | Depends | Priority |
|----|------|--------|---------|----------|
| IFP-172 | [IFP-TASK-172-prisma-file-asset-schema.md](./IFP-TASK-172-prisma-file-asset-schema.md) | Prisma — FileAsset & FileCategory | Phase-0 TASK-018 | P0 |
| IFP-173 | [IFP-TASK-173-infrastructure-file-storage-service.md](./IFP-TASK-173-infrastructure-file-storage-service.md) | Infrastructure — File Storage Service (S3/local) | IFP-172 | P0 |
| IFP-174 | [IFP-TASK-174-usecase-file-crud-categories-search.md](./IFP-TASK-174-usecase-file-crud-categories-search.md) | Use Case — File CRUD, Categories, Search | IFP-173 | P0 |
| IFP-175 | [IFP-TASK-175-api-files-controller-contracts.md](./IFP-TASK-175-api-files-controller-contracts.md) | API + Contracts — Files | IFP-174 | P0 |
| IFP-176 | [IFP-TASK-176-frontend-file-management-ui.md](./IFP-TASK-176-frontend-file-management-ui.md) | Frontend — File Management UI | IFP-175, IFP-002 | P0 |


## Dependency داخلی Epic

Tasks به ترتیب جدول برای Depends زنجیره‌ای داخل epic رعایت شده است.

## Policy notes

- Soft delete FileAsset; virus scan hook P1.
- EXCELLENCE-STANDARDS · SOFT-DELETE-POLICY · ADR-004/005/013/015/017

## مراجع

- `docs/01-product/installment-module-features.md`
- `docs/09-development/PHASE_EPIC_TASK_AUTHORING_RULES.md`
