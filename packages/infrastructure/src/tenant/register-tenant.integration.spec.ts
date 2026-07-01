import {
  RegisterTenantUseCase,
  ValidateVerifiedRegisterTokenUseCase,
} from '@hivork/application';
import { afterAll, describe, expect, it } from 'vitest';

import { PrismaAuditService } from '../audit/prisma-audit.service.js';
import { JwtTokenService } from '../auth/jwt-token.service.js';
import { PrismaStaffRepository } from '../persistence/staff.repository.js';
import { PrismaUserRepository } from '../persistence/user.repository.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RegisterRateLimiterService } from '../redis/register-rate-limiter.service.js';
import { RedisService } from '../redis/redis.service.js';
import { RedisTokenBlacklistService } from '../redis/redis-token-blacklist.service.js';
import { PrismaTenantRegistrationRepository } from '../tenant/prisma-tenant-registration.repository.js';

const databaseUrl = process.env.DATABASE_URL;
const redisUrl = process.env.REDIS_URL;
const describeIfDb = databaseUrl && redisUrl ? describe : describe.skip;

describeIfDb('RegisterTenantUseCase (integration)', () => {
  const prisma = new PrismaService();
  const redisService = new RedisService(redisUrl!);
  const registrationRepository = new PrismaTenantRegistrationRepository(prisma);
  const staffRepository = new PrismaStaffRepository(prisma);
  const userRepository = new PrismaUserRepository(prisma);
  const audit = new PrismaAuditService(prisma);
  const tokens = new JwtTokenService({
    accessSecret: 'access-secret-at-least-32-characters-long',
    refreshSecret: 'refresh-secret-at-least-32-characters-long',
    accessTtlSeconds: 900,
    refreshTtlSeconds: 2_592_000,
    verifiedTtlSeconds: 300,
  });
  const validateVerifiedToken = new ValidateVerifiedRegisterTokenUseCase(
    tokens,
    new RedisTokenBlacklistService(redisService),
  );
  const registerRateLimiter = new RegisterRateLimiterService(redisService, 100);
  const tokenBlacklist = new RedisTokenBlacklistService(redisService);

  const useCase = new RegisterTenantUseCase(
    validateVerifiedToken,
    registrationRepository,
    userRepository,
    staffRepository,
    registerRateLimiter,
    tokens,
    tokenBlacklist,
    audit,
  );

  afterAll(async () => {
    await prisma.$disconnect();
    await redisService.onModuleDestroy();
  });

  it('creates tenant atomically with branch, staff, roles, settings, and subscription', async () => {
    const ownerPhone = `0913${String(Date.now()).slice(-7)}`;
    const slug = `reg-${Date.now()}`;
    const verifiedToken = await tokens.signVerifiedToken({
      phone: ownerPhone,
      actor: 'staff',
      purpose: 'register',
    });

    const result = await useCase.execute({
      name: 'فروشگاه ثبت‌نام',
      slug,
      ownerName: 'مالک جدید',
      ownerPhone,
      verifiedToken,
      clientIp: '127.0.0.1',
    });

    expect(result.tenant.slug).toBe(slug);
    expect(result.staff.name).toBe('مالک جدید');

    const tenant = await prisma.tenant.findFirst({ where: { id: result.tenant.id } });
    expect(tenant?.status).toBe('trial');
    expect(tenant?.enabledModules).toEqual(['installments']);

    const branch = await prisma.branch.findFirst({
      where: { tenantId: result.tenant.id, isDefault: true },
    });
    expect(branch?.name).toBe('شعبه اصلی');

    const staff = await prisma.staff.findFirst({ where: { id: result.staff.id } });
    expect(staff?.primaryBranchId).toBe(branch?.id);
    expect(staff?.dataScope).toBe('all');

    const roles = await prisma.role.findMany({
      where: { tenantId: result.tenant.id, isTemplate: false },
    });
    expect(roles.length).toBeGreaterThanOrEqual(4);

    const settings = await prisma.tenantSetting.findMany({
      where: { tenantId: result.tenant.id, module: 'core' },
    });
    expect(settings.length).toBeGreaterThanOrEqual(2);

    const subscription = await prisma.subscription.findFirst({
      where: { tenantId: result.tenant.id, status: 'active' },
    });
    expect(subscription).not.toBeNull();

    const auditRow = await prisma.auditLog.findFirst({
      where: { entityId: result.tenant.id, action: 'tenant.create' },
    });
    expect(auditRow).not.toBeNull();

    await prisma.tenant.update({
      where: { id: result.tenant.id },
      data: { deletedAt: new Date(), deleteReason: 'integration cleanup' },
    });
  });

  it('rejects reusing the same verified token', async () => {
    const ownerPhone = `0916${String(Date.now()).slice(-7)}`;
    const verifiedToken = await tokens.signVerifiedToken({
      phone: ownerPhone,
      actor: 'staff',
      purpose: 'register',
    });

    await useCase.execute({
      name: 'فروشگاه یکبار',
      slug: `once-${Date.now()}`,
      ownerName: 'مالک',
      ownerPhone,
      verifiedToken,
    });

    await expect(
      useCase.execute({
        name: 'فروشگاه دوباره',
        slug: `once-2-${Date.now()}`,
        ownerName: 'مالک',
        ownerPhone,
        verifiedToken,
      }),
    ).rejects.toMatchObject({ code: 'VERIFIED_TOKEN_INVALID' });
  });

  it('rejects duplicate slug with SLUG_TAKEN', async () => {
    const ownerPhone = `0917${String(Date.now()).slice(-7)}`;
    const slug = `dup-${Date.now()}`;
    const verifiedToken = await tokens.signVerifiedToken({
      phone: ownerPhone,
      actor: 'staff',
      purpose: 'register',
    });

    await useCase.execute({
      name: 'فروشگاه اول',
      slug,
      ownerName: 'مالک اول',
      ownerPhone,
      verifiedToken,
    });

    const secondToken = await tokens.signVerifiedToken({
      phone: `0918${String(Date.now()).slice(-7)}`,
      actor: 'staff',
      purpose: 'register',
    });

    await expect(
      useCase.execute({
        name: 'فروشگاه دوم',
        slug,
        ownerName: 'مالک دوم',
        ownerPhone: `0918${String(Date.now()).slice(-7)}`,
        verifiedToken: secondToken,
      }),
    ).rejects.toMatchObject({ code: 'SLUG_TAKEN', httpStatus: 409 });
  });
});
