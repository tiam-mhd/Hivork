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

describeIfRuntime('InstallmentsController (integration)', () => {
  const redis = new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 });
  const prisma = new PrismaService();
  let baseUrl = '';
  let app: Awaited<ReturnType<typeof createApp>>['app'];
  let server: Awaited<ReturnType<typeof createApp>>['server'];
  let accessToken = '';

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

    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers,
    });

    const body =
      response.status === 204 ? null : await response.json().catch(() => null);

    return { response, body };
  }

  it('lists installments with customer embed and string amountRial', async () => {
    const list = await request('/v1/installments?limit=5', { token: accessToken });

    expect(list.response.status).toBe(200);
    const body = list.body as {
      data: Array<{
        saleId: string;
        customer: { phone: string };
        amountRial: string;
      }>;
      meta: { total: number; hasNext: boolean };
    };

    expect(Array.isArray(body.data)).toBe(true);
    if (body.data.length > 0) {
      expect(typeof body.data[0]?.amountRial).toBe('string');
      expect(body.data[0]?.saleId).toBeTruthy();
      expect(body.data[0]?.customer.phone).toMatch(/^09\d{9}$/);
    }
    expect(typeof body.meta.total).toBe('number');
  });

  it('filters by status and date range', async () => {
    const filtered = await request(
      '/v1/installments?status=pending,overdue&from=2020-01-01&to=2030-12-31&limit=10',
      { token: accessToken },
    );

    expect(filtered.response.status).toBe(200);
    const rows = (filtered.body as { data: Array<{ status: string }> }).data;
    for (const row of rows) {
      expect(['pending', 'overdue']).toContain(row.status);
    }
  });

  it('rejects invalid date range', async () => {
    const invalid = await request(
      '/v1/installments?from=2030-01-01&to=2020-01-01',
      { token: accessToken },
    );

    expect(invalid.response.status).toBe(400);
    expect((invalid.body as { code: string }).code).toBe('VALIDATION_ERROR');
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
