import { join } from 'node:path';

import { CoreModule } from '@hivork/module-core';
import { InstallmentsModule } from '@hivork/module-installments';
import { RedisModule } from '@hivork/infrastructure';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';

import { AuthModule } from './auth/auth.module';
import { AuthCommonModule } from './common/auth-common.module';
import { AppConfigModule } from './config/app-config.module';
import { AppConfigService } from './config/app-config.service';
import { EnvConfig, validateEnv } from './config/env.schema';
import { HealthModule } from './health/health.module';
import { MyModule } from './my/my.module';
import { CustomersModule } from './customers/customers.module';
import { BranchesModule } from './core/branches/branches.module';
import { SavedFiltersModule } from './core/saved-filters/saved-filters.module';
import { SavedViewsModule } from './core/saved-views/saved-views.module';
import { PrintSnapshotsModule } from './core/print/print-snapshots.module';
import { RolesModule } from './core/roles/roles.module';
import { InstallmentsModule as InstallmentsApiModule } from './installments/installments/installments.module';
import { SalesModule } from './installments/sales/sales.module';
import { ReportsModule } from './installments/reports/reports.module';
import { WebhooksModule } from './webhooks/webhooks.module.js';
import { StaffModule } from './core/staff/staff.module';
import { SettingsModule } from './settings/settings.module';
import { ApiKeysModule } from './settings/api-keys.module.js';
import { RealtimeModule } from './core/realtime/realtime.module';
import { TenantsModule } from './tenants/tenants.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        join(process.cwd(), '.env.local'),
        join(process.cwd(), '.env'),
        join(process.cwd(), 'apps/api/.env.local'),
        join(process.cwd(), 'apps/api/.env'),
        join(process.cwd(), '../../.env.local'),
        join(process.cwd(), '../../.env'),
      ],
      validate: validateEnv,
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvConfig, true>) => ({
        pinoHttp: {
          level: config.get('LOG_LEVEL', { infer: true }),
          autoLogging: true,
        },
      }),
    }),
    AppConfigModule,
    RedisModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({ url: config.redisUrl }),
    }),
    AuthCommonModule,
    HealthModule,
    AuthModule,
    StaffModule,
    CustomersModule,
    BranchesModule,
    SavedFiltersModule,
    SavedViewsModule,
    PrintSnapshotsModule,
    RolesModule,
    SalesModule,
    InstallmentsApiModule,
    ReportsModule,
    WebhooksModule,
    SettingsModule,
    ApiKeysModule,
    TenantsModule,
    RealtimeModule,
    MyModule,
    CoreModule,
    InstallmentsModule,
  ],
})
export class AppModule {}
