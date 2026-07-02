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
import {
  futureDateOnly,
  issueStaffAccessToken,
  seedPhase1RbacFixtures,
  type Phase1RbacSeed,
  type SeedStaff,
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

describeIfRuntime('Phase 1 RBAC integration', () => {
  const redis = new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 });
  const prisma = new PrismaService();
  let baseUrl = '';
  let app: Awaited<ReturnType<typeof createApp>>['app'];
  let server: Awaited<ReturnType<typeof createApp>>['server'];
  let tokens: JwtTokenService;
  let seed: Phase1RbacSeed;
  const tokenByStaffId = new Map<string, string>();

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

    seed = await seedPhase1RbacFixtures(prisma, redis);
    await warmTokens(seed.owner, seed.cashier, seed.viewer, seed.branchAStaff, seed.ownScopeStaff);
    await warmTokens(
      seed.cashierWithDenyOverride,
      seed.viewerWithoutSaleList,
      seed.viewerWithCreateGrant,
      seed.noModuleStaff,
    );
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

  async function warmTokens(...staffMembers: SeedStaff[]): Promise<void> {
    for (const staff of staffMembers) {
      tokenByStaffId.set(staff.id, await issueStaffAccessToken(tokens, staff));
    }
  }

  function tokenFor(staff: SeedStaff): string {
    const token = tokenByStaffId.get(staff.id);
    if (!token) {
      throw new Error(`Missing token for staff ${staff.id}`);
    }
    return token;
  }

  async function request(path: string, init?: RequestInit & { token?: string }) {
    const headers = new Headers(init?.headers);
    if (init?.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    if (init?.token) {
      headers.set('Authorization', `Bearer ${init.token}`);
    }

    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers,
    });

    const text = await response.text();
    const body = text ? (JSON.parse(text) as unknown) : null;
    return { response, body };
  }

  function createSaleBody(branchId: string, title?: string) {
    return {
      tenantCustomerId: seed.customerId,
      branchId,
      title: title ?? `RBAC Sale ${crypto.randomUUID()}`,
      totalAmountRial: '3000000',
      downPaymentRial: '0',
      installmentCount: 2,
      firstDueDate: futureDateOnly(45),
      contractDate: futureDateOnly(30),
      intervalDays: 30,
    };
  }

  async function postSale(staff: SeedStaff, branchId = seed.branchA.id, title?: string) {
    return request('/v1/sales', {
      method: 'POST',
      token: tokenFor(staff),
      headers: { 'Idempotency-Key': crypto.randomUUID() },
      body: JSON.stringify(createSaleBody(branchId, title)),
    });
  }

  it('owner creates sale → 201', async () => {
    const result = await postSale(seed.owner);
    expect(result.response.status).toBe(201);
    expect((result.body as { id: string }).id).toBeTruthy();
  });

  it('viewer cannot create sale → 403 PERMISSION_DENIED', async () => {
    const result = await postSale(seed.viewer);
    expect(result.response.status).toBe(403);
    expect((result.body as { code: string }).code).toBe('PERMISSION_DENIED');
  });

  it('cashier lists sales → 200', async () => {
    const result = await request('/v1/sales?limit=5', { token: tokenFor(seed.cashier) });
    expect(result.response.status).toBe(200);
    expect(Array.isArray((result.body as { data: unknown[] }).data)).toBe(true);
  });

  it('staff without installments.sale.view cannot list sales → 403', async () => {
    const result = await request('/v1/sales?limit=5', {
      token: tokenFor(seed.viewerWithoutSaleList),
    });
    expect(result.response.status).toBe(403);
    expect((result.body as { code: string }).code).toBe('PERMISSION_DENIED');
  });

  it('viewer cannot cancel sale → 403 PERMISSION_DENIED', async () => {
    const created = await postSale(seed.owner);
    const saleId = (created.body as { id: string }).id;

    const result = await request(`/v1/sales/${saleId}/cancel`, {
      method: 'POST',
      token: tokenFor(seed.viewer),
      body: JSON.stringify({ reason: 'تلاش لغو بدون مجوز' }),
    });

    expect(result.response.status).toBe(403);
    expect((result.body as { code: string }).code).toBe('PERMISSION_DENIED');
  });

  it('cashier lists installments → 200', async () => {
    const result = await request('/v1/installments?limit=5', {
      token: tokenFor(seed.cashier),
    });
    expect(result.response.status).toBe(200);
    expect(Array.isArray((result.body as { data: unknown[] }).data)).toBe(true);
  });

  it('cashier lists customers → 200', async () => {
    const result = await request('/v1/customers?limit=5', { token: tokenFor(seed.cashier) });
    expect(result.response.status).toBe(200);
    expect(Array.isArray((result.body as { data: unknown[] }).data)).toBe(true);
  });

  it('viewer cannot patch installments settings → 403 PERMISSION_DENIED', async () => {
    const result = await request('/v1/settings/installments', {
      method: 'PATCH',
      token: tokenFor(seed.viewer),
      body: JSON.stringify({ reminder_days_before: [3] }),
    });
    expect(result.response.status).toBe(403);
    expect((result.body as { code: string }).code).toBe('PERMISSION_DENIED');
  });

  it('tenant without installments module → 403 MODULE_NOT_ENABLED', async () => {
    const result = await request('/v1/sales?limit=1', {
      token: tokenFor(seed.noModuleStaff),
    });
    expect(result.response.status).toBe(403);
    expect((result.body as { code: string }).code).toBe('MODULE_NOT_ENABLED');
  });

  it('DENY override beats role GRANT on sale.create', async () => {
    const result = await postSale(seed.cashierWithDenyOverride);
    expect(result.response.status).toBe(403);
    expect((result.body as { code: string }).code).toBe('PERMISSION_DENIED');
  });

  it('GRANT override allows sale.create for viewer role', async () => {
    const result = await postSale(seed.viewerWithCreateGrant);
    expect(result.response.status).toBe(201);
    expect((result.body as { id: string }).id).toBeTruthy();
  });

  it('cashier with installments.sale.create can create sale → 201', async () => {
    const result = await postSale(seed.cashier);
    expect(result.response.status).toBe(201);
  });

  it('branch scope staff lists only assigned branch sales', async () => {
    const marker = `RBAC-BRANCH-${crypto.randomUUID()}`;
    const branchSale = await postSale(seed.owner, seed.branchA.id, `${marker}-A`);
    const otherBranchSale = await postSale(seed.owner, seed.branchB.id, `${marker}-B`);
    expect(branchSale.response.status).toBe(201);
    expect(otherBranchSale.response.status).toBe(201);

    const branchSaleId = (branchSale.body as { id: string }).id;
    const otherBranchSaleId = (otherBranchSale.body as { id: string }).id;

    const result = await request('/v1/sales?limit=50&search=' + encodeURIComponent(marker), {
      token: tokenFor(seed.branchAStaff),
    });

    expect(result.response.status).toBe(200);
    const data = (result.body as { data: Array<{ id: string; branchId: string }> }).data;
    const ids = data.map((row) => row.id);

    expect(ids).toContain(branchSaleId);
    expect(ids).not.toContain(otherBranchSaleId);
    expect(data.every((row) => row.branchId === seed.branchA.id)).toBe(true);
  });

  it('own scope staff lists only own sales', async () => {
    const marker = `RBAC-OWN-${crypto.randomUUID()}`;
    const ownSale = await postSale(seed.ownScopeStaff, seed.branchA.id, `${marker}-OWN`);
    const ownerSale = await postSale(seed.owner, seed.branchA.id, `${marker}-OWNER`);
    expect(ownSale.response.status).toBe(201);
    expect(ownerSale.response.status).toBe(201);

    const ownSaleId = (ownSale.body as { id: string }).id;
    const ownerSaleId = (ownerSale.body as { id: string }).id;

    const result = await request('/v1/sales?limit=50&search=' + encodeURIComponent(marker), {
      token: tokenFor(seed.ownScopeStaff),
    });

    expect(result.response.status).toBe(200);
    const ids = (result.body as { data: Array<{ id: string }> }).data.map((row) => row.id);

    expect(ids).toContain(ownSaleId);
    expect(ids).not.toContain(ownerSaleId);
  });

  it('returns 401 without Authorization header', async () => {
    const result = await request('/v1/sales?limit=1');
    expect(result.response.status).toBe(401);
    expect((result.body as { code: string }).code).toBe('UNAUTHORIZED');
  });

  describe('enterprise contract lifecycle (IFP-064)', () => {
    const fakeSaleId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

    function branchHeaders(branchId: string): HeadersInit {
      return { 'X-Branch-Id': branchId };
    }

    it('viewer cannot terminate sale → 403 PERMISSION_DENIED', async () => {
      const result = await request(`/v1/sales/${fakeSaleId}/terminate`, {
        method: 'POST',
        token: tokenFor(seed.viewer),
        headers: branchHeaders(seed.branchA.id),
        body: JSON.stringify({ reason: 'تلاش فسخ بدون مجوز' }),
      });

      expect(result.response.status).toBe(403);
      expect((result.body as { code: string }).code).toBe('PERMISSION_DENIED');
    });

    it('viewer cannot extend sale → 403 PERMISSION_DENIED', async () => {
      const result = await request(`/v1/sales/${fakeSaleId}/extend`, {
        method: 'POST',
        token: tokenFor(seed.viewer),
        headers: {
          ...branchHeaders(seed.branchA.id),
          'X-Sale-Version': '1',
        },
        body: JSON.stringify({
          newLastDueDate: futureDateOnly(120),
          additionalInstallmentCount: 1,
          reason: 'تلاش تمدید بدون مجوز',
        }),
      });

      expect(result.response.status).toBe(403);
      expect((result.body as { code: string }).code).toBe('PERMISSION_DENIED');
    });

    it('viewer cannot copy sale → 403 PERMISSION_DENIED', async () => {
      const result = await request(`/v1/sales/${fakeSaleId}/copy`, {
        method: 'POST',
        token: tokenFor(seed.viewer),
        headers: branchHeaders(seed.branchA.id),
        body: JSON.stringify({
          tenantCustomerId: seed.customerId,
          branchId: seed.branchA.id,
          contractDate: futureDateOnly(30),
          firstDueDate: futureDateOnly(45),
          reason: 'تلاش کپی بدون مجوز',
        }),
      });

      expect(result.response.status).toBe(403);
      expect((result.body as { code: string }).code).toBe('PERMISSION_DENIED');
    });

    it('viewer cannot close sale → 403 PERMISSION_DENIED', async () => {
      const result = await request(`/v1/sales/${fakeSaleId}/close`, {
        method: 'POST',
        token: tokenFor(seed.viewer),
        headers: branchHeaders(seed.branchA.id),
        body: JSON.stringify({ reason: 'تلاش بستن بدون مجوز' }),
      });

      expect(result.response.status).toBe(403);
      expect((result.body as { code: string }).code).toBe('PERMISSION_DENIED');
    });

    it('viewer cannot archive sale → 403 PERMISSION_DENIED', async () => {
      const result = await request(`/v1/sales/${fakeSaleId}/archive`, {
        method: 'POST',
        token: tokenFor(seed.viewer),
        headers: branchHeaders(seed.branchA.id),
        body: JSON.stringify({ reason: 'تلاش بایگانی بدون مجوز' }),
      });

      expect(result.response.status).toBe(403);
      expect((result.body as { code: string }).code).toBe('PERMISSION_DENIED');
    });

    it('viewer with sale.view can list contract versions → 200', async () => {
      const created = await postSale(seed.owner);
      expect(created.response.status).toBe(201);
      const saleId = (created.body as { id: string }).id;

      const result = await request(`/v1/sales/${saleId}/versions`, {
        token: tokenFor(seed.viewer),
      });

      expect(result.response.status).toBe(200);
      expect(Array.isArray((result.body as { data: unknown[] }).data)).toBe(true);
    });

    it('owner can terminate an active sale → 200', async () => {
      const created = await postSale(seed.owner);
      expect(created.response.status).toBe(201);
      const saleId = (created.body as { id: string }).id;

      const result = await request(`/v1/sales/${saleId}/terminate`, {
        method: 'POST',
        token: tokenFor(seed.owner),
        headers: branchHeaders(seed.branchA.id),
        body: JSON.stringify({ reason: 'فسخ تست RBAC' }),
      });

      expect(result.response.status).toBe(200);
      expect((result.body as { data: { status: string } }).data.status).toBe('terminated');
    });

    it('viewer cannot create guarantor → 403 PERMISSION_DENIED', async () => {
      const created = await postSale(seed.owner);
      expect(created.response.status).toBe(201);
      const saleId = (created.body as { id: string }).id;

      const result = await request(`/v1/sales/${saleId}/guarantors`, {
        method: 'POST',
        token: tokenFor(seed.viewer),
        headers: branchHeaders(seed.branchA.id),
        body: JSON.stringify({
          fullName: 'ضامن بدون مجوز',
          phone: '09121112233',
          relationship: 'other',
        }),
      });

      expect(result.response.status).toBe(403);
      expect((result.body as { code: string }).code).toBe('PERMISSION_DENIED');
    });

    it('viewer cannot bulk upsert line items → 403 PERMISSION_DENIED', async () => {
      const created = await postSale(seed.owner);
      expect(created.response.status).toBe(201);
      const saleId = (created.body as { id: string }).id;

      const result = await request(`/v1/sales/${saleId}/line-items`, {
        method: 'PUT',
        token: tokenFor(seed.viewer),
        headers: branchHeaders(seed.branchA.id),
        body: JSON.stringify({
          expectedVersion: 1,
          items: [{ title: 'Unauthorized line', unitPriceRial: '1000000' }],
        }),
      });

      expect(result.response.status).toBe(403);
      expect((result.body as { code: string }).code).toBe('PERMISSION_DENIED');
    });
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
