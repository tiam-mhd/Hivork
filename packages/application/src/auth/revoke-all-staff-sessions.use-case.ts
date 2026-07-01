import { UseCase } from '../core/use-case.js';
import type { AuditService } from '../ports/audit.port.js';
import type { IAuthTokenService, ITokenBlacklistPort } from './ports/token.port.js';
import type { IStaffSessionRefreshBlacklistPort } from './ports/staff-session-refresh-blacklist.port.js';
import type { IStaffSessionRepository } from './ports/staff-session.repository.port.js';
import { hashRefreshTokenJti } from './refresh-token-hash.js';
import { revokeStaffSessionRecord } from './staff-session-revoke.helper.js';

export type RevokeAllStaffSessionsInput = {
  tenantId: string;
  staffId: string;
  actorStaffId: string;
  includeCurrent?: boolean;
  currentRefreshToken?: string;
  clientIp?: string;
  userAgent?: string;
};

export type RevokeAllStaffSessionsOutput = {
  revokedCount: number;
  revokedCurrent: boolean;
};

export class RevokeAllStaffSessionsUseCase
  implements UseCase<RevokeAllStaffSessionsInput, RevokeAllStaffSessionsOutput>
{
  constructor(
    private readonly staffSessions: IStaffSessionRepository,
    private readonly refreshBlacklist: IStaffSessionRefreshBlacklistPort,
    private readonly tokenBlacklist: ITokenBlacklistPort,
    private readonly tokens: IAuthTokenService,
    private readonly audit: AuditService,
  ) {}

  async execute(input: RevokeAllStaffSessionsInput): Promise<RevokeAllStaffSessionsOutput> {
    const includeCurrent = input.includeCurrent ?? false;
    const currentHash = await this.resolveCurrentRefreshHash(input.currentRefreshToken);
    const sessions = await this.staffSessions.findAllActiveForStaff(
      input.tenantId,
      input.staffId,
    );

    const deps = {
      staffSessionRepository: this.staffSessions,
      refreshBlacklist: this.refreshBlacklist,
      tokenBlacklist: this.tokenBlacklist,
      refreshTtlSeconds: this.tokens.getRefreshTtlSeconds(),
    };

    let revokedCount = 0;
    let revokedCurrent = false;

    for (const session of sessions) {
      const isCurrent = currentHash !== null && session.refreshTokenHash === currentHash;
      if (isCurrent && !includeCurrent) {
        continue;
      }

      const outcome = await revokeStaffSessionRecord(
        deps,
        session,
        input.actorStaffId,
        'staff_revoked_all',
        isCurrent ? { refreshToken: input.currentRefreshToken } : undefined,
      );

      if (outcome === 'revoked') {
        revokedCount += 1;
        if (isCurrent) {
          revokedCurrent = true;
        }
      }
    }

    if (revokedCount > 0) {
      await this.audit.log({
        tenantId: input.tenantId,
        actorType: 'staff',
        actorId: input.actorStaffId,
        action: 'security.session.revoked_all',
        entityType: 'staff',
        entityId: input.staffId,
        ip: input.clientIp,
        userAgent: input.userAgent,
        metadata: {
          revokedCount,
          includeCurrent,
          revokedCurrent,
        },
      });
    }

    return { revokedCount, revokedCurrent };
  }

  private async resolveCurrentRefreshHash(refreshToken?: string): Promise<string | null> {
    if (!refreshToken) {
      return null;
    }

    const payload = await this.tokens.verifyRefreshToken(refreshToken);
    if (!payload?.jti) {
      return null;
    }

    return hashRefreshTokenJti(payload.jti);
  }
}
