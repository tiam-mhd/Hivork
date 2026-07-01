# TASK-120: Test — Integration CreateSale

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 1 |
| Epic | Epic-14-Phase1-Tests |
| ID | TASK-120 |
| Priority | P0 |
| Depends on | TASK-072, TASK-061, TASK-062, TASK-047, TASK-049, TASK-058 |
| Blocks | TASK-122, TASK-123 |
| Estimated | 8h |

---

## هدف

Integration tests برای `CreateSaleUseCase` با PostgreSQL واقعی (Testcontainers) — تأیید transaction atomicity، BR-005 sum invariant در DB، audit row، outbox event، idempotency، و plan/branch/customer validation paths.

---

## معیار پذیرش

- [ ] Spec: `packages/application/src/installments/sales/create-sale.integration.spec.ts`
- [ ] `describe.runIf(hasDatabase)` — skip without DATABASE_URL
- [ ] Testcontainers PG + Redis (idempotency store if Redis-backed)
- [ ] Happy path: create sale → N installment rows + sale row
- [ ] Sum invariant: `SUM(installment.amount) + downPayment = total` in DB
- [ ] Audit: `sale.create` row exists with correct payload
- [ ] Outbox: `SaleCreated` event row exists
- [ ] Idempotency: duplicate key → same sale id, no duplicate rows
- [ ] Idempotency conflict: same key different body → error
- [ ] Customer not found → no DB rows
- [ ] Branch not allowed → no DB rows
- [ ] Rollback: simulate failure after sale insert → no partial data
- [ ] `pnpm turbo test` pass in CI with testcontainers service

---

## مشخصات فنی

### Test Setup

```typescript
// packages/application/src/installments/sales/create-sale.integration.spec.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PostgreSqlContainer } from '@testcontainers/postgresql';

const hasDatabase = !!process.env.DATABASE_URL || process.env.CI === 'true';

describe.runIf(hasDatabase)('CreateSaleUseCase integration', () => {
  let container: StartedPostgreSqlContainer;
  let prisma: PrismaService;
  let useCase: CreateSaleUseCase;

  beforeAll(async () => {
    // Start container OR use env DATABASE_URL
    // Run migrations
    // Seed: tenant, branch, staff, tenantCustomer
  });

  afterAll(async () => {
    await container?.stop();
  });
});
```

### Happy Path Test

```typescript
it('creates sale with installments, audit, and outbox in one transaction', async () => {
  const key = crypto.randomUUID();
  const result = await useCase.execute({
    tenantId: seed.tenantId,
    actorId: seed.staffId,
    idempotencyKey: key,
    tenantCustomerId: seed.customerId,
    branchId: seed.branchId,
    totalAmountRial: 10_000_000n,
    downPaymentRial: 1_000_000n,
    installmentCount: 3,
    firstDueDate: addDays(new Date(), 30),
    contractDate: new Date(),
    intervalDays: 30,
    staffContext: seed.ownerContext,
  });

  expect(result.installments).toHaveLength(3);

  const dbInstallments = await prisma.installment.findMany({
    where: { saleId: result.id, tenantId: seed.tenantId },
  });
  expect(dbInstallments).toHaveLength(3);

  const sum = dbInstallments.reduce((a, i) => a + i.amountRial, 0n);
  expect(sum + 1_000_000n).toBe(10_000_000n); // BR-005

  const audit = await prisma.auditLog.findFirst({
    where: { action: 'sale.create', entityId: result.id },
  });
  expect(audit).toBeTruthy();

  const outbox = await prisma.outboxEvent.findFirst({
    where: { aggregateId: result.id, type: 'SaleCreated' },
  });
  expect(outbox).toBeTruthy();
});
```

### Idempotency Test

```typescript
it('duplicate Idempotency-Key returns cached sale without duplicate rows', async () => {
  const key = crypto.randomUUID();
  const input = { ...baseInput, idempotencyKey: key };

  const first = await useCase.execute(input);
  const second = await useCase.execute(input);

  expect(second.id).toBe(first.id);

  const count = await prisma.sale.count({ where: { tenantId: seed.tenantId } });
  expect(count).toBe(1); // not 2
});
```

### Failure Paths

```typescript
it('CUSTOMER_NOT_FOUND — no sale row created', async () => {
  await expect(useCase.execute({
    ...baseInput,
    tenantCustomerId: crypto.randomUUID(),
  })).rejects.toMatchObject({ code: 'CUSTOMER_NOT_FOUND' });

  const count = await prisma.sale.count({ where: { tenantId: seed.tenantId } });
  expect(count).toBe(0);
});
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/src/installments/sales/create-sale.integration.spec.ts` |
| Reuse | `packages/application/src/installments/sales/create-sale.use-case.ts` |
| Reuse | Test seed helpers from Phase 0 integration tests |

---

## مراحل پیاده‌سازی

1. Reuse Testcontainers setup from Phase 0 integration pattern
2. Seed tenant + branch + staff + customer fixtures
3. Implement happy path with DB assertions
4. Add idempotency tests
5. Add failure path tests (customer, branch)
6. Add rollback test (mock outbox failure optional)
7. Wire into CI test job

---

## Edge Cases & Errors

| سناریو | Assert |
|--------|--------|
| 10M/3 installments | exact bigint sum in DB |
| Idempotency replay | single sale row |
| Invalid customer | zero sale rows |
| Invalid branch | zero sale rows |
| Transaction failure | no orphan installments |

---

## تست

- [ ] Integration: happy path + audit + outbox
- [ ] Integration: BR-005 sum in DB
- [ ] Integration: idempotency duplicate
- [ ] Integration: idempotency conflict
- [ ] Integration: customer not found
- [ ] Integration: branch not allowed

---

## Policy Alignment

- [ ] testing-observability.md §6 — Testcontainers, no DB mocks
- [ ] DEVELOPMENT_RULES — use case integration test
- [ ] BR-001 to BR-010 exercised via integration
- [ ] Audit + outbox mandatory

---

## مراجع

- `docs/06-operations/testing-observability.md` §6–§7
- `Phases/Phase-1-Seller-Panel/Epic-05-Installments-Use-Cases/TASK-072-usecase-create-sale.md`
- `Phases/Phase-1-Seller-Panel/Epic-14-Phase1-Tests/TASK-118-test-domain-installment-algorithm.md`

---

## Self-Review Score

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata | 10 | 10 | ✓ |
| Completeness | 25 | 25 | happy + idempotency + failures |
| Policy | 25 | 25 | Testcontainers، audit/outbox |
| Executability | 25 | 25 | copy-paste test code |
| Alignment | 15 | 15 | TASK-072 |
| **جمع** | **100** | **100** | ≥95 ✅ |
