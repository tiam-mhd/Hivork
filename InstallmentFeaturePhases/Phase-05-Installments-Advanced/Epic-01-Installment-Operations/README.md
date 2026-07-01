# Epic-01 — Installment Operations

## هدف Epic

قوانین دامنه و use caseهای **عملیات پیشرفته اقساط**: جابجایی تاریخ (reschedule)، تعویق (defer)، تعجیل (accelerate)، بازتولید اقساط (regenerate)، ادغام (merge) و تقسیم قسط (split) — با audit، version conflict و رعایت state machine.

## Tasks

| ID | فایل | عنوان | Depends | Priority |
|----|------|--------|---------|----------|
| IFP-079 | [IFP-TASK-079-domain-installment-operations-rules.md](./IFP-TASK-079-domain-installment-operations-rules.md) | Domain — قوانین عملیات اقساط | Phase-1 TASK-066, IFP-055+ | P0 |
| IFP-080 | [IFP-TASK-080-usecase-reschedule-installment.md](./IFP-TASK-080-usecase-reschedule-installment.md) | Use Case + API — جابجایی تاریخ قسط | IFP-079 | P0 |
| IFP-081 | [IFP-TASK-081-usecase-defer-installment.md](./IFP-TASK-081-usecase-defer-installment.md) | Use Case + API — تعویق قسط | IFP-079 | P0 |
| IFP-082 | [IFP-TASK-082-usecase-accelerate-installment.md](./IFP-TASK-082-usecase-accelerate-installment.md) | Use Case + API — تعجیل قسط | IFP-079 | P0 |
| IFP-083 | [IFP-TASK-083-usecase-regenerate-installments.md](./IFP-TASK-083-usecase-regenerate-installments.md) | Use Case + API — بازتولید اقساط | IFP-079 | P0 |
| IFP-084 | [IFP-TASK-084-usecase-merge-installments.md](./IFP-TASK-084-usecase-merge-installments.md) | Use Case + API — ادغام اقساط | IFP-079 | P0 |
| IFP-085 | [IFP-TASK-085-usecase-split-installment.md](./IFP-TASK-085-usecase-split-installment.md) | Use Case + API — تقسیم قسط | IFP-079 | P0 |

## Dependency داخلی Epic

```
IFP-079 (domain)
  ├── IFP-080 reschedule
  ├── IFP-081 defer
  ├── IFP-082 accelerate
  ├── IFP-083 regenerate
  ├── IFP-084 merge
  └── IFP-085 split
```

## Policy notes

- قسط `paid` / `waived` → عملیات ممنوع (`INSTALLMENT_STATUS_INVALID`)
- Soft delete فقط — `InstallmentOperationLog` append-only برای تاریخچه
- ADR-015: scope از طریق `Sale.branchId`
- مبالغ: `bigint` ریال — جمع قبل/بعد باید حفظ شود (merge/split/regenerate)
