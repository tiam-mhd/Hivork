# Epic-02 — Payment Recording

## هدف Epic

ثبت پرداخت با **تمام روش‌ها**: دستی/نقدی، بانکی/حواله/انتقال، آنلاین، کارتخوان (POS)، چک (لینک به Check)، و هزینه (fee) — همه با PaymentAttempt `pending` و contracts یکپارچه.

## Tasks

| ID | فایل | عنوان | Depends | Priority |
|----|------|--------|---------|----------|
| IFP-086 | [IFP-TASK-086-contracts-payment-recording.md](./IFP-TASK-086-contracts-payment-recording.md) | Contracts — DTOهای ثبت پرداخت | Phase-1 TASK-069 | P0 |
| IFP-087 | [IFP-TASK-087-usecase-record-cash-manual-payment.md](./IFP-TASK-087-usecase-record-cash-manual-payment.md) | Use Case + API — نقدی/دستی | IFP-086, IFP-079 | P0 |
| IFP-088 | [IFP-TASK-088-usecase-record-bank-transfer-payment.md](./IFP-TASK-088-usecase-record-bank-transfer-payment.md) | Use Case + API — بانکی/حواله | IFP-086 | P0 |
| IFP-089 | [IFP-TASK-089-usecase-record-online-payment.md](./IFP-TASK-089-usecase-record-online-payment.md) | Use Case + API — آنلاین | IFP-086 | P0 |
| IFP-090 | [IFP-TASK-090-usecase-record-pos-payment.md](./IFP-TASK-090-usecase-record-pos-payment.md) | Use Case + API — کارتخوان | IFP-086 | P0 |
| IFP-091 | [IFP-TASK-091-usecase-record-check-fee-payment.md](./IFP-TASK-091-usecase-record-check-fee-payment.md) | Use Case + API — چک + هزینه | IFP-086 | P0 |

## Dependency داخلی Epic

```
IFP-086 (contracts)
  ├── IFP-087 cash/manual
  ├── IFP-088 bank/transfer
  ├── IFP-089 online
  ├── IFP-090 POS
  └── IFP-091 check + fee
```

## Policy notes

- POST مالی: idempotency key (`Idempotency-Key` header)
- `amountRial` string در JSON — bigint
- Audit: `payment.report` برای هر ثبت
- قسط paid/waived → `INSTALLMENT_ALREADY_PAID`
