# Epic-07 — Phase 04 Tests

> **Phase:** 04 — Contract Enterprise  
> **تسک‌ها:** IFP-078  
> **Priority:** P0

---

## هدف Epic

**Integration + vertical slice** برای فاز ۴: lifecycle، guarantor/collateral، financials، settings enterprise — با RBAC و cross-tenant guards.

---

## Tasks

| ID | فایل | عنوان | Depends | Priority |
|----|------|--------|---------|----------|
| IFP-078 | [IFP-TASK-078-phase04-vertical-slice-tests.md](./IFP-TASK-078-phase04-vertical-slice-tests.md) | Integration + E2E — Phase 04 vertical slice | IFP-064–077 | P0 |

---

## Dependency داخلی Epic

```
IFP-055 → ... → IFP-077
                    │
                    ▼
                 IFP-078
```

---

## Policy notes

- Testcontainers PostgreSQL
- Financial regression: sum invariant بعد از line items
- RBAC: allow + deny + cross-tenant fail
- CI: prisma validate + hard-delete grep

---

*Epic-07 — Phase 04*
