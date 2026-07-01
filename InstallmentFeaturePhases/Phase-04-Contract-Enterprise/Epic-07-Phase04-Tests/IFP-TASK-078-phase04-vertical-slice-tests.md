# IFP-TASK-078: Phase 04 — Vertical Slice Integration & E2E Tests

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 04 — Contract Enterprise |
| Epic | Epic-07-Phase04-Tests |
| ID | IFP-TASK-078 |
| Priority | P0 |
| Depends on | IFP-TASK-055 through IFP-TASK-077 |
| Blocks | IFP Phase 05 (recommended gate) |
| Estimated | 10h |

---

## هدف

**Integration + E2E vertical slice** فاز ۴: قرارداد Enterprise کامل از schema تا UI — lifecycle، guarantor/collateral، financials، settings §۱۵ — با RBAC و cross-tenant guards.

---

## معیار پذیرش

- [ ] Test suite `phase04-contract-enterprise.spec.ts` (API integration — Testcontainers)
- [ ] E2E `phase04-contract-e2e.spec.ts` (Playwright — optional stub if web CI not ready)
- [ ] Scenario A: create sale → add line items → recalculate → add guarantor → attach file metadata
- [ ] Scenario B: extend → terminate → close → archive lifecycle
- [ ] Scenario C: copy contract → new contractNumber → lineage verified
- [ ] Scenario D: PATCH enterprise settings → GET reflects penalty/rounding/numbering
- [ ] RBAC: deny terminate without permission; allow with permission
- [ ] Cross-tenant: tenant B cannot access tenant A sale/guarantor/settings
- [ ] CI job includes: lint, typecheck, prisma validate, hard-delete grep
- [ ] All scenarios pass in CI

---

## مشخصات فنی

### Integration scenario outline (API)

```typescript
describe('Phase 04 Contract Enterprise', () => {
  it('financials: line items sum matches total after recalculate', async () => { ... });
  it('lifecycle: active → terminated → closed → archived', async () => { ... });
  it('copy: copiedFromSaleId set + unique contractNumber', async () => { ... });
  it('guarantor: external person + soft delete', async () => { ... });
  it('settings: penalty_rate_bps patch + audit log', async () => { ... });
  it('rbac: installments.sale.terminate denied', async () => { ... });
  it('cross-tenant: GET sale 404', async () => { ... });
});
```

### E2E scenario (Playwright)

```
1. Login staff tenant A
2. Open contract detail
3. Add line item row → save
4. Open settings → set penalty percent → save
5. Actions → archive (if terminal) — smoke
```

### CI guards (Infrastructure)

```bash
pnpm prisma validate
rg 'prisma\.\w+\.delete\(' packages/ apps/ --glob '!*.spec.ts' && exit 1 || true
pnpm test --filter phase04
```

### Test data seed

- Tenant A: staff with full installments permissions
- Tenant B: staff for cross-tenant
- Role without `installments.sale.terminate`

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/api/test/integration/phase04-contract-enterprise.spec.ts` |
| Create | `apps/web/e2e/phase04-contract-e2e.spec.ts` |
| Update | `.github/workflows/ci.yml` — phase04 test job if split |
| Update | `docs/06-operations/testing-observability.md` — Phase 04 slice |

---

## مراحل پیاده‌سازی

1. Scaffold integration test with Testcontainers PG + Redis
2. Implement scenarios A–D
3. RBAC + cross-tenant cases
4. Playwright E2E smoke (or mark skip with issue if no web in CI)
5. Wire CI
6. Document in testing-observability.md

---

## Edge Cases & Errors

| سناریو | Assertion |
|--------|-----------|
| Recalculate version conflict | 409 |
| Archive from active | 409 |
| Guarantor without identity | 400 |
| PATCH readonly sequence | 400 |
| Soft delete sale with paid | 409 |

---

## تست

- [ ] All integration scenarios green
- [ ] E2E smoke green or documented skip
- [ ] CI pipeline green on PR
- [ ] Hard-delete grep zero hits on business models

---

## UX

N/A — test task.

---

## Flow

```
CI: push → testcontainers up → migrate → seed roles → run phase04 suite
```

---

## Policy Alignment

- [ ] `.cursor/rules/06-testing-quality.mdc` — integration for use cases
- [ ] RBAC allow + deny + cross-tenant
- [ ] SOFT-DELETE-POLICY regression tests
- [ ] No `prisma.*.delete()` in implementation

---

## مراجع

- All IFP-055–077 tasks
- Phase 1 `TASK-123-vertical-slice-phase1-e2e.md`
- `docs/06-operations/testing-observability.md`
- `docs/09-development/CODE-REVIEW-GUIDE.md`

---

## Self-Review Score

| محور | سقف | امتیاز |
|------|-----|--------|
| Metadata | 10 | 10 |
| Completeness | 25 | 25 |
| Policy | 25 | 25 |
| Executability | 25 | 25 |
| Alignment | 15 | 15 |
| **جمع** | **100** | **100** |

---

## Exit Criteria contribution

When IFP-078 passes, Phase 04 exit criteria for tests and vertical slice are satisfied.
