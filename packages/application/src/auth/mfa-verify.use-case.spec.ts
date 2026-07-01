import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MfaVerifyUseCase } from './mfa-verify.use-case.js';

describe('MfaVerifyUseCase', () => {
  const validateMfaToken = { execute: vi.fn() };
  const userRepository = { findById: vi.fn(), updateLastLoginAt: vi.fn() };
  const staffRepository = { findById: vi.fn(), updateLastLoginAt: vi.fn() };
  const userMfa = {
    getLoginStepUp: vi.fn(),
    isOtpStepUpEnabled: vi.fn(),
    verifyTotp: vi.fn(),
  };
  const otpStore = { get: vi.fn(), update: vi.fn(), delete: vi.fn() };
  const tokens = {
    signAccessToken: vi.fn().mockResolvedValue('access-token'),
    signRefreshToken: vi.fn().mockResolvedValue({ token: 'refresh-token', jti: 'refresh-jti' }),
    getAccessTtlSeconds: vi.fn().mockReturnValue(900),
    getRefreshTtlSeconds: vi.fn().mockReturnValue(2_592_000),
  };
  const audit = { log: vi.fn().mockResolvedValue(undefined) };
  const createStaffSession = { execute: vi.fn().mockResolvedValue({ sessionId: 'session-1' }) };

  const useCase = new MfaVerifyUseCase(
    validateMfaToken as never,
    userRepository as never,
    staffRepository as never,
    userMfa as never,
    otpStore as never,
    tokens as never,
    audit as never,
    createStaffSession as never,
  );

  const payload = {
    sub: 'user-1',
    actor: 'staff' as const,
    tenantId: 'tenant-1',
    staffId: 'staff-1',
    type: 'mfa_pending' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    validateMfaToken.execute.mockImplementation(async (input: { consume?: boolean }) => {
      if (input.consume === false) return payload;
      return payload;
    });
    userRepository.findById.mockResolvedValue({
      id: 'user-1',
      phone: '09123456789',
      status: 'active',
      lastLoginAt: null,
    });
    userMfa.getLoginStepUp.mockResolvedValue({
      required: true,
      methods: ['otp'],
      otpEnabled: true,
      totpEnabled: false,
    });
    otpStore.get.mockResolvedValue({ code: '12345', attempts: 0 });
    staffRepository.findById.mockResolvedValue({
      id: 'staff-1',
      tenantId: 'tenant-1',
      userId: 'user-1',
      tenantSlug: 'demo',
      tenantName: 'Demo',
      tenantStatus: 'active',
      status: 'active',
      name: 'Ali',
      phone: '09123456789',
    });
  });

  it('issues session after valid MFA OTP', async () => {
    const result = await useCase.execute({
      mfaToken: 'mfa-token',
      method: 'otp',
      code: '12345',
    });

    expect(result).toMatchObject({
      kind: 'session',
      accessToken: 'access-token',
      staff: { id: 'staff-1' },
    });
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'auth.mfa_success' }),
    );
    expect(validateMfaToken.execute).toHaveBeenLastCalledWith({
      mfaToken: 'mfa-token',
      consume: true,
    });
  });

  it('rejects invalid OTP and audits failure', async () => {
    otpStore.get.mockResolvedValue({ code: '99999', attempts: 0 });

    await expect(
      useCase.execute({ mfaToken: 'mfa-token', method: 'otp', code: '12345' }),
    ).rejects.toMatchObject({ code: 'AUTH_OTP_INVALID', httpStatus: 400 });

    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'auth.mfa_failed' }),
    );
  });
});
