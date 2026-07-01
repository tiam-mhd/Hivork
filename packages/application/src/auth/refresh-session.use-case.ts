import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import type { AuditService } from '../ports/audit.port.js';
import type { AuthActor, IAuthTokenService, ITokenBlacklistPort } from './ports/token.port.js';
import type { IGlobalCustomerRepository } from '../ports/global-customer.repository.port.js';
import type { IStaffRepository } from '../ports/staff.repository.port.js';
import { hashRefreshTokenJti } from './refresh-token-hash.js';
import type { IStaffSessionRefreshBlacklistPort } from './ports/staff-session-refresh-blacklist.port.js';
import type { IStaffSessionRepository } from './ports/staff-session.repository.port.js';
import {
  revokeStaffSessionRecord,
} from './staff-session-revoke.helper.js';
import {
  calculateStaffSessionExpiresAt,
  resolveRefreshTtlSeconds,
} from './staff-session-ttl.js';
import type { IUserRefreshInvalidationPort } from './ports/user-session-revocation.port.js';

export type RefreshSessionInput = {
  actor: AuthActor;
  refreshToken: string;
  clientIp?: string;
  userAgent?: string;
};

export type RefreshSessionOutput = {
  accessToken: string;
  expiresIn: number;
  refreshToken?: string;
  rememberMe?: boolean;
};

export class RefreshSessionUseCase
  implements UseCase<RefreshSessionInput, RefreshSessionOutput>
{
  constructor(
    private readonly tokens: IAuthTokenService,
    private readonly staffRepository: IStaffRepository,
    private readonly customerRepository: IGlobalCustomerRepository,
    private readonly tokenBlacklist: ITokenBlacklistPort,
    private readonly refreshInvalidation: IUserRefreshInvalidationPort,
    private readonly staffSessionRepository: IStaffSessionRepository,
    private readonly refreshBlacklist: IStaffSessionRefreshBlacklistPort,
    private readonly audit: AuditService,
  ) {}

  async execute(input: RefreshSessionInput): Promise<RefreshSessionOutput> {
    if (await this.tokenBlacklist.isRevoked(input.refreshToken)) {
      throw new ApplicationError('AUTH_REFRESH_EXPIRED', 'Refresh token has been revoked.', 401);
    }

    const payload = await this.tokens.verifyRefreshToken(input.refreshToken);
    if (!payload) {
      throw new ApplicationError('AUTH_REFRESH_EXPIRED', 'Refresh token is invalid or expired.', 401);
    }

    if (payload.actor !== input.actor) {
      throw new ApplicationError('TOKEN_INVALID', 'Refresh token actor mismatch.', 401);
    }

    if (payload.actor === 'staff') {
      return this.refreshStaff(input, payload);
    }

    return this.refreshCustomer(input, payload);
  }

  private async refreshStaff(
    input: RefreshSessionInput,
    payload: {
      sub: string;
      jti: string;
      rememberMe?: boolean;
      iat?: number;
    },
  ): Promise<RefreshSessionOutput> {
    await this.assertStaffRefreshStillValid(payload.sub, payload.iat);

    const currentHash = hashRefreshTokenJti(payload.jti);
    if (await this.refreshBlacklist.isRevokedByHash(currentHash)) {
      await this.handleStaffTokenReuse(input, payload.sub, currentHash);
    }

    const session = await this.staffSessionRepository.findActiveByRefreshTokenHash(currentHash);
    if (!session) {
      throw new ApplicationError('AUTH_REFRESH_EXPIRED', 'Refresh token session is no longer active.', 401);
    }

    const staff = await this.staffRepository.findById(payload.sub);
    if (!staff) {
      throw new ApplicationError('STAFF_NOT_FOUND', 'Staff account not found.', 404);
    }
    if (staff.tenantStatus === 'suspended') {
      throw new ApplicationError('TENANT_SUSPENDED', 'Tenant is suspended.', 403);
    }
    if (staff.status === 'suspended') {
      throw new ApplicationError('STAFF_SUSPENDED', 'Staff account is suspended.', 403);
    }

    const rememberMe = payload.rememberMe ?? session.rememberMe;
    const now = new Date();
    const nextExpiresAt = calculateStaffSessionExpiresAt(
      rememberMe,
      now,
      this.tokens.getRefreshTtlSeconds(),
      this.tokens.getRefreshSessionTtlSeconds(),
    );

    const { token: refreshToken, jti: newJti } = await this.tokens.signRefreshToken(
      { sub: staff.id, actor: 'staff' },
      { rememberMe },
    );
    const newHash = hashRefreshTokenJti(newJti);

    const rotated = await this.staffSessionRepository.rotateActiveSessionRefreshHash(
      currentHash,
      newHash,
      now,
      nextExpiresAt,
    );
    if (!rotated) {
      throw new ApplicationError('AUTH_REFRESH_EXPIRED', 'Refresh token session is no longer active.', 401);
    }

    const blacklistTtl = resolveRefreshTtlSeconds(
      rememberMe,
      this.tokens.getRefreshTtlSeconds(),
      this.tokens.getRefreshSessionTtlSeconds(),
    );
    await this.refreshBlacklist.revokeByHash(currentHash, blacklistTtl);
    await this.tokenBlacklist.revoke(input.refreshToken, blacklistTtl);

    const accessToken = await this.tokens.signAccessToken({
      sub: staff.id,
      actor: 'staff',
      tenantId: staff.tenantId,
    });

    return {
      accessToken,
      expiresIn: this.tokens.getAccessTtlSeconds(),
      refreshToken,
      rememberMe,
    };
  }

  private async refreshCustomer(
    input: RefreshSessionInput,
    payload: { sub: string; rememberMe?: boolean },
  ): Promise<RefreshSessionOutput> {
    const customer = await this.customerRepository.findById(payload.sub);
    if (!customer) {
      throw new ApplicationError('CUSTOMER_NOT_FOUND', 'Customer account not found.', 404);
    }
    if (customer.status === 'suspended') {
      throw new ApplicationError('CUSTOMER_SUSPENDED', 'Customer account is suspended.', 403);
    }

    const rememberMe = payload.rememberMe ?? false;
    const { token: refreshToken } = await this.tokens.signRefreshToken(
      { sub: customer.id, actor: 'customer' },
      { rememberMe },
    );

    const blacklistTtl = resolveRefreshTtlSeconds(
      rememberMe,
      this.tokens.getRefreshTtlSeconds(),
      this.tokens.getRefreshSessionTtlSeconds(),
    );
    await this.tokenBlacklist.revoke(input.refreshToken, blacklistTtl);

    const accessToken = await this.tokens.signAccessToken({
      sub: customer.id,
      actor: 'customer',
    });

    return {
      accessToken,
      expiresIn: this.tokens.getAccessTtlSeconds(),
      refreshToken,
      rememberMe,
    };
  }

  private async handleStaffTokenReuse(
    input: RefreshSessionInput,
    staffId: string,
    currentHash: string,
  ): Promise<never> {
    const staff = await this.staffRepository.findById(staffId);
    if (!staff) {
      throw new ApplicationError('AUTH_REFRESH_COMPROMISED', 'Refresh token reuse detected.', 401);
    }

    const sessions = await this.staffSessionRepository.findAllActiveForStaff(
      staff.tenantId,
      staffId,
    );
    const deps = {
      staffSessionRepository: this.staffSessionRepository,
      refreshBlacklist: this.refreshBlacklist,
      tokenBlacklist: this.tokenBlacklist,
      refreshTtlSeconds: this.tokens.getRefreshTtlSeconds(),
    };

    for (const session of sessions) {
      await revokeStaffSessionRecord(deps, session, staffId, 'token_reuse', {
        refreshToken: session.refreshTokenHash === currentHash ? input.refreshToken : undefined,
      });
    }

    await this.audit.log({
      tenantId: staff.tenantId,
      actorType: 'staff',
      actorId: staffId,
      action: 'security.token.reuse_detected',
      entityType: 'staff',
      entityId: staffId,
      ip: input.clientIp,
      userAgent: input.userAgent,
      metadata: {
        refreshTokenHash: currentHash,
      },
    });

    throw new ApplicationError(
      'AUTH_REFRESH_COMPROMISED',
      'Refresh token reuse detected. All sessions have been revoked.',
      401,
    );
  }

  private async assertStaffRefreshStillValid(staffId: string, issuedAt?: number): Promise<void> {
    if (!issuedAt) {
      return;
    }

    const staff = await this.staffRepository.findById(staffId);
    if (!staff) {
      throw new ApplicationError('AUTH_REFRESH_EXPIRED', 'Refresh token has been revoked.', 401);
    }

    const invalidBefore = await this.refreshInvalidation.getInvalidBefore(staff.userId);
    if (invalidBefore !== null && issuedAt * 1000 < invalidBefore) {
      throw new ApplicationError('AUTH_REFRESH_EXPIRED', 'Refresh token has been revoked.', 401);
    }
  }
}
