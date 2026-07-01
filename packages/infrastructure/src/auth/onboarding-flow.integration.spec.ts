import {
  RequestOtpUseCase,
  ValidateVerifiedRegisterTokenUseCase,
  VerifyOtpUseCase,
} from '@hivork/application';
import {
  JwtTokenService,
  NoopLoginHardeningPort,
  OtpRateLimiterService,
  PrismaAuditService,
  PrismaGlobalCustomerRepository,
  PrismaService,
  PrismaStaffRepository,
  PrismaUserRepository,
  PrismaTenantRepository,
  RedisOtpStore,
  RedisService,
} from '../index.js';
import Redis from 'ioredis';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { probeRedis } from '../test/probe-redis.js';

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
const databaseUrl = process.env.DATABASE_URL;
const hasDatabase = Boolean(databaseUrl);
const redisAvailable = await probeRedis(redisUrl);
const describeIfRedis = redisAvailable ? describe : describe.skip;

const flowAPhone = '09991112233';
const flowCPhone = '09992223344';

const noopRecordLogin = {
  recordStaffLogin: vi.fn().mockResolvedValue({ previous: null, newIpAlert: false }),
};
const noopCreateStaffSession = {
  execute: vi.fn().mockResolvedValue({ sessionId: 'integration-session' }),
};
const noopLoginHardening = new NoopLoginHardeningPort();

async function runOtpFlow(params: {
  requestOtp: RequestOtpUseCase;
  verifyOtp: VerifyOtpUseCase;
  phone: string;
  actor: 'staff' | 'customer';
  intent: 'login' | 'register';
  tenantSlug?: string;
}): Promise<unknown> {
  await params.requestOtp.execute({ phone: params.phone, actor: params.actor });

  const otpStore = new RedisOtpStore(new RedisService(redisUrl));
  const record = await otpStore.get({ actor: params.actor, phone: params.phone });
  if (!record) throw new Error('OTP not stored');

  return params.verifyOtp.execute({
    phone: params.phone,
    code: record.code,
    actor: params.actor,
    intent: params.intent,
    tenantSlug: params.tenantSlug,
  });
}

describeIfRedis('TASK-055 onboarding flows (integration)', () => {
  const redis = new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 });
  let requestOtp: RequestOtpUseCase;
  let verifyOtp: VerifyOtpUseCase;
  let validateVerifiedToken: ValidateVerifiedRegisterTokenUseCase;
  let tokens: JwtTokenService;
  let staffRepository: PrismaStaffRepository;
  let userRepository: PrismaUserRepository;

  beforeAll(async () => {
    await redis.connect();
    const redisService = new RedisService(redisUrl);
    await redisService.onModuleInit();

    tokens = new JwtTokenService({
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

    if (hasDatabase) {
      const prisma = new PrismaService();
      await prisma.onModuleInit();
      userRepository = new PrismaUserRepository(prisma);
      staffRepository = new PrismaStaffRepository(prisma);
      verifyOtp = new VerifyOtpUseCase(
        otpStore,
        userRepository,
        staffRepository,
        new PrismaGlobalCustomerRepository(prisma),
        new PrismaTenantRepository(prisma),
        tokens,
        new PrismaAuditService(prisma),
        noopCreateStaffSession as never,
        noopRecordLogin as never,
        noopLoginHardening,
      );
    } else {
      userRepository = {
        findByPhone: vi.fn().mockResolvedValue(null),
        findOrCreateByPhone: vi.fn().mockImplementation(async (phone: string) => ({
          id: 'user-flow-c',
          phone,
          name: null,
          status: 'active' as const,
        })),
        updateLastLoginAt: vi.fn(),
        findById: vi.fn(),
      } as never;
      staffRepository = {
        findByTenantSlugAndUserId: vi.fn(),
        findAllByUserId: vi.fn(),
        findContextById: vi.fn(),
        findById: vi.fn(),
        updateLastLoginAt: vi.fn(),
      } as never;
      verifyOtp = new VerifyOtpUseCase(
        otpStore,
        userRepository,
        staffRepository,
        {
          findByUserId: vi.fn().mockResolvedValue(null),
          findByPhone: vi.fn().mockResolvedValue(null),
          findById: vi.fn(),
          create: vi.fn().mockImplementation(async (userId: string) => ({
            id: 'cust-flow-c',
            userId,
            phone: flowCPhone,
            name: null,
            status: 'active' as const,
          })),
        } as never,
        { findById: vi.fn(), findBySlug: vi.fn() },
        tokens,
        { log: vi.fn() },
        noopCreateStaffSession as never,
        noopRecordLogin as never,
        noopLoginHardening,
      );
    }

    validateVerifiedToken = new ValidateVerifiedRegisterTokenUseCase(tokens, {
      isRevoked: vi.fn().mockResolvedValue(false),
      revoke: vi.fn(),
    } as never);
  });

  afterAll(async () => {
    const keys = [
      `otp:staff:${flowAPhone}`,
      `ratelimit:otp:${flowAPhone}`,
      `otp:customer:${flowCPhone}`,
      `ratelimit:otp:${flowCPhone}`,
    ];
    if (hasDatabase) {
      keys.push(`otp:staff:09120000000`, `ratelimit:otp:09120000000`);
    }
    await redis.del(...keys);
    await redis.quit();
  });

  it('Flow A — register OTP verify returns a valid verifiedToken', async () => {
    const result = await runOtpFlow({
      requestOtp,
      verifyOtp,
      phone: flowAPhone,
      actor: 'staff',
      intent: 'register',
    });

    expect(result).toMatchObject({
      kind: 'verified',
      expiresIn: 300,
    });

    const verifiedToken = (result as { verifiedToken: string }).verifiedToken;
    const payload = await tokens.verifyVerifiedToken(verifiedToken);
    expect(payload).toMatchObject({
      phone: flowAPhone,
      actor: 'staff',
      purpose: 'register',
      type: 'verified',
    });

    await expect(
      validateVerifiedToken.execute({
        verifiedToken,
        ownerPhone: flowAPhone,
      }),
    ).resolves.toEqual({ phone: flowAPhone });
  });

  it.runIf(hasDatabase)(
    'Flow B — seed demo-shop staff login returns session tokens',
    async () => {
      const ownerPhone = '09120000000';
      const result = await runOtpFlow({
        requestOtp,
        verifyOtp,
        phone: ownerPhone,
        actor: 'staff',
        intent: 'login',
        tenantSlug: 'demo-shop',
      });

      expect(result).toMatchObject({
        kind: 'session',
        tenant: { slug: 'demo-shop' },
      });
      expect((result as { accessToken: string }).accessToken).toEqual(expect.any(String));
    },
  );

  it.runIf(hasDatabase)(
    'Flow A edge — register allowed when user already has staff in another tenant',
    async () => {
      const result = await runOtpFlow({
        requestOtp,
        verifyOtp,
        phone: '09120000000',
        actor: 'staff',
        intent: 'register',
      });

      expect(result).toMatchObject({
        kind: 'verified',
        expiresIn: 300,
      });
    },
  );

  it('Flow C — customer login returns session and creates customer', async () => {
    const result = await runOtpFlow({
      requestOtp,
      verifyOtp,
      phone: flowCPhone,
      actor: 'customer',
      intent: 'login',
    });

    expect(result).toMatchObject({
      kind: 'session',
      customer: { phone: flowCPhone },
    });
  });
});
