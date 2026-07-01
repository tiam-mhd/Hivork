import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  FORGOT_PASSWORD_UNIFORM_MESSAGE,
  ForgotPasswordRequestUseCase,
} from './forgot-password-request.use-case.js';

describe('ForgotPasswordRequestUseCase', () => {
  const userRepository = { findByPhone: vi.fn() };
  const credentialRepository = { findByUserId: vi.fn() };
  const otpStore = { save: vi.fn() };
  const sms = { send: vi.fn() };
  const rateLimiter = { checkRequestAllowed: vi.fn().mockResolvedValue(true) };
  const loginHardening = { assertLoginAllowed: vi.fn().mockResolvedValue(undefined) };
  const audit = { log: vi.fn().mockResolvedValue(undefined) };

  const useCase = new ForgotPasswordRequestUseCase(
    userRepository as never,
    credentialRepository as never,
    otpStore as never,
    sms as never,
    rateLimiter as never,
    loginHardening as never,
    audit as never,
    120,
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns uniform response without sending OTP when credential missing', async () => {
    userRepository.findByPhone.mockResolvedValue(null);

    const result = await useCase.execute({ phone: '09123456789' });

    expect(result.message).toBe(FORGOT_PASSWORD_UNIFORM_MESSAGE);
    expect(otpStore.save).not.toHaveBeenCalled();
    expect(sms.send).not.toHaveBeenCalled();
  });

  it('sends OTP when credential exists', async () => {
    userRepository.findByPhone.mockResolvedValue({ id: 'user-1', phone: '09123456789' });
    credentialRepository.findByUserId.mockResolvedValue({ id: 'cred-1' });

    const result = await useCase.execute({ phone: '09123456789' });

    expect(result.expiresIn).toBe(120);
    expect(otpStore.save).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: 'staff',
        phone: '09123456789',
        purpose: 'password_reset',
      }),
    );
    expect(sms.send).toHaveBeenCalled();
  });
});
