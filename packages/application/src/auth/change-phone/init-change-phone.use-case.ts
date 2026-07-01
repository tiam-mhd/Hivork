import { ApplicationError } from '../../errors/application.error.js';
import { UseCase } from '../../core/use-case.js';
import type { AuditService } from '../../ports/audit.port.js';
import type { IUserCredentialRepository } from '../../ports/user-credential.repository.port.js';
import type { IPasswordHasherPort } from '../../ports/password-hasher.port.js';
import type { IStaffRepository } from '../../ports/staff.repository.port.js';
import type { IUserRepository } from '../../ports/user.repository.port.js';
import type { IPhoneChangeSessionStore } from '../ports/phone-change-session.port.js';
import { verifyUserPassword } from '../verify-user-password.js';

export type InitChangePhoneInput = {
  staffId: string;
  tenantId: string;
  actorStaffId: string;
  password: string;
  clientIp?: string;
};

export type InitChangePhoneOutput = {
  changeSessionId: string;
  expiresIn: number;
};

export class InitChangePhoneUseCase implements UseCase<InitChangePhoneInput, InitChangePhoneOutput> {
  constructor(
    private readonly staffRepository: IStaffRepository,
    private readonly userRepository: IUserRepository,
    private readonly credentialRepository: IUserCredentialRepository,
    private readonly passwordHasher: IPasswordHasherPort,
    private readonly sessionStore: IPhoneChangeSessionStore,
    private readonly audit: AuditService,
    private readonly sessionTtlSeconds: number,
  ) {}

  async execute(input: InitChangePhoneInput): Promise<InitChangePhoneOutput> {
    const staff = await this.staffRepository.findActiveByIdForTenant(input.staffId, input.tenantId);
    if (!staff) {
      throw new ApplicationError('STAFF_NOT_FOUND', 'Staff was not found for this tenant.', 404);
    }

    const user = await this.userRepository.findById(staff.userId);
    if (!user) {
      throw new ApplicationError('FORBIDDEN', 'User account is not available.', 403);
    }

    await verifyUserPassword(
      staff.userId,
      input.password,
      this.credentialRepository,
      this.passwordHasher,
    );

    const activeSessionId = await this.sessionStore.findActiveSessionIdForUser(staff.userId);
    if (activeSessionId) {
      throw new ApplicationError(
        'AUTH_PHONE_CHANGE_IN_PROGRESS',
        'A phone change is already in progress.',
        409,
      );
    }

    const changeSessionId = await this.sessionStore.create(
      {
        userId: staff.userId,
        staffId: staff.id,
        tenantId: input.tenantId,
        currentPhone: user.phone,
        step: 'password_verified',
      },
      this.sessionTtlSeconds,
    );

    await this.audit.log({
      tenantId: input.tenantId,
      actorType: 'staff',
      actorId: input.actorStaffId,
      action: 'security.phone.change_initiated',
      entityType: 'user',
      entityId: staff.userId,
      ip: input.clientIp,
      metadata: { staffId: staff.id },
    });

    return {
      changeSessionId,
      expiresIn: this.sessionTtlSeconds,
    };
  }
}
