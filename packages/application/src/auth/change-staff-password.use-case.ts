import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import type { AuditService } from '../ports/audit.port.js';
import type { IPasswordHasherPort } from '../ports/password-hasher.port.js';
import type { IStaffRepository } from '../ports/staff.repository.port.js';
import type { IUserCredentialRepository } from '../ports/user-credential.repository.port.js';
import {
  assertPasswordNotReused,
  buildNextPasswordHistory,
} from './password-history.js';
import type { RevokeAllStaffSessionsUseCase } from './revoke-all-staff-sessions.use-case.js';

export type ChangeStaffPasswordInput = {
  staffId: string;
  tenantId: string;
  currentPassword: string;
  newPassword: string;
  revokeOthers?: boolean;
  currentRefreshToken?: string;
  clientIp?: string;
  userAgent?: string;
};

export type ChangeStaffPasswordOutput = {
  success: true;
};

export class ChangeStaffPasswordUseCase
  implements UseCase<ChangeStaffPasswordInput, ChangeStaffPasswordOutput>
{
  constructor(
    private readonly staffRepository: IStaffRepository,
    private readonly credentialRepository: IUserCredentialRepository,
    private readonly passwordHasher: IPasswordHasherPort,
    private readonly revokeAllSessions: RevokeAllStaffSessionsUseCase,
    private readonly audit: AuditService,
  ) {}

  async execute(input: ChangeStaffPasswordInput): Promise<ChangeStaffPasswordOutput> {
    const staff = await this.staffRepository.findActiveByIdForTenant(input.staffId, input.tenantId);
    if (!staff) {
      throw new ApplicationError('STAFF_NOT_FOUND', 'Staff was not found for this tenant.', 404);
    }

    const credential = await this.credentialRepository.findByUserId(staff.userId);
    if (!credential) {
      throw new ApplicationError('AUTH_INVALID_CREDENTIALS', 'Invalid current password.', 401);
    }

    const now = new Date();
    if (credential.releaseExpiredLock(now)) {
      await this.credentialRepository.update(credential);
    }

    const currentValid = await credential.verifyPassword(input.currentPassword, this.passwordHasher);
    if (!currentValid) {
      throw new ApplicationError('AUTH_INVALID_CREDENTIALS', 'Invalid current password.', 401);
    }

    await assertPasswordNotReused(
      input.newPassword,
      credential.passwordHash,
      credential.passwordHistory,
      this.passwordHasher,
    );

    const nextHash = await this.passwordHasher.hash(input.newPassword);
    const nextHistory = buildNextPasswordHistory(credential.passwordHash, credential.passwordHistory);
    credential.markPasswordChanged(nextHash, { passwordHistory: nextHistory });
    await this.credentialRepository.update(credential);

    const revokeOthers = input.revokeOthers ?? true;
    if (revokeOthers) {
      await this.revokeAllSessions.execute({
        tenantId: input.tenantId,
        staffId: input.staffId,
        actorStaffId: input.staffId,
        includeCurrent: false,
        currentRefreshToken: input.currentRefreshToken,
        clientIp: input.clientIp,
        userAgent: input.userAgent,
      });
    }

    await this.audit.log({
      tenantId: input.tenantId,
      actorType: 'staff',
      actorId: input.staffId,
      action: 'security.password.changed',
      entityType: 'user_credential',
      entityId: credential.id,
      ip: input.clientIp,
      userAgent: input.userAgent,
      metadata: {
        userId: staff.userId,
        revokeOthers,
      },
    });

    return { success: true };
  }
}
