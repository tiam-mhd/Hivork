# TASK-122: Test — Integration Cross-Tenant

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 1 |
| Epic | Epic-14-Phase1-Tests |
| ID | TASK-122 |
| Priority | P0 |
| Depends on | TASK-120, TASK-080, TASK-081, TASK-088, TASK-058 |
| Blocks | TASK-123 |
| Estimated | 6h |

---

## هدف

Integration tests برای isolation چند-مستاجری — IDOR prevention: resource از tenant A با token tenant B باید **404** (نه 403) برگردد. پوشش Sale، Installment، Customer. هر query شامل `tenantId` از JWT.

---

## معیار پذیرش

- [ ] Spec: `apps/api/src/tenancy/phase1-cross-tenant.integration.spec.ts`
- [ ] Seed tenant A + tenant B (each: staff، branch، customer)
- [ ] Create sale in tenant A → GET with tenant B token → 404 `SALE_NOT_FOUND`
- [ ] List sales tenant B → does not include tenant A sales
- [ ] GET installment from tenant A sale → tenant B token → 404
- [ ] List installments tenant B → no tenant A rows
- [ ] GET customer tenant A → tenant B token → 404 `CUSTOMER_NOT_FOUND`
- [ ] Cancel sale tenant A → tenant B token → 404
- [ ] Create sale with tenant A customerId + tenant B token → 404 `CUSTOMER_NOT_FOUND`
- [ ] **Never 403** for cross-tenant ID access (information leakage)
- [ ] Repository-level: direct UC call with wrong tenantId in context → empty/not found
- [ ] `describe.runIf(hasDatabase)`

---

## مشخصات فنی

### IDOR Rule

```
Cross-tenant access by resource ID → 404 NOT FOUND
Reason: 403 reveals resource exists in another tenant
```

### HTTP Tests

```typescript
describe.runIf(hasDatabase)('Phase 1 cross-tenant isolation', () => {
  let tenantA: TenantFixture;
  let tenantB: TenantFixture;
  let saleInA: string;

  beforeAll(async () => {
    tenantA = await seedTenant('tenant-a');
    tenantB = await seedTenant('tenant-b');
    saleInA = await createSaleAs(tenantA);
  });

  it('GET /sales/:id — tenant B cannot read tenant A sale', async () => {
    const tokenB = await staffToken(tenantB.owner);
    const res = await fetch(`${baseUrl}/api/v1/sales/${saleInA}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    expect(res.status).toBe(404);
    expect((await res.json()).code).toBe('SALE_NOT_FOUND');
  });

  it('GET /sales — tenant B list excludes tenant A sales', async () => {
    const tokenB = await staffToken(tenantB.owner);
    const res = await fetch(`${baseUrl}/api/v1/sales`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    const { data } = await res.json();
    expect(data.find((s: { id: string }) => s.id === saleInA)).toBeUndefined();
  });

  it('POST /sales/:id/cancel — tenant B cannot cancel tenant A sale', async () => {
    const tokenB = await staffToken(tenantB.owner);
    const res = await fetch(`${baseUrl}/api/v1/sales/${saleInA}/cancel`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenB}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason: 'حمله' }),
    });
    expect(res.status).toBe(404);
  });

  it('GET /customers/:id — tenant B cannot read tenant A customer', async () => {
    const tokenB = await staffToken(tenantB.owner);
    const res = await fetch(`${baseUrl}/api/v1/customers/${tenantA.customerId}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    expect(res.status).toBe(404);
    expect((await res.json()).code).toBe('CUSTOMER_NOT_FOUND');
  });
});
```

### Use Case Level Test

```typescript
it('CreateSaleUseCase — tenant B context + tenant A customerId → CUSTOMER_NOT_FOUND', async () => {
  await expect(
    createSaleUseCase.execute({
      tenantId: tenantB.id,
      tenantCustomerId: tenantA.customerId,
      ...otherFields,
    }),
  ).rejects.toMatchObject({ code: 'CUSTOMER_NOT_FOUND' });
});
```

### Installment Isolation

```typescript
it('GET /installments — no cross-tenant installment rows', async () => {
  const installmentA = await getFirstInstallment(saleInA);
  const tokenB = await staffToken(tenantB.owner);

  const listRes = await fetch(`${baseUrl}/api/v1/installments`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  const { data } = await listRes.json();
  expect(data.find((i: { id: string }) => i.id === installmentA.id)).toBeUndefined();
});
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/api/src/tenancy/phase1-cross-tenant.integration.spec.ts` |
| Reuse | Seed helpers from TASK-120 |

---

## مراحل پیاده‌سازی

1. Seed two isolated tenants with full fixtures
2. Create resources in tenant A only
3. HTTP tests: sale get/list/cancel cross-tenant
4. HTTP tests: customer get cross-tenant
5. HTTP tests: installment list cross-tenant
6. UC-level test for customerId mismatch
7. Assert 404 not 403 on all IDOR cases

---

## Edge Cases & Errors

| سناریو | Status | Code |
|--------|--------|------|
| Sale ID from other tenant | 404 | SALE_NOT_FOUND |
| Customer ID from other tenant | 404 | CUSTOMER_NOT_FOUND |
| UUID random (never existed) | 404 | same codes |
| List endpoints | 200 | empty or filtered — no leak |

---

## تست

- [ ] Integration: sale GET cross-tenant → 404
- [ ] Integration: sale list isolation
- [ ] Integration: sale cancel cross-tenant → 404
- [ ] Integration: customer GET cross-tenant → 404
- [ ] Integration: installment list isolation
- [ ] Integration: create sale wrong tenant customer → 404
- [ ] Integration: verify never 403 for IDOR

---

## Policy Alignment

- [ ] tenancy-and-entities.md — tenantId on every query
- [ ] DEVELOPMENT_RULES — cross-tenant must fail
- [ ] testing-observability.md §7.3 — 404 not 403
- [ ] ADR-002 — tenant isolation

---

## مراجع

- `docs/02-architecture/tenancy-and-entities.md`
- `docs/06-operations/testing-observability.md` §7.3
- `Phases/Phase-0-Foundation/Epic-10-Vertical-Slice/TASK-054-vertical-slice-e2e.md` — cross-tenant pattern
- `Phases/Phase-1-Seller-Panel/Epic-14-Phase1-Tests/TASK-120-test-integration-create-sale.md`

---

## Self-Review Score

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata | 10 | 10 | ✓ |
| Completeness | 25 | 25 | sale/customer/installment |
| Policy | 25 | 25 | 404 IDOR rule |
| Executability | 25 | 25 | 7 integration cases |
| Alignment | 15 | 15 | TASK-054 pattern |
| **جمع** | **100** | **100** | ≥95 ✅ |
