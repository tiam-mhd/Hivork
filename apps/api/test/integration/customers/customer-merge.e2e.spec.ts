import { PrismaService } from '@hivork/infrastructure';
import Redis from 'ioredis';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  countSalesForCustomer,
  createCustomerWithSale,
  loginDemoOwnerToken,
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

const databaseUrl = process.env.DATABASE_URL;
const redisAvailable = await probeRedis();
const describeIfRuntime = hasIntegrationRuntime(databaseUrl) && redisAvailable ? describe : describe.skip;

describeIfRuntime('Customer merge E2E (IFP-054)', () => {
  const redis = new Redis(DEFAULT_REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 });
  const prisma = new PrismaService();
  let baseUrl = '';
  let app: Awaited<ReturnType<typeof createIntegrationApp>>['app'];
  let server: Awaited<ReturnType<typeof createIntegrationApp>>['server'];
  let request = createHttpClient('');
  let ownerToken = '';
  let tenantId = '';
  let branchId = '';

  beforeAll(async () => {
    await redis.connect();
    const created = await createIntegrationApp();
    app = created.app;
    server = created.server;
    const started = await startHttpServer(server);
    baseUrl = started.baseUrl;
    request = createHttpClient(baseUrl);

    ownerToken = await loginDemoOwnerToken(redis, request);

    const tenant = await prisma.tenant.findFirstOrThrow({
      where: { slug: 'demo-shop', deletedAt: null },
      include: {
        branches: { where: { deletedAt: null, isActive: true }, take: 1 },
      },
    });
    tenantId = tenant.id;
    branchId = tenant.branches[0]?.id ?? '';
    if (!branchId) {
      throw new Error('demo-shop branch required');
    }
  });

  afterAll(async () => {
    if (redis.status === 'ready') {
      await redis.quit();
    }
    await prisma.$disconnect();
    await stopHttpServer(app, server);
  });

  it('merges source into target, reassigns sales, writes audit, soft-deletes source', async () => {
    const runId = Date.now();
    const source = await createCustomerWithSale(request, ownerToken, {
      phone: uniquePhone('0916'),
      name: `Merge Source ${runId}`,
      branchId,
      saleTitle: `Source Sale ${runId}`,
      localCode: `MS-${runId}`,
    });
    const target = await createCustomerWithSale(request, ownerToken, {
      phone: uniquePhone('0917'),
      name: `Merge Target ${runId}`,
      branchId,
      saleTitle: `Target Sale ${runId}`,
      localCode: `MT-${runId}`,
    });

    const idempotencyKey = crypto.randomUUID();
    const mergeBody = {
      sourceTenantCustomerId: source.id,
      targetTenantCustomerId: target.id,
      reason: 'duplicate profile detected in integration test',
    };

    const merged = await request('/v1/customers/merge', {
      method: 'POST',
      token: ownerToken,
      idempotencyKey,
      body: JSON.stringify(mergeBody),
    });

    expect(merged.response.status).toBe(200);
    expect((merged.body as { data: { id: string } }).data.id).toBe(target.id);
    expect((merged.body as { meta: { mergedSalesCount: number } }).meta.mergedSalesCount).toBe(1);

    const list = await request(`/v1/customers?search=${encodeURIComponent(source.phone)}`, {
      token: ownerToken,
    });
    expect(list.response.status).toBe(200);
    const listRows = (list.body as { data: Array<{ id: string }> }).data;
    expect(listRows.some((row) => row.id === source.id)).toBe(false);
    expect(listRows.some((row) => row.id === target.id)).toBe(true);

    const targetSales = await countSalesForCustomer(prisma, tenantId, target.id);
    expect(targetSales).toBe(2);

    const sourceSales = await countSalesForCustomer(prisma, tenantId, source.id);
    expect(sourceSales).toBe(0);

    const sourceRow = await prisma.tenantCustomer.findFirst({ where: { id: source.id } });
    expect(sourceRow?.deletedAt).not.toBeNull();

    const recycle = await request('/v1/customers/recycle', { token: ownerToken });
    expect(recycle.response.status).toBe(200);
    const recycleItems = (recycle.body as { items: Array<{ id: string }> }).items;
    expect(recycleItems.some((item) => item.id === source.id)).toBe(true);

    const auditLog = await prisma.auditLog.findFirst({
      where: {
        tenantId,
        action: 'customer.merge',
        entityId: target.id,
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(auditLog).toBeTruthy();

    const replay = await request('/v1/customers/merge', {
      method: 'POST',
      token: ownerToken,
      idempotencyKey,
      body: JSON.stringify(mergeBody),
    });
    expect(replay.response.status).toBe(200);
    expect((replay.body as { data: { id: string } }).data.id).toBe(target.id);
    expect((replay.body as { meta: { mergedSalesCount: number } }).meta.mergedSalesCount).toBe(1);
  });

  it('returns 409 when idempotency key is reused with different merge parameters', async () => {
    const runId = Date.now();
    const source = await createCustomerWithSale(request, ownerToken, {
      phone: uniquePhone('0918'),
      name: `Idem Source ${runId}`,
      branchId,
      saleTitle: `Idem Source Sale ${runId}`,
    });
    const targetA = await createCustomerWithSale(request, ownerToken, {
      phone: uniquePhone('0919'),
      name: `Idem Target A ${runId}`,
      branchId,
      saleTitle: `Idem Target A Sale ${runId}`,
    });
    const targetB = await createCustomerWithSale(request, ownerToken, {
      phone: uniquePhone('0920'),
      name: `Idem Target B ${runId}`,
      branchId,
      saleTitle: `Idem Target B Sale ${runId}`,
    });

    const idempotencyKey = crypto.randomUUID();

    const first = await request('/v1/customers/merge', {
      method: 'POST',
      token: ownerToken,
      idempotencyKey,
      body: JSON.stringify({
        sourceTenantCustomerId: source.id,
        targetTenantCustomerId: targetA.id,
        reason: 'first idempotent merge attempt',
      }),
    });
    expect(first.response.status).toBe(200);

    const conflict = await request('/v1/customers/merge', {
      method: 'POST',
      token: ownerToken,
      idempotencyKey,
      body: JSON.stringify({
        sourceTenantCustomerId: source.id,
        targetTenantCustomerId: targetB.id,
        reason: 'conflicting idempotent merge attempt',
      }),
    });

    expect(conflict.response.status).toBe(409);
    expect((conflict.body as { code: string }).code).toBe('IDEMPOTENCY_CONFLICT');
  });

  it('returns 404 when merging an already soft-deleted source customer', async () => {
    const runId = Date.now();
    const source = await createCustomerWithSale(request, ownerToken, {
      phone: uniquePhone('0921'),
      name: `Deleted Source ${runId}`,
      branchId,
      saleTitle: `Deleted Source Sale ${runId}`,
    });
    const target = await createCustomerWithSale(request, ownerToken, {
      phone: uniquePhone('0922'),
      name: `Deleted Target ${runId}`,
      branchId,
      saleTitle: `Deleted Target Sale ${runId}`,
    });

    const deleted = await request(`/v1/customers/${source.id}`, {
      method: 'DELETE',
      token: ownerToken,
      body: JSON.stringify({ deleteReason: 'pre-merge delete test' }),
    });
    expect(deleted.response.status).toBe(200);

    const mergeAttempt = await request('/v1/customers/merge', {
      method: 'POST',
      token: ownerToken,
      idempotencyKey: crypto.randomUUID(),
      body: JSON.stringify({
        sourceTenantCustomerId: source.id,
        targetTenantCustomerId: target.id,
        reason: 'merge after source deleted',
      }),
    });

    expect(mergeAttempt.response.status).toBe(404);
    expect((mergeAttempt.body as { code: string }).code).toBe('CUSTOMER_NOT_FOUND');
  });
});
