import {
  AUDIT_SERVICE,
  ChangeRequiredPasswordUseCase,
  ChangeStaffPasswordUseCase,
  GetStaffAccountSecurityUseCase,
  RevokeAllStaffSessionsUseCase,
  type AuditService,
} from '@hivork/application';
import {
  Argon2PasswordHasher,
  JwtTokenService,
  PrismaModule,
  PrismaStaffRepository,
  PrismaStaffSessionRepository,
  PrismaUserCredentialRepository,
  PrismaUserRepository,
  RedisStaffSessionRefreshBlacklistService,
  RedisTokenBlacklistService,
} from '@hivork/infrastructure';
import { Module } from '@nestjs/common';

import { AuthCommonModule } from '../../common/auth-common.module';
import { StaffSessionsModule } from './staff-sessions.module';
import {
  StaffPasswordController,
} from './staff-password.controller';

@Module({
  imports: [PrismaModule, AuthCommonModule, StaffSessionsModule],
  controllers: [StaffPasswordController],
  providers: [
    PrismaUserRepository,
    PrismaUserCredentialRepository,
    Argon2PasswordHasher,
    PrismaStaffSessionRepository,
    RedisStaffSessionRefreshBlacklistService,
    RedisTokenBlacklistService,
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
    {
      provide: ChangeStaffPasswordUseCase,
      useFactory: (
        staff: PrismaStaffRepository,
        credentials: PrismaUserCredentialRepository,
        passwordHasher: Argon2PasswordHasher,
        revokeAll: RevokeAllStaffSessionsUseCase,
        audit: AuditService,
      ) =>
        new ChangeStaffPasswordUseCase(
          staff,
          credentials,
          passwordHasher,
          revokeAll,
          audit,
        ),
      inject: [
        PrismaStaffRepository,
        PrismaUserCredentialRepository,
        Argon2PasswordHasher,
        RevokeAllStaffSessionsUseCase,
        AUDIT_SERVICE,
      ],
    },
    {
      provide: ChangeRequiredPasswordUseCase,
      useFactory: (
        tokens: JwtTokenService,
        users: PrismaUserRepository,
        staff: PrismaStaffRepository,
        credentials: PrismaUserCredentialRepository,
        passwordHasher: Argon2PasswordHasher,
        revokeAll: RevokeAllStaffSessionsUseCase,
        audit: AuditService,
      ) =>
        new ChangeRequiredPasswordUseCase(
          tokens,
          users,
          staff,
          credentials,
          passwordHasher,
          revokeAll,
          audit,
        ),
      inject: [
        JwtTokenService,
        PrismaUserRepository,
        PrismaStaffRepository,
        PrismaUserCredentialRepository,
        Argon2PasswordHasher,
        RevokeAllStaffSessionsUseCase,
        AUDIT_SERVICE,
      ],
    },
    {
      provide: GetStaffAccountSecurityUseCase,
      useFactory: (
        staff: PrismaStaffRepository,
        credentials: PrismaUserCredentialRepository,
      ) => new GetStaffAccountSecurityUseCase(staff, credentials),
      inject: [PrismaStaffRepository, PrismaUserCredentialRepository],
    },
  ],
  exports: [ChangeRequiredPasswordUseCase, GetStaffAccountSecurityUseCase],
})
export class StaffPasswordModule {}
