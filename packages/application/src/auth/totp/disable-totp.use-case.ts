import { ApplicationError } from '../../errors/application.error.js';
import { UseCase } from '../../core/use-case.js';
import type { AuditService } from '../../ports/audit.port.js';
import type { IUserCredentialRepository } from '../../ports/user-credential.repository.port.js';
import type { IPasswordHasherPort } from '../../ports/password-hasher.port.js';
import type { IStaffRepository } from '../../ports/staff.repository.port.js';
import type { ITotpSetupStorePort } from '../ports/totp-setup-store.port.js';
import type { IUserMfaTotpRepository } from '../ports/user-mfa-totp.repository.port.js';
import { verifyUserPassword } from '../verify-user-password.js';

export type DisableTotpInput = {
  staffId: string;
  tenantId: string;
  actorStaffId: string;
  password: string;
};

export type DisableTotpOutput = {
  disabled: true;
};

export class DisableTotpUseCase implements UseCase<DisableTotpInput, DisableTotpOutput> {
  constructor(
    private readonly staffRepository: IStaffRepository,
    private readonly credentialRepository: IUserCredentialRepository,
    private readonly passwordHasher: IPasswordHasherPort,
    private readonly totpRepository: IUserMfaTotpRepository,
    private readonly setupStore: ITotpSetupStorePort,
    private readonly audit: AuditService,
  ) {}

  async execute(input: DisableTotpInput): Promise<DisableTotpOutput> {
    const staff = await this.staffRepository.findActiveByIdForTenant(input.staffId, input.tenantId);
    if (!staff) {
      throw new ApplicationError('STAFF_NOT_FOUND', 'Staff was not found for this tenant.', 404);
    }

    await verifyUserPassword(
      staff.userId,
      input.password,
      this.credentialRepository,
      this.passwordHasher,
    );

    const enabled = await this.totpRepository.findEnabledByUserId(staff.userId);
    if (!enabled) {
      throw new ApplicationError(
        'AUTH_MFA_NOT_ENABLED',
        'Authenticator app is not enabled for this account.',
        403,
      );
    }

    await this.totpRepository.softDelete(staff.userId, staff.userId, 'user_disabled');
    await this.setupStore.delete(staff.userId);

    await this.audit.log({
      tenantId: input.tenantId,
      actorType: 'staff',
      actorId: input.actorStaffId,
      action: 'security.mfa.totp_disabled',
      entityType: 'user',
      entityId: staff.userId,
      metadata: { staffId: staff.id, reason: 'user_disabled' },
    });

    return { disabled: true };
  }
}
