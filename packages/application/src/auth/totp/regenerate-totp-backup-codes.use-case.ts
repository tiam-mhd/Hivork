import { ApplicationError } from '../../errors/application.error.js';
import { mapDomainError } from '../../errors/map-domain-error.js';
import { UseCase } from '../../core/use-case.js';
import type { AuditService } from '../../ports/audit.port.js';
import type { IUserCredentialRepository } from '../../ports/user-credential.repository.port.js';
import type { IPasswordHasherPort } from '../../ports/password-hasher.port.js';
import type { IStaffRepository } from '../../ports/staff.repository.port.js';
import type { IUserMfaTotpRepository } from '../ports/user-mfa-totp.repository.port.js';
import { verifyUserPassword } from '../verify-user-password.js';
import { BACKUP_CODE_COUNT, generateBackupCodes } from './backup-codes.js';

export type RegenerateTotpBackupCodesInput = {
  staffId: string;
  tenantId: string;
  actorStaffId: string;
  password: string;
};

export type RegenerateTotpBackupCodesOutput = {
  backupCodes: string[];
};

export class RegenerateTotpBackupCodesUseCase
  implements UseCase<RegenerateTotpBackupCodesInput, RegenerateTotpBackupCodesOutput>
{
  constructor(
    private readonly staffRepository: IStaffRepository,
    private readonly credentialRepository: IUserCredentialRepository,
    private readonly passwordHasher: IPasswordHasherPort,
    private readonly totpRepository: IUserMfaTotpRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(input: RegenerateTotpBackupCodesInput): Promise<RegenerateTotpBackupCodesOutput> {
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

    const record = await this.totpRepository.findEnabledByUserId(staff.userId);
    if (!record) {
      throw new ApplicationError(
        'AUTH_MFA_NOT_ENABLED',
        'Authenticator app is not enabled for this account.',
        403,
      );
    }

    const { plain, hashed } = await generateBackupCodes(BACKUP_CODE_COUNT, this.passwordHasher);

    try {
      record.setBackupCodes(hashed);
      await this.totpRepository.update(record, staff.userId);
    } catch (error) {
      throw mapDomainError(error);
    }

    await this.audit.log({
      tenantId: input.tenantId,
      actorType: 'staff',
      actorId: input.actorStaffId,
      action: 'security.mfa.backup_regenerated',
      entityType: 'user',
      entityId: staff.userId,
      metadata: { staffId: staff.id },
    });

    return { backupCodes: plain };
  }
}
