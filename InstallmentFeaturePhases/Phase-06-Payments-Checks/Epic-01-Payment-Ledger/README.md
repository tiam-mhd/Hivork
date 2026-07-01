# Epic-01 — Payment Ledger

## هدف Epic

Schema **دفتر پرداخت یکپارچه** (`PaymentLedgerEntry`) برای تمام تراکنش‌ها و API لیست cursor-paginated با فیلتر روش، وضعیت، مشتری و بازه تاریخ.

## Tasks

| ID | فایل | عنوان | Depends | Priority |
|----|------|--------|---------|----------|
| IFP-101 | [IFP-TASK-101-prisma-payment-ledger.md](./IFP-TASK-101-prisma-payment-ledger.md) | Prisma — PaymentLedgerEntry schema | IFP-086–094 | P0 |
| IFP-102 | [IFP-TASK-102-domain-payment-ledger-entity.md](./IFP-TASK-102-domain-payment-ledger-entity.md) | Domain — PaymentLedger entity | IFP-101 | P0 |
| IFP-103 | [IFP-TASK-103-usecase-list-payment-transactions.md](./IFP-TASK-103-usecase-list-payment-transactions.md) | Use Case + API — لیست تمام تراکنش‌ها | IFP-102 | P0 |

## Dependency داخلی Epic

```
IFP-101 → IFP-102 → IFP-103
```

## Policy notes

- Base fields + `tenantId` + indexes `(tenantId, status)`, `(tenantId, occurredAt)`
- `onDelete: Restrict` — soft delete only
- Append-only ledger semantics — void = reversing entry نه hard delete
