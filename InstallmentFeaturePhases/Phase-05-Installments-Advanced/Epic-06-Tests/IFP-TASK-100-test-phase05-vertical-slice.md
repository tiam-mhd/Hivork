# IFP-TASK-100: Integration + E2E — Vertical Slice فاز ۰۵

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 05 — Installments Advanced |
| Epic | Epic-06-Tests |
| ID | IFP-TASK-100 |
| Priority | P0 |
| Depends on | IFP-TASK-080, IFP-TASK-081, IFP-TASK-082, IFP-TASK-083, IFP-TASK-084, IFP-TASK-085, IFP-TASK-086, IFP-TASK-087, IFP-TASK-088, IFP-TASK-089, IFP-TASK-090, IFP-TASK-091, IFP-TASK-092, IFP-TASK-093, IFP-TASK-094, IFP-TASK-095, IFP-TASK-096, IFP-TASK-097, IFP-TASK-098, IFP-TASK-099 |
| Blocks | IFP Phase-06 (101+) |
| Estimated | 10h |

---

## هدف

**Vertical slice test** end-to-end فاز ۰۵ — از عملیات قسط تا ثبت/تأیید پرداخت، رسید، و تعدیلات — با Testcontainers PG، RBAC allow/deny، cross-tenant isolation و regression مالی.

---

## معیار پذیرش

- [ ] Test suite `phase05-vertical-slice.integration.spec.ts`
- [ ] Scenario A: reschedule → record cash → confirm → receipt PDF
- [ ] Scenario B: merge installments → split → amount conservation assert
- [ ] Scenario C: overdue → penalty → discount → partial pay → confirm
- [ ] Scenario D: waive with pending payment rejection
- [ ] Scenario E: confirm → void → installment reverted
- [ ] Cross-tenant: staff A cannot access tenant B installment → 404
- [ ] RBAC: each sensitive endpoint deny without permission
- [ ] CI job includes suite; grep no `prisma.*.delete(` on business models
- [ ] All scenarios pass in < 120s total

---

## مشخصات فنی

### Test harness

```typescript
// packages/application/test/phase05-vertical-slice.integration.spec.ts
// Uses: Testcontainers PostgreSQL, seed tenant A + B, staff with roles
```

### Scenario A steps

```
1. Create sale + 3 installments (seed helper)
2. POST reschedule installment[0]
3. POST record cash payment
4. POST confirm payment
5. GET receipt/pdf → 200, content-type pdf
6. Assert installment[0].status === 'paid'
7. Assert audit logs: installment.reschedule, payment.report, payment.confirm
```

### Scenario B (financial regression)

```
1. Merge installments 1+2 → assert sum(amountRial) unchanged
2. Split merged → assert sum equals pre-merge total
3. bigint assert: totalBefore === totalAfter
```

### RBAC matrix (sample)

| Endpoint | Permission | Deny test |
|----------|------------|-------------|
| POST .../reschedule | installments.installment.reschedule | 403 |
| POST .../confirm | installments.payment.confirm | 403 |
| POST .../waive | installments.installment.waive | 403 |

### CI configuration

```yaml
# .github/workflows/test.yml addition
- name: Phase 05 vertical slice
  run: pnpm --filter @hivork/application test:integration -- phase05-vertical-slice
```

### Hard delete guard

```bash
# scripts/ci/check-no-hard-delete.sh
rg 'prisma\.\w+\.delete\(' packages/ apps/ --glob '!*.spec.ts' && exit 1 || exit 0
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/test/phase05-vertical-slice.integration.spec.ts` |
| Create | `packages/application/test/helpers/phase05-seed.helper.ts` |
| Update | `.github/workflows/test.yml` |
| Update | `package.json` scripts — `test:integration:phase05` |

---

## مراحل پیاده‌سازی

1. Seed helper — sale, installments, staff, permissions
2. Implement scenarios A–E sequentially in one describe block
3. RBAC deny subtests
4. Cross-tenant subtests
5. Wire CI + document in Phase README exit criteria

---

## Edge Cases & Errors

| سناریو | Test assertion |
|--------|----------------|
| Idempotent cash record | same Idempotency-Key → same attempt id |
| Version conflict | second reschedule with stale version → 409 |
| Void window expired | mock date → 403 |

---

## تست

- [ ] Integration: Scenario A pass
- [ ] Integration: Scenario B amount conservation
- [ ] Integration: Scenario C penalty/discount
- [ ] Integration: Scenario D waive
- [ ] Integration: Scenario E void
- [ ] Integration: cross-tenant deny
- [ ] Integration: RBAC deny matrix (≥6 endpoints)
- [ ] CI: suite green on PR

---

## UX

N/A — test task.

---

## Flow

```
CI PR → spin PG container → migrate → seed → run scenarios → teardown
Local: pnpm test:integration:phase05
```

---

## Policy Alignment

- [ ] Testcontainers per DEVELOPMENT_RULES
- [ ] Financial regression before merge
- [ ] Cross-tenant must fail
- [ ] No hard delete in implementation under test

---

## مراجع

- `docs/06-operations/testing-observability.md`
- `docs/09-development/DEVELOPMENT_RULES.md` — Definition of Done
- Phase-05 README Exit Criteria

---

## Self-Review Score

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata | 10 | 10 | ✓ |
| Completeness | 25 | 25 | 5 scenarios |
| Policy | 25 | 25 | RBAC + tenant |
| Executability | 25 | 25 | CI wired |
| Alignment | 15 | 15 | exit criteria |
| **جمع** | **100** | **100** | ≥95 ✅ |
