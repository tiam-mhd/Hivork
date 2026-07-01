import {
  AUDIT_SERVICE,
  AuthenticateApiKeyUseCase,
  CreateTenantApiKeyUseCase,
  ListTenantApiKeysUseCase,
  RevokeTenantApiKeyUseCase,
  type AuditService,
} from '@hivork/application';
import {
  ApiKeyRateLimiterService,
  PrismaModule,
  PrismaTenantApiKeyRepository,
} from '@hivork/infrastructure';
import { Module } from '@nestjs/common';

import { AuthCommonModule } from '../common/auth-common.module.js';
import { ApiKeyGuard } from '../common/guards/api-key.guard.js';
import { IntegrationController } from '../integration/integration.controller.js';
import { ApiKeysController } from './api-keys.controller.js';

@Module({
  imports: [PrismaModule, AuthCommonModule],
  controllers: [ApiKeysController, IntegrationController],
  providers: [
    PrismaTenantApiKeyRepository,
    ApiKeyRateLimiterService,
    ApiKeyGuard,
    {
      provide: ListTenantApiKeysUseCase,
      useFactory: (apiKeys: PrismaTenantApiKeyRepository) =>
        new ListTenantApiKeysUseCase(apiKeys),
      inject: [PrismaTenantApiKeyRepository],
    },
    {
      provide: CreateTenantApiKeyUseCase,
      useFactory: (apiKeys: PrismaTenantApiKeyRepository, audit: AuditService) =>
        new CreateTenantApiKeyUseCase(apiKeys, audit),
      inject: [PrismaTenantApiKeyRepository, AUDIT_SERVICE],
    },
    {
      provide: RevokeTenantApiKeyUseCase,
      useFactory: (apiKeys: PrismaTenantApiKeyRepository, audit: AuditService) =>
        new RevokeTenantApiKeyUseCase(apiKeys, audit),
      inject: [PrismaTenantApiKeyRepository, AUDIT_SERVICE],
    },
    {
      provide: AuthenticateApiKeyUseCase,
      useFactory: (
        apiKeys: PrismaTenantApiKeyRepository,
        rateLimiter: ApiKeyRateLimiterService,
        audit: AuditService,
      ) => new AuthenticateApiKeyUseCase(apiKeys, rateLimiter, audit),
      inject: [PrismaTenantApiKeyRepository, ApiKeyRateLimiterService, AUDIT_SERVICE],
    },
  ],
  exports: [AuthenticateApiKeyUseCase, ApiKeyGuard],
})
export class ApiKeysModule {}
