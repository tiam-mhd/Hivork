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

describeIfRuntime('RolesController (integration)', () => {
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

    const text = await response.text();
    const body = text ? (JSON.parse(text) as unknown) : null;

    return { response, body };
  }

  it('requires auth for role routes', async () => {
    const unauthorized = await request('/v1/roles');
    expect(unauthorized.response.status).toBe(401);
  });

  it('owner creates a custom role and lists system + custom roles', async () => {
    const suffix = String(Date.now()).slice(-6);

    const created = await request('/v1/roles', {
      method: 'POST',
      token: accessToken,
      body: JSON.stringify({
        code: `accountant_${suffix}`,
        name: `حسابدار ${suffix}`,
        permissions: ['core.branch.view', 'installments.report.dashboard'],
        dataScope: 'all',
      }),
    });

    expect(created.response.status).toBe(201);
    const roleId = (created.body as { id: string }).id;
    expect((created.body as { isSystem: boolean }).isSystem).toBe(false);

    const listed = await request('/v1/roles', { token: accessToken });
    expect(listed.response.status).toBe(200);
    const roles = (listed.body as { data: { id: string; code: string; isSystem: boolean }[] }).data;
    expect(roles.some((role) => role.id === roleId)).toBe(true);
    expect(roles.some((role) => role.code === 'owner' && role.isSystem)).toBe(true);

    const detail = await request(`/v1/roles/${roleId}`, { token: accessToken });
    expect(detail.response.status).toBe(200);
    expect((detail.body as { permissions: string[] }).permissions).toContain('core.branch.view');
  });

  it('cannot patch the owner system role', async () => {
    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'demo-shop', deletedAt: null },
    });
    if (!tenant) {
      throw new Error('demo-shop tenant required');
    }

    const ownerRole = await prisma.role.findFirst({
      where: { tenantId: tenant.id, code: 'owner', deletedAt: null },
    });
    if (!ownerRole) {
      throw new Error('owner role required');
    }

    const result = await request(`/v1/roles/${ownerRole.id}`, {
      method: 'PATCH',
      token: accessToken,
      body: JSON.stringify({ name: 'مالک ویرایش‌شده' }),
    });

    expect(result.response.status).toBe(409);
    expect((result.body as { code: string }).code).toBe('ROLE_IS_SYSTEM');
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
