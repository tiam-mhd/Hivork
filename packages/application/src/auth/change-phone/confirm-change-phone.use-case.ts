import { ApplicationError } from '../../errors/application.error.js';
import { UseCase } from '../../core/use-case.js';
import type { AuditService } from '../../ports/audit.port.js';
import type { IOtpStore } from '../../ports/otp.port.js';
import type { IStaffRepository } from '../../ports/staff.repository.port.js';
import type { IUserRepository } from '../../ports/user.repository.port.js';
import type { IAuthTokenService } from '../ports/token.port.js';
import type {
  IUserRefreshInvalidationPort,
  IUserSessionRevocationPort,
} from '../ports/user-session-revocation.port.js';
import type { IPhoneChangeSessionStore } from '../ports/phone-change-session.port.js';
import {
  assertChangePhoneOtpValid,
  hashPhoneForAudit,
  invalidateStaffOtpsForPhone,
  loadPhoneChangeSession,
  type ChangePhoneStaffContext,
} from './change-phone.helpers.js';

export type ConfirmChangePhoneInput = {
  staffId: string;
  tenantId: string;
  actorStaffId: string;
  changeSessionId: string;
  code: string;
  clientIp?: string;
  userAgent?: string;
};

export type ConfirmChangePhoneOutput = {
  success: true;
  newPhone: string;
};

export class ConfirmChangePhoneUseCase
  implements UseCase<ConfirmChangePhoneInput, ConfirmChangePhoneOutput>
{
  constructor(
    private readonly staffRepository: IStaffRepository,
    private readonly userRepository: IUserRepository,
    private readonly sessionStore: IPhoneChangeSessionStore,
    private readonly otpStore: IOtpStore,
    private readonly sessionRevocation: IUserSessionRevocationPort,
    private readonly refreshInvalidation: IUserRefreshInvalidationPort,
    private readonly tokens: IAuthTokenService,
    private readonly audit: AuditService,
  ) {}

  async execute(input: ConfirmChangePhoneInput): Promise<ConfirmChangePhoneOutput> {
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

    if (session.step !== 'new_sent' || !session.newPhone) {
      throw new ApplicationError(
        'AUTH_PHONE_CHANGE_EXPIRED',
        'Complete previous steps before confirming the new phone.',
        401,
      );
    }

    const conflict = await this.userRepository.getPhoneConflict(session.newPhone, staff.userId);
    if (conflict !== 'available') {
      throw new ApplicationError(
        'PHONE_ALREADY_IN_USE',
        'This phone number is no longer available.',
        409,
      );
    }

    await assertChangePhoneOtpValid(
      this.otpStore,
      session.newPhone,
      'phone_change_new',
      input.code,
    );

    const oldPhone = session.currentPhone;
    const newPhone = session.newPhone;

    await this.userRepository.updatePhone(staff.userId, newPhone);

    await this.otpStore.delete({
      actor: 'staff',
      phone: newPhone,
      purpose: 'phone_change_new',
    });
    await invalidateStaffOtpsForPhone(this.otpStore, oldPhone);
    await invalidateStaffOtpsForPhone(this.otpStore, newPhone);

    await this.sessionRevocation.revokeAllSessionsForUser(staff.userId);
    await this.refreshInvalidation.invalidateAllForUser(
      staff.userId,
      this.tokens.getRefreshTtlSeconds(),
    );

    await this.sessionStore.delete(input.changeSessionId, staff.userId);

    await this.audit.log({
      tenantId: input.tenantId,
      actorType: 'staff',
      actorId: input.actorStaffId,
      action: 'security.phone.changed',
      entityType: 'user',
      entityId: staff.userId,
      ip: input.clientIp,
      userAgent: input.userAgent,
      metadata: {
        staffId: staff.id,
        oldPhoneHash: hashPhoneForAudit(oldPhone),
        newPhoneHash: hashPhoneForAudit(newPhone),
      },
    });

    return { success: true, newPhone };
  }
}
