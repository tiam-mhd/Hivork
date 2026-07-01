import { TOTP_ISSUER, type ITotpServicePort } from '@hivork/application';
import { authenticator } from 'otplib';
import { Injectable } from '@nestjs/common';

authenticator.options = {
  digits: 6,
  step: 30,
  window: 1,
};

@Injectable()
export class OtplibTotpService implements ITotpServicePort {
  generateSecret(): string {
    return authenticator.generateSecret();
  }

  buildOtpauthUrl(accountLabel: string, secret: string): string {
    return authenticator.keyuri(accountLabel, TOTP_ISSUER, secret);
  }

  verifyCode(secret: string, code: string): boolean {
    return authenticator.verify({ token: code.trim(), secret });
  }
}
