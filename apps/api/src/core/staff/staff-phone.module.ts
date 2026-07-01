import {
  AUDIT_SERVICE,
  ConfirmChangePhoneUseCase,
  InitChangePhoneUseCase,
  PHONE_CHANGE_SESSION_TTL_SECONDS,
  RequestCurrentPhoneOtpUseCase,
  RequestNewPhoneOtpUseCase,
  VerifyCurrentPhoneOtpUseCase,
  type AuditService,
} from '@hivork/application';
import {
  Argon2PasswordHasher,
  ConsoleSmsAdapter,
  JwtTokenService,
  OtpRateLimiterService,
  PrismaModule,
  PrismaStaffRepository,
  PrismaUserRepository,
  PrismaUserCredentialRepository,
  PrismaUserSessionRevocationService,
  RedisModule,
  RedisOtpStore,
  RedisPhoneChangeSessionStore,
  RedisService,
  RedisStaffSessionRefreshBlacklistService,
  RedisTokenBlacklistService,
  RedisUserRefreshInvalidationService,
  PrismaStaffSessionRepository,
} from '@hivork/infrastructure';
import { Module } from '@nestjs/common';

import { AuthCommonModule } from '../../common/auth-common.module';
import { AppConfigService } from '../../config/app-config.service';
import { StaffPhoneController } from './staff-phone.controller';

@Module({
  imports: [PrismaModule, RedisModule, AuthCommonModule],
  controllers: [StaffPhoneController],
  providers: [
    RedisPhoneChangeSessionStore,
    ConsoleSmsAdapter,
    {
      provide: OtpRateLimiterService,
      useFactory: (redis: RedisService, config: AppConfigService) =>
        new OtpRateLimiterService(redis, config.otpRateLimitPerMinute),
      inject: [RedisService, AppConfigService],
    },
    PrismaStaffSessionRepository,
    PrismaUserSessionRevocationService,
    PrismaStaffRepository,
    PrismaUserRepository,
    PrismaUserCredentialRepository,
    Argon2PasswordHasher,
    RedisOtpStore,
    RedisStaffSessionRefreshBlacklistService,
    RedisTokenBlacklistService,
    RedisUserRefreshInvalidationService,
    {
      provide: InitChangePhoneUseCase,
      useFactory: (
        staff: PrismaStaffRepository,
        users: PrismaUserRepository,
        credentials: PrismaUserCredentialRepository,
        passwordHasher: Argon2PasswordHasher,
        sessionStore: RedisPhoneChangeSessionStore,
        audit: AuditService,
      ) =>
        new InitChangePhoneUseCase(
          staff,
          users,
          credentials,
          passwordHasher,
          sessionStore,
          audit,
          PHONE_CHANGE_SESSION_TTL_SECONDS,
        ),
      inject: [
        PrismaStaffRepository,
        PrismaUserRepository,
        PrismaUserCredentialRepository,
        Argon2PasswordHasher,
        RedisPhoneChangeSessionStore,
        AUDIT_SERVICE,
      ],
    },
    {
      provide: RequestCurrentPhoneOtpUseCase,
      useFactory: (
        staff: PrismaStaffRepository,
        sessionStore: RedisPhoneChangeSessionStore,
        otpStore: RedisOtpStore,
        rateLimiter: OtpRateLimiterService,
        sms: ConsoleSmsAdapter,
        config: AppConfigService,
      ) =>
        new RequestCurrentPhoneOtpUseCase(
          staff,
          sessionStore,
          otpStore,
          rateLimiter,
          sms,
          config.otpTtlSeconds,
        ),
      inject: [
        PrismaStaffRepository,
        RedisPhoneChangeSessionStore,
        RedisOtpStore,
        OtpRateLimiterService,
        ConsoleSmsAdapter,
        AppConfigService,
      ],
    },
    {
      provide: VerifyCurrentPhoneOtpUseCase,
      useFactory: (
        staff: PrismaStaffRepository,
        sessionStore: RedisPhoneChangeSessionStore,
        otpStore: RedisOtpStore,
        audit: AuditService,
      ) =>
        new VerifyCurrentPhoneOtpUseCase(
          staff,
          sessionStore,
          otpStore,
          audit,
          PHONE_CHANGE_SESSION_TTL_SECONDS,
        ),
      inject: [
        PrismaStaffRepository,
        RedisPhoneChangeSessionStore,
        RedisOtpStore,
        AUDIT_SERVICE,
      ],
    },
    {
      provide: RequestNewPhoneOtpUseCase,
      useFactory: (
        staff: PrismaStaffRepository,
        users: PrismaUserRepository,
        sessionStore: RedisPhoneChangeSessionStore,
        otpStore: RedisOtpStore,
        rateLimiter: OtpRateLimiterService,
        sms: ConsoleSmsAdapter,
        config: AppConfigService,
      ) =>
        new RequestNewPhoneOtpUseCase(
          staff,
          users,
          sessionStore,
          otpStore,
          rateLimiter,
          sms,
          config.otpTtlSeconds,
          PHONE_CHANGE_SESSION_TTL_SECONDS,
        ),
      inject: [
        PrismaStaffRepository,
        PrismaUserRepository,
        RedisPhoneChangeSessionStore,
        RedisOtpStore,
        OtpRateLimiterService,
        ConsoleSmsAdapter,
        AppConfigService,
      ],
    },
    {
      provide: ConfirmChangePhoneUseCase,
      useFactory: (
        staff: PrismaStaffRepository,
        users: PrismaUserRepository,
        sessionStore: RedisPhoneChangeSessionStore,
        otpStore: RedisOtpStore,
        sessionRevocation: PrismaUserSessionRevocationService,
        refreshInvalidation: RedisUserRefreshInvalidationService,
        tokens: JwtTokenService,
        audit: AuditService,
      ) =>
        new ConfirmChangePhoneUseCase(
          staff,
          users,
          sessionStore,
          otpStore,
          sessionRevocation,
          refreshInvalidation,
          tokens,
          audit,
        ),
      inject: [
        PrismaStaffRepository,
        PrismaUserRepository,
        RedisPhoneChangeSessionStore,
        RedisOtpStore,
        PrismaUserSessionRevocationService,
        RedisUserRefreshInvalidationService,
        JwtTokenService,
        AUDIT_SERVICE,
      ],
    },
  ],
})
export class StaffPhoneModule {}
