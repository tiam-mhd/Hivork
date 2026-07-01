import {
  AUDIT_SERVICE,
  GetInstallmentSettingsUseCase,
  GetSecuritySettingsUseCase,
  GetSettingsUseCase,
  type AuditService,
  UpdateInstallmentSettingsUseCase,
  UpdateSecuritySettingsUseCase,
  UpdateSettingUseCase,
} from '@hivork/application';
import {
  PrismaModule,
  PrismaModuleEntitlement,
  PrismaTenantSettingsRepository,
  PrismaUnitOfWork,
  SettingsSchemaRegistry,
} from '@hivork/infrastructure';
import { Module } from '@nestjs/common';

import { AuthCommonModule } from '../common/auth-common.module';
import { SettingsController } from './settings.controller';
import { SecuritySettingsController } from './security-settings.controller.js';

@Module({
  imports: [PrismaModule, AuthCommonModule],
  controllers: [SettingsController, SecuritySettingsController],
  providers: [
    SettingsSchemaRegistry,
    PrismaTenantSettingsRepository,
    PrismaModuleEntitlement,
    PrismaUnitOfWork,
    {
      provide: GetSettingsUseCase,
      useFactory: (
        schemaRegistry: SettingsSchemaRegistry,
        settingsRepository: PrismaTenantSettingsRepository,
      ) => new GetSettingsUseCase(schemaRegistry, settingsRepository),
      inject: [SettingsSchemaRegistry, PrismaTenantSettingsRepository],
    },
    {
      provide: UpdateSettingUseCase,
      useFactory: (
        schemaRegistry: SettingsSchemaRegistry,
        settingsRepository: PrismaTenantSettingsRepository,
        audit: AuditService,
      ) => new UpdateSettingUseCase(schemaRegistry, settingsRepository, audit),
      inject: [SettingsSchemaRegistry, PrismaTenantSettingsRepository, AUDIT_SERVICE],
    },
    {
      provide: GetInstallmentSettingsUseCase,
      useFactory: (
        moduleEntitlement: PrismaModuleEntitlement,
        settingsRepository: PrismaTenantSettingsRepository,
      ) => new GetInstallmentSettingsUseCase(moduleEntitlement, settingsRepository),
      inject: [PrismaModuleEntitlement, PrismaTenantSettingsRepository],
    },
    {
      provide: UpdateInstallmentSettingsUseCase,
      useFactory: (
        getSettings: GetInstallmentSettingsUseCase,
        settingsRepository: PrismaTenantSettingsRepository,
        audit: AuditService,
        unitOfWork: PrismaUnitOfWork,
      ) =>
        new UpdateInstallmentSettingsUseCase(
          getSettings,
          settingsRepository,
          audit,
          unitOfWork,
        ),
      inject: [
        GetInstallmentSettingsUseCase,
        PrismaTenantSettingsRepository,
        AUDIT_SERVICE,
        PrismaUnitOfWork,
      ],
    },
    {
      provide: GetSecuritySettingsUseCase,
      useFactory: (settingsRepository: PrismaTenantSettingsRepository) =>
        new GetSecuritySettingsUseCase(settingsRepository),
      inject: [PrismaTenantSettingsRepository],
    },
    {
      provide: UpdateSecuritySettingsUseCase,
      useFactory: (
        getSettings: GetSecuritySettingsUseCase,
        settingsRepository: PrismaTenantSettingsRepository,
        audit: AuditService,
        unitOfWork: PrismaUnitOfWork,
      ) =>
        new UpdateSecuritySettingsUseCase(getSettings, settingsRepository, audit, unitOfWork),
      inject: [
        GetSecuritySettingsUseCase,
        PrismaTenantSettingsRepository,
        AUDIT_SERVICE,
        PrismaUnitOfWork,
      ],
    },
  ],
})
export class SettingsModule {}
