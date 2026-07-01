import { randomInt } from 'node:crypto';

import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import type { IOtpRateLimiter, IOtpStore } from '../ports/otp.port.js';
import type { ISmsPort } from '../ports/sms.port.js';
import type { IUserMfaPort } from './ports/user-mfa.port.js';
import type { IUserRepository } from '../ports/user.repository.port.js';
import { ValidateMfaPendingTokenUseCase } from './validate-mfa-pending-token.use-case.js';

export const MFA_OTP_RESEND_COOLDOWN_SECONDS = 60;

export type MfaRequestOtpInput = {
  mfaToken: string;
};

export type MfaRequestOtpOutput = {
  expiresIn: number;
  cooldownSeconds: number;
};

export class MfaRequestOtpUseCase implements UseCase<MfaRequestOtpInput, MfaRequestOtpOutput> {
  constructor(
    private readonly validateMfaToken: ValidateMfaPendingTokenUseCase,
    private readonly userRepository: IUserRepository,
    private readonly userMfa: IUserMfaPort,
    private readonly otpStore: IOtpStore,
    private readonly rateLimiter: IOtpRateLimiter,
    private readonly sms: ISmsPort,
    private readonly otpTtlSeconds: number,
  ) {}

  async execute(input: MfaRequestOtpInput): Promise<MfaRequestOtpOutput> {
    const payload = await this.validateMfaToken.execute({
      mfaToken: input.mfaToken,
      consume: false,
    });

    const otpEnabled = await this.userMfa.isOtpStepUpEnabled(payload.sub);
    if (!otpEnabled) {
      throw new ApplicationError(
        'AUTH_MFA_NOT_ENABLED',
        'SMS verification is not enabled for this account.',
        403,
      );
    }

    const user = await this.userRepository.findById(payload.sub);
    if (!user) {
      throw new ApplicationError('AUTH_MFA_TOKEN_INVALID', 'Invalid MFA token.', 401);
    }

    const allowed = await this.rateLimiter.checkOtpRateLimit(user.phone);
    if (!allowed) {
      throw new ApplicationError('AUTH_OTP_RATE_LIMITED', 'Too many OTP requests. Try again later.', 429);
    }

    const code = String(randomInt(10_000, 100_000));

    await this.otpStore.save({
      actor: 'staff',
      phone: user.phone,
      purpose: 'mfa_step_up',
      record: { code, attempts: 0 },
      ttlSeconds: this.otpTtlSeconds,
    });

    await this.sms.send(user.phone, `کد تأیید دو مرحله‌ای هی‌ورک: ${code}`);

    return {
      expiresIn: this.otpTtlSeconds,
      cooldownSeconds: MFA_OTP_RESEND_COOLDOWN_SECONDS,
    };
  }
}
