import { JwtTokenService, PrismaService } from '@hivork/infrastructure';
import Redis from 'ioredis';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  createCustomerViaApi,
  createCustomerWithSale,
  issueToken,
  uniquePhone,
} from './customer-test.helpers.js';
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
  seedPhase1RbacFixtures,
  type Phase1RbacSeed,
} from '../../../src/test-utils/rbac-seed.helper.js';

const databaseUrl = process.env.DATABASE_URL;
const redisAvailable = await probeRedis();
const describeIfRuntime = hasIntegrationRuntime(databaseUrl) && redisAvailable ? describe : describe.skip;

describeIfRuntime('Customer RBAC integration (IFP-054)', () => {
  const redis = new Redis(DEFAULT_REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 });
  const prisma = new PrismaService();
  let baseUrl = '';
  let app: Awaited<ReturnType<typeof createIntegrationApp>>['app'];
  let server: Awaited<ReturnType<typeof createIntegrationApp>>['server'];
  let request = createHttpClient('');
  let tokens: JwtTokenService;
  let seed: Phase1RbacSeed;
  let ownerToken = '';
  let cashierToken = '';
  let branchAStaffToken = '';

  beforeAll(async () => {
    await redis.connect();
    const created = await createIntegrationApp();
    app = created.app;
    server = created.server;
    tokens = app.get(JwtTokenService);

    const started = await startHttpServer(server);
    baseUrl = started.baseUrl;
    request = createHttpClient(baseUrl);

    seed = await seedPhase1RbacFixtures(prisma, redis);
    ownerToken = await issueToken(tokens, seed.owner);
    cashierToken = await issueToken(tokens, seed.cashier);
    branchAStaffToken = await issueToken(tokens, seed.branchAStaff);
  });

  afterAll(async () => {
    if (redis.status === 'ready') {
      await redis.quit();
    }
    await prisma.$disconnect();
    await stopHttpServer(app, server);
  });

  it('cashier without merge permission cannot merge customers → 403 PERMISSION_DENIED', async () => {
    const runId = Date.now();
    const source = await createCustomerWithSale(request, ownerToken, {
      phone: uniquePhone('0930'),
      name: `RBAC Source ${runId}`,
      branchId: seed.branchA.id,
      saleTitle: `RBAC Source Sale ${runId}`,
    });
    const target = await createCustomerWithSale(request, ownerToken, {
      phone: uniquePhone('0931'),
      name: `RBAC Target ${runId}`,
      branchId: seed.branchA.id,
      saleTitle: `RBAC Target Sale ${runId}`,
    });

    const result = await request('/v1/customers/merge', {
      method: 'POST',
      token: cashierToken,
      idempotencyKey: crypto.randomUUID(),
      body: JSON.stringify({
        sourceTenantCustomerId: source.id,
        targetTenantCustomerId: target.id,
        reason: 'cashier merge attempt should be denied',
      }),
    });

    expect(result.response.status).toBe(403);
    expect((result.body as { code: string }).code).toBe('PERMISSION_DENIED');
  });

  it('branch-scoped staff cannot read customer assigned to another branch → 404', async () => {
    const runId = Date.now();
    const branchBCustomer = await createCustomerViaApi(request, ownerToken, {
      phone: uniquePhone('0932'),
      name: `Branch B Customer ${runId}`,
      defaultBranchId: seed.branchB.id,
      localCode: `BB-${runId}`,
    });

    const result = await request(`/v1/customers/${branchBCustomer.id}`, {
      token: branchAStaffToken,
    });

    expect(result.response.status).toBe(404);
    expect(result.response.status).not.toBe(403);
    expect((result.body as { code: string }).code).toBe('CUSTOMER_NOT_FOUND');
  });

  it('branch-scoped staff list excludes customers outside assigned branches', async () => {
    const runId = Date.now();
    const branchBCustomer = await createCustomerViaApi(request, ownerToken, {
      phone: uniquePhone('0933'),
      name: `Branch B List ${runId}`,
      defaultBranchId: seed.branchB.id,
    });

    const result = await request(`/v1/customers?search=${encodeURIComponent(branchBCustomer.phone)}`, {
      token: branchAStaffToken,
    });

    expect(result.response.status).toBe(200);
    const data = (result.body as { data: Array<{ id: string }> }).data;
    expect(data.find((row) => row.id === branchBCustomer.id)).toBeUndefined();
  });
});
