import { AUDIT_SERVICE, GetStaffPermissionsUseCase } from '@hivork/application';
import {
  JwtTokenService,
  PrismaAuditService,
  PrismaStaffPermissionsRepository,
  PrismaStaffRepository,
  PrismaUserCredentialRepository,
  PrismaUserRepository,
  PrismaTenantModulesReader,
  RedisStaffActiveBranchStore,
  RedisStaffPermissionsCache,
  RedisTenantModulesCache,
} from '@hivork/infrastructure';
import {
  CoreModule,
  ModuleEntitlementService,
  ModuleGuard,
  TENANT_ID_RESOLVER,
  TENANT_MODULES_CACHE,
  TENANT_MODULES_READER,
} from '@hivork/module-core';
import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { AppConfigModule } from '../config/app-config.module';
import { AppConfigService } from '../config/app-config.service';
import { AuthGuard } from './guards/auth.guard.js';
import { CustomerAuthGuard } from './guards/customer-auth.guard.js';
import { PermissionGuard } from './guards/permission.guard.js';
import { StaffAuthGuard } from './guards/staff-auth.guard.js';
import { AuditInterceptor } from './interceptors/audit.interceptor.js';
import { DataScopeInterceptor } from './interceptors/data-scope.interceptor.js';
import { TenantContextInterceptor } from './interceptors/tenant-context.interceptor.js';
import { StaffTenantIdResolver } from './resolvers/staff-tenant-id.resolver.js';

const STAFF_PERMISSIONS_CACHE_TTL_SECONDS = 300;

@Global()
@Module({
  imports: [AppConfigModule, CoreModule],
  providers: [
    {
      provide: JwtTokenService,
      useFactory: (config: AppConfigService) =>
        new JwtTokenService({
          accessSecret: config.jwtAccessSecret,
          refreshSecret: config.jwtRefreshSecret,
          accessTtlSeconds: config.jwtAccessTtlSeconds,
          refreshTtlSeconds: config.jwtRefreshTtlSeconds,
          refreshSessionTtlSeconds: config.jwtRefreshSessionTtlSeconds,
          verifiedTtlSeconds: 300,
        }),
      inject: [AppConfigService],
    },
    PrismaStaffRepository,
    PrismaUserRepository,
    PrismaUserCredentialRepository,
    PrismaStaffPermissionsRepository,
    PrismaTenantModulesReader,
    PrismaAuditService,
    {
      provide: AUDIT_SERVICE,
      useExisting: PrismaAuditService,
    },
    RedisStaffActiveBranchStore,
    RedisStaffPermissionsCache,
    RedisTenantModulesCache,
    StaffTenantIdResolver,
    {
      provide: TENANT_MODULES_READER,
      useExisting: PrismaTenantModulesReader,
    },
    {
      provide: TENANT_MODULES_CACHE,
      useExisting: RedisTenantModulesCache,
    },
    {
      provide: TENANT_ID_RESOLVER,
      useExisting: StaffTenantIdResolver,
    },
    ModuleEntitlementService,
    {
      provide: GetStaffPermissionsUseCase,
      useFactory: (
        repository: PrismaStaffPermissionsRepository,
        cache: RedisStaffPermissionsCache,
      ) => new GetStaffPermissionsUseCase(repository, cache, STAFF_PERMISSIONS_CACHE_TTL_SECONDS),
      inject: [PrismaStaffPermissionsRepository, RedisStaffPermissionsCache],
    },
    StaffAuthGuard,
    CustomerAuthGuard,
    AuthGuard,
    PermissionGuard,
    ModuleGuard,
    TenantContextInterceptor,
    DataScopeInterceptor,
    AuditInterceptor,
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantContextInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: DataScopeInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
  exports: [
    JwtTokenService,
    PrismaStaffRepository,
    PrismaUserRepository,
    PrismaUserCredentialRepository,
    PrismaStaffPermissionsRepository,
    PrismaTenantModulesReader,
    PrismaAuditService,
    AUDIT_SERVICE,
    RedisStaffActiveBranchStore,
    RedisStaffPermissionsCache,
    RedisTenantModulesCache,
    GetStaffPermissionsUseCase,
    ModuleEntitlementService,
    StaffAuthGuard,
    CustomerAuthGuard,
    AuthGuard,
    PermissionGuard,
    ModuleGuard,
    TenantContextInterceptor,
    DataScopeInterceptor,
    AuditInterceptor,
    TENANT_ID_RESOLVER,
    CoreModule,
  ],
})
export class AuthCommonModule {}
