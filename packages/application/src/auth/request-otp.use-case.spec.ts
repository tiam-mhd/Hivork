import { describe, expect, it, vi } from 'vitest';

import { RequestOtpUseCase } from './request-otp.use-case.js';

describe('RequestOtpUseCase', () => {
  const otpStore = {
    save: vi.fn().mockResolvedValue(undefined),
  };
  const rateLimiter = {
    checkOtpRateLimit: vi.fn().mockResolvedValue(true),
  };
  const sms = {
    send: vi.fn().mockResolvedValue(undefined),
  };
  const captchaGuard = {
    require: vi.fn().mockResolvedValue(undefined),
  };

  const useCase = new RequestOtpUseCase(otpStore, rateLimiter, sms, captchaGuard as never, 120);

  it('stores otp and sends sms', async () => {
    const result = await useCase.execute({ phone: '09123456789', actor: 'staff' });

    expect(result).toEqual({ success: true, expiresIn: 120 });
    expect(rateLimiter.checkOtpRateLimit).toHaveBeenCalledWith('09123456789');
    expect(otpStore.save).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: 'staff',
        phone: '09123456789',
        ttlSeconds: 120,
        record: expect.objectContaining({
          attempts: 0,
          code: expect.stringMatching(/^\d{5}$/),
        }),
      }),
    );
    expect(sms.send).toHaveBeenCalled();
  });

  it('throws OTP_RATE_LIMITED on the 4th request within the window', async () => {
    rateLimiter.checkOtpRateLimit
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    for (let attempt = 0; attempt < 3; attempt += 1) {
      await expect(
        useCase.execute({ phone: '09123456789', actor: 'staff' }),
      ).resolves.toEqual({ success: true, expiresIn: 120 });
    }

    await expect(
      useCase.execute({ phone: '09123456789', actor: 'customer' }),
    ).rejects.toMatchObject({
      code: 'OTP_RATE_LIMITED',
      httpStatus: 429,
    });
  });
});
