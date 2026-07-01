import { authenticator } from 'otplib';
import { describe, expect, it } from 'vitest';

import { OtplibTotpService } from './totp.service.js';

describe('OtplibTotpService', () => {
  const service = new OtplibTotpService();

  it('generates secrets and verifies codes within window', () => {
    const secret = service.generateSecret();
    const token = authenticator.generate(secret);

    expect(service.verifyCode(secret, token)).toBe(true);
    expect(service.verifyCode(secret, '000000')).toBe(false);
  });

  it('builds otpauth URLs with issuer and account label', () => {
    const secret = service.generateSecret();
    const url = service.buildOtpauthUrl('09123456789', secret);

    expect(url).toContain('otpauth://totp/');
    expect(url).toContain('Hivork');
    expect(url).toContain(secret);
  });
});
