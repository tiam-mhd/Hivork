import { GetStaffPermissionsUseCase } from '@hivork/application';
import { ModuleRegistryService } from '@hivork/module-core';
import { PrismaService, PrismaStaffPermissionsRepository } from '@hivork/infrastructure';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import Redis from 'ioredis';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { AppModule } from '../../app.module.js';
import { HttpExceptionFilter } from '../../common/filters/http-exception.filter.js';
import { AppConfigService } from '../../config/app-config.service.js';
import { cleanupDemoTenantTestArtifacts } from '../../test-utils/demo-tenant-cleanup.helper.js';

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

describeIfRuntime('StaffController (integration)', () => {
  const redis = new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 });
  const prisma = new PrismaService();
  const staffPermissions = new PrismaStaffPermissionsRepository(prisma);
  const getPermissions = new GetStaffPermissionsUseCase(staffPermissions);
  let baseUrl = '';
  let app: Awaited<ReturnType<typeof createApp>>['app'];
  let server: Awaited<ReturnType<typeof createApp>>['server'];
  let accessToken = '';
  let ownerStaffId = '';
  let defaultBranchId = '';
  let demoTenantId = '';

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
        staff: {
          where: { user: { phone: ownerPhone }, deletedAt: null },
          take: 1,
        },
        branches: {
          where: { deletedAt: null, isDefault: true },
          take: 1,
        },
      },
    });
    if (!tenant?.staff[0] || !tenant.branches[0]) {
      throw new Error('demo-shop owner and default branch required');
    }

    await cleanupDemoTenantTestArtifacts(prisma, tenant.id);

    demoTenantId = tenant.id;
    ownerStaffId = tenant.staff[0].id;
    defaultBranchId = tenant.branches[0].id;
  });

  beforeEach(async () => {
    if (demoTenantId) {
      await cleanupDemoTenantTestArtifacts(prisma, demoTenantId);
    }
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

  it('requires auth for staff routes', async () => {
    const unauthorized = await request('/v1/staff');
    expect(unauthorized.response.status).toBe(401);
  });

  it('creates staff and assigns a role', async () => {
    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'demo-shop', deletedAt: null },
    });
    if (!tenant) {
      throw new Error('demo-shop tenant required');
    }

    const cashierRole = await prisma.role.findFirst({
      where: { tenantId: tenant.id, code: 'cashier', deletedAt: null },
    });
    if (!cashierRole) {
      throw new Error('cashier role required');
    }

    const phoneSuffix = String(Date.now()).slice(-7);
    const created = await request('/v1/staff', {
      method: 'POST',
      token: accessToken,
      body: JSON.stringify({
        phone: `0913${phoneSuffix}`,
        name: `کارمند تست ${phoneSuffix}`,
        dataScope: 'all',
      }),
    });

    expect(created.response.status).toBe(201);
    const staffId = (created.body as { id: string }).id;

    const assigned = await request(`/v1/staff/${staffId}/roles`, {
      method: 'POST',
      token: accessToken,
      body: JSON.stringify({ roleId: cashierRole.id }),
    });

    expect(assigned.response.status).toBe(201);
    expect((assigned.body as { role: { code: string } }).role.code).toBe('cashier');
  });

  it('cannot delete own staff account', async () => {
    const result = await request(`/v1/staff/${ownerStaffId}`, {
      method: 'DELETE',
      token: accessToken,
    });

    expect(result.response.status).toBe(409);
    expect((result.body as { code: string }).code).toBe('STAFF_CANNOT_DELETE_SELF');
  });

  it('sets active branch for authenticated staff', async () => {
    const result = await request('/v1/staff/me/active-branch', {
      method: 'PATCH',
      token: accessToken,
      body: JSON.stringify({ branchId: defaultBranchId }),
    });

    expect(result.response.status).toBe(200);
    expect((result.body as { activeBranchId: string }).activeBranchId).toBe(defaultBranchId);
  });

  it('DENY override blocks an inherited permission', async () => {
    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'demo-shop', deletedAt: null },
    });
    if (!tenant) {
      throw new Error('demo-shop tenant required');
    }

    const cashierRole = await prisma.role.findFirst({
      where: { tenantId: tenant.id, code: 'cashier', deletedAt: null },
    });
    if (!cashierRole) {
      throw new Error('cashier role required');
    }

    const phoneSuffix = String(Date.now()).slice(-7);
    const created = await request('/v1/staff', {
      method: 'POST',
      token: accessToken,
      body: JSON.stringify({
        phone: `0916${phoneSuffix}`,
        name: `کارمند deny ${phoneSuffix}`,
        dataScope: 'all',
      }),
    });
    expect(created.response.status).toBe(201);
    const staffId = (created.body as { id: string }).id;

    const assigned = await request(`/v1/staff/${staffId}/roles`, {
      method: 'POST',
      token: accessToken,
      body: JSON.stringify({ roleId: cashierRole.id }),
    });
    expect(assigned.response.status).toBe(201);

    const before = await getPermissions.execute({ staffId });
    expect(before.has('installments.sale.create')).toBe(true);

    const denied = await request(`/v1/staff/${staffId}/permission-overrides`, {
      method: 'POST',
      token: accessToken,
      body: JSON.stringify({
        permission: 'installments.sale.create',
        effect: 'deny',
        reason: 'محدودیت موقت به دلیل آموزش',
      }),
    });
    expect(denied.response.status).toBe(201);

    const listed = await request(`/v1/staff/${staffId}/permission-overrides`, {
      token: accessToken,
    });
    expect(listed.response.status).toBe(200);
    expect(
      (listed.body as { data: { effect: string; permission: string }[] }).data.some(
        (item) => item.effect === 'deny' && item.permission === 'installments.sale.create',
      ),
    ).toBe(true);

    const after = await getPermissions.execute({ staffId });
    expect(after.has('installments.sale.create')).toBe(false);
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
