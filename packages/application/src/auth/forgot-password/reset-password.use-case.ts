import { ApplicationError } from '../../errors/application.error.js';
import { UseCase } from '../../core/use-case.js';
import type { AuditService } from '../../ports/audit.port.js';
import type { IPasswordHasherPort } from '../../ports/password-hasher.port.js';
import type { IUserCredentialRepository } from '../../ports/user-credential.repository.port.js';
import type { IUserRepository } from '../../ports/user.repository.port.js';
import {
  assertPasswordNotReused,
  buildNextPasswordHistory,
} from '../password-history.js';
import type { IForgotPasswordRateLimiterPort } from '../ports/forgot-password-rate-limiter.port.js';
import type { IResetTokenConsumptionPort } from '../ports/reset-token-consumption.port.js';
import type { IAuthTokenService } from '../ports/token.port.js';
import type { IUserRefreshInvalidationPort, IUserSessionRevocationPort } from '../ports/user-session-revocation.port.js';

export type ResetPasswordInput = {
  resetToken: string;
  password: string;
  clientIp?: string;
  userAgent?: string;
};

export type ResetPasswordOutput = {
  success: true;
};

export class ResetPasswordUseCase implements UseCase<ResetPasswordInput, ResetPasswordOutput> {
  constructor(
    private readonly tokens: IAuthTokenService,
    private readonly resetTokenConsumption: IResetTokenConsumptionPort,
    private readonly userRepository: IUserRepository,
    private readonly credentialRepository: IUserCredentialRepository,
    private readonly passwordHasher: IPasswordHasherPort,
    private readonly sessionRevocation: IUserSessionRevocationPort,
    private readonly refreshInvalidation: IUserRefreshInvalidationPort,
    private readonly rateLimiter: IForgotPasswordRateLimiterPort,
    private readonly audit: AuditService,
  ) {}

  async execute(input: ResetPasswordInput): Promise<ResetPasswordOutput> {
    const allowed = await this.rateLimiter.checkResetAllowed(input.clientIp);
    if (!allowed) {
      throw new ApplicationError(
        'AUTH_LOGIN_RATE_LIMITED',
        'Too many password reset attempts. Try again later.',
        429,
      );
    }

    const payload = await this.tokens.verifyResetToken(input.resetToken);
    if (!payload) {
      throw new ApplicationError(
        'AUTH_RESET_TOKEN_EXPIRED',
        'Password reset link expired. Please start again.',
        401,
      );
    }

    if (
      payload.actor !== 'staff' ||
      payload.purpose !== 'password_reset' ||
      payload.type !== 'reset'
    ) {
      throw new ApplicationError('AUTH_RESET_TOKEN_INVALID', 'Invalid password reset token.', 401);
    }

    if (await this.resetTokenConsumption.isConsumed(payload.jti)) {
      throw new ApplicationError(
        'AUTH_RESET_TOKEN_INVALID',
        'Password reset token already used.',
        401,
      );
    }

    const user = await this.userRepository.findById(payload.sub);
    if (!user) {
      throw new ApplicationError('AUTH_RESET_TOKEN_INVALID', 'Invalid password reset token.', 401);
    }

    const credential = await this.credentialRepository.findByUserId(user.id);
    if (!credential) {
      throw new ApplicationError('AUTH_RESET_TOKEN_INVALID', 'Invalid password reset token.', 401);
    }

    await assertPasswordNotReused(
      input.password,
      credential.passwordHash,
      credential.passwordHistory,
      this.passwordHasher,
    );

    const nextHash = await this.passwordHasher.hash(input.password);
    const nextHistory = buildNextPasswordHistory(credential.passwordHash, credential.passwordHistory);
    credential.markPasswordChanged(nextHash, { passwordHistory: nextHistory });
    await this.credentialRepository.update(credential);

    await this.resetTokenConsumption.markConsumed(
      payload.jti,
      this.tokens.getResetTtlSeconds(),
    );

    await this.sessionRevocation.revokeAllSessionsForUser(user.id);
    await this.refreshInvalidation.invalidateAllForUser(
      user.id,
      this.tokens.getRefreshTtlSeconds(),
    );

    await this.audit.log({
      actorType: 'system',
      actorId: user.id,
      action: 'security.password.reset_completed',
      entityType: 'user_credential',
      entityId: credential.id,
      ip: input.clientIp,
      userAgent: input.userAgent,
      metadata: { userId: user.id },
    });

    return { success: true };
  }
}
