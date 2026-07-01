# Epic-03 — Payment Confirmation

## هدف Epic

تأیید، رد و ابطال پرداخت (PaymentAttempt state machine) و **رسید** (چاپ PDF + ارسال SMS/Bale) — با side effect روی Installment و audit اجباری.

## Tasks

| ID | فایل | عنوان | Depends | Priority |
|----|------|--------|---------|----------|
| IFP-092 | [IFP-TASK-092-usecase-confirm-payment.md](./IFP-TASK-092-usecase-confirm-payment.md) | Use Case + API — تأیید پرداخت | IFP-087–091 | P0 |
| IFP-093 | [IFP-TASK-093-usecase-reject-payment.md](./IFP-TASK-093-usecase-reject-payment.md) | Use Case + API — رد پرداخت | IFP-087–091 | P0 |
| IFP-094 | [IFP-TASK-094-usecase-void-payment.md](./IFP-TASK-094-usecase-void-payment.md) | Use Case + API — ابطال پرداخت | IFP-092 | P0 |
| IFP-095 | [IFP-TASK-095-api-receipt-print-send.md](./IFP-TASK-095-api-receipt-print-send.md) | API — چاپ و ارسال رسید | IFP-092 | P0 |

## Dependency داخلی Epic

```
IFP-087–091 (recording)
  ├── IFP-092 confirm → IFP-094 void
  ├── IFP-093 reject
  └── IFP-095 receipt (needs confirmed)
```

## Policy notes

- `confirmed` → terminal — فقط void از طریق IFP-094 با قوانین خاص
- Audit: `payment.confirm`, `payment.reject`, `payment.void`
- Permission: `installments.payment.confirm`, `installments.payment.reject`, `installments.payment.void`
