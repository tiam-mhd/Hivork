import { ModuleRegistryService } from '@hivork/module-core';
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

describeIfRuntime('ReportsController cashflow (integration)', () => {
  const redis = new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 });
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

    if (app) {
      await app.close();
    }

    if (server?.listening) {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  });

  it('requires auth for cashflow route', async () => {
    const unauthorized = await request('/v1/reports/cashflow');
    expect(unauthorized.response.status).toBe(401);
  });

  it('returns six monthly cashflow buckets for owner', async () => {
    const result = await request('/v1/reports/cashflow', { token: accessToken });

    expect(result.response.status).toBe(200);

    const body = result.body as {
      data: {
        buckets: Array<{ month: string; installmentCount: number; totalRial: string }>;
        fromMonth: string;
        toMonth: string;
        updatedAt: string;
      };
      meta: Record<string, unknown>;
    };

    expect(body.data.buckets).toHaveLength(6);
    expect(body.data.buckets.every((bucket) => /^\d{4}-\d{2}$/.test(bucket.month))).toBe(true);
    expect(body.data.buckets.every((bucket) => typeof bucket.totalRial === 'string')).toBe(true);
    expect(body.data.fromMonth).toMatch(/^\d{4}-\d{2}$/);
    expect(body.data.toMonth).toMatch(/^\d{4}-\d{2}$/);
    expect(body.data.updatedAt).toBeTruthy();
    expect(body.meta).toEqual({});
  });

  it('rejects invalid branchId query', async () => {
    const result = await request('/v1/reports/cashflow?branchId=not-a-uuid', {
      token: accessToken,
    });

    expect(result.response.status).toBe(400);
    expect((result.body as { code: string }).code).toBe('VALIDATION_ERROR');
  });

  async function request(
    path: string,
    options: { method?: string; body?: string; token?: string } = {},
  ) {
    const response = await fetch(`${baseUrl}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body: options.body,
    });

    const text = await response.text();
    const parsed = text ? (JSON.parse(text) as unknown) : null;
    return { response, body: parsed };
  }
});

async function createApp() {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  const config = app.get(AppConfigService);
  app.setGlobalPrefix('api', {
    exclude: [{ path: 'health', method: RequestMethod.GET }],
  });
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.get(ModuleRegistryService).bootstrap(app);
  await app.init();

  return { app, server: app.getHttpServer() };
}
