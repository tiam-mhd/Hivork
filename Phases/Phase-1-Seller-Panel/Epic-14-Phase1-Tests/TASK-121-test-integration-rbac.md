# TASK-121: Test — Integration RBAC

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 1 |
| Epic | Epic-14-Phase1-Tests |
| ID | TASK-121 |
| Priority | P0 |
| Depends on | TASK-080, TASK-081, TASK-082, TASK-083, TASK-088, TASK-093, TASK-041, TASK-042, TASK-043 |
| Blocks | TASK-123 |
| Estimated | 8h |

---

## هدف

Integration tests برای RBAC روی endpointهای Phase 1 — allow با permission صحیح، deny بدون permission، DENY override > GRANT، module guard (`MODULE_NOT_ENABLED`)، و data scope (branch/own). HTTP-level با NestJS testing module + real PG.

---

## معیار پذیرش

- [ ] Spec: `apps/api/src/rbac/phase1-rbac.integration.spec.ts`
- [ ] Testcontainers PG — seed roles: owner، cashier، viewer
- [ ] **Allow:** owner creates sale → 201
- [ ] **Deny:** viewer POST /sales → 403 `PERMISSION_DENIED`
- [ ] **Deny:** viewer POST /sales/:id/cancel → 403
- [ ] **Allow:** cashier `installments.sale.create` → 201
- [ ] **Module guard:** tenant without installments module → 403 `MODULE_NOT_ENABLED`
- [ ] **Override DENY:** user override deny `installments.sale.create` → 403 even if role grants
- [ ] **Override GRANT:** user override grant single permission → 201
- [ ] **Data scope branch:** branch staff list sales → only assigned branches
- [ ] **Data scope own:** own scope staff list sales → only own sales
- [ ] Endpoints covered: sales، installments، customers، settings (sample per controller)
- [ ] `describe.runIf(hasDatabase)`

---

## مشخصات فنی

### Test Matrix (minimum)

| Endpoint | Permission | Role | Expected |
|----------|------------|------|----------|
| POST /api/v1/sales | installments.sale.create | owner | 201 |
| POST /api/v1/sales | installments.sale.create | viewer | 403 |
| GET /api/v1/sales | installments.sale.view | cashier | 200 |
| GET /api/v1/sales | installments.sale.view | viewer (no perm) | 403 |
| POST /api/v1/sales/:id/cancel | installments.sale.cancel | viewer | 403 |
| GET /api/v1/installments | installments.installment.view | cashier | 200 |
| GET /api/v1/customers | installments.customer.view | cashier | 200 |
| PATCH /api/v1/settings?module=installments | core.settings.edit | viewer | 403 |
| Any installments route | module enabled | demo-shop | pass |
| Any installments route | module disabled | tenant-no-module | 403 MODULE_NOT_ENABLED |

### Setup Pattern

```typescript
describe.runIf(hasDatabase)('Phase 1 RBAC integration', () => {
  async function loginAs(staff: SeedStaff): Promise<string> {
    // OTP flow or direct JWT factory for tests
    return tokenService.issueStaffToken(staff);
  }

  it('viewer cannot create sale', async () => {
    const token = await loginAs(seed.viewer);
    const res = await fetch(`${baseUrl}/api/v1/sales`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Idempotency-Key': crypto.randomUUID(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(validCreateSaleBody),
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe('PERMISSION_DENIED');
  });
});
```

### Override Precedence Test

```typescript
it('DENY override beats role GRANT', async () => {
  // Seed: cashier role has installments.sale.create
  // Add user override DENY for installments.sale.create
  const token = await loginAs(seed.cashierWithDenyOverride);
  const res = await postSale(token);
  expect(res.status).toBe(403);
  expect((await res.json()).code).toBe('PERMISSION_DENIED');
});
```

### Data Scope Test

```typescript
it('branch scope staff sees only assigned branch sales', async () => {
  await createSale({ branchId: seed.branchA });
  await createSale({ branchId: seed.branchB });

  const token = await loginAs(seed.branchAStaff); // scope=branch, assigned [A]
  const res = await fetch(`${baseUrl}/api/v1/sales`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const { data } = await res.json();
  expect(data.every((s: { branchId: string }) => s.branchId === seed.branchA.id)).toBe(true);
});
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/api/src/rbac/phase1-rbac.integration.spec.ts` |
| Create | `apps/api/src/test-utils/rbac-seed.helper.ts` |
| Reuse | Phase 0 guard tests pattern (TASK-041–046) |

---

## مراحل پیاده‌سازی

1. Create RBAC seed: owner، cashier، viewer + branch assignments
2. JWT factory for test staff (bypass OTP in integration)
3. Implement allow/deny matrix for sales endpoints
4. Add module guard test tenant
5. Add override DENY/GRANT tests
6. Add data scope branch + own tests
7. Sample tests for customers + settings controllers

---

## Edge Cases & Errors

| سناریو | Expected |
|--------|----------|
| No Authorization header | 401 |
| Expired token | 401 |
| Valid perm wrong module | 403 MODULE_NOT_ENABLED |
| DENY override | 403 PERMISSION_DENIED |
| Branch staff wrong X-Branch-Id | filtered list |

---

## تست

- [ ] Integration: 10+ RBAC matrix cases
- [ ] Integration: override precedence (2 cases)
- [ ] Integration: module guard
- [ ] Integration: data scope branch + own
- [ ] CI: runs with testcontainers

---

## Policy Alignment

- [ ] rbac.md — DENY > GRANT > role
- [ ] ADR-015 — data scope tests
- [ ] DEVELOPMENT_RULES — permission endpoint → RBAC test
- [ ] testing-observability.md §7

---

## مراجع

- `docs/02-architecture/rbac.md`
- `docs/06-operations/testing-observability.md` §7
- `docs/06-operations/security-and-audit.md`
- `Phases/Phase-1-Seller-Panel/Epic-06-Installments-API/TASK-080-api-sales-controller.md`

---

## Self-Review Score

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata | 10 | 10 | ✓ |
| Completeness | 25 | 25 | matrix، overrides، scope |
| Policy | 25 | 25 | rbac.md precedence |
| Executability | 25 | 25 | 10+ cases |
| Alignment | 15 | 15 | Phase 1 API tasks |
| **جمع** | **100** | **100** | ≥95 ✅ |
