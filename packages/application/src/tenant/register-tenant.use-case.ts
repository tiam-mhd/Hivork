import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import { ValidateVerifiedRegisterTokenUseCase } from '../auth/validate-verified-register-token.use-case.js';
import type { AuditService } from '../ports/audit.port.js';
import type { IAuthTokenService, ITokenBlacklistPort } from '../ports/auth.port.js';
import type { IRegisterRateLimiter } from '../ports/register-rate-limiter.port.js';
import type { IStaffRepository } from '../ports/staff.repository.port.js';
import type { ITenantRegistrationRepository } from '../ports/tenant-registration.repository.port.js';
import type { IUserRepository } from '../ports/user.repository.port.js';

export type RegisterTenantInput = {
  name: string;
  slug: string;
  legalName?: string;
  taxId?: string;
  phone?: string;
  email?: string;
  ownerName: string;
  ownerPhone: string;
  verifiedToken: string;
  clientIp?: string;
  userAgent?: string;
};

export type RegisterTenantOutput = {
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
};

export class RegisterTenantUseCase implements UseCase<RegisterTenantInput, RegisterTenantOutput> {
  constructor(
    private readonly validateVerifiedToken: ValidateVerifiedRegisterTokenUseCase,
    private readonly registrationRepository: ITenantRegistrationRepository,
    private readonly userRepository: IUserRepository,
    private readonly staffRepository: IStaffRepository,
    private readonly registerRateLimiter: IRegisterRateLimiter,
    private readonly tokens: IAuthTokenService,
    private readonly tokenBlacklist: ITokenBlacklistPort,
    private readonly audit: AuditService,
  ) {}

  async execute(input: RegisterTenantInput): Promise<RegisterTenantOutput> {
    if (input.clientIp) {
      const allowed = await this.registerRateLimiter.checkRegisterRateLimit(input.clientIp);
      if (!allowed) {
        throw new ApplicationError(
          'REGISTER_RATE_LIMITED',
          'Too many registration attempts. Try again later.',
          429,
        );
      }
    }

    await this.validateVerifiedToken.execute({
      verifiedToken: input.verifiedToken,
      ownerPhone: input.ownerPhone,
    });

    if (await this.registrationRepository.isSlugTaken(input.slug)) {
      throw new ApplicationError('SLUG_TAKEN', 'Tenant slug is already taken.', 409);
    }

    const ownerUser = await this.userRepository.findOrCreateByPhone(
      input.ownerPhone,
      input.ownerName,
    );

    const result = await this.registrationRepository.register({
      name: input.name,
      slug: input.slug,
      legalName: input.legalName,
      taxId: input.taxId,
      phone: input.phone,
      email: input.email,
      ownerName: input.ownerName,
      ownerUserId: ownerUser.id,
    });

    await Promise.all([
      this.staffRepository.updateLastLoginAt(result.staff.id),
      this.userRepository.updateLastLoginAt(ownerUser.id),
    ]);

    await this.audit.log({
      tenantId: result.tenant.id,
      actorType: 'staff',
      actorId: result.staff.id,
      action: 'tenant.create',
      entityType: 'tenant',
      entityId: result.tenant.id,
      newValue: {
        slug: result.tenant.slug,
        name: result.tenant.name,
        ownerPhone: input.ownerPhone,
        ownerUserId: ownerUser.id,
      },
      ip: input.clientIp,
      userAgent: input.userAgent,
    });

    const accessToken = await this.tokens.signAccessToken({
      sub: result.staff.id,
      actor: 'staff',
      tenantId: result.tenant.id,
    });
    const { token: refreshToken } = await this.tokens.signRefreshToken({
      sub: result.staff.id,
      actor: 'staff',
    });

    await this.tokenBlacklist.revoke(
      input.verifiedToken,
      this.tokens.getVerifiedTtlSeconds(),
    );

    return {
      accessToken,
      expiresIn: this.tokens.getAccessTtlSeconds(),
      refreshToken,
      staff: {
        id: result.staff.id,
        tenantId: result.tenant.id,
        name: result.staff.name,
      },
      tenant: result.tenant,
    };
  }
}
