import { randomInt } from 'node:crypto';

import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import type { AuthActor } from '../ports/auth.port.js';
import type { IOtpRateLimiter, IOtpStore } from '../ports/otp.port.js';
import type { ISmsPort } from '../ports/sms.port.js';
import type { CaptchaGuard } from './captcha.guard.js';

export type RequestOtpInput = {
  phone: string;
  actor: AuthActor;
  captchaToken?: string;
  clientIp?: string;
  captchaBypassToken?: string;
};

export type RequestOtpOutput = {
  success: true;
  expiresIn: number;
};

export class RequestOtpUseCase implements UseCase<RequestOtpInput, RequestOtpOutput> {
  constructor(
    private readonly otpStore: IOtpStore,
    private readonly rateLimiter: IOtpRateLimiter,
    private readonly sms: ISmsPort,
    private readonly captchaGuard: CaptchaGuard,
    private readonly otpTtlSeconds: number,
  ) {}

  async execute(input: RequestOtpInput): Promise<RequestOtpOutput> {
    await this.captchaGuard.require({
      captchaToken: input.captchaToken,
      clientIp: input.clientIp,
      bypassToken: input.captchaBypassToken,
    });

    const allowed = await this.rateLimiter.checkOtpRateLimit(input.phone);
    if (!allowed) {
      throw new ApplicationError('OTP_RATE_LIMITED', 'Too many OTP requests. Try again later.', 429);
    }

    const code = String(randomInt(10_000, 100_000));

    await this.otpStore.save({
      actor: input.actor,
      phone: input.phone,
      record: { code, attempts: 0 },
      ttlSeconds: this.otpTtlSeconds,
    });

    await this.sms.send(input.phone, `کد ورود هی‌ورک: ${code}`);

    return {
      success: true,
      expiresIn: this.otpTtlSeconds,
    };
  }
}
