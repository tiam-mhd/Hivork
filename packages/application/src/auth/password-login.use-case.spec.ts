import { UserCredential } from '@hivork/domain';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PasswordLoginUseCase } from './password-login.use-case.js';

describe('PasswordLoginUseCase', () => {
  const userRepository = {
    findByPhone: vi.fn(),
    updateLastLoginAt: vi.fn(),
  };
  const credentialRepository = {
    findByUserId: vi.fn(),
    update: vi.fn(),
  };
  const passwordHasher = {
    hash: vi.fn(),
    verify: vi.fn(),
  };
  const staffRepository = {
    findByTenantSlugAndUserId: vi.fn(),
    findAllByUserId: vi.fn(),
    updateLastLoginAt: vi.fn(),
  };
  const tenantRepository = {
    findBySlug: vi.fn(),
  };
  const tokens = {
    signAccessToken: vi.fn().mockResolvedValue('access-token'),
    signRefreshToken: vi.fn().mockResolvedValue({ token: 'refresh-token', jti: 'refresh-jti' }),
    signMfaPendingToken: vi.fn().mockResolvedValue('mfa-token'),
    signChangePasswordToken: vi.fn().mockResolvedValue('change-password-token'),
    getAccessTtlSeconds: vi.fn().mockReturnValue(900),
    getRefreshTtlSeconds: vi.fn().mockReturnValue(2_592_000),
    getRefreshSessionTtlSeconds: vi.fn().mockReturnValue(86_400),
    getMfaPendingTtlSeconds: vi.fn().mockReturnValue(300),
    getChangePasswordTtlSeconds: vi.fn().mockReturnValue(600),
  };
  const userMfa = {
    getLoginStepUp: vi.fn().mockResolvedValue({
      required: false,
      methods: [],
      otpEnabled: false,
      totpEnabled: false,
    }),
    isOtpStepUpEnabled: vi.fn().mockResolvedValue(false),
    verifyTotp: vi.fn().mockResolvedValue({ ok: false, reason: 'invalid' }),
  };
  const loginHardening = {
    assertLoginAllowed: vi.fn().mockResolvedValue(undefined),
    recordPasswordLoginFailure: vi.fn().mockResolvedValue(undefined),
  };
  const loginRateLimiter = { checkAndRecord: vi.fn().mockResolvedValue(true) };
  const settingsRepository = { findByModule: vi.fn().mockResolvedValue({}) };
  const schemaRegistry = { getSchema: vi.fn().mockReturnValue(null) };
  const audit = { log: vi.fn().mockResolvedValue(undefined) };
  const createStaffSession = { execute: vi.fn().mockResolvedValue({ sessionId: 'session-1' }) };
  const recordLogin = {
    recordStaffLogin: vi.fn().mockResolvedValue({
      previous: {
        at: '2026-06-29T10:00:00.000Z',
        ip: '5.6.7.8',
        deviceLabel: 'Safari — iOS',
      },
      newIpAlert: true,
    }),
  };

  const useCase = new PasswordLoginUseCase(
    userRepository as never,
    credentialRepository as never,
    passwordHasher as never,
    staffRepository as never,
    tenantRepository as never,
    tokens as never,
    userMfa as never,
    loginHardening as never,
    loginRateLimiter as never,
    settingsRepository as never,
    schemaRegistry as never,
    audit as never,
    createStaffSession as never,
    recordLogin as never,
  );

  const activeUser = {
    id: 'user-1',
    phone: '09123456789',
    name: 'Ali',
    status: 'active' as const,
    lastLoginAt: new Date('2026-06-29T10:00:00Z'),
  };

  const activeCredential = UserCredential.reconstitute({
    id: 'cred-1',
    userId: 'user-1',
    passwordHash: 'hash',
    passwordChangedAt: new Date(),
    mustChangePassword: false,
    status: 'active',
    failedLoginCount: 0,
    lockedUntil: null,
    lastFailedLoginAt: null,
    deletedAt: null,
    deletedById: null,
    deleteReason: null,
    version: 1,
  });

  const staffMatch = {
    id: 'staff-1',
    tenantId: 'tenant-1',
    tenantSlug: 'demo',
    tenantName: 'Demo Shop',
    tenantStatus: 'active' as const,
    status: 'active' as const,
    name: 'Ali',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    loginRateLimiter.checkAndRecord.mockReset();
    loginRateLimiter.checkAndRecord.mockResolvedValue(true);
    loginHardening.assertLoginAllowed.mockReset();
    loginHardening.assertLoginAllowed.mockResolvedValue(undefined);
    loginHardening.recordPasswordLoginFailure.mockReset();
    loginHardening.recordPasswordLoginFailure.mockResolvedValue(undefined);
    userRepository.findByPhone.mockResolvedValue(activeUser);
    credentialRepository.findByUserId.mockResolvedValue(activeCredential);
    passwordHasher.verify.mockResolvedValue(true);
    staffRepository.findByTenantSlugAndUserId.mockResolvedValue(staffMatch);
    staffRepository.findAllByUserId.mockResolvedValue([staffMatch]);
  });

  it('returns session on successful password login', async () => {
    const result = await useCase.execute({
      phone: '09123456789',
      password: 'Secret1pass',
      tenantSlug: 'demo',
      clientIp: '1.2.3.4',
      userAgent: 'Chrome',
    });

    expect(result).toMatchObject({
      kind: 'session',
      accessToken: 'access-token',
      expiresIn: 900,
      staff: { id: 'staff-1', tenantId: 'tenant-1', name: 'Ali' },
      tenant: { id: 'tenant-1', slug: 'demo', name: 'Demo Shop' },
      lastLogin: {
        at: '2026-06-29T10:00:00.000Z',
        ip: '5.6.7.8',
        deviceLabel: 'Safari — iOS',
      },
      newIpAlert: true,
    });
    expect(recordLogin.recordStaffLogin).toHaveBeenCalledWith(
      'staff-1',
      'tenant-1',
      'user-1',
      expect.objectContaining({ ipAddress: '1.2.3.4', userAgent: 'Chrome' }),
    );
    expect(credentialRepository.update).toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'auth.login_success',
        metadata: expect.objectContaining({ method: 'password' }),
      }),
    );
  });

  it('returns uniform invalid credentials when user is missing', async () => {
    userRepository.findByPhone.mockResolvedValue(null);

    await expect(
      useCase.execute({ phone: '09123456789', password: 'wrong' }),
    ).rejects.toMatchObject({ code: 'AUTH_INVALID_CREDENTIALS', httpStatus: 401 });
  });

  it('increments failed login count on wrong password', async () => {
    passwordHasher.verify.mockResolvedValue(false);

    await expect(
      useCase.execute({ phone: '09123456789', password: 'wrong', tenantSlug: 'demo' }),
    ).rejects.toMatchObject({ code: 'AUTH_INVALID_CREDENTIALS', httpStatus: 401 });

    expect(credentialRepository.update).toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'auth.login_failed',
        metadata: expect.objectContaining({ method: 'password', reason: 'invalid_credentials' }),
      }),
    );
  });

  it('returns account locked when credential is locked', async () => {
    const lockedCredential = UserCredential.reconstitute({
      ...activeCredential.toPersistence(),
      status: 'locked',
      failedLoginCount: 5,
      lockedUntil: new Date(Date.now() + 60_000),
    });
    credentialRepository.findByUserId.mockResolvedValue(lockedCredential);

    await expect(
      useCase.execute({ phone: '09123456789', password: 'Secret1pass' }),
    ).rejects.toMatchObject({
      code: 'AUTH_ACCOUNT_LOCKED',
      httpStatus: 423,
      details: expect.objectContaining({
        lockedUntil: expect.any(String),
        retryAfterSeconds: expect.any(Number),
      }),
    });
  });

  it('returns rate limited when IP/phone window exceeded', async () => {
    loginRateLimiter.checkAndRecord.mockResolvedValue(false);

    await expect(
      useCase.execute({ phone: '09123456789', password: 'wrong', clientIp: '1.2.3.4' }),
    ).rejects.toMatchObject({
      code: 'AUTH_LOGIN_RATE_LIMITED',
      httpStatus: 429,
      details: expect.objectContaining({ retryAfterSeconds: expect.any(Number) }),
    });
  });

  it('audits lockout when max failed attempts reached', async () => {
    passwordHasher.verify.mockResolvedValue(false);
    const credential = UserCredential.reconstitute({
      ...activeCredential.toPersistence(),
      failedLoginCount: 4,
    });
    credentialRepository.findByUserId.mockResolvedValue(credential);

    await expect(
      useCase.execute({ phone: '09123456789', password: 'wrong', tenantSlug: 'demo' }),
    ).rejects.toMatchObject({ code: 'AUTH_ACCOUNT_LOCKED', httpStatus: 423 });

    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'auth.lockout_triggered' }),
    );
  });

  it('returns must change password when flag is set', async () => {
    const mustChangeCredential = UserCredential.reconstitute({
      ...activeCredential.toPersistence(),
      mustChangePassword: true,
      status: 'must_change_password',
    });
    credentialRepository.findByUserId.mockResolvedValue(mustChangeCredential);

    const result = await useCase.execute({
      phone: '09123456789',
      password: 'Secret1pass',
    });

    expect(result).toEqual({
      kind: 'must_change_password',
      changePasswordToken: 'change-password-token',
      expiresIn: 600,
    });
  });

  it('throws NEED_TENANT_SLUG for multi-tenant staff without slug', async () => {
    staffRepository.findAllByUserId.mockResolvedValue([
      staffMatch,
      { ...staffMatch, id: 'staff-2', tenantId: 'tenant-2', tenantSlug: 'shop-b', tenantName: 'Shop B' },
    ]);

    await expect(
      useCase.execute({ phone: '09123456789', password: 'Secret1pass' }),
    ).rejects.toMatchObject({ code: 'NEED_TENANT_SLUG', httpStatus: 409 });
  });

  it('returns mfa_required when login step-up is required', async () => {
    userMfa.getLoginStepUp.mockResolvedValue({
      required: true,
      methods: ['otp', 'totp'],
      otpEnabled: true,
      totpEnabled: true,
    });

    const result = await useCase.execute({
      phone: '09123456789',
      password: 'Secret1pass',
      tenantSlug: 'demo',
      rememberMe: true,
    });

    expect(result).toEqual({
      kind: 'mfa_required',
      mfaToken: 'mfa-token',
      expiresIn: 300,
      methods: ['otp', 'totp'],
    });
    expect(tokens.signMfaPendingToken).toHaveBeenCalledWith({
      sub: 'user-1',
      actor: 'staff',
      tenantId: 'tenant-1',
      staffId: 'staff-1',
      rememberMe: true,
    });
  });
});
