import { randomUUID } from 'node:crypto';

import {
  CreateTenantCustomerUseCase,
  GetDashboardReportUseCase,
  ListTenantCustomersUseCase,
  RegisterTenantUseCase,
  RequestOtpUseCase,
  RestoreEntityUseCase,
  SoftDeleteEntityUseCase,
  ValidateVerifiedRegisterTokenUseCase,
  VerifyOtpUseCase,
} from '@hivork/application';
import {
  JwtTokenService,
  NoopLoginHardeningPort,
  OtpRateLimiterService,
  PrismaAuditService,
  PrismaBranchReader,
  PrismaGlobalCustomerRepository,
  PrismaService,
  PrismaStaffRepository,
  PrismaUserRepository,
  PrismaInstallmentReportRepository,
  PrismaTenantCustomerRepository,
  PrismaTenantPlanReader,
  PrismaTenantRegistrationRepository,
  PrismaTenantRepository,
  RedisOtpStore,
  RedisReportCache,
  RedisService,
  RedisTokenBlacklistService,
  RegisterRateLimiterService,
  prismaRequestStorage,
} from '../index.js';
import Redis from 'ioredis';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
const databaseUrl = process.env.DATABASE_URL;
const hasDatabase = Boolean(databaseUrl);

type StaffRunContext = {
  tenantId: string;
  staffId: string;
};

function runAsStaff<T>(ctx: StaffRunContext, fn: () => Promise<T>): Promise<T> {
  return prismaRequestStorage.run(
    {
      tenantId: ctx.tenantId,
      staffId: ctx.staffId,
      activeBranchId: null,
      primaryBranchId: null,
      effectiveBranchIds: [],
      dataScopeFilter: {},
    },
    fn,
  );
}

async function runOtpRegisterFlow(
  requestOtp: RequestOtpUseCase,
  verifyOtp: VerifyOtpUseCase,
  phone: string,
): Promise<string> {
  await requestOtp.execute({ phone, actor: 'staff' });
  const otpStore = new RedisOtpStore(new RedisService(redisUrl));
  const record = await otpStore.get({ actor: 'staff', phone });
  if (!record) throw new Error('OTP not stored');

  const result = await verifyOtp.execute({
    phone,
    code: record.code,
    actor: 'staff',
    intent: 'register',
  });

  return (result as { verifiedToken: string }).verifiedToken;
}

describe.runIf(hasDatabase)('TASK-054 vertical slice (integration)', () => {
  const redis = new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 });
  let prisma: PrismaService;
  let requestOtp: RequestOtpUseCase;
  let verifyOtp: VerifyOtpUseCase;
  let registerTenant: RegisterTenantUseCase;
  let createCustomer: CreateTenantCustomerUseCase;
  let listCustomers: ListTenantCustomersUseCase;
  let dashboard: GetDashboardReportUseCase;
  let softDelete: SoftDeleteEntityUseCase;
  let restore: RestoreEntityUseCase;

  const flowAPhone = `0999${String(Date.now()).slice(-7)}`;
  const flowASlug = `e2e-${randomUUID().slice(0, 8)}`;

  beforeAll(async () => {
    await redis.connect();
    const redisService = new RedisService(redisUrl);
    await redisService.onModuleInit();

    prisma = new PrismaService();
    await prisma.onModuleInit();

    const tokens = new JwtTokenService({
      accessSecret: 'access-secret-at-least-32-characters-long',
      refreshSecret: 'refresh-secret-at-least-32-characters-long',
      accessTtlSeconds: 900,
      refreshTtlSeconds: 2_592_000,
      verifiedTtlSeconds: 300,
    });

    const otpStore = new RedisOtpStore(redisService);
    const rateLimiter = new OtpRateLimiterService(redisService, 10);
    const sms = { send: vi.fn().mockResolvedValue(undefined) };
    requestOtp = new RequestOtpUseCase(otpStore, rateLimiter, sms, 120);

    const audit = new PrismaAuditService(prisma);
    const userRepository = new PrismaUserRepository(prisma);
    const staffRepository = new PrismaStaffRepository(prisma);
    const globalCustomers = new PrismaGlobalCustomerRepository(prisma);
    const tenantCustomers = new PrismaTenantCustomerRepository(prisma);

    const noopRecordLogin = {
      recordStaffLogin: vi.fn().mockResolvedValue({ previous: null, newIpAlert: false }),
    };
    const noopCreateStaffSession = {
      execute: vi.fn().mockResolvedValue({ sessionId: 'integration-session' }),
    };
    const noopLoginHardening = new NoopLoginHardeningPort();

    verifyOtp = new VerifyOtpUseCase(
      otpStore,
      userRepository,
      staffRepository,
      globalCustomers,
      new PrismaTenantRepository(prisma),
      tokens,
      audit,
      noopCreateStaffSession as never,
      noopRecordLogin as never,
      noopLoginHardening,
    );

    const tokenBlacklist = new RedisTokenBlacklistService(redisService);

    registerTenant = new RegisterTenantUseCase(
      new ValidateVerifiedRegisterTokenUseCase(tokens, tokenBlacklist),
      new PrismaTenantRegistrationRepository(prisma),
      userRepository,
      staffRepository,
      new RegisterRateLimiterService(redisService, 100),
      tokens,
      tokenBlacklist,
      audit,
    );

    createCustomer = new CreateTenantCustomerUseCase(
      userRepository,
      globalCustomers,
      tenantCustomers,
      new PrismaBranchReader(prisma),
      new PrismaTenantPlanReader(prisma),
      audit,
    );

    listCustomers = new ListTenantCustomersUseCase(tenantCustomers);
    dashboard = new GetDashboardReportUseCase(
      new PrismaInstallmentReportRepository(prisma),
      new PrismaTenantRepository(prisma),
      new RedisReportCache(redisService),
    );
    softDelete = new SoftDeleteEntityUseCase(tenantCustomers, audit, 'tenant_customer');
    restore = new RestoreEntityUseCase(tenantCustomers, audit, 'tenant_customer');
  });

  afterAll(async () => {
    await redis.del(`otp:staff:${flowAPhone}`, `ratelimit:otp:${flowAPhone}`);
    await redis.quit();
    await prisma?.$disconnect();
  });

  it('Flow A — register tenant, customer, list, dashboard, soft delete, restore', async () => {
    const verifiedToken = await runOtpRegisterFlow(requestOtp, verifyOtp, flowAPhone);

    const registration = await registerTenant.execute({
      name: 'E2E Shop',
      slug: flowASlug,
      ownerName: 'Owner',
      ownerPhone: flowAPhone,
      verifiedToken,
    });

    const staffContext = {
      staffId: registration.staff.id,
      dataScope: 'all' as const,
      assignedBranchIds: [] as string[],
      activeBranchId: null,
    };

    const runCtx = { tenantId: registration.tenant.id, staffId: registration.staff.id };

    const created = await runAsStaff(runCtx, () =>
      createCustomer.execute({
        tenantId: registration.tenant.id,
        actorId: registration.staff.id,
        phone: '09121112233',
        name: 'مشتری تست',
        staffContext,
      }),
    );

    const listed = await runAsStaff(runCtx, () =>
      listCustomers.execute({
        tenantId: registration.tenant.id,
        staffContext,
      }),
    );

    expect(listed.items).toHaveLength(1);
    expect(listed.items[0]?.id).toBe(created.customer.id);

    const report = await runAsStaff(runCtx, () =>
      dashboard.execute({
        tenantId: registration.tenant.id,
        actorId: registration.staff.id,
        staffContext,
      }),
    );
    expect(report.data.activeSalesCount).toBe(0);
    expect(report.meta.cached).toBe(false);

    await runAsStaff(runCtx, () =>
      softDelete.execute({
        tenantId: registration.tenant.id,
        entityId: created.customer.id,
        actorId: registration.staff.id,
      }),
    );

    const afterDelete = await runAsStaff(runCtx, () =>
      listCustomers.execute({
        tenantId: registration.tenant.id,
        staffContext,
      }),
    );
    expect(afterDelete.items).toHaveLength(0);

    const afterDeleteReport = await runAsStaff(runCtx, () =>
      dashboard.execute({
        tenantId: registration.tenant.id,
        actorId: registration.staff.id,
        staffContext,
      }),
    );
    expect(afterDeleteReport.data.activeSalesCount).toBe(0);

    await runAsStaff(runCtx, () =>
      restore.execute({
        tenantId: registration.tenant.id,
        entityId: created.customer.id,
        actorId: registration.staff.id,
      }),
    );

    const afterRestore = await runAsStaff(runCtx, () =>
      listCustomers.execute({
        tenantId: registration.tenant.id,
        staffContext,
      }),
    );
    expect(afterRestore.items).toHaveLength(1);
  });

  it('Flow B — demo-shop owner can create customer and read dashboard', async () => {
    const demoTenant = await prisma.tenant.findFirst({
      where: { slug: 'demo-shop', deletedAt: null },
    });
    const demoStaff = demoTenant
      ? await prisma.staff.findFirst({
          where: { tenantId: demoTenant.id, deletedAt: null },
        })
      : null;

    if (!demoTenant || !demoStaff) {
      return;
    }

    const staffContext = {
      staffId: demoStaff.id,
      dataScope: 'all' as const,
      assignedBranchIds: [] as string[],
      activeBranchId: null,
    };
    const runCtx = { tenantId: demoTenant.id, staffId: demoStaff.id };

    const before = await runAsStaff(runCtx, () =>
      dashboard.execute({
        tenantId: demoTenant.id,
        actorId: demoStaff.id,
        staffContext,
      }),
    );

    await runAsStaff(runCtx, () =>
      createCustomer.execute({
        tenantId: demoTenant.id,
        actorId: demoStaff.id,
        phone: `0913${String(Date.now()).slice(-7)}`,
        name: 'مشتری دمو',
        staffContext,
      }),
    );

    const after = await runAsStaff(runCtx, () =>
      dashboard.execute({
        tenantId: demoTenant.id,
        actorId: demoStaff.id,
        staffContext,
      }),
    );
    expect(after.data.activeSalesCount).toBe(before.data.activeSalesCount);
  });

  it('isolates customers by tenant context', async () => {
    const tenants = await prisma.tenant.findMany({
      where: { deletedAt: null },
      take: 2,
      orderBy: { createdAt: 'asc' },
    });
    if (tenants.length < 2) return;

    const [tenantA, tenantB] = tenants;
    const staffA = await prisma.staff.findFirst({
      where: { tenantId: tenantA.id, deletedAt: null },
    });
    const staffB = await prisma.staff.findFirst({
      where: { tenantId: tenantB.id, deletedAt: null },
    });
    if (!staffA || !staffB) return;

    const staffContextA = {
      staffId: staffA.id,
      dataScope: 'all' as const,
      assignedBranchIds: [] as string[],
      activeBranchId: null,
    };
    const staffContextB = {
      staffId: staffB.id,
      dataScope: 'all' as const,
      assignedBranchIds: [] as string[],
      activeBranchId: null,
    };

    const phoneA = `0914${String(Date.now()).slice(-7)}`;
    const phoneB = `0915${String(Date.now() + 1).slice(-7)}`;

    const createdA = await runAsStaff(
      { tenantId: tenantA.id, staffId: staffA.id },
      () =>
        createCustomer.execute({
          tenantId: tenantA.id,
          actorId: staffA.id,
          phone: phoneA,
          name: 'Tenant A',
          staffContext: staffContextA,
        }),
    );

    await runAsStaff({ tenantId: tenantB.id, staffId: staffB.id }, () =>
      createCustomer.execute({
        tenantId: tenantB.id,
        actorId: staffB.id,
        phone: phoneB,
        name: 'Tenant B',
        staffContext: staffContextB,
      }),
    );

    const listA = await runAsStaff({ tenantId: tenantA.id, staffId: staffA.id }, () =>
      listCustomers.execute({
        tenantId: tenantA.id,
        staffContext: staffContextA,
      }),
    );

    expect(listA.items.some((item) => item.id === createdA.customer.id)).toBe(true);
    expect(listA.items.every((item) => item.customer.phone !== phoneB)).toBe(true);
  });
});
