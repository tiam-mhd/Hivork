import {
  mapDomainError,
  verifyBackupCode,
  type IMfaEncryptionPort,
  type IPasswordHasherPort,
  type ITotpServicePort,
  type ITotpVerificationPort,
  type IUserMfaTotpRepository,
  type TotpVerifyResult,
} from '@hivork/application';
import {
  isBackupCodeFormat,
  isTotpCodeFormat,
  normalizeBackupCodeInput,
  UserMfaTotp,
} from '@hivork/domain';
import { Injectable } from '@nestjs/common';

@Injectable()
export class TotpVerificationService implements ITotpVerificationPort {
  constructor(
    private readonly totpRepository: IUserMfaTotpRepository,
    private readonly totpService: ITotpServicePort,
    private readonly encryption: IMfaEncryptionPort,
    private readonly passwordHasher: IPasswordHasherPort,
  ) {}

  async verifyForLogin(userId: string, code: string): Promise<TotpVerifyResult> {
    const record = await this.totpRepository.findEnabledByUserId(userId);
    if (!record) {
      return { ok: false, reason: 'invalid' };
    }

    const trimmed = code.trim();

    if (isBackupCodeFormat(trimmed)) {
      return this.verifyBackup(record, normalizeBackupCodeInput(trimmed));
    }

    if (!isTotpCodeFormat(trimmed)) {
      return { ok: false, reason: 'invalid' };
    }

    return this.verifyTotp(record, trimmed);
  }

  private async verifyTotp(record: UserMfaTotp, code: string): Promise<TotpVerifyResult> {
    const now = new Date();
    if (record.isReplayInCurrentWindow(now)) {
      return { ok: false, reason: 'invalid' };
    }

    const secret = this.encryption.decrypt(record.secretEncrypted);
    const valid = this.totpService.verifyCode(secret, code);
    if (!valid) {
      return { ok: false, reason: 'invalid' };
    }

    record.markTotpUsed(now);
    await this.totpRepository.update(record);
    return { ok: true, via: 'totp' };
  }

  private async verifyBackup(record: UserMfaTotp, normalized: string): Promise<TotpVerifyResult> {
    const entries = record.backupCodesHash ?? [];
    const result = await verifyBackupCode(normalized, entries, this.passwordHasher);

    if (!result.ok) {
      return { ok: false, reason: result.reason === 'used' ? 'backup_used' : 'invalid' };
    }

    try {
      record.markBackupCodeUsed(result.index);
      await this.totpRepository.update(record);
    } catch (error) {
      throw mapDomainError(error);
    }

    return { ok: true, via: 'backup' };
  }
}
