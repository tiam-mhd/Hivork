import type { IUserSessionRevocationPort } from '@hivork/application';
import { revokeStaffSessionRecord } from '@hivork/application';
import { Injectable } from '@nestjs/common';

import { JwtTokenService } from './jwt-token.service.js';
import { PrismaStaffSessionRepository } from '../persistence/staff-session.repository.js';
import { RedisStaffSessionRefreshBlacklistService } from '../redis/redis-staff-session-refresh-blacklist.service.js';
import { RedisTokenBlacklistService } from '../redis/redis-token-blacklist.service.js';

@Injectable()
export class PrismaUserSessionRevocationService implements IUserSessionRevocationPort {
  constructor(
    private readonly staffSessions: PrismaStaffSessionRepository,
    private readonly refreshBlacklist: RedisStaffSessionRefreshBlacklistService,
    private readonly tokenBlacklist: RedisTokenBlacklistService,
    private readonly tokens: JwtTokenService,
  ) {}

  async revokeAllSessionsForUser(userId: string): Promise<void> {
    const sessions = await this.staffSessions.findAllActiveForUser(userId);
    const deps = {
      staffSessionRepository: this.staffSessions,
      refreshBlacklist: this.refreshBlacklist,
      tokenBlacklist: this.tokenBlacklist,
      refreshTtlSeconds: this.tokens.getRefreshTtlSeconds(),
    };

    for (const session of sessions) {
      await revokeStaffSessionRecord(deps, session, session.staffId, 'user_security_event');
    }
  }
}
