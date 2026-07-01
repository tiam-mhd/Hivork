# Epic-03 — Refund, Void, Settlement, Reconciliation

## هدف Epic

استرداد (refund)، ابطال تراکنش ledger، **تسویه** (settlement batch) و **مغایرت‌گیری** (reconciliation) — با audit و حفظ تعادل مالی.

## Tasks

| ID | فایل | عنوان | Depends | Priority |
|----|------|--------|---------|----------|
| IFP-107 | [IFP-TASK-107-usecase-refund-payment.md](./IFP-TASK-107-usecase-refund-payment.md) | Use Case + API — استرداد | IFP-105, IFP-103 | P0 |
| IFP-108 | [IFP-TASK-108-usecase-void-ledger-transaction.md](./IFP-TASK-108-usecase-void-ledger-transaction.md) | Use Case + API — ابطال تراکنش ledger | IFP-103, IFP-094 | P0 |
| IFP-109 | [IFP-TASK-109-usecase-settlement.md](./IFP-TASK-109-usecase-settlement.md) | Use Case + API — تسویه | IFP-103 | P0 |
| IFP-110 | [IFP-TASK-110-usecase-reconciliation-discrepancy.md](./IFP-TASK-110-usecase-reconciliation-discrepancy.md) | Use Case + API — مغایرت‌گیری | IFP-109 | P0 |

## Dependency داخلی Epic

```
IFP-103 → IFP-107, IFP-108, IFP-109
IFP-109 → IFP-110
```

## Policy notes

- Refund = reversing ledger entry + optional gateway callback
- Settlement batch immutable after `closed`
- Audit: `payment.refund`, `payment.void`, `settlement.create`, `reconciliation.resolve`
