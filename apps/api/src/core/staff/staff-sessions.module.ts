import {
  AUDIT_SERVICE,
  ListStaffSessionsUseCase,
  RevokeAllStaffSessionsUseCase,
  RevokeStaffSessionUseCase,
  type AuditService,
} from '@hivork/application';
import {
  JwtTokenService,
  PrismaStaffSessionRepository,
  RedisStaffSessionRefreshBlacklistService,
  RedisTokenBlacklistService,
} from '@hivork/infrastructure';
import { Module } from '@nestjs/common';

import { AuthCommonModule } from '../../common/auth-common.module';
import { PrismaModule } from '@hivork/infrastructure';
import { StaffSessionsController } from './staff-sessions.controller';

@Module({
  imports: [PrismaModule, AuthCommonModule],
  controllers: [StaffSessionsController],
  providers: [
    PrismaStaffSessionRepository,
    RedisStaffSessionRefreshBlacklistService,
    RedisTokenBlacklistService,
    {
      provide: ListStaffSessionsUseCase,
      useFactory: (staffSessions: PrismaStaffSessionRepository, tokens: JwtTokenService) =>
        new ListStaffSessionsUseCase(staffSessions, tokens),
      inject: [PrismaStaffSessionRepository, JwtTokenService],
    },
    {
      provide: RevokeStaffSessionUseCase,
      useFactory: (
        staffSessions: PrismaStaffSessionRepository,
        refreshBlacklist: RedisStaffSessionRefreshBlacklistService,
        tokenBlacklist: RedisTokenBlacklistService,
        tokens: JwtTokenService,
        audit: AuditService,
      ) =>
        new RevokeStaffSessionUseCase(
          staffSessions,
          refreshBlacklist,
          tokenBlacklist,
          tokens,
          audit,
        ),
      inject: [
        PrismaStaffSessionRepository,
        RedisStaffSessionRefreshBlacklistService,
        RedisTokenBlacklistService,
        JwtTokenService,
        AUDIT_SERVICE,
      ],
    },
    {
      provide: RevokeAllStaffSessionsUseCase,
      useFactory: (
        staffSessions: PrismaStaffSessionRepository,
        refreshBlacklist: RedisStaffSessionRefreshBlacklistService,
        tokenBlacklist: RedisTokenBlacklistService,
        tokens: JwtTokenService,
        audit: AuditService,
      ) =>
        new RevokeAllStaffSessionsUseCase(
          staffSessions,
          refreshBlacklist,
          tokenBlacklist,
          tokens,
          audit,
        ),
      inject: [
        PrismaStaffSessionRepository,
        RedisStaffSessionRefreshBlacklistService,
        RedisTokenBlacklistService,
        JwtTokenService,
        AUDIT_SERVICE,
      ],
    },
  ],
})
export class StaffSessionsModule {}
