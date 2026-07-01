import {
  GetCurrentTenantUseCase,
  RegisterTenantUseCase,
  ValidateVerifiedRegisterTokenUseCase,
} from '@hivork/application';
import {
  JwtTokenService,
  PrismaAuditService,
  PrismaModule,
  PrismaStaffRepository,
  PrismaTenantRegistrationRepository,
  PrismaTenantRepository,
  PrismaUserRepository,
  RedisModule,
  RedisService,
  RedisTokenBlacklistService,
  RegisterRateLimiterService,
} from '@hivork/infrastructure';
import { Module } from '@nestjs/common';

import { AuthCommonModule } from '../common/auth-common.module';
import { AppConfigModule } from '../config/app-config.module';
import { TenantsController } from './tenants.controller';

const REGISTER_RATE_LIMIT_PER_HOUR = 3;

@Module({
  imports: [PrismaModule, RedisModule, AppConfigModule, AuthCommonModule],
  controllers: [TenantsController],
  providers: [
    PrismaTenantRegistrationRepository,
    PrismaStaffRepository,
    PrismaUserRepository,
    PrismaTenantRepository,
    RedisTokenBlacklistService,
    {
      provide: RegisterRateLimiterService,
      useFactory: (redis: RedisService) =>
        new RegisterRateLimiterService(redis, REGISTER_RATE_LIMIT_PER_HOUR),
      inject: [RedisService],
    },
    {
      provide: ValidateVerifiedRegisterTokenUseCase,
      useFactory: (tokens: JwtTokenService, blacklist: RedisTokenBlacklistService) =>
        new ValidateVerifiedRegisterTokenUseCase(tokens, blacklist),
      inject: [JwtTokenService, RedisTokenBlacklistService],
    },
    {
      provide: GetCurrentTenantUseCase,
      useFactory: (tenants: PrismaTenantRepository) => new GetCurrentTenantUseCase(tenants),
      inject: [PrismaTenantRepository],
    },
    {
      provide: RegisterTenantUseCase,
      useFactory: (
        validateVerifiedToken: ValidateVerifiedRegisterTokenUseCase,
        registrationRepository: PrismaTenantRegistrationRepository,
        userRepository: PrismaUserRepository,
        staffRepository: PrismaStaffRepository,
        registerRateLimiter: RegisterRateLimiterService,
        tokens: JwtTokenService,
        blacklist: RedisTokenBlacklistService,
        audit: PrismaAuditService,
      ) =>
        new RegisterTenantUseCase(
          validateVerifiedToken,
          registrationRepository,
          userRepository,
          staffRepository,
          registerRateLimiter,
          tokens,
          blacklist,
          audit,
        ),
      inject: [
        ValidateVerifiedRegisterTokenUseCase,
        PrismaTenantRegistrationRepository,
        PrismaUserRepository,
        PrismaStaffRepository,
        RegisterRateLimiterService,
        JwtTokenService,
        RedisTokenBlacklistService,
        PrismaAuditService,
      ],
    },
  ],
})
export class TenantsModule {}
