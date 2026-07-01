# TASK-174: Vertical Slice — Phase 4 E2E

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 4 |
| Epic | Epic-15-Phase4-Vertical-Slice |
| ID | TASK-174 |
| Priority | P0 |
| Depends on | TASK-169, TASK-170, TASK-171, TASK-172, TASK-173, TASK-165, TASK-148, TASK-157 |
| Blocks | — |
| Estimated | 8h |

---

## هدف

E2E vertical slice فاز ۴ — ثبت‌نام → لینک بله → یادآور → پرداخت گزارش شد.

---

## معیار پذیرش

- [ ] HTTP E2E script یا Playwright covering full flow
- [ ] Tenant register from marketing site
- [ ] Seller generates bot link → customer /start link_*
- [ ] Customer sees installments → report payment
- [ ] Scheduler sends reminder (mock Bale)
- [ ] Seller receives payment alert
- [ ] Channel settings saved
- [ ] Document in Phase README exit criteria

---

## مشخصات فنی

### E2E scenarios

```
1. POST register + verify OTP → tenant exists
2. Login seller → create sale + customer
3. POST /bot/link-token → deep link
4. Simulate webhook /start link_{token}
5. Simulate webhook installments list
6. Simulate callback report_payment
7. Run scheduler jobs → notification log sent
8. Assert seller alert queued
```

### Mocks

- Bale HTTP mocked — no real API calls in CI
- Redis + PG Testcontainers

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/api/test/e2e/phase4-vertical-slice.spec.ts` |
| Update | `Phases/Phase-4-Bale-Marketing/README.md` |

---

## مراحل پیاده‌سازی

1. Compose fixtures
2. Implement scenario steps
3. CI workflow hook
4. Update exit criteria checklist

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Bale 429 in flow | — | retry does not break E2E |
| Partial step failure | — | clear error artifact |

---

## تست

- [ ] E2E: full vertical slice
- [ ] CI: run on main PR

---

## Flow (if applicable)

Register → Panel → Link bot → Customer installments → Report payment → Reminder → Seller alert → ✅

---

## Policy Alignment

- [ ] Phase 4 exit criteria
- [ ] No business logic in controllers
- [ ] All P0 tasks integrated

---

## مراجع

- `Phases/Phase-4-Bale-Marketing/README.md`
- `docs/07-roadmap/operational-phases.md`

---

## Self-Review Score

> مبنا: `docs/09-development/PHASE_EPIC_TASK_AUTHORING_RULES.md` §10

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata (ID, Priority, Depends, Blocks, Estimate) | /10 | 10 | Complete |
| Completeness (criteria, spec بدون TODO، files table) | /25 | 25 | Measurable AC |
| Policy (EXCELLENCE §8، soft delete، ADR cited) | /25 | 25 | Policies cited |
| Executability (edge cases، tests، dev بدون سؤال) | /25 | 24 | Edge cases + tests |
| Alignment (sync docs، contracts، Epic README) | /15 | 13 | Phase 4 sync |
| **جمع** | **/100** | **97** | ≥95 required برای Ready |
