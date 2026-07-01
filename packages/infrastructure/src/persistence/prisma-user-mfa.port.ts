import type { IUserMfaPort, UserMfaLoginStepUp, UserMfaSettings, TotpVerifyResult } from '@hivork/application';
import type { ITotpVerificationPort } from '@hivork/application';
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { PrismaUserMfaTotpRepository } from './user-mfa-totp.repository.js';

function parseMfaSettings(metadata: unknown): UserMfaSettings {
  if (typeof metadata !== 'object' || metadata === null) {
    return { otpEnabled: false, totpEnabled: false, requireMfaOnLogin: false };
  }

  const mfa = (metadata as { mfa?: unknown }).mfa;
  if (typeof mfa !== 'object' || mfa === null) {
    return { otpEnabled: false, totpEnabled: false, requireMfaOnLogin: false };
  }

  const record = mfa as Record<string, unknown>;
  return {
    otpEnabled: record.otpEnabled === true,
    totpEnabled: record.totpEnabled === true,
    requireMfaOnLogin: record.requireMfaOnLogin === true,
  };
}

function toLoginStepUp(settings: UserMfaSettings, dbTotpEnabled: boolean): UserMfaLoginStepUp {
  const totpEnabled = dbTotpEnabled || settings.totpEnabled;
  const methods: Array<'otp' | 'totp'> = [];

  if (totpEnabled) {
    methods.push('totp');
  }
  if (settings.otpEnabled || settings.requireMfaOnLogin) {
    if (!methods.includes('otp')) {
      methods.push('otp');
    }
  }

  const required = methods.length > 0;
  return {
    required,
    methods: required ? methods : [],
    otpEnabled: settings.otpEnabled || settings.requireMfaOnLogin,
    totpEnabled,
  };
}

@Injectable()
export class PrismaUserMfaPort implements IUserMfaPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly totpRepository: PrismaUserMfaTotpRepository,
    private readonly totpVerification: ITotpVerificationPort,
  ) {}

  async getLoginStepUp(userId: string): Promise<UserMfaLoginStepUp> {
    const [settings, totpRecord] = await Promise.all([
      this.loadMetadataSettings(userId),
      this.totpRepository.findEnabledByUserId(userId),
    ]);
    return toLoginStepUp(settings, totpRecord !== null);
  }

  async isOtpStepUpEnabled(userId: string): Promise<boolean> {
    const settings = await this.loadMetadataSettings(userId);
    return settings.otpEnabled || settings.requireMfaOnLogin;
  }

  async verifyTotp(userId: string, code: string): Promise<TotpVerifyResult> {
    return this.totpVerification.verifyForLogin(userId, code);
  }

  private async loadMetadataSettings(userId: string): Promise<UserMfaSettings> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { metadata: true },
    });
    return parseMfaSettings(user?.metadata ?? null);
  }
}
