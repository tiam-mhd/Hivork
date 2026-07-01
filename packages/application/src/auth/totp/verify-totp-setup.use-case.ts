import { ApplicationError } from '../../errors/application.error.js';
import { mapDomainError } from '../../errors/map-domain-error.js';
import { UseCase } from '../../core/use-case.js';
import type { AuditService } from '../../ports/audit.port.js';
import type { IStaffRepository } from '../../ports/staff.repository.port.js';
import type { IPasswordHasherPort } from '../../ports/password-hasher.port.js';
import type { IMfaEncryptionPort } from '../ports/mfa-encryption.port.js';
import type { ITotpServicePort } from '../ports/totp-service.port.js';
import type { ITotpSetupStorePort } from '../ports/totp-setup-store.port.js';
import type { IUserMfaTotpRepository } from '../ports/user-mfa-totp.repository.port.js';
import { BACKUP_CODE_COUNT, generateBackupCodes } from './backup-codes.js';

export type VerifyTotpSetupInput = {
  staffId: string;
  tenantId: string;
  actorStaffId: string;
  code: string;
};

export type VerifyTotpSetupOutput = {
  enabled: true;
  backupCodes: string[];
};

export class VerifyTotpSetupUseCase implements UseCase<VerifyTotpSetupInput, VerifyTotpSetupOutput> {
  constructor(
    private readonly staffRepository: IStaffRepository,
    private readonly totpRepository: IUserMfaTotpRepository,
    private readonly totpService: ITotpServicePort,
    private readonly encryption: IMfaEncryptionPort,
    private readonly setupStore: ITotpSetupStorePort,
    private readonly passwordHasher: IPasswordHasherPort,
    private readonly audit: AuditService,
  ) {}

  async execute(input: VerifyTotpSetupInput): Promise<VerifyTotpSetupOutput> {
    const staff = await this.staffRepository.findActiveByIdForTenant(input.staffId, input.tenantId);
    if (!staff) {
      throw new ApplicationError('STAFF_NOT_FOUND', 'Staff was not found for this tenant.', 404);
    }

    const enabled = await this.totpRepository.findEnabledByUserId(staff.userId);
    if (enabled) {
      throw new ApplicationError(
        'AUTH_MFA_ALREADY_ENABLED',
        'Authenticator app is already enabled for this account.',
        409,
      );
    }

    const pending = await this.setupStore.get(staff.userId);
    if (!pending || pending.expiresAt <= new Date()) {
      throw new ApplicationError(
        'AUTH_TOTP_SETUP_EXPIRED',
        'Authenticator setup expired. Please start setup again.',
        400,
      );
    }

    const secret = this.encryption.decrypt(pending.secretEncrypted);
    const valid = this.totpService.verifyCode(secret, input.code.trim());
    if (!valid) {
      throw new ApplicationError(
        'AUTH_TOTP_INVALID',
        'Invalid authenticator code. Check your device time and try again.',
        400,
      );
    }

    const { plain, hashed } = await generateBackupCodes(BACKUP_CODE_COUNT, this.passwordHasher);
    const secretEncrypted = this.encryption.encrypt(secret);

    const existing = await this.totpRepository.findByUserIdIncludingDeleted(staff.userId);
    try {
      if (!existing) {
        const created = await this.totpRepository.create({
          userId: staff.userId,
          secretEncrypted,
          createdById: staff.userId,
        });
        created.enable(hashed);
        await this.totpRepository.update(created, staff.userId);
      } else if (existing.isDeleted) {
        existing.restore();
        existing.prepareForSetup(secretEncrypted);
        existing.enable(hashed);
        await this.totpRepository.update(existing, staff.userId);
      } else {
        existing.prepareForSetup(secretEncrypted);
        existing.enable(hashed);
        await this.totpRepository.update(existing, staff.userId);
      }
    } catch (error) {
      throw mapDomainError(error);
    }

    await this.setupStore.delete(staff.userId);

    await this.audit.log({
      tenantId: input.tenantId,
      actorType: 'staff',
      actorId: input.actorStaffId,
      action: 'security.mfa.totp_enabled',
      entityType: 'user',
      entityId: staff.userId,
      metadata: { staffId: staff.id },
    });

    return {
      enabled: true,
      backupCodes: plain,
    };
  }
}
