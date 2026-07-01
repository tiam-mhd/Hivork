# Epic-01 — اسکیمای حسابداری

## هدف Epic

صندوق، بانک، سند حسابداری — schema و invariants §۱۸.

## Tasks

| ID | فایل | عنوان | Depends | Priority |
|----|------|--------|---------|----------|
| IFP-188 | [IFP-TASK-188-prisma-chart-of-accounts-cash-bank.md](./IFP-TASK-188-prisma-chart-of-accounts-cash-bank.md) | Prisma — Chart of Accounts, Cash & Bank | IFP-168, Phase-0 TASK-018 | P0 |
| IFP-189 | [IFP-TASK-189-prisma-journal-entry-lines-schema.md](./IFP-TASK-189-prisma-journal-entry-lines-schema.md) | Prisma — JournalEntry & JournalLine | IFP-188 | P0 |
| IFP-190 | [IFP-TASK-190-domain-accounting-invariants.md](./IFP-TASK-190-domain-accounting-invariants.md) | Domain — Accounting Invariants & Rules | IFP-189 | P0 |


## Dependency داخلی Epic

Tasks به ترتیب جدول برای Depends زنجیره‌ای داخل epic رعایت شده است.

## Policy notes

- bigint Rial; journal balanced; soft delete accounts inactive only.
- EXCELLENCE-STANDARDS · SOFT-DELETE-POLICY · ADR-004/005/013/015/017

## مراجع

- `docs/01-product/installment-module-features.md`
- `docs/09-development/PHASE_EPIC_TASK_AUTHORING_RULES.md`
