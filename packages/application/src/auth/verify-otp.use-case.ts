import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import type { AuditService } from '../ports/audit.port.js';
import type { AuthActor, IAuthTokenService } from '../ports/auth.port.js';
import type { IGlobalCustomerRepository } from '../ports/global-customer.repository.port.js';
import type { IOtpStore } from '../ports/otp.port.js';
import type { IStaffRepository } from '../ports/staff.repository.port.js';
import type { ITenantRepository } from '../ports/tenant.repository.port.js';
import type { IUserRepository } from '../ports/user.repository.port.js';
import type { CreateStaffSessionUseCase } from './create-staff-session.use-case.js';
import { issueStaffAuthSession } from './issue-staff-auth-session.js';
import type { LoginSnapshot } from './login-snapshot.js';
import type { ILoginHardeningPort } from './ports/login-hardening.port.js';
import type { RecordLoginService } from './record-login.service.js';

const OTP_MAX_ATTEMPTS = 5;
const VERIFIED_TOKEN_TTL_SECONDS = 300;
const SYSTEM_ACTOR_ID = '00000000-0000-0000-0000-000000000000';

export type VerifyOtpInput = {
  phone: string;
  code: string;
  actor: AuthActor;
  intent: 'login' | 'register';
  tenantSlug?: string;
  rememberMe?: boolean;
  clientIp?: string;
  ipAllowlistBypassToken?: string;
  userAgent?: string;
  deviceId?: string;
  deviceFingerprint?: string;
};

export type VerifyOtpVerifiedOutput = {
  kind: 'verified';
  verifiedToken: string;
  expiresIn: number;
};

export type VerifyOtpSessionOutput = {
  kind: 'session';
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  staff?: {
    id: string;
    tenantId: string;
    name: string;
  };
  customer?: {
    id: string;
    phone: string;
    name: string | null;
  };
  tenant?: {
    id: string;
    slug: string;
    name: string;
  };
  lastLogin?: LoginSnapshot;
  newIpAlert?: boolean;
};

export type VerifyOtpOutput = VerifyOtpVerifiedOutput | VerifyOtpSessionOutput;

export class VerifyOtpUseCase implements UseCase<VerifyOtpInput, VerifyOtpOutput> {
  constructor(
    private readonly otpStore: IOtpStore,
    private readonly userRepository: IUserRepository,
    private readonly staffRepository: IStaffRepository,
    private readonly customerRepository: IGlobalCustomerRepository,
    private readonly tenantRepository: ITenantRepository,
    private readonly tokens: IAuthTokenService,
    private readonly audit: AuditService,
    private readonly createStaffSession: CreateStaffSessionUseCase,
    private readonly recordLogin: RecordLoginService,
    private readonly loginHardening: ILoginHardeningPort,
  ) {}

  async execute(input: VerifyOtpInput): Promise<VerifyOtpOutput> {
    await this.assertOtpValid(input);

    let result: VerifyOtpOutput;
    if (input.intent === 'register' && input.actor === 'staff') {
      result = await this.registerStaff(input.phone);
    } else if (input.intent === 'login' && input.actor === 'staff') {
      result = await this.loginStaff(input);
    } else {
      result = await this.loginCustomer(input.phone);
    }

    await this.otpStore.delete({ actor: input.actor, phone: input.phone });
    return result;
  }

  private async assertOtpValid(input: VerifyOtpInput): Promise<void> {
    const record = await this.otpStore.get({ actor: input.actor, phone: input.phone });
    if (!record) {
      await this.auditLoginFailed(input, 'otp_expired');
      throw new ApplicationError('OTP_EXPIRED', 'OTP expired or not found.', 401);
    }

    if (record.code !== input.code) {
      const attempts = record.attempts + 1;
      if (attempts >= OTP_MAX_ATTEMPTS) {
        await this.otpStore.delete({ actor: input.actor, phone: input.phone });
      } else {
        await this.otpStore.update({
          actor: input.actor,
          phone: input.phone,
          record: { ...record, attempts },
        });
      }
      await this.auditLoginFailed(input, 'otp_invalid');
      throw new ApplicationError('OTP_INVALID', 'Invalid OTP code.', 401);
    }
  }

  private async registerStaff(phone: string): Promise<VerifyOtpVerifiedOutput> {
    const verifiedToken = await this.tokens.signVerifiedToken({
      phone,
      actor: 'staff',
      purpose: 'register',
    });

    return {
      kind: 'verified',
      verifiedToken,
      expiresIn: VERIFIED_TOKEN_TTL_SECONDS,
    };
  }

  private async loginStaff(input: VerifyOtpInput): Promise<VerifyOtpSessionOutput> {
    const { phone, tenantSlug } = input;
    const user = await this.userRepository.findByPhone(phone);
    if (!user) {
      await this.auditLoginFailed({ phone, actor: 'staff', intent: 'login' }, 'staff_not_found');
      throw new ApplicationError('STAFF_NOT_FOUND', 'No staff account found for this phone.', 404);
    }

    if (user.status === 'suspended') {
      await this.auditLoginFailed({ phone, actor: 'staff', intent: 'login' }, 'user_suspended');
      throw new ApplicationError('STAFF_SUSPENDED', 'Staff account is suspended.', 403);
    }

    let staffMatch: Awaited<ReturnType<IStaffRepository['findByTenantSlugAndUserId']>> = null;

    if (tenantSlug) {
      staffMatch = await this.staffRepository.findByTenantSlugAndUserId(tenantSlug, user.id);
      if (!staffMatch) {
        const tenant = await this.tenantRepository.findBySlug(tenantSlug);
        if (!tenant) {
          throw new ApplicationError('TENANT_NOT_FOUND', 'Tenant not found.', 404);
        }
        await this.auditLoginFailed(
          { phone, actor: 'staff', intent: 'login', tenantSlug },
          'staff_not_found',
          tenant.id,
        );
        throw new ApplicationError('STAFF_NOT_FOUND', 'No staff account found for this phone.', 404);
      }
    } else {
      const matches = await this.staffRepository.findAllByUserId(user.id);
      if (matches.length === 0) {
        await this.auditLoginFailed({ phone, actor: 'staff', intent: 'login' }, 'staff_not_found');
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
        { phone, actor: 'staff', intent: 'login', tenantSlug: staffMatch.tenantSlug },
        'tenant_suspended',
        staffMatch.tenantId,
        staffMatch.id,
      );
      throw new ApplicationError('TENANT_SUSPENDED', 'Tenant is suspended.', 403);
    }

    if (staffMatch.status === 'suspended') {
      await this.auditLoginFailed(
        { phone, actor: 'staff', intent: 'login', tenantSlug: staffMatch.tenantSlug },
        'staff_suspended',
        staffMatch.tenantId,
        staffMatch.id,
      );
      throw new ApplicationError('STAFF_SUSPENDED', 'Staff account is suspended.', 403);
    }

    await this.loginHardening.assertLoginAllowed({
      clientIp: input.clientIp,
      tenantId: staffMatch.tenantId,
      ipAllowlistBypassToken: input.ipAllowlistBypassToken,
      ipAllowlistAuditMetadata: {
        phone: input.phone,
        method: 'otp',
        staffId: staffMatch.id,
      },
    });

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
      metadata: { phone, userId: user.id, method: 'otp' },
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

  private async loginCustomer(phone: string): Promise<VerifyOtpSessionOutput> {
    const user = await this.userRepository.findOrCreateByPhone(phone);
    if (user.status === 'suspended') {
      await this.auditLoginFailed(
        { phone, actor: 'customer', intent: 'login' },
        'customer_suspended',
        undefined,
        user.id,
      );
      throw new ApplicationError('CUSTOMER_SUSPENDED', 'Customer account is suspended.', 403);
    }

    let customer = await this.customerRepository.findByUserId(user.id);
    const created = !customer;
    if (!customer) {
      customer = await this.customerRepository.create(user.id);
    }

    if (customer.status === 'suspended') {
      await this.auditLoginFailed(
        { phone, actor: 'customer', intent: 'login' },
        'customer_suspended',
        undefined,
        customer.id,
      );
      throw new ApplicationError('CUSTOMER_SUSPENDED', 'Customer account is suspended.', 403);
    }

    await this.userRepository.updateLastLoginAt(user.id);

    const accessToken = await this.tokens.signAccessToken({
      sub: customer.id,
      actor: 'customer',
    });
    const { token: refreshToken } = await this.tokens.signRefreshToken({
      sub: customer.id,
      actor: 'customer',
    });

    await this.audit.log({
      actorType: 'customer',
      actorId: customer.id,
      action: created ? 'customer.create' : 'auth.login_success',
      entityType: 'global_customer',
      entityId: customer.id,
      metadata: { phone, userId: user.id },
    });

    return {
      kind: 'session',
      accessToken,
      expiresIn: this.tokens.getAccessTtlSeconds(),
      refreshToken,
      customer: {
        id: customer.id,
        phone: customer.phone,
        name: customer.name,
      },
    };
  }

  private async auditLoginFailed(
    input: Pick<VerifyOtpInput, 'phone' | 'actor' | 'intent' | 'tenantSlug'>,
    reason: string,
    tenantId?: string,
    entityId?: string,
  ): Promise<void> {
    await this.audit.log({
      tenantId,
      actorType: 'system',
      actorId: SYSTEM_ACTOR_ID,
      action: 'auth.login_failed',
      entityType: input.actor === 'staff' ? 'staff' : 'global_customer',
      entityId: entityId ?? SYSTEM_ACTOR_ID,
      metadata: {
        phone: input.phone,
        actor: input.actor,
        intent: input.intent,
        tenantSlug: input.tenantSlug,
        reason,
      },
    });
  }
}
