import { randomInt } from 'node:crypto';

import { ApplicationError } from '../../errors/application.error.js';
import { UseCase } from '../../core/use-case.js';
import type { IOtpRateLimiter, IOtpStore } from '../../ports/otp.port.js';
import type { ISmsPort } from '../../ports/sms.port.js';
import type { IStaffRepository } from '../../ports/staff.repository.port.js';
import type { IPhoneChangeSessionStore } from '../ports/phone-change-session.port.js';
import { loadPhoneChangeSession, type ChangePhoneStaffContext } from './change-phone.helpers.js';

export type RequestCurrentPhoneOtpInput = {
  staffId: string;
  tenantId: string;
  actorStaffId: string;
  changeSessionId: string;
};

export type RequestCurrentPhoneOtpOutput = {
  expiresIn: number;
  message: string;
};

export class RequestCurrentPhoneOtpUseCase
  implements UseCase<RequestCurrentPhoneOtpInput, RequestCurrentPhoneOtpOutput>
{
  constructor(
    private readonly staffRepository: IStaffRepository,
    private readonly sessionStore: IPhoneChangeSessionStore,
    private readonly otpStore: IOtpStore,
    private readonly rateLimiter: IOtpRateLimiter,
    private readonly sms: ISmsPort,
    private readonly otpTtlSeconds: number,
  ) {}

  async execute(input: RequestCurrentPhoneOtpInput): Promise<RequestCurrentPhoneOtpOutput> {
    const staff = await this.staffRepository.findActiveByIdForTenant(input.staffId, input.tenantId);
    if (!staff) {
      throw new ApplicationError('STAFF_NOT_FOUND', 'Staff was not found for this tenant.', 404);
    }

    const context: ChangePhoneStaffContext = {
      staffId: staff.id,
      tenantId: input.tenantId,
      userId: staff.userId,
      actorStaffId: input.actorStaffId,
    };

    const session = await loadPhoneChangeSession(
      this.sessionStore,
      input.changeSessionId,
      context,
    );

    if (session.step !== 'password_verified' && session.step !== 'current_verified') {
      throw new ApplicationError(
        'AUTH_PHONE_CHANGE_EXPIRED',
        'Phone change session is in an invalid state.',
        401,
      );
    }

    const allowed = await this.rateLimiter.checkOtpRateLimit(session.currentPhone);
    if (!allowed) {
      throw new ApplicationError(
        'AUTH_OTP_RATE_LIMITED',
        'Too many OTP requests. Try again later.',
        429,
      );
    }

    const code = String(randomInt(10_000, 100_000));
    await this.otpStore.save({
      actor: 'staff',
      phone: session.currentPhone,
      purpose: 'phone_change_current',
      record: { code, attempts: 0 },
      ttlSeconds: this.otpTtlSeconds,
    });
    await this.sms.send(session.currentPhone, `کد تأیید تغییر شماره هی‌ورک: ${code}`);

    return {
      expiresIn: this.otpTtlSeconds,
      message: 'کد تأیید به شماره موبایل فعلی ارسال شد',
    };
  }
}
