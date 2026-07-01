import { describe, expect, it, vi } from 'vitest';

import { ValidateVerifiedRegisterTokenUseCase } from '../auth/validate-verified-register-token.use-case.js';
import { RegisterTenantUseCase } from './register-tenant.use-case.js';

describe('RegisterTenantUseCase', () => {
  const tokenBlacklist = { isRevoked: vi.fn().mockResolvedValue(false), revoke: vi.fn().mockResolvedValue(undefined) };
  const validateVerifiedToken = new ValidateVerifiedRegisterTokenUseCase(
    {
      verifyVerifiedToken: vi.fn().mockResolvedValue({
        phone: '09123456789',
        actor: 'staff',
        purpose: 'register',
        type: 'verified',
      }),
    } as never,
    tokenBlacklist as never,
  );

  const registrationRepository = {
    isSlugTaken: vi.fn(),
    register: vi.fn(),
  };
  const userRepository = {
    findOrCreateByPhone: vi.fn(),
    updateLastLoginAt: vi.fn(),
  };
  const staffRepository = {
    updateLastLoginAt: vi.fn(),
  };
  const registerRateLimiter = { checkRegisterRateLimit: vi.fn().mockResolvedValue(true) };
  const tokens = {
    signAccessToken: vi.fn().mockResolvedValue('access-token'),
    signRefreshToken: vi.fn().mockResolvedValue({ token: 'refresh-token', jti: 'refresh-jti' }),
    getAccessTtlSeconds: vi.fn().mockReturnValue(900),
    getVerifiedTtlSeconds: vi.fn().mockReturnValue(300),
  };
  const audit = { log: vi.fn() };

  const useCase = new RegisterTenantUseCase(
    validateVerifiedToken,
    registrationRepository,
    userRepository as never,
    staffRepository as never,
    registerRateLimiter,
    tokens as never,
    tokenBlacklist as never,
    audit,
  );

  const baseInput = {
    name: 'فروشگاه تست',
    slug: 'test-shop',
    ownerName: 'مالک',
    ownerPhone: '09123456789',
    verifiedToken: 'verified-token',
    clientIp: '127.0.0.1',
  };

  it('registers tenant and returns session tokens', async () => {
    userRepository.findOrCreateByPhone.mockResolvedValue({
      id: 'user-1',
      phone: '09123456789',
      name: 'مالک',
      status: 'active',
    });
    registrationRepository.isSlugTaken.mockResolvedValue(false);
    registrationRepository.register.mockResolvedValue({
      tenant: { id: 'tenant-1', slug: 'test-shop', name: 'فروشگاه تست' },
      staff: { id: 'staff-1', tenantId: 'tenant-1', name: 'مالک', userId: 'user-1' },
    });

    const result = await useCase.execute(baseInput);

    expect(result).toMatchObject({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresIn: 900,
      tenant: { id: 'tenant-1', slug: 'test-shop' },
      staff: { id: 'staff-1', tenantId: 'tenant-1' },
    });
    expect(registrationRepository.register).toHaveBeenCalledWith(
      expect.objectContaining({ ownerUserId: 'user-1' }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'tenant.create', entityType: 'tenant' }),
    );
    expect(tokenBlacklist.revoke).toHaveBeenCalledWith('verified-token', 300);
  });

  it('rejects taken slug', async () => {
    userRepository.findOrCreateByPhone.mockResolvedValue({
      id: 'user-1',
      phone: '09123456789',
      name: 'مالک',
      status: 'active',
    });
    registrationRepository.isSlugTaken.mockResolvedValue(true);

    await expect(useCase.execute(baseInput)).rejects.toMatchObject({
      code: 'SLUG_TAKEN',
      httpStatus: 409,
    });
  });

  it('rejects when register rate limit exceeded', async () => {
    registerRateLimiter.checkRegisterRateLimit.mockResolvedValue(false);

    await expect(useCase.execute(baseInput)).rejects.toMatchObject({
      code: 'REGISTER_RATE_LIMITED',
      httpStatus: 429,
    });
  });
});
