import { ModuleRegistryService } from '@hivork/module-core';
import { PrismaAuditService, PrismaService } from '@hivork/infrastructure';
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

describeIfRuntime('SettingsController installments (integration)', () => {
  const redis = new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 });
  const prisma = new PrismaService();
  const audit = new PrismaAuditService(prisma);
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

  it('GET returns all installments settings keys with defaults', async () => {
    const get = await request('/v1/settings/installments', { token: accessToken });

    expect(get.response.status).toBe(200);
    const installments = (get.body as { data: { installments: Record<string, unknown> } }).data
      .installments;

    expect(installments.reminder_days_before).toEqual([3, 1]);
    expect(installments.reminder_time).toBe('09:00');
    expect(installments.default_installment_count).toBe(12);
    expect(installments.default_reminder_channels).toEqual(['telegram']);
  });

  it('PATCH updates settings and writes audit log', async () => {
    const patch = await request('/v1/settings/installments', {
      method: 'PATCH',
      token: accessToken,
      body: JSON.stringify({
        reminder_time: '10:30',
        default_installment_count: 18,
      }),
    });

    expect(patch.response.status).toBe(200);
    const installments = (patch.body as { data: { installments: Record<string, unknown> } }).data
      .installments;
    expect(installments.reminder_time).toBe('10:30');
    expect(installments.default_installment_count).toBe(18);

    const auditRows = await audit.find({
      tenantId,
      action: 'settings.change',
      entityType: 'TenantSettings',
      limit: 20,
    });

    expect(
      auditRows.some(
        (row) =>
          row.metadata?.key === 'reminder_time' &&
          row.newValue &&
          typeof row.newValue === 'object' &&
          'reminder_time' in row.newValue &&
          row.newValue.reminder_time === '10:30',
      ),
    ).toBe(true);
    expect(
      auditRows.some(
        (row) =>
          row.metadata?.key === 'default_installment_count' &&
          row.newValue &&
          typeof row.newValue === 'object' &&
          'default_installment_count' in row.newValue &&
          row.newValue.default_installment_count === 18,
      ),
    ).toBe(true);

    await prisma.tenantSetting.updateMany({
      where: {
        tenantId,
        module: 'installments',
        key: { in: ['reminder_time', 'default_installment_count'] },
      },
      data: { deletedAt: new Date() },
    });
  });

  it('rejects unknown patch key', async () => {
    const invalid = await request('/v1/settings/installments', {
      method: 'PATCH',
      token: accessToken,
      body: JSON.stringify({ not_a_real_key: true }),
    });

    expect(invalid.response.status).toBe(400);
    expect((invalid.body as { code: string }).code).toBe('SETTING_KEY_UNKNOWN');
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
