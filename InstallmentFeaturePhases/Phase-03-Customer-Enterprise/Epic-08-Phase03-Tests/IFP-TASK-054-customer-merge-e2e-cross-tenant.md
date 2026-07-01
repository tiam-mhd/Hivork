# IFP-TASK-054: Customer Merge E2E + Cross-Tenant Fail Test

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | IFP-03 Customer Enterprise |
| Epic | Epic-08-Phase03-Tests |
| ID | IFP-054 |
| Priority | P0 |
| Depends on | IFP-050, IFP-053, IFP-040 |
| Blocks | — (phase exit) |
| Estimated | 8h |

---

## هدف

**Vertical slice tests** پایان فاز ۳: E2E سناریو ادغام مشتری با verify sales/audit، و integration **cross-tenant fail** روی list/get/update/merge — Definition of Done فاز Customer Enterprise.

---

## معیار پذیرش

### E2E merge scenario

- [ ] Seed tenant A: staff owner, two customers each with 1 sale
- [ ] API or UI merge source → target
- [ ] Assert: source not in list; target has 2 sales; audit `customer.merge` exists
- [ ] Assert: source soft-deleted query with admin flag only
- [ ] Idempotency replay → 409

### Cross-tenant integration suite

- [ ] Tenant A staff token accessing Tenant B customer GET → 404
- [ ] Tenant A list never returns Tenant B customers
- [ ] Tenant A merge attempt with B customer id → 404/403
- [ ] Tenant A update B customer → 404
- [ ] Tenant A export with injected B id filter → no leak

### RBAC deny cases

- [ ] Cashier without merge permission → 403 merge
- [ ] Branch scope staff cannot see other branch customer → 404

### CI

- [ ] Tests run in `pnpm test:integration` job
- [ ] Testcontainers PostgreSQL
- [ ] No flaky cursor timing — use fixed seed data

---

## مشخصات فنی

### Test file layout

| File | Scope |
|------|-------|
| `customer-merge.e2e.spec.ts` | Full merge flow |
| `customer-cross-tenant.integration.spec.ts` | Isolation |
| `customer-rbac.integration.spec.ts` | Permissions |

### Fixtures

Factory helpers: createTenant, createStaff, createCustomerWithSale, authHeaders

### E2E tool

Prefer integration supertest chain for merge; optional Playwright smoke on IFP-053 merge dialog if stable

### Assertions

- Database: Sale.customerId counts
- AuditLog table: action customer.merge
- HTTP status codes exact

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/api/test/integration/customers/customer-merge.e2e.spec.ts` |
| Create | `apps/api/test/integration/customers/customer-cross-tenant.integration.spec.ts` |
| Create | `apps/api/test/integration/customers/customer-rbac.integration.spec.ts` |
| Update | test fixtures/helpers |
| Update | CI workflow if new job label needed |

---

## مراحل پیاده‌سازی

1. Extend test factories for Enterprise customer fields
2. Merge integration test happy path
3. Cross-tenant matrix tests
4. RBAC deny tests
5. Wire CI
6. Document run command in phase README exit criteria

---

## Edge Cases & Errors

| Test case | Expected |
|-----------|----------|
| Merge same id twice with idempotency key | same response or 409 |
| Merge after source deleted | 404 |
| List with wrong tenant JWT | 403 empty |
| SQL injection in search q | 422 safe |

---

## تست

- [ ] This task **is** the test deliverable
- [ ] All specs pass locally with Testcontainers
- [ ] Regression: Phase 1 customer list still passes

---

## UX (اگر UI دارد)

- [ ] Optional Playwright: merge wizard visible only with permission

---

## Flow

```
CI pipeline:
unit domain scoring (IFP-052)
→ integration cross-tenant
→ integration merge
→ optional e2e web smoke
All green → Phase 03 exit criteria met
```

---

## Policy Alignment

- [ ] `.cursor/rules/06-testing-quality.mdc` — integration PG, RBAC cross-tenant
- [ ] SOFT-DELETE-POLICY — assert soft delete not hard
- [ ] No delete in test cleanup — use transaction rollback or dedicated test schema

---

## مراجع

- IFP-050 merge use case
- `docs/06-operations/testing-observability.md`
- Phase 03 README exit criteria

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
