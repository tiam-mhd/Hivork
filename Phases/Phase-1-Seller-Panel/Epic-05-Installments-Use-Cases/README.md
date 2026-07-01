# Epic-05 — Installments Use Cases

## هدف Epic

Use caseهای application layer برای فروش، لیست اقساط، و تنظیمات ماژول — با transaction، audit، outbox، RBAC، data scope، و idempotency.

---

## Tasks

| ID | فایل | عنوان | Depends | Priority |
|----|------|--------|---------|----------|
| TASK-072 | [TASK-072-usecase-create-sale.md](./TASK-072-usecase-create-sale.md) | Use Case — CreateSale | TASK-065, TASK-068, TASK-047 | P0 |
| TASK-073 | [TASK-073-usecase-cancel-sale.md](./TASK-073-usecase-cancel-sale.md) | Use Case — CancelSale | TASK-065, TASK-068 | P0 |
| TASK-074 | [TASK-074-usecase-list-get-sale.md](./TASK-074-usecase-list-get-sale.md) | Use Case — List & Get Sale | TASK-065, TASK-068 | P0 |
| TASK-075 | [TASK-075-usecase-list-installments.md](./TASK-075-usecase-list-installments.md) | Use Case — List Installments | TASK-066, TASK-069 | P0 |
| TASK-076 | [TASK-076-usecase-list-today-installments.md](./TASK-076-usecase-list-today-installments.md) | Use Case — Today Due Installments | TASK-075 | P0 |
| TASK-077 | [TASK-077-usecase-list-overdue-installments.md](./TASK-077-usecase-list-overdue-installments.md) | Use Case — Overdue Installments | TASK-075 | P0 |
| TASK-078 | [TASK-078-usecase-get-installment-settings.md](./TASK-078-usecase-get-installment-settings.md) | Use Case — Get Installment Settings | TASK-070, TASK-049 | P0 |
| TASK-079 | [TASK-079-usecase-update-installment-settings.md](./TASK-079-usecase-update-installment-settings.md) | Use Case — Update Installment Settings | TASK-078 | P0 |

---

## Dependency داخلی Epic

```
TASK-072 (CreateSale)
    │
    ├──► TASK-073 (CancelSale)
    ├──► TASK-074 (List/Get Sale)
    └──► TASK-075 (List Installments)
              │
              ├──► TASK-076 (Today)
              └──► TASK-077 (Overdue)

TASK-078 (Get Settings) ──► TASK-079 (Update Settings)
```

---

## Policy notes

- Permission guard + `@RequireModule('installments')` + `@ApplyDataScope()`
- Branch filter: `X-Branch-Id` + `canAccessBranch()` (ADR-015)
- Financial POST: `Idempotency-Key` header
- Audit: `sale.create`, `sale.cancel`, `settings.change`
- Outbox: `SaleCreated` on create

---

## مراجع

- `docs/03-modules/installments/BUSINESS-RULES.md` — BR-001 تا BR-010 (CreateSale)
- `docs/02-architecture/rbac.md`
- `docs/06-operations/security-and-audit.md`
