import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import type { AuditService } from '../ports/audit.port.js';
import type { IAuthTokenService } from '../ports/auth.port.js';
import type { IOtpStore } from '../ports/otp.port.js';
import type { IStaffRepository } from '../ports/staff.repository.port.js';
import type { IUserRepository } from '../ports/user.repository.port.js';
import type { IUserMfaPort } from './ports/user-mfa.port.js';
import type { CreateStaffSessionUseCase } from './create-staff-session.use-case.js';
import { issueStaffAuthSession } from './issue-staff-auth-session.js';
import type { LoginSnapshot } from './login-snapshot.js';
import type { RecordLoginService } from './record-login.service.js';
import { ValidateMfaPendingTokenUseCase } from './validate-mfa-pending-token.use-case.js';

const MFA_OTP_MAX_ATTEMPTS = 5;
const SYSTEM_ACTOR_ID = '00000000-0000-0000-0000-000000000000';

export type MfaVerifyInput = {
  mfaToken: string;
  method: 'otp' | 'totp';
  code: string;
  clientIp?: string;
  userAgent?: string;
  deviceId?: string;
  deviceFingerprint?: string;
};

export type MfaVerifySessionOutput = {
  kind: 'session';
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  staff: {
    id: string;
    tenantId: string;
    name: string;
  };
  tenant: {
    id: string;
    slug: string;
    name: string;
  };
  lastLogin?: LoginSnapshot;
  newIpAlert?: boolean;
  rememberMe?: boolean;
};

export type MfaVerifyOutput = MfaVerifySessionOutput;

export class MfaVerifyUseCase implements UseCase<MfaVerifyInput, MfaVerifyOutput> {
  constructor(
    private readonly validateMfaToken: ValidateMfaPendingTokenUseCase,
    private readonly userRepository: IUserRepository,
    private readonly staffRepository: IStaffRepository,
    private readonly userMfa: IUserMfaPort,
    private readonly otpStore: IOtpStore,
    private readonly tokens: IAuthTokenService,
    private readonly audit: AuditService,
    private readonly createStaffSession: CreateStaffSessionUseCase,
    private readonly recordLogin: RecordLoginService,
  ) {}

  async execute(input: MfaVerifyInput): Promise<MfaVerifyOutput> {
    const payload = await this.validateMfaToken.execute({
      mfaToken: input.mfaToken,
      consume: false,
    });

    const stepUp = await this.userMfa.getLoginStepUp(payload.sub);
    if (!stepUp.required) {
      throw new ApplicationError(
        'AUTH_MFA_NOT_ENABLED',
        'Multi-factor authentication is no longer required. Please sign in again.',
        403,
      );
    }

    if (!stepUp.methods.includes(input.method)) {
      throw new ApplicationError(
        'AUTH_MFA_NOT_ENABLED',
        `${input.method.toUpperCase()} verification is not enabled for this account.`,
        403,
      );
    }

    const user = await this.userRepository.findById(payload.sub);
    if (!user) {
      await this.mfaFailed(input, payload, 'user_not_found');
      throw new ApplicationError('AUTH_MFA_TOKEN_INVALID', 'Invalid MFA token.', 401);
    }

    if (input.method === 'otp') {
      await this.assertMfaOtpValid(user.phone, input.code, input, payload);
    } else {
      const result = await this.userMfa.verifyTotp(payload.sub, input.code);
      if (!result.ok) {
        await this.mfaFailed(
          input,
          payload,
          result.reason === 'backup_used' ? 'backup_code_used' : 'totp_invalid',
        );
        if (result.reason === 'backup_used') {
          throw new ApplicationError(
            'AUTH_BACKUP_CODE_USED',
            'This backup code has already been used.',
            400,
          );
        }
        throw new ApplicationError(
          'AUTH_TOTP_INVALID',
          'Invalid authenticator code. Check your device time and try again.',
          400,
        );
      }

      if (result.via === 'backup') {
        await this.audit.log({
          tenantId: payload.tenantId,
          actorType: 'staff',
          actorId: payload.staffId,
          action: 'security.mfa.backup_code_used',
          entityType: 'user',
          entityId: payload.sub,
          ip: input.clientIp,
          userAgent: input.userAgent,
          metadata: { method: 'backup' },
        });
      }
    }

    await this.validateMfaToken.execute({
      mfaToken: input.mfaToken,
      consume: true,
    });

    const staffMatch = await this.staffRepository.findById(payload.staffId);
    if (
      !staffMatch ||
      staffMatch.tenantId !== payload.tenantId ||
      staffMatch.userId !== payload.sub
    ) {
      throw new ApplicationError('AUTH_MFA_TOKEN_INVALID', 'Invalid MFA token.', 401);
    }

    if (staffMatch.tenantStatus === 'suspended') {
      throw new ApplicationError('TENANT_SUSPENDED', 'Tenant is suspended.', 403);
    }

    if (staffMatch.status === 'suspended') {
      throw new ApplicationError('STAFF_SUSPENDED', 'Staff account is suspended.', 403);
    }

    if (input.method === 'otp') {
      await this.otpStore.delete({
        actor: 'staff',
        phone: user.phone,
        purpose: 'mfa_step_up',
      });
    }

    const loginRecorded = await this.recordLogin.recordStaffLogin(
      staffMatch.id,
      staffMatch.tenantId,
      user.id,
      {
        ipAddress: input.clientIp,
        userAgent: input.userAgent,
      },
    );

    const session = await issueStaffAuthSession(this.tokens, this.createStaffSession, {
      staffId: staffMatch.id,
      tenantId: staffMatch.tenantId,
      userId: user.id,
      rememberMe: payload.rememberMe,
      deviceId: input.deviceId,
      deviceFingerprint: input.deviceFingerprint,
      userAgent: input.userAgent,
      ipAddress: input.clientIp,
    });

    await this.audit.log({
      tenantId: staffMatch.tenantId,
      actorType: 'staff',
      actorId: staffMatch.id,
      action: 'auth.mfa_success',
      entityType: 'staff',
      entityId: staffMatch.id,
      ip: input.clientIp,
      userAgent: input.userAgent,
      metadata: {
        userId: user.id,
        method: input.method,
      },
    });

    return {
      kind: 'session',
      accessToken: session.accessToken,
      expiresIn: session.expiresIn,
      refreshToken: session.refreshToken,
      staff: {
        id: staffMatch.id,
        tenantId: staffMatch.tenantId,
        name: staffMatch.name,
      },
      tenant: {
        id: staffMatch.tenantId,
        slug: staffMatch.tenantSlug,
        name: staffMatch.tenantName,
      },
      lastLogin: loginRecorded.previous ?? undefined,
      newIpAlert: loginRecorded.newIpAlert || undefined,
      rememberMe: payload.rememberMe ?? false,
    };
  }

  private async assertMfaOtpValid(
    phone: string,
    code: string,
    input: MfaVerifyInput,
    payload: Awaited<ReturnType<ValidateMfaPendingTokenUseCase['execute']>>,
  ): Promise<void> {
    const record = await this.otpStore.get({
      actor: 'staff',
      phone,
      purpose: 'mfa_step_up',
    });

    if (!record) {
      await this.mfaFailed(input, payload, 'otp_expired');
      throw new ApplicationError('AUTH_OTP_EXPIRED', 'OTP expired or not found.', 400);
    }

    if (record.code !== code) {
      const attempts = record.attempts + 1;
      if (attempts >= MFA_OTP_MAX_ATTEMPTS) {
        await this.otpStore.delete({
          actor: 'staff',
          phone,
          purpose: 'mfa_step_up',
        });
        await this.mfaFailed(input, payload, 'otp_too_many_attempts');
        throw new ApplicationError(
          'AUTH_OTP_TOO_MANY_ATTEMPTS',
          'Too many invalid OTP attempts.',
          429,
        );
      }

      await this.otpStore.update({
        actor: 'staff',
        phone,
        purpose: 'mfa_step_up',
        record: { ...record, attempts },
      });
      await this.mfaFailed(input, payload, 'otp_invalid');
      throw new ApplicationError('AUTH_OTP_INVALID', 'Invalid OTP code.', 400);
    }
  }

  private async mfaFailed(
    input: MfaVerifyInput,
    payload: Awaited<ReturnType<ValidateMfaPendingTokenUseCase['execute']>>,
    reason: string,
  ): Promise<void> {
    await this.audit.log({
      tenantId: payload.tenantId,
      actorType: 'system',
      actorId: SYSTEM_ACTOR_ID,
      action: 'auth.mfa_failed',
      entityType: 'staff',
      entityId: payload.staffId,
      ip: input.clientIp,
      userAgent: input.userAgent,
      metadata: {
        userId: payload.sub,
        method: input.method,
        reason,
      },
    });
  }
}
