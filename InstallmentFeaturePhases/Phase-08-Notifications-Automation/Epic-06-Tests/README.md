# Epic-06-Tests — Phase 08 Tests

> **Phase:** 08 — Notifications & Automation  
> **وضعیت:** Ready for implementation  
> **منبع محصول:** `docs/01-product/installment-module-features.md`

---

## هدف Epic

Integration + E2E tests فاز ۸.

---

## Tasks

| ID | فایل | عنوان | Depends | Priority |
|----|------|--------|---------|----------|
| 156 | [IFP-TASK-156-phase-08-integration-e2e-tests.md](./IFP-TASK-156-phase-08-integration-e2e-tests.md) | Tests — Phase 08 Notifications & Automation | IFP-TASK-153, IFP-TASK-154, IFP-TASK-155 | P0 |

---

## Dependency Graph

```mermaid
flowchart TD
  T156[IFP-156]
```

---

## Policy Notes

| موضوع | قانون |
|-------|--------|
| Idempotency | regression on auto sends |
| Mock | external providers mocked |

---

## مراجع

- `docs/06-operations/testing-observability.md`
