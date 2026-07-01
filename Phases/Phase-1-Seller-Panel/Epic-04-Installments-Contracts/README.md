# Epic-04 — Installments Contracts

## هدف Epic

Zod schemas در `packages/contracts` برای Sale، Installment، Payment، Settings، و Customer extended — 100% هم‌تراز با `api-contracts.md` و EXCELLENCE §8.

---

## Tasks

| ID | فایل | عنوان | Depends | Priority |
|----|------|--------|---------|----------|
| TASK-068 | [TASK-068-contracts-sale.md](./TASK-068-contracts-sale.md) | Contracts — Sale | TASK-065 | P0 |
| TASK-069 | [TASK-069-contracts-installment-payment.md](./TASK-069-contracts-installment-payment.md) | Contracts — Installment & Payment | TASK-066, TASK-067 | P0 |
| TASK-070 | [TASK-070-contracts-installments-settings.md](./TASK-070-contracts-installments-settings.md) | Contracts — Installments Settings | TASK-060 | P0 |
| TASK-071 | [TASK-071-contracts-customer-extended.md](./TASK-071-contracts-customer-extended.md) | Contracts — Customer Extended | TASK-051 | P0 |

---

## Dependency داخلی Epic

```
TASK-065 ──► TASK-068
TASK-066 ──┐
TASK-067 ──┴──► TASK-069
TASK-060 ──► TASK-070
TASK-051 ──► TASK-071
         │
         ▼
   Epic-05 Use Cases
```

---

## Policy notes

- `bigint` → `string` در JSON (Zod `.transform` / schema pattern)
- `phoneSchema` از `@hivork/contracts/shared`
- Response fields شامل EXCELLENCE §8 (creditScore، tags، …)
- List responses: cursor pagination meta

---

## مراجع

- `docs/02-architecture/api-contracts.md` §۵
- `docs/09-development/EXCELLENCE-STANDARDS.md` §8
