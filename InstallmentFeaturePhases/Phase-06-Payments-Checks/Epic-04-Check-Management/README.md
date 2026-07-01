# Epic-04 — Check Management

## هدف Epic

چرخه کامل **چک**: ثبت دریافتی/پرداختی، سررسید، برگشتی، وصول، انتقال، تصویر چک، بانک و پیگیری.

## Tasks

| ID | فایل | عنوان | Depends | Priority |
|----|------|--------|---------|----------|
| IFP-111 | [IFP-TASK-111-prisma-check-schema.md](./IFP-TASK-111-prisma-check-schema.md) | Prisma — Check schema | IFP-101 | P0 |
| IFP-112 | [IFP-TASK-112-domain-check-entity-state-machine.md](./IFP-TASK-112-domain-check-entity-state-machine.md) | Domain — Check entity + state machine | IFP-111 | P0 |
| IFP-113 | [IFP-TASK-113-usecase-register-received-check.md](./IFP-TASK-113-usecase-register-received-check.md) | Use Case + API — چک دریافتی | IFP-112 | P0 |
| IFP-114 | [IFP-TASK-114-usecase-register-payable-bounced-check.md](./IFP-TASK-114-usecase-register-payable-bounced-check.md) | Use Case + API — پرداختی + برگشتی | IFP-112 | P0 |
| IFP-115 | [IFP-TASK-115-usecase-collect-transfer-check.md](./IFP-TASK-115-usecase-collect-transfer-check.md) | Use Case + API — وصول + انتقال | IFP-113, IFP-114 | P0 |
| IFP-116 | [IFP-TASK-116-api-check-tracking-image.md](./IFP-TASK-116-api-check-tracking-image.md) | API — پیگیری + تصویر چک | IFP-115 | P0 |

## Dependency داخلی Epic

```
IFP-111 → IFP-112 → IFP-113, IFP-114 → IFP-115 → IFP-116
```

## Policy notes

- Check status: `registered`, `due`, `collected`, `bounced`, `transferred`, `cancelled`
- لینک به PaymentLedgerEntry و PaymentAttempt
- تصویر چک: File service (IFP Phase-10) — stub acceptable در این فاز
