import { ModuleRegistryService } from '@hivork/module-core';
import { PrismaService } from '@hivork/infrastructure';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import Redis from 'ioredis';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AppModule } from '../../app.module.js';
import { HttpExceptionFilter } from '../../common/filters/http-exception.filter.js';
import { AppConfigService } from '../../config/app-config.service.js';

const databaseUrl = process.env.DATABASE_URL;
const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';

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
const describeIfRuntime = databaseUrl && redisAvailable ? describe : describe.skip;

describeIfRuntime('SalesController (integration)', () => {
  const redis = new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 });
  const prisma = new PrismaService();
  let baseUrl = '';
  let app: Awaited<ReturnType<typeof createApp>>['app'];
  let server: Awaited<ReturnType<typeof createApp>>['server'];
  let accessToken = '';
  let branchId = '';
  let tenantCustomerId = '';

  beforeAll(async () => {
    await redis.connect();
    const created = await createApp();
    app = created.app;
    server = created.server;
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 4000;
    baseUrl = `http://127.0.0.1:${port}/api`;

    const ownerPhone = process.env.SEED_OWNER_PHONE ?? '09120000000';

    await request('/v1/auth/otp/request', {
      method: 'POST',
      body: JSON.stringify({
        phone: ownerPhone,
        actor: 'staff',
        intent: 'login',
        tenantSlug: 'demo-shop',
      }),
    });

    const otpRecord = await redis.get(`otp:staff:${ownerPhone}`);
    const code = JSON.parse(otpRecord!).code as string;

    const verify = await request('/v1/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify({
        phone: ownerPhone,
        code,
        actor: 'staff',
        intent: 'login',
        tenantSlug: 'demo-shop',
      }),
    });

    accessToken = (verify.body as { accessToken: string }).accessToken;

    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'demo-shop', deletedAt: null },
      include: {
        branches: { where: { deletedAt: null, isActive: true }, take: 1 },
        tenantCustomers: { where: { deletedAt: null }, take: 1 },
      },
    });

    if (!tenant?.branches[0] || !tenant.tenantCustomers[0]) {
      throw new Error('demo-shop seed data required');
    }

    branchId = tenant.branches[0].id;
    tenantCustomerId = tenant.tenantCustomers[0].id;
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
    if (init?.body) {
      headers.set('Content-Type', 'application/json');
    }
    if (init?.token) {
      headers.set('Authorization', `Bearer ${init.token}`);
    }

    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers,
    });

    const body =
      response.status === 204 ? null : await response.json().catch(() => null);

    return { response, body };
  }

  it('creates, lists, gets, and cancels a sale', async () => {
    const idempotencyKey = crypto.randomUUID();

    const create = await request('/v1/sales', {
      method: 'POST',
      token: accessToken,
      headers: { 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify({
        tenantCustomerId,
        branchId,
        title: 'API Integration Sale',
        totalAmountRial: '4000000',
        downPaymentRial: '0',
        installmentCount: 2,
        firstDueDate: '2026-09-01',
        contractDate: '2026-08-01',
      }),
    });

    expect(create.response.status).toBe(201);
    const saleId = (create.body as { id: string }).id;
    expect((create.body as { installments: unknown[] }).installments).toHaveLength(2);

    const duplicate = await request('/v1/sales', {
      method: 'POST',
      token: accessToken,
      headers: { 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify({
        tenantCustomerId,
        branchId,
        title: 'API Integration Sale',
        totalAmountRial: '4000000',
        downPaymentRial: '0',
        installmentCount: 2,
        firstDueDate: '2026-09-01',
        contractDate: '2026-08-01',
      }),
    });
    expect(duplicate.response.status).toBe(201);
    expect((duplicate.body as { id: string }).id).toBe(saleId);

    const list = await request('/v1/sales?limit=5', { token: accessToken });
    expect(list.response.status).toBe(200);
    expect((list.body as { data: Array<{ id: string }> }).data.some((row) => row.id === saleId)).toBe(
      true,
    );

    const detail = await request(`/v1/sales/${saleId}`, { token: accessToken });
    expect(detail.response.status).toBe(200);
    expect((detail.body as { data: { id: string } }).data.id).toBe(saleId);
    expect((detail.body as { data: { customer: unknown } }).data.customer).toBeTruthy();

    const cancel = await request(`/v1/sales/${saleId}/cancel`, {
      method: 'POST',
      token: accessToken,
      body: JSON.stringify({ reason: 'تست لغو فروش' }),
    });
    expect(cancel.response.status).toBe(200);
    expect((cancel.body as { status: string }).status).toBe('cancelled');
  });

  it('returns 404 for cross-tenant sale id', async () => {
    const missing = await request(
      `/v1/sales/00000000-0000-4000-8000-000000000099`,
      { token: accessToken },
    );
    expect(missing.response.status).toBe(404);
    expect((missing.body as { code: string }).code).toBe('SALE_NOT_FOUND');
  });

  it('requires idempotency key on create', async () => {
    const create = await request('/v1/sales', {
      method: 'POST',
      token: accessToken,
      body: JSON.stringify({
        tenantCustomerId,
        branchId,
        totalAmountRial: '1000000',
        downPaymentRial: '0',
        installmentCount: 1,
        firstDueDate: '2026-09-01',
        contractDate: '2026-08-01',
      }),
    });

    expect(create.response.status).toBe(400);
    expect((create.body as { code: string }).code).toBe('FIELD_REQUIRED');
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
