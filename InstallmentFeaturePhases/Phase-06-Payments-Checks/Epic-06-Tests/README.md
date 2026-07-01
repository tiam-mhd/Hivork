# Epic-06 — Tests (Phase 06)

## هدف Epic

Integration و E2E tests برای فاز ۰۶: ledger، refund، settlement، چرخه چک.

## Tasks

| ID | فایل | عنوان | Depends | Priority |
|----|------|--------|---------|----------|
| IFP-118 | [IFP-TASK-118-test-phase06-vertical-slice.md](./IFP-TASK-118-test-phase06-vertical-slice.md) | Integration + E2E — vertical slice فاز ۰۶ | IFP-101–117 | P0 |

## Dependency داخلی Epic

```
IFP-101–117 → IFP-118
```

## Policy notes

- Regression: refund amount = original
- Check bounced → installment status unchanged until new payment
- Cross-tenant isolation
