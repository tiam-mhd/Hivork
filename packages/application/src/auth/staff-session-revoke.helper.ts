import type { StaffSession } from '@hivork/domain';

import type { IStaffSessionRefreshBlacklistPort } from './ports/staff-session-refresh-blacklist.port.js';
import type { IStaffSessionRepository } from './ports/staff-session.repository.port.js';
import type { ITokenBlacklistPort } from './ports/token.port.js';

export function blacklistTtlForSession(session: StaffSession, maxTtlSeconds: number): number {
  const remainingMs = session.expiresAt.getTime() - Date.now();
  const remainingSeconds = Math.max(1, Math.ceil(remainingMs / 1000));
  return Math.min(remainingSeconds, maxTtlSeconds);
}

export type RevokeStaffSessionDeps = {
  staffSessionRepository: IStaffSessionRepository;
  refreshBlacklist: IStaffSessionRefreshBlacklistPort;
  tokenBlacklist: ITokenBlacklistPort;
  refreshTtlSeconds: number;
};

export async function revokeStaffSessionRecord(
  deps: RevokeStaffSessionDeps,
  session: StaffSession,
  actorStaffId: string,
  reason: string,
  options?: { refreshToken?: string },
): Promise<'revoked' | 'already_revoked'> {
  if (session.status === 'revoked') {
    return 'already_revoked';
  }

  if (!session.isActive() && session.status !== 'active') {
    return 'already_revoked';
  }

  session.revoke(actorStaffId, reason);
  await deps.staffSessionRepository.saveRevoked(session, actorStaffId);

  const ttl = blacklistTtlForSession(session, deps.refreshTtlSeconds);
  await deps.refreshBlacklist.revokeByHash(session.refreshTokenHash, ttl);

  if (options?.refreshToken) {
    await deps.tokenBlacklist.revoke(options.refreshToken, deps.refreshTtlSeconds);
  }

  return 'revoked';
}
