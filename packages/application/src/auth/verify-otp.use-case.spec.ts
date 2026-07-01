import { describe, expect, it, vi, beforeEach } from 'vitest';

import { VerifyOtpUseCase } from './verify-otp.use-case.js';

describe('VerifyOtpUseCase', () => {
  const otpStore = {
    get: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
    save: vi.fn(),
  };
  const userRepository = {
    findByPhone: vi.fn(),
    findOrCreateByPhone: vi.fn(),
    updateLastLoginAt: vi.fn(),
  };
  const staffRepository = {
    findByTenantSlugAndUserId: vi.fn(),
    findAllByUserId: vi.fn(),
    updateLastLoginAt: vi.fn(),
  };
  const customerRepository = {
    findByUserId: vi.fn(),
    create: vi.fn(),
  };
  const tenantRepository = {
    findById: vi.fn(),
    findBySlug: vi.fn(),
  };
  const tokens = {
    signAccessToken: vi.fn().mockResolvedValue('access-token'),
    signRefreshToken: vi.fn().mockResolvedValue({ token: 'refresh-token', jti: 'refresh-jti' }),
    signVerifiedToken: vi.fn().mockResolvedValue('verified-token'),
    verifyAccessToken: vi.fn(),
    verifyRefreshToken: vi.fn(),
    verifyVerifiedToken: vi.fn(),
    getAccessTtlSeconds: vi.fn().mockReturnValue(900),
    getRefreshTtlSeconds: vi.fn().mockReturnValue(2_592_000),
    getRefreshSessionTtlSeconds: vi.fn().mockReturnValue(86_400),
  };
  const audit = { log: vi.fn().mockResolvedValue(undefined) };
  const createStaffSession = { execute: vi.fn().mockResolvedValue({ sessionId: 'session-1' }) };
  const recordLogin = {
    recordStaffLogin: vi.fn().mockResolvedValue({ previous: null, newIpAlert: false }),
  };
  const loginHardening = {
    assertLoginAllowed: vi.fn().mockResolvedValue(undefined),
    recordPasswordLoginFailure: vi.fn().mockResolvedValue(undefined),
  };

  const useCase = new VerifyOtpUseCase(
    otpStore,
    userRepository,
    staffRepository,
    customerRepository,
    tenantRepository,
    tokens,
    audit,
    createStaffSession,
    recordLogin,
    loginHardening,
  );

  beforeEach(() => {
    vi.clearAllMocks();
    otpStore.get.mockResolvedValue({ code: '12345', attempts: 0 });
    otpStore.delete.mockResolvedValue(undefined);
  });

  it('returns verified token for staff register', async () => {
    const result = await useCase.execute({
      phone: '09123456789',
      code: '12345',
      actor: 'staff',
      intent: 'register',
    });

    expect(result).toEqual({
      kind: 'verified',
      verifiedToken: 'verified-token',
      expiresIn: 300,
    });
    expect(tokens.signVerifiedToken).toHaveBeenCalledWith({
      phone: '09123456789',
      actor: 'staff',
      purpose: 'register',
    });
  });

  it('logs in staff when tenant slug matches', async () => {
    userRepository.findByPhone.mockResolvedValue({
      id: 'user-1',
      phone: '09123456789',
      name: 'Owner',
      status: 'active',
    });
    staffRepository.findByTenantSlugAndUserId.mockResolvedValue({
      id: 'staff-1',
      tenantId: 'tenant-1',
      userId: 'user-1',
      phone: '09123456789',
      name: 'Owner',
      status: 'active',
      tenantSlug: 'demo-shop',
      tenantName: 'Demo',
      tenantStatus: 'active',
    });

    const result = await useCase.execute({
      phone: '09123456789',
      code: '12345',
      actor: 'staff',
      intent: 'login',
      tenantSlug: 'demo-shop',
    });

    expect(result.kind).toBe('session');
    expect(recordLogin.recordStaffLogin).toHaveBeenCalledWith(
      'staff-1',
      'tenant-1',
      'user-1',
      expect.objectContaining({ ipAddress: undefined, userAgent: undefined }),
    );
    expect(loginHardening.assertLoginAllowed).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'tenant-1', clientIp: undefined }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'auth.login_success' }),
    );
  });

  it('throws OTP_INVALID on wrong code', async () => {
    otpStore.get.mockResolvedValue({ code: '99999', attempts: 0 });

    await expect(
      useCase.execute({
        phone: '09123456789',
        code: '12345',
        actor: 'staff',
        intent: 'login',
        tenantSlug: 'demo-shop',
      }),
    ).rejects.toMatchObject({ code: 'OTP_INVALID', httpStatus: 401 });
  });

  it('creates customer on first login', async () => {
    userRepository.findOrCreateByPhone.mockResolvedValue({
      id: 'user-1',
      phone: '09123456789',
      name: null,
      status: 'active',
    });
    customerRepository.findByUserId.mockResolvedValue(null);
    customerRepository.create.mockResolvedValue({
      id: 'cust-1',
      userId: 'user-1',
      phone: '09123456789',
      name: null,
      status: 'active',
    });

    const result = await useCase.execute({
      phone: '09123456789',
      code: '12345',
      actor: 'customer',
      intent: 'login',
    });

    expect(result.kind).toBe('session');
    expect(customerRepository.create).toHaveBeenCalledWith('user-1');
  });

  it('requires tenantSlug when user has multiple staff memberships', async () => {
    userRepository.findByPhone.mockResolvedValue({
      id: 'user-1',
      phone: '09123456789',
      name: null,
      status: 'active',
    });
    staffRepository.findAllByUserId.mockResolvedValue([
      {
        id: 'staff-1',
        tenantId: 'tenant-1',
        userId: 'user-1',
        phone: '09123456789',
        name: 'A',
        status: 'active',
        tenantSlug: 'shop-a',
        tenantName: 'Shop A',
        tenantStatus: 'active',
      },
      {
        id: 'staff-2',
        tenantId: 'tenant-2',
        userId: 'user-1',
        phone: '09123456789',
        name: 'B',
        status: 'active',
        tenantSlug: 'shop-b',
        tenantName: 'Shop B',
        tenantStatus: 'active',
      },
    ]);

    await expect(
      useCase.execute({
        phone: '09123456789',
        code: '12345',
        actor: 'staff',
        intent: 'login',
      }),
    ).rejects.toMatchObject({
      code: 'NEED_TENANT_SLUG',
      httpStatus: 409,
      details: { tenantSlugs: ['shop-a', 'shop-b'] },
    });
  });

  it('returns TENANT_NOT_FOUND for unknown tenant slug', async () => {
    userRepository.findByPhone.mockResolvedValue({
      id: 'user-1',
      phone: '09123456789',
      name: null,
      status: 'active',
    });
    staffRepository.findByTenantSlugAndUserId.mockResolvedValue(null);
    tenantRepository.findBySlug.mockResolvedValue(null);

    await expect(
      useCase.execute({
        phone: '09123456789',
        code: '12345',
        actor: 'staff',
        intent: 'login',
        tenantSlug: 'missing-shop',
      }),
    ).rejects.toMatchObject({ code: 'TENANT_NOT_FOUND', httpStatus: 404 });
  });
});
