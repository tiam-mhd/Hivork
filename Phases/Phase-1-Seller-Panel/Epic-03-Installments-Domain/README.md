# Epic-03 — Installments Domain

## هدف Epic

Entityهای pure TypeScript برای `Sale`، `Installment`، `PaymentAttempt` با state transitions، BR-005 algorithm، domain errors — بدون import Prisma/NestJS.

---

## Tasks

| ID | فایل | عنوان | Depends | Priority |
|----|------|--------|---------|----------|
| TASK-065 | [TASK-065-domain-sale-entity.md](./TASK-065-domain-sale-entity.md) | Domain Entity — Sale | TASK-064 | P0 |
| TASK-066 | [TASK-066-domain-installment-entity.md](./TASK-066-domain-installment-entity.md) | Domain Entity — Installment | TASK-064 | P0 |
| TASK-067 | [TASK-067-domain-payment-attempt-entity.md](./TASK-067-domain-payment-attempt-entity.md) | Domain Entity — PaymentAttempt | TASK-064, TASK-066 | P0 |

---

## Dependency داخلی Epic

```
TASK-064 (migration)
    │
    ├──────────────┬──────────────┐
    ▼              ▼              │
TASK-065      TASK-066            │
(Sale)        (Installment)       │
    │              │              │
    └──────┬───────┘              │
           ▼                      │
      TASK-067 (PaymentAttempt) ◄─┘
           │
           ▼
    Epic-04 Contracts
```

> TASK-065 و TASK-066 می‌توانند **موازی** بعد از TASK-064 اجرا شوند.

---

## Policy notes

- Transitions **فقط** در entity methods — `state-machines.md`
- Installment paid/waived: **terminal** — `INSTALLMENT_CANNOT_DELETE`
- Sale.createInstallments(): BR-005 BigInt algorithm
- Unit tests اجباری برای هر invariant

---

## مراجع

- `docs/03-modules/installments/state-machines.md`
- `docs/03-modules/installments/BUSINESS-RULES.md` — BR-001 تا BR-047
- `docs/09-development/ERROR-CODES.md`
