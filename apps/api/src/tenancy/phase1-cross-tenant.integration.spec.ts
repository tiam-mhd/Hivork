import {
  CreateSaleUseCase,
  GetSaleUseCase,
  GetTenantCustomerUseCase,
  ListInstallmentsUseCase,
  ListSalesUseCase,
} from '@hivork/application';
import {
  JwtTokenService,
  PrismaAuditService,
  PrismaBranchReader,
  PrismaInstallmentRepository,
  PrismaOutboxPublisher,
  PrismaSaleIdempotencyStore,
  PrismaSaleRepository,
  PrismaService,
  PrismaTenantCustomerRepository,
  PrismaTenantPlanReader,
  PrismaUnitOfWork,
} from '@hivork/infrastructure';
import { ModuleRegistryService } from '@hivork/module-core';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import Redis from 'ioredis';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AppModule } from '../app.module.js';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter.js';
import { AppConfigService } from '../config/app-config.service.js';
import {
  seedCrossTenantFixtures,
  type CrossTenantSeed,
  type TenantFixture,
} from '../test-utils/cross-tenant-seed.helper.js';
import {
  futureDateOnly,
  issueStaffAccessToken,
  type SeedStaff,
} from '../test-utils/rbac-seed.helper.js';

const databaseUrl = process.env.DATABASE_URL;
const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
const hasDatabase = Boolean(databaseUrl) || process.env.CI === 'true';

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
const describeIfRuntime = hasDatabase && redisAvailable ? describe : describe.skip;

function futureDueDate(): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 30);
  date.setUTCHours(12, 0, 0, 0);
  return date;
}

function ownerContext(staff: SeedStaff) {
  return {
    staffId: staff.id,
    dataScope: 'all' as const,
    assignedBranchIds: staff.assignedBranchIds,
    activeBranchId: null,
  };
}

function buildSaleUseCases(prisma: PrismaService) {
  const unitOfWork = new PrismaUnitOfWork(prisma);
  const sales = new PrismaSaleRepository(prisma);
  const installments = new PrismaInstallmentRepository(prisma);
  const tenantCustomers = new PrismaTenantCustomerRepository(prisma);
  const branches = new PrismaBranchReader(prisma);
  const tenantPlans = new PrismaTenantPlanReader(prisma);
  const idempotency = new PrismaSaleIdempotencyStore(prisma);
  const audit = new PrismaAuditService(prisma);
  const outbox = new PrismaOutboxPublisher(prisma);

  return {
    createSale: new CreateSaleUseCase(
      unitOfWork,
      sales,
      installments,
      tenantCustomers,
      branches,
      tenantPlans,
      idempotency,
      audit,
      outbox,
    ),
    getSale: new GetSaleUseCase(sales, installments),
    listSales: new ListSalesUseCase(sales),
    listInstallments: new ListInstallmentsUseCase(installments),
    getCustomer: new GetTenantCustomerUseCase(tenantCustomers, sales),
  };
}

describeIfRuntime('Phase 1 cross-tenant isolation', () => {
  const redis = new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 });
  const prisma = new PrismaService();
  let baseUrl = '';
  let app: Awaited<ReturnType<typeof createApp>>['app'];
  let server: Awaited<ReturnType<typeof createApp>>['server'];
  let tokens: JwtTokenService;
  let seed: CrossTenantSeed;
  let saleInA: string;
  let installmentInA: string;
  let tokenA = '';
  let tokenB = '';
  let useCases: ReturnType<typeof buildSaleUseCases>;

  beforeAll(async () => {
    await redis.connect();
    const created = await createApp();
    app = created.app;
    server = created.server;
    tokens = app.get(JwtTokenService);
    useCases = buildSaleUseCases(prisma);

    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 4000;
    baseUrl = `http://127.0.0.1:${port}/api`;

    seed = await seedCrossTenantFixtures(prisma, redis);
    tokenA = await issueStaffAccessToken(tokens, seed.tenantA.owner);
    tokenB = await issueStaffAccessToken(tokens, seed.tenantB.owner);

    const createdSale = await createSaleViaApi(seed.tenantA, tokenA, 'Cross-Tenant Sale A');
    saleInA = createdSale.saleId;
    installmentInA = createdSale.installmentId;
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

    const response = await fetch(`${baseUrl}${path}`, { ...init, headers });
    const text = await response.text();
    const body = text ? (JSON.parse(text) as unknown) : null;
    return { response, body };
  }

  async function createSaleViaApi(
    tenant: TenantFixture,
    token: string,
    title: string,
  ): Promise<{ saleId: string; installmentId: string }> {
    const result = await request('/v1/sales', {
      method: 'POST',
      token,
      headers: { 'Idempotency-Key': crypto.randomUUID() },
      body: JSON.stringify({
        tenantCustomerId: tenant.customerId,
        branchId: tenant.branchId,
        title,
        totalAmountRial: '4000000',
        downPaymentRial: '0',
        installmentCount: 2,
        firstDueDate: futureDateOnly(45),
        contractDate: futureDateOnly(30),
        intervalDays: 30,
      }),
    });

    if (result.response.status !== 201) {
      throw new Error(`Failed to create sale: ${JSON.stringify(result.body)}`);
    }

    const body = result.body as {
      id: string;
      installments: Array<{ id: string }>;
    };

    return {
      saleId: body.id,
      installmentId: body.installments[0]?.id ?? '',
    };
  }

  it('GET /sales/:id — tenant B cannot read tenant A sale (404, not 403)', async () => {
    const result = await request(`/v1/sales/${saleInA}`, { token: tokenB });

    expect(result.response.status).toBe(404);
    expect(result.response.status).not.toBe(403);
    expect((result.body as { code: string }).code).toBe('SALE_NOT_FOUND');
  });

  it('GET /sales — tenant B list excludes tenant A sales', async () => {
    const result = await request('/v1/sales?limit=100&search=Cross-Tenant%20Sale%20A', {
      token: tokenB,
    });

    expect(result.response.status).toBe(200);
    const data = (result.body as { data: Array<{ id: string }> }).data;
    expect(data.find((row) => row.id === saleInA)).toBeUndefined();
  });

  it('POST /sales/:id/cancel — tenant B cannot cancel tenant A sale (404)', async () => {
    const cancelTarget = (
      await createSaleViaApi(seed.tenantA, tokenA, `Cross-Tenant Cancel ${crypto.randomUUID()}`)
    ).saleId;

    const result = await request(`/v1/sales/${cancelTarget}/cancel`, {
      method: 'POST',
      token: tokenB,
      body: JSON.stringify({ reason: 'تلاش لغو cross-tenant' }),
    });

    expect(result.response.status).toBe(404);
    expect(result.response.status).not.toBe(403);
    expect((result.body as { code: string }).code).toBe('SALE_NOT_FOUND');
  });

  it('GET /customers/:id — tenant B cannot read tenant A customer (404)', async () => {
    const result = await request(`/v1/customers/${seed.tenantA.customerId}`, {
      token: tokenB,
    });

    expect(result.response.status).toBe(404);
    expect(result.response.status).not.toBe(403);
    expect((result.body as { code: string }).code).toBe('CUSTOMER_NOT_FOUND');
  });

  it('GET /installments — tenant B list excludes tenant A installment rows', async () => {
    expect(installmentInA).toBeTruthy();

    const result = await request('/v1/installments?limit=100', { token: tokenB });

    expect(result.response.status).toBe(200);
    const data = (result.body as { data: Array<{ id: string }> }).data;
    expect(data.find((row) => row.id === installmentInA)).toBeUndefined();
  });

  it('POST /sales — tenant B token with tenant A customerId → CUSTOMER_NOT_FOUND (404)', async () => {
    const result = await request('/v1/sales', {
      method: 'POST',
      token: tokenB,
      headers: { 'Idempotency-Key': crypto.randomUUID() },
      body: JSON.stringify({
        tenantCustomerId: seed.tenantA.customerId,
        branchId: seed.tenantB.branchId,
        totalAmountRial: '2000000',
        downPaymentRial: '0',
        installmentCount: 2,
        firstDueDate: futureDateOnly(45),
        contractDate: futureDateOnly(30),
        intervalDays: 30,
      }),
    });

    expect(result.response.status).toBe(404);
    expect(result.response.status).not.toBe(403);
    expect((result.body as { code: string }).code).toBe('CUSTOMER_NOT_FOUND');
  });

  it('CreateSaleUseCase — tenant B context + tenant A customerId → CUSTOMER_NOT_FOUND', async () => {
    await expect(
      useCases.createSale.execute({
        tenantId: seed.tenantB.id,
        actorId: seed.tenantB.owner.id,
        idempotencyKey: crypto.randomUUID(),
        tenantCustomerId: seed.tenantA.customerId,
        branchId: seed.tenantB.branchId,
        totalAmountRial: 3_000_000n,
        downPaymentRial: 0n,
        installmentCount: 2,
        firstDueDate: futureDueDate(),
        contractDate: new Date('2026-08-01'),
        intervalDays: 30,
        staffContext: ownerContext(seed.tenantB.owner),
      }),
    ).rejects.toMatchObject({ code: 'CUSTOMER_NOT_FOUND', httpStatus: 404 });
  });

  it('GetSaleUseCase — tenant B context + tenant A saleId → SALE_NOT_FOUND', async () => {
    await expect(
      useCases.getSale.execute({
        tenantId: seed.tenantB.id,
        actorId: seed.tenantB.owner.id,
        saleId: saleInA,
        staffContext: ownerContext(seed.tenantB.owner),
      }),
    ).rejects.toMatchObject({ code: 'SALE_NOT_FOUND', httpStatus: 404 });
  });

  it('GetTenantCustomerUseCase — tenant B context + tenant A customer → CUSTOMER_NOT_FOUND', async () => {
    await expect(
      useCases.getCustomer.execute({
        tenantId: seed.tenantB.id,
        tenantCustomerId: seed.tenantA.customerId,
        staffContext: ownerContext(seed.tenantB.owner),
      }),
    ).rejects.toMatchObject({ code: 'CUSTOMER_NOT_FOUND', httpStatus: 404 });
  });

  it('ListInstallmentsUseCase — tenant B context returns no tenant A installment rows', async () => {
    expect(installmentInA).toBeTruthy();

    const result = await useCases.listInstallments.execute({
      tenantId: seed.tenantB.id,
      actorId: seed.tenantB.owner.id,
      staffContext: ownerContext(seed.tenantB.owner),
      limit: 100,
      sort: 'dueDate:asc',
    });

    expect(result.data.find((row) => row.id === installmentInA)).toBeUndefined();
  });

  it('ListSalesUseCase — tenant B context returns no tenant A sale rows', async () => {
    const result = await useCases.listSales.execute({
      tenantId: seed.tenantB.id,
      actorId: seed.tenantB.owner.id,
      staffContext: ownerContext(seed.tenantB.owner),
      limit: 100,
      sort: 'createdAt:desc',
      search: 'Cross-Tenant Sale A',
    });

    expect(result.data.find((row) => row.id === saleInA)).toBeUndefined();
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
