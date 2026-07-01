/**
 * TASK-123 — Phase 1 exit gate (operational-phases.md §فاز ۱):
 * مشتری → فروش → اقساط → گزارش معوقات
 *
 * Playwright UI E2E (`apps/web/e2e/phase1-seller-panel.spec.ts`) is P1 stretch — not blocking.
 */
import { JwtTokenService, PrismaService } from '@hivork/infrastructure';
import { ModuleRegistryService } from '@hivork/module-core';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import Redis from 'ioredis';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AppModule } from '../app.module.js';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter.js';
import { AppConfigService } from '../config/app-config.service.js';
import { seedCrossTenantFixtures } from '../test-utils/cross-tenant-seed.helper.js';
import { loginDemoShopOwner } from '../test-utils/demo-shop-auth.helper.js';
import { markInstallmentOverdueForTest } from '../test-utils/overdue-test.helper.js';
import {
  futureDateOnly,
  issueStaffAccessToken,
  seedPhase1RbacFixtures,
} from '../test-utils/rbac-seed.helper.js';

const databaseUrl = process.env.DATABASE_URL;
const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
const hasDatabase = Boolean(databaseUrl) || process.env.CI === 'true';

async function probeRedis(url: string): Promise<boolean> {
  const client = new Redis(url, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    connectTimeout: 2_000,
  });

  try {
    await client.connect();
    await client.ping();
    await client.quit();
    return true;
  } catch {
    try {
      await client.quit();
    } catch {
      // ignore
    }
    return false;
  }
}

const redisAvailable = await probeRedis(redisUrl);
const describeIfRuntime = hasDatabase && redisAvailable ? describe : describe.skip;

function parseRial(value: string): bigint {
  return BigInt(value);
}

describeIfRuntime('Phase 1 vertical slice (HTTP E2E)', () => {
  const redis = new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 });
  const prisma = new PrismaService();
  let baseUrl = '';
  let app: Awaited<ReturnType<typeof createApp>>['app'];
  let server: Awaited<ReturnType<typeof createApp>>['server'];
  let tokens: JwtTokenService;
  let ownerToken = '';
  let branchId = '';
  let tenantBToken = '';
  let viewerToken = '';

  beforeAll(async () => {
    await redis.connect();
    const created = await createApp();
    app = created.app;
    server = created.server;
    tokens = app.get(JwtTokenService);

    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 4000;
    baseUrl = `http://127.0.0.1:${port}/api`;

    const rbacSeed = await seedPhase1RbacFixtures(prisma, redis);
    const crossTenantSeed = await seedCrossTenantFixtures(prisma, redis);
    ownerToken = await issueStaffAccessToken(tokens, rbacSeed.owner);
    viewerToken = await issueStaffAccessToken(tokens, rbacSeed.viewer);
    tenantBToken = await issueStaffAccessToken(tokens, crossTenantSeed.tenantB.owner);

    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'demo-shop', deletedAt: null },
      include: {
        branches: { where: { deletedAt: null, isActive: true }, take: 1 },
      },
    });
    if (!tenant?.branches[0]) {
      throw new Error('demo-shop branch required');
    }
    branchId = tenant.branches[0].id;
  });

  afterAll(async () => {
    if (redis.status === 'ready') {
      await redis.quit();
    }

    await prisma.$disconnect();

    if (app) {
      await app.close();
    }

    if (server?.listening) {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  });

  async function request(path: string, init?: RequestInit & { token?: string }) {
    const headers = new Headers(init?.headers);
    if (init?.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    if (init?.token) {
      headers.set('Authorization', `Bearer ${init.token}`);
    }

    const response = await fetch(`${baseUrl}${path}`, { ...init, headers });
    const text = await response.text();
    const body = text ? (JSON.parse(text) as unknown) : null;
    return { response, body };
  }

  async function ensureOwnerToken(): Promise<string> {
    return ownerToken;
  }

  it('exit flow: customer → sale → installments → overdue report', async () => {
    const token = await ensureOwnerToken();
    const customerPhone = `0912${String(Date.now()).slice(-7)}`;
    const flowMarker = `Phase1-E2E-${Date.now()}`;

    const customersBefore = await request('/v1/customers?limit=5', { token });
    expect(customersBefore.response.status).toBe(200);
    const countBefore = (customersBefore.body as { data: unknown[] }).data.length;

    const createCustomer = await request('/v1/customers', {
      method: 'POST',
      token,
      body: JSON.stringify({
        phone: customerPhone,
        name: 'مشتری تست فاز ۱',
        localCode: `P1-${String(Date.now()).slice(-4)}`,
      }),
    });
    expect(createCustomer.response.status).toBe(201);
    const customerId = (createCustomer.body as { id: string }).id;

    const customersAfter = await request('/v1/customers?limit=100', { token });
    expect(customersAfter.response.status).toBe(200);
    const customerRows = (customersAfter.body as { data: Array<{ id: string }> }).data;
    expect(customerRows.length).toBeGreaterThanOrEqual(countBefore + 1);
    expect(customerRows.some((row) => row.id === customerId)).toBe(true);

    const totalAmountRial = '12000000';
    const downPaymentRial = '2000000';
    const idempotencyKey = crypto.randomUUID();

    const createSale = await request('/v1/sales', {
      method: 'POST',
      token,
      headers: { 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify({
        tenantCustomerId: customerId,
        branchId,
        title: flowMarker,
        totalAmountRial,
        downPaymentRial,
        installmentCount: 4,
        firstDueDate: futureDateOnly(45),
        contractDate: futureDateOnly(30),
        intervalDays: 30,
      }),
    });
    expect(createSale.response.status).toBe(201);

    const saleBody = createSale.body as {
      id: string;
      installments: Array<{ id: string; amountRial: string }>;
      downPaymentRial: string;
      totalAmountRial: string;
    };
    const saleId = saleBody.id;
    expect(saleBody.installments).toHaveLength(4);

    const installmentSum = saleBody.installments.reduce(
      (sum, row) => sum + parseRial(row.amountRial),
      0n,
    );
    expect(installmentSum + parseRial(downPaymentRial)).toBe(parseRial(totalAmountRial));

    const saleDetail = await request(`/v1/sales/${saleId}`, { token });
    expect(saleDetail.response.status).toBe(200);
    expect((saleDetail.body as { installments: unknown[] }).installments).toHaveLength(4);

    const installmentList = await request(`/v1/installments?saleId=${saleId}&limit=10`, {
      token,
    });
    expect(installmentList.response.status).toBe(200);
    expect((installmentList.body as { data: unknown[] }).data).toHaveLength(4);

    const targetInstallmentId = saleBody.installments[0]?.id;
    expect(targetInstallmentId).toBeTruthy();

    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'demo-shop', deletedAt: null },
      select: { id: true },
    });
    if (!tenant) {
      throw new Error('demo-shop tenant required');
    }

    const overdueBefore = await request(
      `/v1/installments?saleId=${saleId}&status=overdue&limit=10`,
      { token },
    );
    expect(overdueBefore.response.status).toBe(200);
    expect(
      (overdueBefore.body as { data: Array<{ id: string }> }).data.some(
        (row) => row.id === targetInstallmentId,
      ),
    ).toBe(false);

    await markInstallmentOverdueForTest(prisma, targetInstallmentId!, tenant.id);

    const overdueInstallments = await request(
      `/v1/installments?saleId=${saleId}&status=overdue&limit=10`,
      { token },
    );
    expect(overdueInstallments.response.status).toBe(200);
    const overdueRows = (
      overdueInstallments.body as {
        data: Array<{ id: string; daysOverdue?: number }>;
        meta: { totalAmountRial?: string };
      }
    ).data;
    const overdueRow = overdueRows.find((row) => row.id === targetInstallmentId);
    expect(overdueRow).toBeTruthy();
    expect((overdueRow?.daysOverdue ?? 0) >= 1).toBe(true);

    const overdueReport = await request(
      `/v1/reports/overdue?search=${encodeURIComponent(customerPhone)}&limit=10`,
      { token },
    );
    expect(overdueReport.response.status).toBe(200);
    const reportRows = (
      overdueReport.body as {
        data: Array<{ customerId: string; totalOverdueRial: string; overdueCount: number }>;
      }
    ).data;
    expect(reportRows.some((row) => row.customerId === customerId)).toBe(true);
    expect(
      reportRows.some((row) => parseRial(row.totalOverdueRial) > 0n && row.overdueCount >= 1),
    ).toBe(true);
  });

  it('duplicate Idempotency-Key returns cached sale', async () => {
    const token = await ensureOwnerToken();
    const customerPhone = `0913${String(Date.now()).slice(-7)}`;

    const customer = await request('/v1/customers', {
      method: 'POST',
      token,
      body: JSON.stringify({ phone: customerPhone, name: 'مشتری idempotency' }),
    });
    expect(customer.response.status).toBe(201);
    const customerId = (customer.body as { id: string }).id;

    const idempotencyKey = crypto.randomUUID();
    const body = JSON.stringify({
      tenantCustomerId: customerId,
      branchId,
      title: `Idempotency ${Date.now()}`,
      totalAmountRial: '3000000',
      downPaymentRial: '0',
      installmentCount: 2,
      firstDueDate: futureDateOnly(40),
      contractDate: futureDateOnly(25),
      intervalDays: 30,
    });

    const first = await request('/v1/sales', {
      method: 'POST',
      token,
      headers: { 'Idempotency-Key': idempotencyKey },
      body,
    });
    const second = await request('/v1/sales', {
      method: 'POST',
      token,
      headers: { 'Idempotency-Key': idempotencyKey },
      body,
    });

    expect(first.response.status).toBe(201);
    expect(second.response.status).toBe(201);
    expect((second.body as { id: string }).id).toBe((first.body as { id: string }).id);
  });

  it('cross-tenant sale access returns 404 SALE_NOT_FOUND (not 403)', async () => {
    const token = await ensureOwnerToken();
    const customer = await request('/v1/customers', {
      method: 'POST',
      token,
      body: JSON.stringify({
        phone: `0914${String(Date.now()).slice(-7)}`,
        name: 'مشتری cross-tenant',
      }),
    });
    const customerId = (customer.body as { id: string }).id;

    const sale = await request('/v1/sales', {
      method: 'POST',
      token,
      headers: { 'Idempotency-Key': crypto.randomUUID() },
      body: JSON.stringify({
        tenantCustomerId: customerId,
        branchId,
        totalAmountRial: '2000000',
        downPaymentRial: '0',
        installmentCount: 2,
        firstDueDate: futureDateOnly(40),
        contractDate: futureDateOnly(25),
        intervalDays: 30,
      }),
    });
    const saleId = (sale.body as { id: string }).id;

    const crossTenant = await request(`/v1/sales/${saleId}`, { token: tenantBToken });
    expect(crossTenant.response.status).toBe(404);
    expect(crossTenant.response.status).not.toBe(403);
    expect((crossTenant.body as { code: string }).code).toBe('SALE_NOT_FOUND');
  });

  it('viewer cannot create sale → 403 PERMISSION_DENIED', async () => {
    const token = await ensureOwnerToken();
    const customer = await request('/v1/customers', {
      method: 'POST',
      token,
      body: JSON.stringify({
        phone: `0915${String(Date.now()).slice(-7)}`,
        name: 'مشتری RBAC',
      }),
    });
    const customerId = (customer.body as { id: string }).id;

    const denied = await request('/v1/sales', {
      method: 'POST',
      token: viewerToken,
      headers: { 'Idempotency-Key': crypto.randomUUID() },
      body: JSON.stringify({
        tenantCustomerId: customerId,
        branchId,
        totalAmountRial: '2000000',
        downPaymentRial: '0',
        installmentCount: 2,
        firstDueDate: futureDateOnly(40),
        contractDate: futureDateOnly(25),
        intervalDays: 30,
      }),
    });

    expect(denied.response.status).toBe(403);
    expect((denied.body as { code: string }).code).toBe('PERMISSION_DENIED');
  });

  it('cancelled sale installments are excluded from overdue list', async () => {
    const token = await ensureOwnerToken();
    const customer = await request('/v1/customers', {
      method: 'POST',
      token,
      body: JSON.stringify({
        phone: `0916${String(Date.now()).slice(-7)}`,
        name: 'مشتری لغو',
      }),
    });
    const customerId = (customer.body as { id: string }).id;

    const sale = await request('/v1/sales', {
      method: 'POST',
      token,
      headers: { 'Idempotency-Key': crypto.randomUUID() },
      body: JSON.stringify({
        tenantCustomerId: customerId,
        branchId,
        title: `Cancel-Overdue ${Date.now()}`,
        totalAmountRial: '2000000',
        downPaymentRial: '0',
        installmentCount: 2,
        firstDueDate: futureDateOnly(40),
        contractDate: futureDateOnly(25),
        intervalDays: 30,
      }),
    });
    const saleBody = sale.body as {
      id: string;
      installments: Array<{ id: string }>;
    };
    const installmentId = saleBody.installments[0]?.id;
    expect(installmentId).toBeTruthy();

    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'demo-shop', deletedAt: null },
      select: { id: true },
    });
    if (!tenant) {
      throw new Error('demo-shop tenant required');
    }

    await markInstallmentOverdueForTest(prisma, installmentId!, tenant.id);

    await request(`/v1/sales/${saleBody.id}/cancel`, {
      method: 'POST',
      token,
      body: JSON.stringify({ reason: 'تست حذف از گزارش معوقات' }),
    });

    const overdueList = await request(
      `/v1/installments?saleId=${saleBody.id}&status=overdue&limit=10`,
      { token },
    );
    expect(overdueList.response.status).toBe(200);
    expect(
      (overdueList.body as { data: Array<{ id: string }> }).data.some(
        (row) => row.id === installmentId,
      ),
    ).toBe(false);
  });
});

async function createApp() {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  const appConfig = app.get(AppConfigService);

  app.use(cookieParser());
  app.enableCors({ origin: appConfig.corsOrigin, credentials: true });
  app.setGlobalPrefix('api', {
    exclude: [{ path: 'health', method: RequestMethod.GET }],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.get(ModuleRegistryService).bootstrap(app);

  await app.init();
  const server = app.getHttpServer() as import('node:http').Server;

  return { app, server };
}
