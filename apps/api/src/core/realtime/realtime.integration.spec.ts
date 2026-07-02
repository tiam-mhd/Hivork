import { randomUUID } from 'node:crypto';

import {
  RedisRealtimeConnectionRegistry,
  RedisRealtimePublisher,
  RedisRealtimeUnreadCounter,
  RedisService,
} from '@hivork/infrastructure';
import { PublishRealtimeEventUseCase } from '@hivork/application';
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
  const client = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 1, connectTimeout: 2_000 });
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

describeIfRuntime('Realtime API (IFP-031)', () => {
  const redis = new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 });
  let baseUrl = '';
  let app: Awaited<ReturnType<typeof createApp>>['app'];
  let server: Awaited<ReturnType<typeof createApp>>['server'];
  let accessToken = '';
  let tenantId = '';
  let staffId = '';

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

    await httpRequest('/v1/auth/otp/request', {
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

    const verify = await httpRequest('/v1/auth/otp/verify', {
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
    tenantId = (verify.body as { tenant: { id: string } }).tenant.id;
    staffId = (verify.body as { staff: { id: string } }).staff.id;
  });

  afterAll(async () => {
    await redis.quit();
    await app.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('denies SSE stream without token', async () => {
    const response = await fetch(`${baseUrl}/v1/realtime/stream`);
    expect(response.status).toBe(401);
  });

  it('returns unread count for authenticated staff', async () => {
    const response = await httpRequest('/v1/notifications/unread-count', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(response.status).toBe(200);
    expect((response.body as { unreadCount: number }).unreadCount).toBeGreaterThanOrEqual(0);
  });

  it('increments unread count after dev ping', async () => {
    const before = await httpRequest('/v1/notifications/unread-count', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const beforeCount = (before.body as { unreadCount: number }).unreadCount;

    const ping = await httpRequest('/v1/dev/realtime/ping', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(ping.status).toBe(204);

    const after = await httpRequest('/v1/notifications/unread-count', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect((after.body as { unreadCount: number }).unreadCount).toBe(beforeCount + 1);
  });

  it('isolates redis channels across tenants', async () => {
    const redisService = app.get(RedisService);
    const publisher = new RedisRealtimePublisher(redisService);
    const unread = new RedisRealtimeUnreadCounter(redisService);
    const useCase = new PublishRealtimeEventUseCase(publisher, unread);
    const otherTenantId = randomUUID();
    const otherStaffId = randomUUID();

    await useCase.execute({
      tenantId: otherTenantId,
      staffId: otherStaffId,
      event: {
        id: randomUUID(),
        type: 'system.ping',
        priority: 'normal',
        payload: {},
        createdAt: new Date().toISOString(),
      },
    });

    expect(await unread.get(tenantId, staffId)).toBeGreaterThanOrEqual(0);
    expect(await unread.get(otherTenantId, otherStaffId)).toBe(1);

    await unread.reset(otherTenantId, otherStaffId);
  });

  it('enforces one connection per staff in registry', async () => {
    const registry = app.get(RedisRealtimeConnectionRegistry);
    const connA = randomUUID();
    const connB = randomUUID();

    expect(await registry.tryAcquire(tenantId, staffId, connA)).toBe(true);
    expect(await registry.tryAcquire(tenantId, staffId, connB)).toBe(false);
    await registry.release(tenantId, staffId, connA);
  });

  async function httpRequest(path: string, init?: RequestInit & { headers?: Record<string, string> }) {
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });
    if (response.status === 204) {
      return { status: response.status, body: null };
    }
    const body: unknown = await response.json().catch(() => null);
    return { status: response.status, body };
  }
});

async function createApp() {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
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
  return { app, server: app.getHttpServer() };
}
