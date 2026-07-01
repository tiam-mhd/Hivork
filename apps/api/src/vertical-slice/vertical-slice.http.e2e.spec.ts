import { ModuleRegistryService } from '@hivork/module-core';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import Redis from 'ioredis';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AppModule } from '../app.module.js';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter.js';
import { AppConfigService } from '../config/app-config.service.js';

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

describeIfRuntime('TASK-054 vertical slice (HTTP e2e)', () => {
  const redis = new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 });
  let baseUrl = '';
  let app: Awaited<ReturnType<typeof createApp>>['app'];
  let server: Awaited<ReturnType<typeof createApp>>['server'];

  const flowAPhone = `0998${String(Date.now()).slice(-7)}`;
  const flowASlug = `http-e2e-${Date.now()}`;

  beforeAll(async () => {
    await redis.connect();
    const created = await createApp();
    app = created.app;
    server = created.server;
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 4000;
    baseUrl = `http://127.0.0.1:${port}/api`;
  });

  afterAll(async () => {
    if (redis.status === 'ready') {
      await redis.del(`otp:staff:${flowAPhone}`, `ratelimit:otp:${flowAPhone}`);
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

  async function request(path: string, init?: RequestInit & { token?: string }) {
    const headers = new Headers(init?.headers);
    headers.set('Content-Type', 'application/json');
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

  it('Flow A — OTP register, tenant register, customer, list, dashboard, soft-delete, restore', async () => {
      await request('/v1/auth/otp/request', {
        method: 'POST',
        body: JSON.stringify({ phone: flowAPhone, actor: 'staff', intent: 'register' }),
      });

      const otpRecord = await redis.get(`otp:staff:${flowAPhone}`);
      expect(otpRecord).toBeTruthy();
      const code = JSON.parse(otpRecord!).code as string;

      const verify = await request('/v1/auth/otp/verify', {
        method: 'POST',
        body: JSON.stringify({
          phone: flowAPhone,
          code,
          actor: 'staff',
          intent: 'register',
        }),
      });
      expect(verify.response.status).toBe(200);
      const verifiedToken = (verify.body as { verifiedToken: string }).verifiedToken;

      const register = await request('/v1/tenants/register', {
        method: 'POST',
        body: JSON.stringify({
          name: 'HTTP E2E Shop',
          slug: flowASlug,
          ownerName: 'Owner',
          ownerPhone: flowAPhone,
          verifiedToken,
        }),
      });
      expect(register.response.status).toBe(201);
      const accessToken = (register.body as { accessToken: string }).accessToken;

      const me = await request('/v1/tenants/me', { token: accessToken });
      expect(me.response.status).toBe(200);
      expect((me.body as { tenant: { slug: string } }).tenant.slug).toBe(flowASlug);

      const createCustomer = await request('/v1/customers', {
        method: 'POST',
        token: accessToken,
        body: JSON.stringify({ phone: '09127776655', name: 'HTTP Customer' }),
      });
      expect(createCustomer.response.status).toBe(201);
      const customerId = (createCustomer.body as { id: string }).id;

      const list = await request('/v1/customers', { token: accessToken });
      expect(list.response.status).toBe(200);
      expect((list.body as { data: unknown[] }).data).toHaveLength(1);

      const dashboard = await request('/v1/reports/dashboard', { token: accessToken });
      expect(dashboard.response.status).toBe(200);
      expect((dashboard.body as { data: { activeSalesCount: number }; meta: { cached: boolean } }).data.activeSalesCount).toBe(0);
      expect((dashboard.body as { meta: { cached: boolean } }).meta.cached).toBe(false);

      // Soft-delete — customer must disappear from list
      const softDelete = await request(`/v1/customers/${customerId}`, {
        method: 'DELETE',
        token: accessToken,
      });
      expect(softDelete.response.status).toBe(204);

      const listAfterDelete = await request('/v1/customers', { token: accessToken });
      expect(listAfterDelete.response.status).toBe(200);
      expect((listAfterDelete.body as { data: unknown[] }).data).toHaveLength(0);

      const dashboardAfterDelete = await request('/v1/reports/dashboard', { token: accessToken });
      expect(dashboardAfterDelete.response.status).toBe(200);
      expect((dashboardAfterDelete.body as { data: { activeSalesCount: number } }).data.activeSalesCount).toBe(0);

      // Restore — customer must reappear
      const restore = await request(`/v1/customers/${customerId}/restore`, {
        method: 'POST',
        token: accessToken,
      });
      expect(restore.response.status).toBe(200);

      const listAfterRestore = await request('/v1/customers', { token: accessToken });
      expect(listAfterRestore.response.status).toBe(200);
      expect((listAfterRestore.body as { data: unknown[] }).data).toHaveLength(1);
  });

  it('installments stub route is module-guarded and reachable for entitled tenant', async () => {
      await request('/v1/auth/otp/request', {
        method: 'POST',
        body: JSON.stringify({
          phone: '09120000000',
          actor: 'staff',
          intent: 'login',
          tenantSlug: 'demo-shop',
        }),
      });

      const otpRecord = await redis.get('otp:staff:09120000000');
      expect(otpRecord).toBeTruthy();
      const code = JSON.parse(otpRecord!).code as string;

      const verify = await request('/v1/auth/otp/verify', {
        method: 'POST',
        body: JSON.stringify({
          phone: '09120000000',
          code,
          actor: 'staff',
          intent: 'login',
          tenantSlug: 'demo-shop',
        }),
      });
      expect(verify.response.status).toBe(200);

      const accessToken = (verify.body as { accessToken: string }).accessToken;
      const stub = await request('/v1/installments/stub', { token: accessToken });
      expect(stub.response.status).toBe(200);
      expect(stub.body).toEqual({ ok: true, module: 'installments', version: '1.0.0' });
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
