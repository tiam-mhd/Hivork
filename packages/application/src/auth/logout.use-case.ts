import { UseCase } from '../core/use-case.js';
import type { AuditService } from '../ports/audit.port.js';
import type { AuthActor, IAuthTokenService, ITokenBlacklistPort } from './ports/token.port.js';
import type { IStaffSessionRefreshBlacklistPort } from './ports/staff-session-refresh-blacklist.port.js';
import type { IStaffSessionRepository } from './ports/staff-session.repository.port.js';
import { hashRefreshTokenJti } from './refresh-token-hash.js';
import { revokeStaffSessionRecord } from './staff-session-revoke.helper.js';

export type LogoutInput = {
  actor: AuthActor;
  refreshToken?: string;
  clientIp?: string;
  userAgent?: string;
};

export type LogoutOutput = {
  success: true;
};

export class LogoutUseCase implements UseCase<LogoutInput, LogoutOutput> {
  constructor(
    private readonly tokens: IAuthTokenService,
    private readonly tokenBlacklist: ITokenBlacklistPort,
    private readonly staffSessionRepository: IStaffSessionRepository,
    private readonly refreshBlacklist: IStaffSessionRefreshBlacklistPort,
    private readonly audit: AuditService,
  ) {}

  async execute(input: LogoutInput): Promise<LogoutOutput> {
    if (input.refreshToken) {
      await this.tokenBlacklist.revoke(input.refreshToken, this.tokens.getRefreshTtlSeconds());

      if (input.actor === 'staff') {
        await this.revokeStaffSessionOnLogout(input);
      }
    }

    return { success: true };
  }

  private async revokeStaffSessionOnLogout(input: LogoutInput): Promise<void> {
    if (!input.refreshToken) {
      return;
    }

    const payload = await this.tokens.verifyRefreshToken(input.refreshToken);
    if (!payload?.jti) {
      return;
    }

    const hash = hashRefreshTokenJti(payload.jti);
    const session = await this.staffSessionRepository.findByRefreshTokenHash(hash);
    if (!session) {
      return;
    }

    const deps = {
      staffSessionRepository: this.staffSessionRepository,
      refreshBlacklist: this.refreshBlacklist,
      tokenBlacklist: this.tokenBlacklist,
      refreshTtlSeconds: this.tokens.getRefreshTtlSeconds(),
    };

    const outcome = await revokeStaffSessionRecord(
      deps,
      session,
      session.staffId,
      'logout',
      { refreshToken: input.refreshToken },
    );

    if (outcome === 'revoked') {
      await this.audit.log({
        tenantId: session.tenantId,
        actorType: 'staff',
        actorId: session.staffId,
        action: 'security.session.revoked',
        entityType: 'staff_session',
        entityId: session.id,
        ip: input.clientIp,
        userAgent: input.userAgent,
        metadata: {
          staffId: session.staffId,
          reason: 'logout',
        },
      });
    }
  }
}
