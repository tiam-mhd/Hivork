import { beforeEach, describe, expect, it, vi } from 'vitest';

import { requireCaptcha, isCaptchaBypass } from './require-captcha.js';

describe('requireCaptcha', () => {
  const verifier = {
    verify: vi.fn().mockResolvedValue({ success: true }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('skips verification when captcha is disabled and not forced', async () => {
    await requireCaptcha(
      { verifier, config: { enabled: false, bypassToken: 'test-bypass' } },
      { captchaToken: undefined },
    );
    expect(verifier.verify).not.toHaveBeenCalled();
  });

  it('requires token when captcha is enabled', async () => {
    await expect(
      requireCaptcha(
        { verifier, config: { enabled: true, bypassToken: 'test-bypass' } },
        { captchaToken: undefined },
      ),
    ).rejects.toMatchObject({ code: 'AUTH_CAPTCHA_REQUIRED', httpStatus: 400 });
  });

  it('accepts bypass token in test env', async () => {
    await requireCaptcha(
      { verifier, config: { enabled: true, bypassToken: 'test-bypass' } },
      { bypassToken: 'test-bypass' },
    );
    expect(verifier.verify).not.toHaveBeenCalled();
  });

  it('rejects invalid captcha token', async () => {
    verifier.verify.mockResolvedValueOnce({ success: false, errorCodes: ['invalid-input-response'] });

    await expect(
      requireCaptcha(
        { verifier, config: { enabled: true, bypassToken: 'test-bypass' } },
        { captchaToken: 'bad-token' },
      ),
    ).rejects.toMatchObject({ code: 'AUTH_CAPTCHA_INVALID', httpStatus: 400 });
  });

  it('forces captcha when failure synergy is active', async () => {
    await expect(
      requireCaptcha(
        { verifier, config: { enabled: false, bypassToken: 'test-bypass' } },
        { forceRequired: true, captchaToken: undefined },
      ),
    ).rejects.toMatchObject({ code: 'AUTH_CAPTCHA_REQUIRED', httpStatus: 400 });
  });

  it('maps provider errors to CAPTCHA_SERVICE_UNAVAILABLE', async () => {
    verifier.verify.mockRejectedValueOnce(new Error('network'));

    await expect(
      requireCaptcha(
        { verifier, config: { enabled: true, bypassToken: 'test-bypass' } },
        { captchaToken: 'token' },
      ),
    ).rejects.toMatchObject({ code: 'CAPTCHA_SERVICE_UNAVAILABLE', httpStatus: 503 });
  });
});

describe('isCaptchaBypass', () => {
  it('matches exact bypass token', () => {
    expect(isCaptchaBypass('test-bypass', 'test-bypass')).toBe(true);
    expect(isCaptchaBypass('wrong', 'test-bypass')).toBe(false);
  });
});
