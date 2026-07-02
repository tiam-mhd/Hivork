import { JwtTokenService, PrismaService } from '@hivork/infrastructure';
import Redis from 'ioredis';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { issueToken } from './customer-test.helpers.js';
import {
  createHttpClient,
  createIntegrationApp,
  DEFAULT_REDIS_URL,
  hasIntegrationRuntime,
  probeRedis,
  startHttpServer,
  stopHttpServer,
} from '../helpers/integration-runtime.helper.js';
import {
  seedCrossTenantFixtures,
  type CrossTenantSeed,
} from '../../../src/test-utils/cross-tenant-seed.helper.js';
import { futureDateOnly } from '../../../src/test-utils/rbac-seed.helper.js';

const databaseUrl = process.env.DATABASE_URL;
const redisAvailable = await probeRedis();
const describeIfRuntime = hasIntegrationRuntime(databaseUrl) && redisAvailable ? describe : describe.skip;

describeIfRuntime('Customer cross-tenant isolation (IFP-054)', () => {
  const redis = new Redis(DEFAULT_REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 });
  const prisma = new PrismaService();
  let baseUrl = '';
  let app: Awaited<ReturnType<typeof createIntegrationApp>>['app'];
  let server: Awaited<ReturnType<typeof createIntegrationApp>>['server'];
  let request = createHttpClient('');
  let tokens: JwtTokenService;
  let seed: CrossTenantSeed;
  let tokenA = '';
  let tokenB = '';

  beforeAll(async () => {
    await redis.connect();
    const created = await createIntegrationApp();
    app = created.app;
    server = created.server;
    tokens = app.get(JwtTokenService);

    const started = await startHttpServer(server);
    baseUrl = started.baseUrl;
    request = createHttpClient(baseUrl);

    seed = await seedCrossTenantFixtures(prisma, redis);
    tokenA = await issueToken(tokens, seed.tenantA.owner);
    tokenB = await issueToken(tokens, seed.tenantB.owner);
  });

  afterAll(async () => {
    if (redis.status === 'ready') {
      await redis.quit();
    }
    await prisma.$disconnect();
    await stopHttpServer(app, server);
  });

  it('GET /customers/:id — tenant B cannot read tenant A customer (404)', async () => {
    const result = await request(`/v1/customers/${seed.tenantA.customerId}`, { token: tokenB });

    expect(result.response.status).toBe(404);
    expect(result.response.status).not.toBe(403);
    expect((result.body as { code: string }).code).toBe('CUSTOMER_NOT_FOUND');
  });

  it('GET /customers — tenant A list never returns tenant B customers', async () => {
    const result = await request('/v1/customers?limit=100', { token: tokenA });

    expect(result.response.status).toBe(200);
    const data = (result.body as { data: Array<{ id: string }> }).data;
    expect(data.find((row) => row.id === seed.tenantB.customerId)).toBeUndefined();
    expect(data.find((row) => row.id === seed.tenantA.customerId)).toBeTruthy();
  });

  it('POST /customers/merge — tenant A cannot merge tenant B customer id (404)', async () => {
    const result = await request('/v1/customers/merge', {
      method: 'POST',
      token: tokenA,
      idempotencyKey: crypto.randomUUID(),
      body: JSON.stringify({
        sourceTenantCustomerId: seed.tenantA.customerId,
        targetTenantCustomerId: seed.tenantB.customerId,
        reason: 'cross-tenant merge attempt must fail',
      }),
    });

    expect(result.response.status).toBe(404);
    expect((result.body as { code: string }).code).toBe('CUSTOMER_NOT_FOUND');
  });

  it('PATCH /customers/:id — tenant A cannot update tenant B customer (404)', async () => {
    const detail = await request(`/v1/customers/${seed.tenantB.customerId}`, { token: tokenB });
    expect(detail.response.status).toBe(200);
    const version = (detail.body as { version: number }).version;

    const result = await request(`/v1/customers/${seed.tenantB.customerId}`, {
      method: 'PATCH',
      token: tokenA,
      body: JSON.stringify({
        version,
        name: 'Cross-tenant hijack',
      }),
    });

    expect(result.response.status).toBe(404);
    expect((result.body as { code: string }).code).toBe('CUSTOMER_NOT_FOUND');
  });

  it('POST /customers/export — tenant A export with injected tenant B id does not leak data', async () => {
    const exported = await request('/v1/customers/export', {
      method: 'POST',
      token: tokenA,
      body: JSON.stringify({
        format: 'xlsx',
        ids: [seed.tenantA.customerId, seed.tenantB.customerId],
      }),
    });

    expect(exported.response.status).toBe(200);
    const rowCount = Number(exported.response.headers.get('x-export-row-count') ?? '0');
    expect(rowCount).toBe(1);

    const list = await request('/v1/customers?limit=100', { token: tokenA });
    const tenantACount = (list.body as { data: unknown[] }).data.length;
    expect(rowCount).toBeLessThanOrEqual(tenantACount);
  });

  it('GET /customers search with SQL injection attempt returns safely without server error', async () => {
    const malicious = "' OR 1=1; DROP TABLE tenant_customers; --";
    const result = await request(`/v1/customers?search=${encodeURIComponent(malicious)}`, {
      token: tokenA,
    });

    expect(result.response.status).toBe(200);
    expect(Array.isArray((result.body as { data: unknown[] }).data)).toBe(true);

    const tableExists = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'tenant_customers'
      ) AS exists
    `;
    expect(tableExists[0]?.exists).toBe(true);
  });

  it('POST /sales — tenant B cannot create sale for tenant A customer (404)', async () => {
    const result = await request('/v1/sales', {
      method: 'POST',
      token: tokenB,
      idempotencyKey: crypto.randomUUID(),
      body: JSON.stringify({
        tenantCustomerId: seed.tenantA.customerId,
        branchId: seed.tenantB.branchId,
        totalAmountRial: '2000000',
        downPaymentRial: '0',
        installmentCount: 2,
        firstDueDate: futureDateOnly(45),
        contractDate: futureDateOnly(30),
        intervalDays: 30,
      }),
    });

    expect(result.response.status).toBe(404);
    expect((result.body as { code: string }).code).toBe('CUSTOMER_NOT_FOUND');
  });
});
