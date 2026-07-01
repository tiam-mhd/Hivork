# Epic-06 — Tests (Phase 05)

## هدف Epic

Vertical slice و integration tests برای فاز ۰۵: عملیات قسط → ثبت پرداخت → تأیید → تعدیلات.

## Tasks

| ID | فایل | عنوان | Depends | Priority |
|----|------|--------|---------|----------|
| IFP-100 | [IFP-TASK-100-test-phase05-vertical-slice.md](./IFP-TASK-100-test-phase05-vertical-slice.md) | Integration + E2E — vertical slice فاز ۰۵ | IFP-080–099 | P0 |

## Dependency داخلی Epic

```
IFP-080–099 → IFP-100
```

## Policy notes

- Testcontainers PostgreSQL
- Cross-tenant deny test
- RBAC allow + deny per endpoint
- Financial regression: merge/split amount conservation
