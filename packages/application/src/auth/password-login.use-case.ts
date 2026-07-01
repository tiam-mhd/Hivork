import { UserCredential } from '@hivork/domain';

import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import type { AuditService } from '../ports/audit.port.js';
import type { IAuthTokenService } from '../ports/auth.port.js';
import type { ISettingsSchemaRegistry } from '../ports/settings-schema-registry.port.js';
import type { ITenantRepository } from '../ports/tenant.repository.port.js';
import type { ITenantSettingsRepository } from '../ports/tenant-settings.repository.port.js';
import type { ILoginHardeningPort } from './ports/login-hardening.port.js';
import {
  LOGIN_IP_WINDOW_SECONDS,
  type ILoginRateLimiterPort,
} from './ports/login-rate-limiter.port.js';
import type { IPasswordHasherPort } from '../ports/password-hasher.port.js';
import type { IStaffRepository } from '../ports/staff.repository.port.js';
import type { IUserCredentialRepository } from '../ports/user-credential.repository.port.js';
import type { IUserRepository } from '../ports/user.repository.port.js';
import type { CreateStaffSessionUseCase } from './create-staff-session.use-case.js';
import { issueStaffAuthSession } from './issue-staff-auth-session.js';
import type { RecordLoginService } from './record-login.service.js';
import type { IUserMfaPort } from './ports/user-mfa.port.js';
import { resolveLockoutPolicy } from './resolve-lockout-policy.js';

const SYSTEM_ACTOR_ID = '00000000-0000-0000-0000-000000000000';

export type PasswordLoginInput = {
  phone: string;
  password: string;
  tenantSlug?: string;
  rememberMe?: boolean;
  captchaToken?: string;
  captchaBypassToken?: string;
  ipAllowlistBypassToken?: string;
  clientIp?: string;
  userAgent?: string;
  deviceId?: string;
  deviceFingerprint?: string;
};

export type PasswordLoginLastLogin = {
  at: string;
  ip?: string;
  deviceLabel?: string;
};

export type PasswordLoginSessionOutput = {
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
  lastLogin?: PasswordLoginLastLogin;
  newIpAlert?: boolean;
};

export type PasswordLoginMfaRequiredOutput = {
  kind: 'mfa_required';
  mfaToken: string;
  expiresIn: number;
  methods: Array<'otp' | 'totp'>;
};

export type PasswordLoginMustChangePasswordOutput = {
  kind: 'must_change_password';
  changePasswordToken: string;
  expiresIn: number;
};

export type PasswordLoginOutput =
  | PasswordLoginSessionOutput
  | PasswordLoginMfaRequiredOutput
  | PasswordLoginMustChangePasswordOutput;

export class PasswordLoginUseCase implements UseCase<PasswordLoginInput, PasswordLoginOutput> {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly credentialRepository: IUserCredentialRepository,
    private readonly passwordHasher: IPasswordHasherPort,
    private readonly staffRepository: IStaffRepository,
    private readonly tenantRepository: ITenantRepository,
    private readonly tokens: IAuthTokenService,
    private readonly userMfa: IUserMfaPort,
    private readonly loginHardening: ILoginHardeningPort,
    private readonly loginRateLimiter: ILoginRateLimiterPort,
    private readonly settingsRepository: ITenantSettingsRepository,
    private readonly schemaRegistry: ISettingsSchemaRegistry,
    private readonly audit: AuditService,
    private readonly createStaffSession: CreateStaffSessionUseCase,
    private readonly recordLogin: RecordLoginService,
  ) {}

  async execute(input: PasswordLoginInput): Promise<PasswordLoginOutput> {
    await this.loginHardening.assertLoginAllowed({
      captchaToken: input.captchaToken,
      clientIp: input.clientIp,
      captchaBypassToken: input.captchaBypassToken,
    });

    await this.assertLoginRateLimit(input);

    const lockoutPolicy = await resolveLockoutPolicy(
      this.tenantRepository,
      this.settingsRepository,
      this.schemaRegistry,
      input.tenantSlug,
    );

    const user = await this.userRepository.findByPhone(input.phone);
    const credential = user ? await this.credentialRepository.findByUserId(user.id) : null;

    if (!user || !credential) {
      await this.loginHardening.recordPasswordLoginFailure(input.clientIp);
      await this.auditLoginFailed(input, 'invalid_credentials');
      throw new ApplicationError(
        'AUTH_INVALID_CREDENTIALS',
        'Invalid phone number or password.',
        401,
      );
    }

    const now = new Date();
    if (credential.releaseExpiredLock(now)) {
      await this.credentialRepository.update(credential);
    }

    if (credential.isLocked(now)) {
      await this.auditLoginFailed(input, 'account_locked', undefined, user.id);
      throw this.buildAccountLockedError(credential);
    }

    const passwordValid = await credential.verifyPassword(input.password, this.passwordHasher);
    if (!passwordValid) {
      const wasLocked = credential.isLocked(now);
      credential.recordFailedLogin(
        lockoutPolicy.maxAttempts,
        lockoutPolicy.durationMinutes,
        now,
      );
      await this.credentialRepository.update(credential);
      await this.loginHardening.recordPasswordLoginFailure(input.clientIp);
      await this.auditLoginFailed(input, 'invalid_credentials', undefined, user.id);

      if (!wasLocked && credential.isLocked(now)) {
        await this.auditLockoutTriggered(input, user.id, credential);
      }

      if (credential.isLocked(now)) {
        throw this.buildAccountLockedError(credential);
      }

      throw new ApplicationError(
        'AUTH_INVALID_CREDENTIALS',
        'Invalid phone number or password.',
        401,
      );
    }

    if (lockoutPolicy.resetAfterSuccess) {
      credential.clearFailedLogins();
      await this.credentialRepository.update(credential);
    }

    if (user.status === 'suspended') {
      await this.auditLoginFailed(input, 'user_suspended', undefined, user.id);
      throw new ApplicationError('STAFF_SUSPENDED', 'Staff account is suspended.', 403);
    }

    if (credential.mustChangePassword || credential.status === 'must_change_password') {
      const changePasswordToken = await this.tokens.signChangePasswordToken({
        sub: user.id,
        actor: 'staff',
      });

      await this.audit.log({
        actorType: 'system',
        actorId: user.id,
        action: 'auth.login_failed',
        entityType: 'user_credential',
        entityId: credential.id,
        ip: input.clientIp,
        userAgent: input.userAgent,
        metadata: {
          phone: input.phone,
          method: 'password',
          reason: 'must_change_password',
        },
      });

      return {
        kind: 'must_change_password',
        changePasswordToken,
        expiresIn: this.tokens.getChangePasswordTtlSeconds(),
      };
    }

    const staffMatch = await this.resolveStaff(input, user.id);

    await this.loginHardening.assertLoginAllowed({
      captchaToken: input.captchaToken,
      clientIp: input.clientIp,
      tenantId: staffMatch.tenantId,
      captchaBypassToken: input.captchaBypassToken,
      ipAllowlistBypassToken: input.ipAllowlistBypassToken,
      ipAllowlistAuditMetadata: {
        phone: input.phone,
        method: 'password',
        staffId: staffMatch.id,
      },
    });

    const stepUp = await this.userMfa.getLoginStepUp(user.id);
    if (stepUp.required) {
      const mfaToken = await this.tokens.signMfaPendingToken({
        sub: user.id,
        actor: 'staff',
        tenantId: staffMatch.tenantId,
        staffId: staffMatch.id,
        rememberMe: input.rememberMe,
      });

      return {
        kind: 'mfa_required',
        mfaToken,
        expiresIn: this.tokens.getMfaPendingTtlSeconds(),
        methods: stepUp.methods.length > 0 ? stepUp.methods : ['otp', 'totp'],
      };
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
      rememberMe: input.rememberMe,
      deviceId: input.deviceId,
      deviceFingerprint: input.deviceFingerprint,
      userAgent: input.userAgent,
      ipAddress: input.clientIp,
    });

    await this.audit.log({
      tenantId: staffMatch.tenantId,
      actorType: 'staff',
      actorId: staffMatch.id,
      action: 'auth.login_success',
      entityType: 'staff',
      entityId: staffMatch.id,
      ip: input.clientIp,
      userAgent: input.userAgent,
      metadata: {
        phone: input.phone,
        userId: user.id,
        method: 'password',
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
    };
  }

  private async assertLoginRateLimit(input: PasswordLoginInput): Promise<void> {
    const allowed = await this.loginRateLimiter.checkAndRecord(input.phone, input.clientIp);
    if (!allowed) {
      throw new ApplicationError(
        'AUTH_LOGIN_RATE_LIMITED',
        'Too many login attempts. Try again later.',
        429,
        { retryAfterSeconds: LOGIN_IP_WINDOW_SECONDS },
      );
    }
  }

  private async resolveStaff(
    input: PasswordLoginInput,
    userId: string,
  ): Promise<NonNullable<Awaited<ReturnType<IStaffRepository['findByTenantSlugAndUserId']>>>> {
    let staffMatch: Awaited<ReturnType<IStaffRepository['findByTenantSlugAndUserId']>> = null;

    if (input.tenantSlug) {
      staffMatch = await this.staffRepository.findByTenantSlugAndUserId(input.tenantSlug, userId);
      if (!staffMatch) {
        const tenant = await this.tenantRepository.findBySlug(input.tenantSlug);
        if (!tenant) {
          throw new ApplicationError('TENANT_NOT_FOUND', 'Tenant not found.', 404);
        }
        await this.auditLoginFailed(
          input,
          'staff_not_found',
          tenant.id,
          userId,
        );
        throw new ApplicationError('STAFF_NOT_FOUND', 'No staff account found for this phone.', 404);
      }
    } else {
      const matches = await this.staffRepository.findAllByUserId(userId);
      if (matches.length === 0) {
        await this.auditLoginFailed(input, 'staff_not_found', undefined, userId);
        throw new ApplicationError('STAFF_NOT_FOUND', 'No staff account found for this phone.', 404);
      }
      if (matches.length > 1) {
        throw new ApplicationError(
          'NEED_TENANT_SLUG',
          'Multiple tenants match this phone. Provide tenantSlug.',
          409,
          {
            tenantSlugs: matches.map((match) => match.tenantSlug),
            tenants: matches.map((match) => ({
              slug: match.tenantSlug,
              name: match.tenantName,
            })),
          },
        );
      }
      staffMatch = matches[0]!;
    }

    if (staffMatch.tenantStatus === 'suspended') {
      await this.auditLoginFailed(
        input,
        'tenant_suspended',
        staffMatch.tenantId,
        staffMatch.id,
      );
      throw new ApplicationError('TENANT_SUSPENDED', 'Tenant is suspended.', 403);
    }

    if (staffMatch.status === 'suspended') {
      await this.auditLoginFailed(
        input,
        'staff_suspended',
        staffMatch.tenantId,
        staffMatch.id,
      );
      throw new ApplicationError('STAFF_SUSPENDED', 'Staff account is suspended.', 403);
    }

    return staffMatch;
  }

  private buildAccountLockedError(credential: UserCredential): ApplicationError {
    const lockedUntil = credential.lockedUntil;
    const retryAfterSeconds = lockedUntil
      ? Math.max(1, Math.ceil((lockedUntil.getTime() - Date.now()) / 1000))
      : undefined;

    return new ApplicationError('AUTH_ACCOUNT_LOCKED', 'Account is temporarily locked.', 423, {
      lockedUntil: lockedUntil?.toISOString() ?? null,
      retryAfterSeconds,
    });
  }

  private async auditLockoutTriggered(
    input: PasswordLoginInput,
    userId: string,
    credential: UserCredential,
  ): Promise<void> {
    await this.audit.log({
      actorType: 'system',
      actorId: SYSTEM_ACTOR_ID,
      action: 'auth.lockout_triggered',
      entityType: 'user_credential',
      entityId: credential.id,
      ip: input.clientIp,
      userAgent: input.userAgent,
      metadata: {
        userId,
        phone: input.phone,
        tenantSlug: input.tenantSlug,
        failedLoginCount: credential.failedLoginCount,
        lockedUntil: credential.lockedUntil?.toISOString() ?? null,
      },
    });
  }

  private async auditLoginFailed(
    input: PasswordLoginInput,
    reason: string,
    tenantId?: string,
    entityId?: string,
  ): Promise<void> {
    await this.audit.log({
      tenantId,
      actorType: 'system',
      actorId: SYSTEM_ACTOR_ID,
      action: 'auth.login_failed',
      entityType: 'staff',
      entityId: entityId ?? SYSTEM_ACTOR_ID,
      ip: input.clientIp,
      userAgent: input.userAgent,
      metadata: {
        phone: input.phone,
        tenantSlug: input.tenantSlug,
        method: 'password',
        reason,
      },
    });
  }
}
