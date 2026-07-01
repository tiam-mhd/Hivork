# Epic-03 — تنظیمات فروشگاه — Schema & API

## هدف Epic

توسعه settings schema برای پروفایل فروشنده، مالی، درگاه، مالیات، ساعت کاری — ADR-005.

## Tasks

| ID | فایل | عنوان | Depends | Priority |
|----|------|--------|---------|----------|
| IFP-166 | [IFP-TASK-166-settings-schema-store-profile.md](./IFP-TASK-166-settings-schema-store-profile.md) | Settings Schema — Store Profile (seller, logo, contact) | Phase-0 TASK-048, ADR-005 | P0 |
| IFP-167 | [IFP-TASK-167-settings-schema-financial-payment-tax-hours.md](./IFP-TASK-167-settings-schema-financial-payment-tax-hours.md) | Settings Schema — Financial, Gateway, Tax, Business Hours | IFP-166, Phase-1 payment settings | P0 |
| IFP-169 | [IFP-TASK-169-contracts-store-settings-zod.md](./IFP-TASK-169-contracts-store-settings-zod.md) | Contracts — Store Settings Zod Schemas | IFP-166, IFP-167 | P0 |
| IFP-168 | [IFP-TASK-168-usecase-api-store-settings.md](./IFP-TASK-168-usecase-api-store-settings.md) | Use Case + API — Store Settings | IFP-166, IFP-167, IFP-169 | P0 |


## Dependency داخلی Epic

Tasks به ترتیب جدول برای Depends زنجیره‌ای داخل epic رعایت شده است.

## Policy notes

- Typed schema only — invariants in domain.
- EXCELLENCE-STANDARDS · SOFT-DELETE-POLICY · ADR-004/005/013/015/017

## مراجع

- `docs/01-product/installment-module-features.md`
- `docs/09-development/PHASE_EPIC_TASK_AUTHORING_RULES.md`
