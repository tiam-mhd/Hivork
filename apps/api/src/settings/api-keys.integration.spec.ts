import { PrismaService } from '@hivork/infrastructure';
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

describeIfRuntime('ApiKeysController (integration)', () => {
  const redis = new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 });
  const prisma = new PrismaService();
  let baseUrl = '';
  let app: Awaited<ReturnType<typeof createApp>>['app'];
  let server: Awaited<ReturnType<typeof createApp>>['server'];
  let accessToken = '';
  let tenantId = '';

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
      select: { id: true },
    });

    if (!tenant) {
      throw new Error('demo-shop seed data required');
    }

    tenantId = tenant.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await redis.quit();
    await app.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('creates API key, authenticates via whoami, then revokes', async () => {
    const createRes = await request('/v1/settings/api-keys', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        name: `integration-${Date.now()}`,
        scopes: ['installments.read'],
      }),
    });

    expect(createRes.status).toBe(201);
    const created = createRes.body as {
      id: string;
      key: string;
      keyPrefix: string;
      scopes: string[];
    };
    expect(created.key).toMatch(/^hivork_live_/);
    expect(created.keyPrefix).toBe('hivork_live_');

    const whoami = await request('/v1/integration/whoami', {
      headers: { Authorization: `Bearer ${created.key}` },
    });
    expect(whoami.status).toBe(200);
    expect((whoami.body as { tenantId: string }).tenantId).toBe(tenantId);

    const revokeRes = await request(`/v1/settings/api-keys/${created.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(revokeRes.status).toBe(200);

    const whoamiAfter = await request('/v1/integration/whoami', {
      headers: { Authorization: `Bearer ${created.key}` },
    });
    expect(whoamiAfter.status).toBe(401);
    expect((whoamiAfter.body as { code: string }).code).toBe('AUTH_API_KEY_REVOKED');
  });

  it('lists API keys with prefix only (no secret)', async () => {
    const listRes = await request('/v1/settings/api-keys', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(listRes.status).toBe(200);
    const body = listRes.body as { items: Array<Record<string, unknown>> };
    for (const item of body.items) {
      expect(item).not.toHaveProperty('key');
      expect(item).not.toHaveProperty('keyHash');
    }
  });

  async function request(path: string, init?: RequestInit & { headers?: Record<string, string> }) {
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });
    const body: unknown = await response.json().catch(() => null);
    return { status: response.status, body };
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
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.use(cookieParser());
  app.enableCors({ origin: config.corsOrigin, credentials: true });
  await app.init();
  const server = app.getHttpServer();
  return { app, server };
}
