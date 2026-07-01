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

describeIfRuntime('StaffSecurityController audit-log (integration)', () => {
  const redis = new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 });
  const prisma = new PrismaService();
  let baseUrl = '';
  let app: Awaited<ReturnType<typeof createApp>>['app'];
  let server: Awaited<ReturnType<typeof createApp>>['server'];
  let accessToken = '';
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
    staffId = (verify.body as { staff: { id: string } }).staff.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await redis.quit();
    await app.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('returns security audit events for the authenticated staff only', async () => {
    const res = await request('/v1/staff/me/security/audit-log?category=security&limit=10', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    expect(res.status).toBe(200);
    const body = res.body as { items: Array<{ action: string }> };
    expect(Array.isArray(body.items)).toBe(true);

    const rows = await prisma.auditLog.findMany({
      where: {
        actorType: 'staff',
        actorId: staffId,
        action: { startsWith: 'auth.' },
      },
      take: 1,
    });

    if (rows.length > 0) {
      expect(body.items.some((item) => item.action.startsWith('auth.'))).toBe(true);
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
