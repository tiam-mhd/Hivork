# Epic-06 — Phase 01 Tests

> **Phase:** 01 — Auth & Security  
> **هدف:** Vertical slice E2E + RBAC برای کل فاز

---

## Tasks

| ID | فایل | عنوان | Depends | Priority |
|----|------|--------|---------|----------|
| IFP-018 | [IFP-TASK-018-phase01-e2e-rbac.md](./IFP-TASK-018-phase01-e2e-rbac.md) | Phase 01 vertical slice E2E + RBAC | IFP-001→017 P0 | P0 |

---

## Policy notes

- Testcontainers PostgreSQL + Redis
- Playwright for web E2E
- Vitest integration for API
- No `prisma.delete()` in test cleanup — use soft delete helpers

---

## مراجع

- [testing-observability.md](../../../docs/06-operations/testing-observability.md)
- [TASK-054](../../../Phases/Phase-0-Foundation/Epic-10-Vertical-Slice/TASK-054-vertical-slice-e2e.md) — pattern
