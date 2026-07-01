# Testing و Observability — Hivork

> **وضعیت:** Approved — v2.0  
> **نسخه:** 2.0 — 1405/04/08  
> **ADR مرتبط:** ADR-006, ADR-013  
> **مراجع:** [`DEVELOPMENT_RULES.md`](../09-development/DEVELOPMENT_RULES.md) · [`EXCELLENCE-STANDARDS.md`](../09-development/EXCELLENCE-STANDARDS.md)

---

## ۱. استراتژی کلی

| Level | Tool | Focus | سرعت |
|-------|------|-------|-------|
| Unit | Vitest | domain rules, amount calc, RBAC precedence | <100ms |
| Integration | Vitest + Testcontainers | use cases + PG + Redis | <30s |
| E2E API | Supertest | critical flows end-to-end | <60s |
| E2E Web | Playwright | seller happy path, customer login | <5min |
| Contract | OpenAPI diff in CI | breaking API changes | <10s |

### Golden Rule

> **هر bug مالی → یک failing test قبل از fix.**

---

## ۲. ساختار پوشه‌های تست

```
packages/
  domain/
    installments/
      __tests__/
        sale.spec.ts          # domain rule unit tests
        installment.spec.ts
        payment-calc.spec.ts

  application/
    installments/
      __tests__/
        create-sale.integration.spec.ts
        confirm-payment.integration.spec.ts
        waive-installment.integration.spec.ts

apps/
  api/
    test/
      rbac/
        sale.rbac.spec.ts     # permission tests
        cross-tenant.spec.ts  # isolation tests
      e2e/
        sale-flow.e2e.spec.ts
        payment-flow.e2e.spec.ts
        auth-otp.e2e.spec.ts
```

### Phase 01 — Auth & Security gate (IFP-018)

| Suite | Path | Runtime |
|-------|------|---------|
| Integration (API) | `apps/api/src/phase-01-auth/phase-01-auth.integration.spec.ts` (fixtures in `packages/integration-tests/src/phase-01-auth/`) | PG + Redis via Testcontainers / CI services |
| Playwright (Web) | `apps/web/e2e/phase-01-auth.e2e.spec.ts` | API + Web + seed |
| Fixtures | `prisma/seed/phase-01-auth.ts` | `pnpm db:seed` |
| CI job | `.github/workflows/ci.yml` → `test-phase-01-auth` | push/PR after `quality` |

```bash
# Local — requires migrate + seed + Redis + Postgres
pnpm test:phase-01-auth

# Integration only
pnpm --filter @hivork/integration-tests test:phase-01-auth

# Playwright only (API on :4000, web on :3000)
PLAYWRIGHT_SKIP_WEBSERVER=1 pnpm --filter @hivork/web exec playwright test phase-01-auth
```

**Captcha bypass in tests:** header `x-captcha-bypass: test-bypass` (see `CAPTCHA_BYPASS_TOKEN`).

**Traceability:** `InstallmentFeaturePhases/TRACEABILITY-MATRIX.md` §1 + IFP-TASK-018 matrix.

---

## ۳. آستانه پوشش (Coverage Thresholds)

```json
// vitest.config.ts
{
  "coverage": {
    "thresholds": {
      "lines": 85,
      "functions": 85,
      "branches": 80,
      "statements": 85
    },
    "include": [
      "packages/domain/**",
      "packages/application/**"
    ],
    "exclude": [
      "**/*.spec.ts",
      "**/index.ts",
      "**/*.dto.ts"
    ]
  }
}
```

| Package | Lines | Branches |
|---------|-------|----------|
| `packages/domain` | **90%+** | **85%+** |
| `packages/application` | **85%+** | **80%+** |
| `apps/api` (controllers) | 70%+ | 65%+ |

---

## ۴. Test Data Factories

### Factory Pattern

```typescript
// packages/testing/factories/sale.factory.ts
import { faker } from '@faker-js/faker';
import { Sale, SaleStatus } from '@hivork/domain';

export const saleFactory = {
  build(overrides: Partial<Sale> = {}): Sale {
    return {
      id: faker.string.uuid(),
      tenantId: faker.string.uuid(),
      branchId: faker.string.uuid(),
      tenantCustomerId: faker.string.uuid(),
      createdById: faker.string.uuid(),
      title: faker.commerce.productName(),
      totalAmountRial: 10_000_000n,      // ۱۰ میلیون ریال
      downPaymentRial: 2_000_000n,       // ۲ میلیون ریال
      installmentCount: 4,
      status: SaleStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      ...overrides,
    };
  },

  buildCompleted(overrides: Partial<Sale> = {}): Sale {
    return this.build({ status: SaleStatus.COMPLETED, ...overrides });
  },

  buildCancelled(overrides: Partial<Sale> = {}): Sale {
    return this.build({ status: SaleStatus.CANCELLED, ...overrides });
  },
};

// packages/testing/factories/installment.factory.ts
export const installmentFactory = {
  build(overrides: Partial<Installment> = {}): Installment {
    return {
      id: faker.string.uuid(),
      saleId: faker.string.uuid(),
      tenantId: faker.string.uuid(),
      sequenceNumber: 1,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      amountRial: 2_000_000n,
      status: InstallmentStatus.PENDING,
      paidAt: null,
      confirmedById: null,
      waivedById: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      ...overrides,
    };
  },

  buildOverdue(overrides: Partial<Installment> = {}): Installment {
    return this.build({
      status: InstallmentStatus.OVERDUE,
      dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      ...overrides,
    });
  },

  buildPaid(overrides: Partial<Installment> = {}): Installment {
    return this.build({
      status: InstallmentStatus.PAID,
      paidAt: new Date(),
      confirmedById: faker.string.uuid(),
      ...overrides,
    });
  },
};
```

### DB Seed Helper

```typescript
// packages/testing/helpers/db-seed.ts
export async function seedTenant(prisma: PrismaClient) {
  const tenant = await prisma.tenant.create({
    data: {
      id: faker.string.uuid(),
      name: 'فروشگاه تست',
      phone: '09121234567',
      planId: 'basic',
    },
  });

  const branch = await prisma.branch.create({
    data: {
      tenantId: tenant.id,
      name: 'شعبه اصلی',
      isDefault: true,
    },
  });

  const staffOwner = await prisma.staff.create({
    data: {
      tenantId: tenant.id,
      globalCustomer: { create: { phone: '09120000001', name: 'مالک' } },
      roleCode: 'owner',
    },
  });

  return { tenant, branch, staffOwner };
}
```

---

## ۵. Unit Tests — Domain Rules

### ۵.۱ محاسبه اقساط

```typescript
// packages/domain/installments/__tests__/installment-calc.spec.ts
import { describe, it, expect } from 'vitest';
import { calculateInstallments } from '../services/installment-calculator';

describe('calculateInstallments', () => {
  it('توزیع مساوی بدون باقی‌مانده', () => {
    const result = calculateInstallments({
      totalAmountRial: 12_000_000n,
      downPaymentRial: 0n,
      count: 4,
      startDate: new Date('2025-01-01'),
      intervalDays: 30,
    });

    expect(result).toHaveLength(4);
    expect(result.every(i => i.amountRial === 3_000_000n)).toBe(true);
    const sum = result.reduce((acc, i) => acc + i.amountRial, 0n);
    expect(sum).toBe(12_000_000n);
  });

  it('پیش‌پرداخت از مجموع کسر می‌شود', () => {
    const result = calculateInstallments({
      totalAmountRial: 10_000_000n,
      downPaymentRial: 2_000_000n,
      count: 4,
      startDate: new Date('2025-01-01'),
      intervalDays: 30,
    });

    const remaining = 8_000_000n;
    const sum = result.reduce((acc, i) => acc + i.amountRial, 0n);
    expect(sum).toBe(remaining);
  });

  it('باقی‌مانده به قسط اول اضافه می‌شود', () => {
    // ۱۰ میلیون / ۳ = ۳,۳۳۳,۳۳۴ + ۳,۳۳۳,۳۳۳ + ۳,۳۳۳,۳۳۳
    const result = calculateInstallments({
      totalAmountRial: 10_000_000n,
      downPaymentRial: 0n,
      count: 3,
      startDate: new Date('2025-01-01'),
      intervalDays: 30,
    });

    expect(result[0].amountRial).toBe(3_333_334n); // قسط اول باقی‌مانده می‌گیرد
    expect(result[1].amountRial).toBe(3_333_333n);
    expect(result[2].amountRial).toBe(3_333_333n);
    const sum = result.reduce((acc, i) => acc + i.amountRial, 0n);
    expect(sum).toBe(10_000_000n);
  });

  it('خطا: پیش‌پرداخت بیشتر از کل مبلغ', () => {
    expect(() =>
      calculateInstallments({
        totalAmountRial: 5_000_000n,
        downPaymentRial: 6_000_000n,
        count: 4,
        startDate: new Date('2025-01-01'),
        intervalDays: 30,
      })
    ).toThrow('AMOUNT_EXCEEDS_TOTAL');
  });

  it('مجموع اقساط همیشه برابر total - downPayment', () => {
    for (const count of [1, 2, 3, 5, 7, 12, 24]) {
      const total = 10_000_000n;
      const down = 1_500_000n;
      const result = calculateInstallments({
        totalAmountRial: total,
        downPaymentRial: down,
        count,
        startDate: new Date('2025-01-01'),
        intervalDays: 30,
      });
      const sum = result.reduce((acc, i) => acc + i.amountRial, 0n);
      expect(sum).toBe(total - down);
    }
  });
});
```

### ۵.۲ Invariant های Status Transition

```typescript
// packages/domain/installments/__tests__/installment.spec.ts
import { describe, it, expect } from 'vitest';
import { Installment, InstallmentStatus } from '../entities/installment';
import { installmentFactory } from '@hivork/testing';

describe('Installment Status Invariants', () => {
  it('قسط paid → هیچ transition مجاز نیست', () => {
    const installment = installmentFactory.buildPaid();

    expect(() => installment.markOverdue()).toThrow('INSTALLMENT_STATUS_INVALID');
    expect(() => installment.markWaived({ staffId: 'x' })).toThrow('INSTALLMENT_STATUS_INVALID');
    expect(() => installment.markPaid({ staffId: 'x' })).toThrow('INSTALLMENT_ALREADY_PAID');
  });

  it('قسط waived → هیچ transition مجاز نیست', () => {
    const installment = installmentFactory.build({ status: InstallmentStatus.WAIVED });

    expect(() => installment.markPaid({ staffId: 'x' })).toThrow('INSTALLMENT_STATUS_INVALID');
    expect(() => installment.markOverdue()).toThrow('INSTALLMENT_STATUS_INVALID');
    expect(() => installment.markWaived({ staffId: 'x' })).toThrow('INSTALLMENT_ALREADY_WAIVED');
  });

  it('pending → overdue فقط اگر due_date گذشته باشد', () => {
    const future = installmentFactory.build({
      dueDate: new Date(Date.now() + 86400000),
    });
    expect(() => future.markOverdue()).toThrow('INSTALLMENT_STATUS_INVALID');

    const past = installmentFactory.build({
      dueDate: new Date(Date.now() - 86400000),
    });
    expect(() => past.markOverdue()).not.toThrow();
    expect(past.status).toBe(InstallmentStatus.OVERDUE);
  });

  it('overdue → paid مجاز است', () => {
    const overdue = installmentFactory.buildOverdue();
    overdue.markPaid({ staffId: faker.string.uuid(), paidAt: new Date() });
    expect(overdue.status).toBe(InstallmentStatus.PAID);
    expect(overdue.paidAt).not.toBeNull();
    expect(overdue.confirmedById).not.toBeNull();
  });
});
```

### ۵.۳ Sale Cancellation Rules

```typescript
// packages/domain/installments/__tests__/sale.spec.ts
describe('Sale Cancellation', () => {
  it('cancel فروش بدون هیچ قسط paid ممکن است', () => {
    const sale = saleFactory.build();
    const installments = [
      installmentFactory.build({ saleId: sale.id, status: InstallmentStatus.PENDING }),
      installmentFactory.build({ saleId: sale.id, status: InstallmentStatus.OVERDUE }),
    ];

    expect(() => sale.cancel({ installments, staffId: 'x' })).not.toThrow();
    expect(sale.status).toBe(SaleStatus.CANCELLED);
  });

  it('cancel فروش با قسط paid ممنوع است', () => {
    const sale = saleFactory.build();
    const installments = [
      installmentFactory.buildPaid({ saleId: sale.id }),
      installmentFactory.build({ saleId: sale.id }),
    ];

    expect(() => sale.cancel({ installments, staffId: 'x' }))
      .toThrow('SALE_HAS_PAID_INSTALLMENT');
  });

  it('cancel فروش cancelled ممنوع است', () => {
    const sale = saleFactory.buildCancelled();
    expect(() => sale.cancel({ installments: [], staffId: 'x' }))
      .toThrow('SALE_ALREADY_CANCELLED');
  });

  it('sale خودکار completed می‌شود وقتی همه اقساط paid/waived', () => {
    const sale = saleFactory.build();
    const installments = [
      installmentFactory.buildPaid({ saleId: sale.id }),
      installmentFactory.build({ saleId: sale.id, status: InstallmentStatus.WAIVED }),
    ];

    sale.checkCompletion(installments);
    expect(sale.status).toBe(SaleStatus.COMPLETED);
  });
});
```

---

## ۶. Integration Tests — Use Cases با Testcontainers

### ۶.۱ Setup کانتینر

```typescript
// packages/application/installments/__tests__/setup.ts
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

let pgContainer: StartedPostgreSqlContainer;
let redisContainer: StartedRedisContainer;
let prisma: PrismaClient;

export async function setupIntegrationTest() {
  pgContainer = await new PostgreSqlContainer('postgres:16')
    .withDatabase('hivork_test')
    .withUsername('test')
    .withPassword('test')
    .start();

  redisContainer = await new RedisContainer('redis:7').start();

  const databaseUrl = pgContainer.getConnectionUri();
  process.env.DATABASE_URL = databaseUrl;
  process.env.REDIS_URL = redisContainer.getConnectionUrl();

  // Run migrations
  execSync('pnpm prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });

  prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  await prisma.$connect();

  return { prisma };
}

export async function teardownIntegrationTest() {
  await prisma.$disconnect();
  await pgContainer.stop();
  await redisContainer.stop();
}
```

### ۶.۲ تست CreateSale Use Case

```typescript
// packages/application/installments/__tests__/create-sale.integration.spec.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupIntegrationTest, teardownIntegrationTest } from './setup';
import { CreateSaleUseCase } from '../use-cases/create-sale.use-case';
import { seedTenant } from '@hivork/testing';

describe('CreateSale — Integration', () => {
  let ctx: Awaited<ReturnType<typeof setupIntegrationTest>>;
  let tenantCtx: { tenant: any; branch: any; staffOwner: any };

  beforeAll(async () => {
    ctx = await setupIntegrationTest();
    tenantCtx = await seedTenant(ctx.prisma);
  });

  afterAll(async () => {
    await teardownIntegrationTest();
  });

  it('فروش جدید ایجاد می‌شود و اقساط درست محاسبه می‌شوند', async () => {
    const useCase = new CreateSaleUseCase(ctx.prisma);

    const result = await useCase.execute({
      tenantId: tenantCtx.tenant.id,
      branchId: tenantCtx.branch.id,
      staffId: tenantCtx.staffOwner.id,
      tenantCustomerId: 'some-customer-id',
      totalAmountRial: 12_000_000n,
      downPaymentRial: 0n,
      installmentCount: 4,
      title: 'خرید تلویزیون',
      firstDueDate: new Date('2025-02-01'),
      intervalDays: 30,
    });

    expect(result.saleId).toBeDefined();

    const sale = await ctx.prisma.sale.findUniqueOrThrow({ where: { id: result.saleId } });
    expect(sale.status).toBe('active');
    expect(sale.totalAmountRial).toBe(12_000_000n);
    expect(sale.tenantId).toBe(tenantCtx.tenant.id);

    const installments = await ctx.prisma.installment.findMany({
      where: { saleId: result.saleId },
      orderBy: { sequenceNumber: 'asc' },
    });

    expect(installments).toHaveLength(4);
    expect(installments.every(i => i.status === 'pending')).toBe(true);
    const totalInstallments = installments.reduce((s, i) => s + i.amountRial, 0n);
    expect(totalInstallments).toBe(12_000_000n);
  });

  it('audit log ثبت می‌شود', async () => {
    const useCase = new CreateSaleUseCase(ctx.prisma);
    const result = await useCase.execute({
      tenantId: tenantCtx.tenant.id,
      branchId: tenantCtx.branch.id,
      staffId: tenantCtx.staffOwner.id,
      tenantCustomerId: 'some-customer-id',
      totalAmountRial: 5_000_000n,
      downPaymentRial: 1_000_000n,
      installmentCount: 2,
      title: 'تست audit',
      firstDueDate: new Date('2025-02-01'),
      intervalDays: 30,
    });

    const auditLog = await ctx.prisma.auditLog.findFirst({
      where: { entityId: result.saleId, action: 'sale.create' },
    });

    expect(auditLog).not.toBeNull();
    expect(auditLog!.actorId).toBe(tenantCtx.staffOwner.id);
    expect(auditLog!.tenantId).toBe(tenantCtx.tenant.id);
  });

  it('domain event در outbox ثبت می‌شود', async () => {
    const useCase = new CreateSaleUseCase(ctx.prisma);
    const result = await useCase.execute({
      tenantId: tenantCtx.tenant.id,
      branchId: tenantCtx.branch.id,
      staffId: tenantCtx.staffOwner.id,
      tenantCustomerId: 'some-customer-id',
      totalAmountRial: 6_000_000n,
      downPaymentRial: 0n,
      installmentCount: 3,
      title: 'تست outbox',
      firstDueDate: new Date('2025-02-01'),
      intervalDays: 30,
    });

    const outboxEvent = await ctx.prisma.outboxEvent.findFirst({
      where: { payload: { path: ['saleId'], equals: result.saleId } },
    });

    expect(outboxEvent).not.toBeNull();
    expect(outboxEvent!.eventType).toBe('SaleCreated');
  });
});
```

### ۶.۳ تست ConfirmPayment Use Case

```typescript
// packages/application/installments/__tests__/confirm-payment.integration.spec.ts
describe('ConfirmPayment — Integration', () => {
  it('تأیید پرداخت → installment paid + sale completed', async () => {
    // Setup: یک فروش با یک قسط
    const { saleId } = await createSaleHelper({ installmentCount: 1 });
    const installment = await ctx.prisma.installment.findFirst({ where: { saleId } });
    const attempt = await ctx.prisma.paymentAttempt.create({
      data: {
        installmentId: installment!.id,
        reportedByType: 'customer',
        reportedById: 'customer-id',
        amountRial: installment!.amountRial,
        status: 'pending',
      },
    });

    // Act
    await confirmPaymentUseCase.execute({
      attemptId: attempt.id,
      staffId: staffOwner.id,
      tenantId: tenant.id,
    });

    // Assert
    const updatedAttempt = await ctx.prisma.paymentAttempt.findUniqueOrThrow({
      where: { id: attempt.id },
    });
    expect(updatedAttempt.status).toBe('confirmed');

    const updatedInstallment = await ctx.prisma.installment.findUniqueOrThrow({
      where: { id: installment!.id },
    });
    expect(updatedInstallment.status).toBe('paid');
    expect(updatedInstallment.paidAt).not.toBeNull();

    // فروش با یک قسط باید completed شود
    const updatedSale = await ctx.prisma.sale.findUniqueOrThrow({ where: { id: saleId } });
    expect(updatedSale.status).toBe('completed');
  });

  it('تأیید پرداخت قبلاً تأییدشده → خطا', async () => {
    const attempt = await ctx.prisma.paymentAttempt.create({
      data: { ..., status: 'confirmed' },
    });

    await expect(
      confirmPaymentUseCase.execute({ attemptId: attempt.id, staffId: 'x', tenantId: tenant.id })
    ).rejects.toThrow('PAYMENT_ALREADY_CONFIRMED');
  });
});
```

---

## ۷. RBAC Permission Tests

```typescript
// apps/api/test/rbac/sale.rbac.spec.ts
import { describe, it, expect, beforeAll } from 'vitest';
import * as request from 'supertest';
import { createTestApp } from '../helpers/app';
import { generateStaffToken } from '../helpers/auth';

describe('RBAC — Sale Endpoints', () => {
  let app: any;

  beforeAll(async () => {
    app = await createTestApp();
  });

  describe('POST /api/v1/sales', () => {
    it('owner می‌تواند فروش ایجاد کند', async () => {
      const token = generateStaffToken({ role: 'owner', tenantId: 'tenant-a' });

      const response = await request(app.getHttpServer())
        .post('/api/v1/sales')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Branch-Id', 'branch-a')
        .send(validSalePayload);

      expect(response.status).toBe(201);
    });

    it('cashier می‌تواند فروش ایجاد کند', async () => {
      const token = generateStaffToken({ role: 'cashier', tenantId: 'tenant-a' });

      const response = await request(app.getHttpServer())
        .post('/api/v1/sales')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Branch-Id', 'branch-a')
        .send(validSalePayload);

      expect(response.status).toBe(201);
    });

    it('viewer نمی‌تواند فروش ایجاد کند — 403', async () => {
      const token = generateStaffToken({ role: 'viewer', tenantId: 'tenant-a' });

      const response = await request(app.getHttpServer())
        .post('/api/v1/sales')
        .set('Authorization', `Bearer ${token}`)
        .send(validSalePayload);

      expect(response.status).toBe(403);
      expect(response.body.code).toBe('PERMISSION_DENIED');
    });

    it('بدون توکن — 401', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/sales')
        .send(validSalePayload);

      expect(response.status).toBe(401);
    });

    it('DENY override روی user — 403', async () => {
      const token = generateStaffToken({
        role: 'owner',
        tenantId: 'tenant-a',
        deniedPermissions: ['installments.sale.create'],
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/sales')
        .set('Authorization', `Bearer ${token}`)
        .send(validSalePayload);

      expect(response.status).toBe(403);
    });
  });

  describe('DENY > GRANT precedence', () => {
    it('DENY صریح > GRANT role — 403', async () => {
      // Staff با role که permission دارد اما DENY user override
      const token = generateStaffToken({
        role: 'manager',          // manager.sale.create = GRANT
        tenantId: 'tenant-a',
        deniedPermissions: ['installments.sale.create'],  // user DENY
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/sales')
        .set('Authorization', `Bearer ${token}`)
        .send(validSalePayload);

      expect(response.status).toBe(403); // DENY wins
    });
  });
});
```

---

## ۸. Cross-Tenant Isolation Tests

```typescript
// apps/api/test/rbac/cross-tenant.spec.ts
describe('Cross-Tenant Isolation', () => {
  it('staff tenant A نمی‌تواند فروش‌های tenant B را ببیند', async () => {
    // فروش در tenant B
    const tenantBSaleId = await createSaleInTenant('tenant-b');

    // Staff از tenant A با دسترسی view
    const token = generateStaffToken({ role: 'manager', tenantId: 'tenant-a' });

    const response = await request(app.getHttpServer())
      .get(`/api/v1/sales/${tenantBSaleId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(404); // نه 403 — برای جلوگیری از information leakage
  });

  it('customer فقط اقساط خود را می‌بیند — نه tenant دیگر', async () => {
    const customerToken = generateCustomerToken({ customerId: 'customer-1' });

    // قسط متعلق به tenant A
    const installmentId = await createInstallmentForCustomer('customer-2', 'tenant-a');

    const response = await request(app.getHttpServer())
      .get(`/api/v1/customer/installments/${installmentId}`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(response.status).toBe(404);
  });

  it('staff endpoint با customer token — 401/403', async () => {
    const customerToken = generateCustomerToken({ customerId: 'customer-1' });

    const response = await request(app.getHttpServer())
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${customerToken}`)
      .send(validSalePayload);

    expect([401, 403]).toContain(response.status);
  });

  it('تلاش JWT spoofing tenant_id — رد می‌شود', async () => {
    // Token claim tenantId: 'tenant-a' اما سعی می‌کند به tenant-b دسترسی پیدا کند
    const token = generateStaffToken({ role: 'owner', tenantId: 'tenant-a' });

    const tenantBResourceId = await createResourceInTenant('tenant-b');

    const response = await request(app.getHttpServer())
      .get(`/api/v1/sales/${tenantBResourceId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(404);
  });
});
```

---

## ۹. E2E Tests — Critical Flows

### ۹.۱ فلوی OTP Login

```typescript
// apps/api/test/e2e/auth-otp.e2e.spec.ts
describe('OTP Login Flow', () => {
  it('OTP Request → Verify → Token received', async () => {
    // Step 1: Request OTP
    const requestResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/otp/request')
      .send({ phone: '09121234567', actor: 'staff' });

    expect(requestResponse.status).toBe(200);

    // Step 2: Verify (در محیط test از mock OTP استفاده می‌شود)
    const verifyResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/otp/verify')
      .send({ phone: '09121234567', otp: '123456', actor: 'staff' });

    expect(verifyResponse.status).toBe(200);
    expect(verifyResponse.body).toHaveProperty('accessToken');
    expect(verifyResponse.body).toHaveProperty('refreshToken');
  });

  it('OTP Rate Limit — بیش از ۳ درخواست در دقیقه رد می‌شود', async () => {
    for (let i = 0; i < 3; i++) {
      await request(app.getHttpServer())
        .post('/api/v1/auth/otp/request')
        .send({ phone: '09129999999', actor: 'staff' });
    }

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/otp/request')
      .send({ phone: '09129999999', actor: 'staff' });

    expect(response.status).toBe(429);
  });

  it('OTP یک بار مصرف — استفاده دوباره رد می‌شود', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/otp/request')
      .send({ phone: '09121111111', actor: 'staff' });

    const payload = { phone: '09121111111', otp: '123456', actor: 'staff' };

    const first = await request(app.getHttpServer())
      .post('/api/v1/auth/otp/verify')
      .send(payload);
    expect(first.status).toBe(200);

    const second = await request(app.getHttpServer())
      .post('/api/v1/auth/otp/verify')
      .send(payload);
    expect(second.status).toBe(400);
    expect(second.body.code).toBe('OTP_INVALID_OR_EXPIRED');
  });
});
```

### ۹.۲ فلوی کامل فروش و پرداخت

```typescript
// apps/api/test/e2e/sale-payment-flow.e2e.spec.ts
describe('Sale → Payment Full Flow', () => {
  it('create sale → customer report → staff confirm → completed', async () => {
    const ownerToken = await loginStaff('09120000001', 'owner');
    const customerToken = await loginCustomer('09129999999');

    // ۱. ایجاد فروش
    const saleRes = await request(app.getHttpServer())
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('X-Branch-Id', branch.id)
      .send({
        tenantCustomerId: customer.id,
        totalAmountRial: '6000000',
        downPaymentRial: '0',
        installmentCount: 1,
        title: 'خرید تست E2E',
        firstDueDate: '2025-03-01',
        intervalDays: 30,
      });

    expect(saleRes.status).toBe(201);
    const { saleId } = saleRes.body;

    // ۲. دریافت لیست اقساط توسط مشتری
    const installmentsRes = await request(app.getHttpServer())
      .get('/api/v1/customer/installments')
      .set('Authorization', `Bearer ${customerToken}`);

    const installment = installmentsRes.body.find((i: any) =>
      i.saleId === saleId
    );
    expect(installment).toBeDefined();

    // ۳. مشتری گزارش پرداخت می‌دهد
    const reportRes = await request(app.getHttpServer())
      .post(`/api/v1/customer/installments/${installment.id}/report-payment`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ amountRial: '6000000', note: 'واریز کردم' });

    expect(reportRes.status).toBe(201);
    const { attemptId } = reportRes.body;

    // ۴. فروشنده تأیید می‌کند
    const confirmRes = await request(app.getHttpServer())
      .post(`/api/v1/payments/${attemptId}/confirm`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(confirmRes.status).toBe(200);

    // ۵. بررسی وضعیت نهایی
    const finalSale = await request(app.getHttpServer())
      .get(`/api/v1/sales/${saleId}`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(finalSale.body.status).toBe('completed');
  });
});
```

---

## ۱۰. Critical Test Scenarios — Checklist

### Domain

- [x] مجموع اقساط = مبلغ کل − پیش‌پرداخت
- [x] باقی‌مانده تقسیم به قسط اول اضافه می‌شود
- [x] قسط paid → هیچ transition مجاز نیست
- [x] overdue transition فقط با due_date گذشته
- [x] cancel فروش فقط بدون قسط paid
- [x] sale خودکار completed با همه paid/waived
- [x] idempotent reminder (بدون duplicate)
- [x] bot link token یک‌بار مصرف

### RBAC

- [x] DENY override > GRANT role
- [x] cashier با branch scope نمی‌تواند branch دیگر ببیند
- [x] customer نمی‌تواند endpoint staff استفاده کند
- [x] cross-tenant → 404 (نه 403)
- [x] JWT spoofing tenant_id رد می‌شود
- [x] بدون توکن → 401
- [x] توکن منقضی → 401

### Payment Flow

- [x] customer report → `PaymentAttempt.pending`
- [x] staff confirm → installment paid + audit
- [x] staff reject → customer event در outbox
- [x] duplicate pending → خطا PAYMENT_PENDING_EXISTS
- [x] تأیید attempt قبلاً تأییدشده → خطا

### Auth

- [x] OTP rate limit (3/min)
- [x] OTP یک‌بار مصرف
- [x] OTP منقضی (5 دقیقه)
- [x] شماره تلفن normalize شود

---

## ۱۱. Observability

### Structured Logging (Pino)

```typescript
logger.info({
  tenantId,
  installmentId,
  event: 'reminder.sent',
  channel: 'telegram',
}, 'ok');

// ❌ ممنوع در production
console.log('installment paid', installmentId);

// ❌ PII ممنوع
logger.info({ phone: '09121234567' }, 'OTP sent');

// ✅ بدون PII
logger.info({ customerId, maskedPhone: '0912****567' }, 'OTP sent');
```

### Error Tracking

- **Sentry** در همه apps
- PII scrubbing در Sentry config
- Breadcrumbs برای tenant context

### Metrics (Phase 2+)

| Metric | Type | Label‌ها |
|--------|------|---------|
| `reminders_sent_total` | counter | `channel`, `tenant_id` |
| `overdue_installments` | gauge | `tenant_id` |
| `api_request_duration_ms` | histogram | `method`, `path`, `status` |
| `otp_requests_total` | counter | `actor`, `result` |
| `payment_attempts_total` | counter | `result`, `tenant_id` |

Prometheus + Grafana (وقتی ترافیک توجیه کند).

---

## ۱۲. Health Checks

```
GET /health
  → DB ping (< 50ms)
  → Redis ping (< 10ms)
  → Queue depth (warning اگر > 1000)

GET /health/ready  → dependency checks
GET /health/live   → process alive
```

---

## ۱۳. CI Pipeline — جریان کامل

```
PR opened:
  ┌─────────────────────────────────────────────┐
  │ 1. lint (ESLint + Prettier)                 │
  │ 2. typecheck (tsc --noEmit strict)          │
  │ 3. unit tests (Vitest — بدون DB)            │ ← < 30s
  │ 4. integration tests (Testcontainers PG+Redis) │ ← < 3min
  │ 5. coverage check (thresholds must pass)    │
  │ 6. build all apps (turbo build)             │
  │ 7. OpenAPI diff (اگر api تغییر کرده)        │
  │ 8. check prisma.*.delete( in business code  │ ← soft-delete CI guard
  └─────────────────────────────────────────────┘

main merge:
  ┌─────────────────────────────────────────────┐
  │ 9.  build docker images                     │
  │ 10. push to registry                        │
  │ 11. deploy staging                          │
  │ 12. smoke test (GET /health + 5 key flows)  │
  │ 13. manual approve → production             │
  └─────────────────────────────────────────────┘
```

### CI Commands

```bash
# local — قبل از push
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:integration
pnpm test:coverage

# E2E (CI only یا local با docker)
pnpm test:e2e

# Watch mode در development
pnpm test:watch
```

---

## ۱۴. Database Migrations در CI

- **Prisma migrate** فقط — هرگز `db push` در production
- Migration review اجباری برای:
  - drop column
  - تغییر type روی فیلدهای مالی
  - NOT NULL اضافه کردن روی جدول پر داده

---

## ۱۵. Backup & Restore

| Item | Schedule | مکان |
|------|----------|------|
| PG full dump | daily 03:00 | Arvan Object Storage |
| WAL archiving | continuous | Arvan Object Storage |
| Retention | 90 days min | — |
| Restore test | ماهانه | staging env |

---

## ۱۶. Alerting — Production

| Alert | Condition | Action |
|-------|-----------|--------|
| API error rate | > 1% for 5min | PagerDuty |
| Reminder queue backlog | > 1000 jobs | Slack + on-call |
| OTP failure rate | > 10% | Investigate |
| Disk space | < 20% | Auto-scale + alert |
| DB connections | > 80% pool | Alert |
| Response P99 | > 2s | Performance review |

---

*نسخه 2.0 — 1405/04/08*
