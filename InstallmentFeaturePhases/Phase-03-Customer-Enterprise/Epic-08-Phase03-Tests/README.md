# Epic-08 — Phase03 Tests

> **Phase:** IFP-03 Customer Enterprise  
> **وضعیت:** Ready for implementation  
> **ADR:** ADR-002, ADR-013, ADR-015

---

## هدف Epic

Vertical slice tests فاز ۳: E2E merge مشتری با audit trail، و integration cross-tenant fail روی عملیات حساس مشتری.

---

## Tasks

| ID | فایل | عنوان | Depends | Priority |
|----|------|--------|---------|----------|
| IFP-054 | [IFP-TASK-054-customer-merge-e2e-cross-tenant.md](./IFP-TASK-054-customer-merge-e2e-cross-tenant.md) | Customer merge E2E + cross-tenant fail | IFP-050, IFP-053, IFP-040 | P0 |

---

## Policy Notes

| موضوع | قانون |
|-------|--------|
| Testcontainers | PostgreSQL real — نه mock DB |
| Cross-tenant | list/get/update/merge با tenant B token → 404 یا 403 |
| E2E | Playwright یا supertest chain — merge + verify sales count |

---

## مراجع

- `docs/06-operations/testing-observability.md`
- `.cursor/rules/06-testing-quality.mdc`
