import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import type { AuditService } from '../ports/audit.port.js';
import type { IPasswordHasherPort } from '../ports/password-hasher.port.js';
import type { IStaffRepository } from '../ports/staff.repository.port.js';
import type { IUserCredentialRepository } from '../ports/user-credential.repository.port.js';
import type { IUserRepository } from '../ports/user.repository.port.js';
import {
  assertPasswordNotReused,
  buildNextPasswordHistory,
} from './password-history.js';
import type { IAuthTokenService } from './ports/token.port.js';
import type { RevokeAllStaffSessionsUseCase } from './revoke-all-staff-sessions.use-case.js';

export type ChangeRequiredPasswordInput = {
  newPassword: string;
  changePasswordToken?: string;
  currentPassword?: string;
  staffId?: string;
  tenantId?: string;
  currentRefreshToken?: string;
  clientIp?: string;
  userAgent?: string;
};

export type ChangeRequiredPasswordOutput = {
  success: true;
};

export class ChangeRequiredPasswordUseCase
  implements UseCase<ChangeRequiredPasswordInput, ChangeRequiredPasswordOutput>
{
  constructor(
    private readonly tokens: IAuthTokenService,
    private readonly userRepository: IUserRepository,
    private readonly staffRepository: IStaffRepository,
    private readonly credentialRepository: IUserCredentialRepository,
    private readonly passwordHasher: IPasswordHasherPort,
    private readonly revokeAllSessions: RevokeAllStaffSessionsUseCase,
    private readonly audit: AuditService,
  ) {}

  async execute(input: ChangeRequiredPasswordInput): Promise<ChangeRequiredPasswordOutput> {
    const resolved = await this.resolveSubject(input);

    const credential = await this.credentialRepository.findByUserId(resolved.userId);
    if (!credential) {
      throw new ApplicationError('AUTH_INVALID_CREDENTIALS', 'Password change is not available.', 401);
    }

    const mustChange = credential.mustChangePassword || credential.status === 'must_change_password';

    if (!mustChange && !input.changePasswordToken) {
      if (!input.currentPassword) {
        throw new ApplicationError(
          'VALIDATION_ERROR',
          'Current password is required.',
          400,
        );
      }

      const now = new Date();
      if (credential.releaseExpiredLock(now)) {
        await this.credentialRepository.update(credential);
      }

      const currentValid = await credential.verifyPassword(
        input.currentPassword,
        this.passwordHasher,
      );
      if (!currentValid) {
        throw new ApplicationError('AUTH_INVALID_CREDENTIALS', 'Invalid current password.', 401);
      }
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

    if (resolved.staffId && resolved.tenantId) {
      await this.revokeAllSessions.execute({
        tenantId: resolved.tenantId,
        staffId: resolved.staffId,
        actorStaffId: resolved.staffId,
        includeCurrent: false,
        currentRefreshToken: input.currentRefreshToken,
        clientIp: input.clientIp,
        userAgent: input.userAgent,
      });
    }

    await this.audit.log({
      tenantId: resolved.tenantId,
      actorType: resolved.staffId ? 'staff' : 'system',
      actorId: resolved.staffId ?? resolved.userId,
      action: 'security.password.changed',
      entityType: 'user_credential',
      entityId: credential.id,
      ip: input.clientIp,
      userAgent: input.userAgent,
      metadata: {
        userId: resolved.userId,
        via: input.changePasswordToken ? 'change_password_token' : 'authenticated',
        required: mustChange,
      },
    });

    return { success: true };
  }

  private async resolveSubject(input: ChangeRequiredPasswordInput): Promise<{
    userId: string;
    staffId?: string;
    tenantId?: string;
  }> {
    if (input.changePasswordToken) {
      const payload = await this.tokens.verifyChangePasswordToken(input.changePasswordToken);
      if (!payload || payload.actor !== 'staff' || payload.type !== 'change_password') {
        throw new ApplicationError(
          'AUTH_TOKEN_INVALID',
          'Change password token is invalid or expired.',
          401,
        );
      }

      const user = await this.userRepository.findById(payload.sub);
      if (!user) {
        throw new ApplicationError('AUTH_TOKEN_INVALID', 'Change password token is invalid.', 401);
      }

      if (payload.staffId && payload.tenantId) {
        return {
          userId: user.id,
          staffId: payload.staffId,
          tenantId: payload.tenantId,
        };
      }

      if (input.staffId && input.tenantId) {
        const staff = await this.staffRepository.findActiveByIdForTenant(
          input.staffId,
          input.tenantId,
        );
        if (!staff || staff.userId !== user.id) {
          throw new ApplicationError('FORBIDDEN', 'Token does not match the active staff session.', 403);
        }
        return { userId: user.id, staffId: staff.id, tenantId: staff.tenantId };
      }

      return { userId: user.id };
    }

    if (!input.staffId || !input.tenantId) {
      throw new ApplicationError(
        'VALIDATION_ERROR',
        'Authentication or change password token is required.',
        400,
      );
    }

    const staff = await this.staffRepository.findActiveByIdForTenant(input.staffId, input.tenantId);
    if (!staff) {
      throw new ApplicationError('STAFF_NOT_FOUND', 'Staff was not found for this tenant.', 404);
    }

    return { userId: staff.userId, staffId: staff.id, tenantId: staff.tenantId };
  }
}
