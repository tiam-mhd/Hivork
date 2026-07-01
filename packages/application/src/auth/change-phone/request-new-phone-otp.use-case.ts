import { randomInt } from 'node:crypto';

import { normalizePhone } from '@hivork/contracts';
import { ApplicationError } from '../../errors/application.error.js';
import { mapDomainError } from '../../errors/map-domain-error.js';
import { UseCase } from '../../core/use-case.js';
import type { IOtpRateLimiter, IOtpStore } from '../../ports/otp.port.js';
import type { ISmsPort } from '../../ports/sms.port.js';
import type { IStaffRepository } from '../../ports/staff.repository.port.js';
import type { IUserRepository } from '../../ports/user.repository.port.js';
import type { IPhoneChangeSessionStore } from '../ports/phone-change-session.port.js';
import { loadPhoneChangeSession, type ChangePhoneStaffContext } from './change-phone.helpers.js';

export type RequestNewPhoneOtpInput = {
  staffId: string;
  tenantId: string;
  actorStaffId: string;
  changeSessionId: string;
  newPhone: string;
};

export type RequestNewPhoneOtpOutput = {
  expiresIn: number;
  message: string;
};

export class RequestNewPhoneOtpUseCase
  implements UseCase<RequestNewPhoneOtpInput, RequestNewPhoneOtpOutput>
{
  constructor(
    private readonly staffRepository: IStaffRepository,
    private readonly userRepository: IUserRepository,
    private readonly sessionStore: IPhoneChangeSessionStore,
    private readonly otpStore: IOtpStore,
    private readonly rateLimiter: IOtpRateLimiter,
    private readonly sms: ISmsPort,
    private readonly otpTtlSeconds: number,
    private readonly sessionTtlSeconds: number,
  ) {}

  async execute(input: RequestNewPhoneOtpInput): Promise<RequestNewPhoneOtpOutput> {
    const staff = await this.staffRepository.findActiveByIdForTenant(input.staffId, input.tenantId);
    if (!staff) {
      throw new ApplicationError('STAFF_NOT_FOUND', 'Staff was not found for this tenant.', 404);
    }

    let normalizedPhone: string;
    try {
      normalizedPhone = normalizePhone(input.newPhone);
    } catch (error) {
      throw mapDomainError(error);
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

    if (session.step !== 'current_verified' && session.step !== 'new_sent') {
      throw new ApplicationError(
        'AUTH_PHONE_CHANGE_EXPIRED',
        'Verify your current phone before entering a new number.',
        401,
      );
    }

    if (normalizedPhone === session.currentPhone) {
      throw new ApplicationError(
        'INVALID_PHONE',
        'New phone number must be different from the current number.',
        400,
      );
    }

    const conflict = await this.userRepository.getPhoneConflict(normalizedPhone, staff.userId);
    if (conflict === 'same') {
      throw new ApplicationError(
        'INVALID_PHONE',
        'New phone number must be different from the current number.',
        400,
      );
    }
    if (conflict === 'staff_user') {
      throw new ApplicationError(
        'PHONE_ALREADY_IN_USE',
        'This phone number is already registered. Contact support to merge accounts.',
        409,
      );
    }
    if (conflict === 'customer_only') {
      throw new ApplicationError(
        'PHONE_ALREADY_IN_USE',
        'This phone number is linked to a customer account. Contact support for assistance.',
        409,
      );
    }

    const allowed = await this.rateLimiter.checkOtpRateLimit(normalizedPhone);
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
      phone: normalizedPhone,
      purpose: 'phone_change_new',
      record: { code, attempts: 0 },
      ttlSeconds: this.otpTtlSeconds,
    });
    await this.sms.send(normalizedPhone, `کد تأیید شماره جدید هی‌ورک: ${code}`);

    await this.sessionStore.update(
      input.changeSessionId,
      {
        ...session,
        step: 'new_sent',
        newPhone: normalizedPhone,
      },
      this.sessionTtlSeconds,
    );

    return {
      expiresIn: this.otpTtlSeconds,
      message: 'کد تأیید به شماره موبایل جدید ارسال شد',
    };
  }
}
