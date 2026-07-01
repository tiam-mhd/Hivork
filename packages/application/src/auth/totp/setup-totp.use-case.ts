import { ApplicationError } from '../../errors/application.error.js';
import { UseCase } from '../../core/use-case.js';
import type { AuditService } from '../../ports/audit.port.js';
import type { IStaffRepository } from '../../ports/staff.repository.port.js';
import type { IUserRepository } from '../../ports/user.repository.port.js';
import type { IQrCodeGeneratorPort } from '../ports/qr-code-generator.port.js';
import type { IMfaEncryptionPort } from '../ports/mfa-encryption.port.js';
import type { ITotpServicePort } from '../ports/totp-service.port.js';
import {
  TOTP_SETUP_TTL_SECONDS,
  type ITotpSetupStorePort,
} from '../ports/totp-setup-store.port.js';
import type { IUserMfaTotpRepository } from '../ports/user-mfa-totp.repository.port.js';

export type SetupTotpInput = {
  staffId: string;
  tenantId: string;
  actorStaffId: string;
};

export type SetupTotpOutput = {
  secret: string;
  otpauthUrl: string;
  qrCodeDataUrl: string;
  pendingExpiresAt: string;
};

export class SetupTotpUseCase implements UseCase<SetupTotpInput, SetupTotpOutput> {
  constructor(
    private readonly staffRepository: IStaffRepository,
    private readonly userRepository: IUserRepository,
    private readonly totpRepository: IUserMfaTotpRepository,
    private readonly totpService: ITotpServicePort,
    private readonly encryption: IMfaEncryptionPort,
    private readonly setupStore: ITotpSetupStorePort,
    private readonly qrCode: IQrCodeGeneratorPort,
    private readonly audit: AuditService,
  ) {}

  async execute(input: SetupTotpInput): Promise<SetupTotpOutput> {
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

    const user = await this.userRepository.findById(staff.userId);
    if (!user) {
      throw new ApplicationError('USER_NOT_FOUND', 'User was not found.', 404);
    }

    const secret = this.totpService.generateSecret();
    const accountLabel = `${user.phone}`;
    const otpauthUrl = this.totpService.buildOtpauthUrl(accountLabel, secret);
    const secretEncrypted = this.encryption.encrypt(secret);
    const expiresAt = new Date(Date.now() + TOTP_SETUP_TTL_SECONDS * 1000);

    await this.setupStore.save(staff.userId, { secretEncrypted, expiresAt });

    const qrCodeDataUrl = await this.qrCode.toDataUrl(otpauthUrl);

    await this.audit.log({
      tenantId: input.tenantId,
      actorType: 'staff',
      actorId: input.actorStaffId,
      action: 'security.mfa.totp_setup_started',
      entityType: 'user',
      entityId: staff.userId,
      metadata: { staffId: staff.id },
    });

    return {
      secret,
      otpauthUrl,
      qrCodeDataUrl,
      pendingExpiresAt: expiresAt.toISOString(),
    };
  }
}
