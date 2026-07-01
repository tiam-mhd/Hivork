import { randomInt } from 'node:crypto';

import { ApplicationError } from '../../errors/application.error.js';
import { UseCase } from '../../core/use-case.js';
import type { AuditService } from '../../ports/audit.port.js';
import type { IOtpStore } from '../../ports/otp.port.js';
import type { ISmsPort } from '../../ports/sms.port.js';
import type { IUserCredentialRepository } from '../../ports/user-credential.repository.port.js';
import type { IUserRepository } from '../../ports/user.repository.port.js';
import type { IForgotPasswordRateLimiterPort } from '../ports/forgot-password-rate-limiter.port.js';
import type { ILoginHardeningPort } from '../ports/login-hardening.port.js';

export const FORGOT_PASSWORD_UNIFORM_MESSAGE =
  'در صورت وجود حساب، کد ارسال شد';

export type ForgotPasswordRequestInput = {
  phone: string;
  captchaToken?: string;
  captchaBypassToken?: string;
  clientIp?: string;
};

export type ForgotPasswordRequestOutput = {
  expiresIn: number;
  message: string;
};

export class ForgotPasswordRequestUseCase
  implements UseCase<ForgotPasswordRequestInput, ForgotPasswordRequestOutput>
{
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly credentialRepository: IUserCredentialRepository,
    private readonly otpStore: IOtpStore,
    private readonly sms: ISmsPort,
    private readonly rateLimiter: IForgotPasswordRateLimiterPort,
    private readonly loginHardening: ILoginHardeningPort,
    private readonly audit: AuditService,
    private readonly otpTtlSeconds: number,
  ) {}

  async execute(input: ForgotPasswordRequestInput): Promise<ForgotPasswordRequestOutput> {
    await this.loginHardening.assertLoginAllowed({
      captchaToken: input.captchaToken,
      clientIp: input.clientIp,
      captchaBypassToken: input.captchaBypassToken,
    });

    const allowed = await this.rateLimiter.checkRequestAllowed(input.phone, input.clientIp);
    if (!allowed) {
      throw new ApplicationError(
        'AUTH_LOGIN_RATE_LIMITED',
        'Too many password reset requests. Try again later.',
        429,
      );
    }

    const user = await this.userRepository.findByPhone(input.phone);
    const credential =
      user !== null ? await this.credentialRepository.findByUserId(user.id) : null;

    if (user && credential) {
      const code = String(randomInt(10_000, 100_000));
      await this.otpStore.save({
        actor: 'staff',
        phone: input.phone,
        purpose: 'password_reset',
        record: { code, attempts: 0 },
        ttlSeconds: this.otpTtlSeconds,
      });
      await this.sms.send(input.phone, `کد بازیابی رمز هی‌ورک: ${code}`);
    }

    await this.audit.log({
      actorType: 'system',
      actorId: user?.id ?? '00000000-0000-0000-0000-000000000000',
      action: 'security.password.reset_requested',
      entityType: 'user',
      entityId: user?.id ?? input.phone,
      ip: input.clientIp,
      metadata: {
        otpSent: Boolean(user && credential),
      },
    });

    return {
      expiresIn: this.otpTtlSeconds,
      message: FORGOT_PASSWORD_UNIFORM_MESSAGE,
    };
  }
}
