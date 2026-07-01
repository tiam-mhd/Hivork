import { ApplicationError } from '../../errors/application.error.js';
import { UseCase } from '../../core/use-case.js';
import type { AuditService } from '../../ports/audit.port.js';
import type { IOtpStore } from '../../ports/otp.port.js';
import type { IStaffRepository } from '../../ports/staff.repository.port.js';
import type { IPhoneChangeSessionStore } from '../ports/phone-change-session.port.js';
import {
  assertChangePhoneOtpValid,
  loadPhoneChangeSession,
  type ChangePhoneStaffContext,
} from './change-phone.helpers.js';

export type VerifyCurrentPhoneOtpInput = {
  staffId: string;
  tenantId: string;
  actorStaffId: string;
  changeSessionId: string;
  code: string;
  clientIp?: string;
};

export type VerifyCurrentPhoneOtpOutput = {
  verified: true;
};

export class VerifyCurrentPhoneOtpUseCase
  implements UseCase<VerifyCurrentPhoneOtpInput, VerifyCurrentPhoneOtpOutput>
{
  constructor(
    private readonly staffRepository: IStaffRepository,
    private readonly sessionStore: IPhoneChangeSessionStore,
    private readonly otpStore: IOtpStore,
    private readonly audit: AuditService,
    private readonly sessionTtlSeconds: number,
  ) {}

  async execute(input: VerifyCurrentPhoneOtpInput): Promise<VerifyCurrentPhoneOtpOutput> {
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

    await assertChangePhoneOtpValid(
      this.otpStore,
      session.currentPhone,
      'phone_change_current',
      input.code,
    );

    await this.otpStore.delete({
      actor: 'staff',
      phone: session.currentPhone,
      purpose: 'phone_change_current',
    });

    const currentVerifiedAt = new Date().toISOString();
    await this.sessionStore.update(
      input.changeSessionId,
      {
        ...session,
        step: 'current_verified',
        currentVerifiedAt,
      },
      this.sessionTtlSeconds,
    );

    await this.audit.log({
      tenantId: input.tenantId,
      actorType: 'staff',
      actorId: input.actorStaffId,
      action: 'security.phone.current_verified',
      entityType: 'user',
      entityId: staff.userId,
      ip: input.clientIp,
      metadata: { staffId: staff.id, changeSessionId: input.changeSessionId },
    });

    return { verified: true };
  }
}
