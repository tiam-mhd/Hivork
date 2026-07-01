# IFP-TASK-138: Tests — Phase 07 Dashboard, Reports, Calendar

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 07 � Dashboard, Reports & Calendar |
| Epic | Epic-08-Tests |
| ID | IFP-TASK-138 |
| Priority | P0 |
| Depends on | IFP-TASK-135, IFP-TASK-136, IFP-TASK-137 |
| Blocks | IFP-TASK-139 |
| Estimated | 10h |

---

## هدف

Integration و E2E tests برای فاز ۷ — dashboard KPIs، reports export، calendar.

---

## معیار پذیرش

- [ ] Integration: all dashboard/report/calendar APIs RBAC
- [ ] Cross-tenant fail tests
- [ ] E2E: login → dashboard → report export → calendar
- [ ] Regression: bigint sum invariants in reports

---

## مشخصات فنی

### Test Matrix

| Area | Integration | E2E |
| Dashboard KPIs | ✓ | ✓ |
| Charts/Widgets | ✓ | ✓ |
| 10 report types | ✓ | sample |
| Export excel/pdf | ✓ | ✓ |
| Calendar | ✓ | ✓ |

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/api/test/integration/dashboard/` |
| Create | `apps/api/test/integration/reports/` |
| Create | `apps/web/e2e/phase-07-dashboard.spec.ts` |

---

## مراحل پیاده‌سازی

1. Integration test suite
2. E2E Playwright spec
3. CI job inclusion

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Flaky E2E | — | retry + stable selectors |

---

## تست

- [ ] All integration tests pass
- [ ] E2E vertical slice pass

---

## Policy Alignment

- [ ] docs/06-operations/testing-observability.md
- [ ] Cross-tenant must fail

---

## مراجع

- `docs/09-development/PHASE_EPIC_TASK_AUTHORING_RULES.md`

---

## Self-Review Score

> مبنا: `docs/09-development/PHASE_EPIC_TASK_AUTHORING_RULES.md` §10

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata (ID, Priority, Depends, Blocks, Estimate) | /10 | 10 | Complete |
| Completeness (criteria, spec بدون TODO، files table) | /25 | 25 | Measurable AC |
| Policy (EXCELLENCE §8، soft delete، ADR cited) | /25 | 25 | Policies cited |
| Executability (edge cases، tests، dev بدون سؤال) | /25 | 24 | Edge cases + tests |
| Alignment (sync docs، contracts، Epic README) | /15 | 14 | Epic sync |
| **جمع** | **/100** | **98** | ≥95 required برای Ready |
