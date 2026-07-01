import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import type { AuditService } from '../ports/audit.port.js';
import type { IAuthTokenService, ITokenBlacklistPort } from './ports/token.port.js';
import type { IStaffSessionRefreshBlacklistPort } from './ports/staff-session-refresh-blacklist.port.js';
import type { IStaffSessionRepository } from './ports/staff-session.repository.port.js';
import { hashRefreshTokenJti } from './refresh-token-hash.js';
import { revokeStaffSessionRecord } from './staff-session-revoke.helper.js';

export type RevokeStaffSessionInput = {
  tenantId: string;
  staffId: string;
  actorStaffId: string;
  sessionId: string;
  currentRefreshToken?: string;
  clientIp?: string;
  userAgent?: string;
};

export type RevokeStaffSessionOutput = {
  success: true;
  revokedCurrent: boolean;
};

export class RevokeStaffSessionUseCase
  implements UseCase<RevokeStaffSessionInput, RevokeStaffSessionOutput>
{
  constructor(
    private readonly staffSessions: IStaffSessionRepository,
    private readonly refreshBlacklist: IStaffSessionRefreshBlacklistPort,
    private readonly tokenBlacklist: ITokenBlacklistPort,
    private readonly tokens: IAuthTokenService,
    private readonly audit: AuditService,
  ) {}

  async execute(input: RevokeStaffSessionInput): Promise<RevokeStaffSessionOutput> {
    const session = await this.staffSessions.findByIdForStaff(
      input.tenantId,
      input.staffId,
      input.sessionId,
    );

    if (!session) {
      throw new ApplicationError('SESSION_NOT_FOUND', 'Session was not found.', 404);
    }

    const currentHash = await this.resolveCurrentRefreshHash(input.currentRefreshToken);
    const isCurrent = currentHash !== null && session.refreshTokenHash === currentHash;

    const deps = {
      staffSessionRepository: this.staffSessions,
      refreshBlacklist: this.refreshBlacklist,
      tokenBlacklist: this.tokenBlacklist,
      refreshTtlSeconds: this.tokens.getRefreshTtlSeconds(),
    };

    const outcome = await revokeStaffSessionRecord(
      deps,
      session,
      input.actorStaffId,
      'staff_revoked',
      isCurrent ? { refreshToken: input.currentRefreshToken } : undefined,
    );

    if (outcome === 'revoked') {
      await this.audit.log({
        tenantId: input.tenantId,
        actorType: 'staff',
        actorId: input.actorStaffId,
        action: 'security.session.revoked',
        entityType: 'staff_session',
        entityId: session.id,
        ip: input.clientIp,
        userAgent: input.userAgent,
        metadata: {
          staffId: input.staffId,
          deviceLabel: session.deviceLabel,
          isCurrent,
        },
      });
    }

    return { success: true, revokedCurrent: isCurrent };
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
