import {
  AUDIT_SERVICE,
  AssignRoleToStaffUseCase,
  CreatePermissionOverrideUseCase,
  CreateStaffUseCase,
  DeletePermissionOverrideUseCase,
  GetCurrentStaffMeUseCase,
  GetStaffPermissionsUseCase,
  GetStaffUseCase,
  ListPermissionOverridesUseCase,
  ListRolesUseCase,
  ListStaffUseCase,
  RemoveRoleFromStaffUseCase,
  SetActiveBranchUseCase,
  SoftDeleteStaffUseCase,
  UpdateStaffUseCase,
  type AuditService,
} from '@hivork/application';
import {
  PrismaBranchReader,
  PrismaModule,
  PrismaPermissionOverrideRepository,
  PrismaPermissionRegistry,
  PrismaRoleRepository,
  PrismaStaffPermissionsRepository,
  PrismaStaffRepository,
  PrismaStaffRoleRepository,
  PrismaTenantPlanReader,
  PrismaUserRepository,
  RedisModule,
  RedisStaffActiveBranchStore,
} from '@hivork/infrastructure';
import { Module } from '@nestjs/common';

import { AuthCommonModule } from '../../common/auth-common.module';
import { AppConfigService } from '../../config/app-config.service';
import { StaffMfaModule } from './staff-mfa.module';
import { StaffPasswordModule } from './staff-password.module';
import { StaffPhoneModule } from './staff-phone.module';
import { StaffSessionsModule } from './staff-sessions.module';
import { StaffSecurityModule } from './staff-security.module';
import { StaffController } from './staff.controller';

@Module({
  imports: [PrismaModule, AuthCommonModule, RedisModule, StaffMfaModule, StaffPasswordModule, StaffPhoneModule, StaffSessionsModule, StaffSecurityModule],
  controllers: [StaffController],
  providers: [
    PrismaBranchReader,
    PrismaTenantPlanReader,
    PrismaUserRepository,
    PrismaStaffRoleRepository,
    PrismaRoleRepository,
    PrismaPermissionOverrideRepository,
    PrismaPermissionRegistry,
    {
      provide: CreateStaffUseCase,
      useFactory: (
        staff: PrismaStaffRepository,
        users: PrismaUserRepository,
        branches: PrismaBranchReader,
        tenantPlans: PrismaTenantPlanReader,
        audit: AuditService,
      ) => new CreateStaffUseCase(staff, users, branches, tenantPlans, audit),
      inject: [
        PrismaStaffRepository,
        PrismaUserRepository,
        PrismaBranchReader,
        PrismaTenantPlanReader,
        AUDIT_SERVICE,
      ],
    },
    {
      provide: ListStaffUseCase,
      useFactory: (staff: PrismaStaffRepository) => new ListStaffUseCase(staff),
      inject: [PrismaStaffRepository],
    },
    {
      provide: GetStaffUseCase,
      useFactory: (staff: PrismaStaffRepository) => new GetStaffUseCase(staff),
      inject: [PrismaStaffRepository],
    },
    {
      provide: GetCurrentStaffMeUseCase,
      useFactory: (
        staff: PrismaStaffRepository,
        getStaffPermissions: GetStaffPermissionsUseCase,
      ) => new GetCurrentStaffMeUseCase(staff, getStaffPermissions),
      inject: [PrismaStaffRepository, GetStaffPermissionsUseCase],
    },
    {
      provide: UpdateStaffUseCase,
      useFactory: (staff: PrismaStaffRepository, branches: PrismaBranchReader, audit: AuditService) =>
        new UpdateStaffUseCase(staff, branches, audit),
      inject: [PrismaStaffRepository, PrismaBranchReader, AUDIT_SERVICE],
    },
    {
      provide: SoftDeleteStaffUseCase,
      useFactory: (staff: PrismaStaffRepository, audit: AuditService) =>
        new SoftDeleteStaffUseCase(staff, audit),
      inject: [PrismaStaffRepository, AUDIT_SERVICE],
    },
    {
      provide: ListRolesUseCase,
      useFactory: (roles: PrismaRoleRepository) => new ListRolesUseCase(roles),
      inject: [PrismaRoleRepository],
    },
    {
      provide: AssignRoleToStaffUseCase,
      useFactory: (
        staff: PrismaStaffRepository,
        roles: PrismaRoleRepository,
        staffRoles: PrismaStaffRoleRepository,
        staffPermissions: PrismaStaffPermissionsRepository,
        audit: AuditService,
      ) =>
        new AssignRoleToStaffUseCase(staff, roles, staffRoles, staffPermissions, audit),
      inject: [
        PrismaStaffRepository,
        PrismaRoleRepository,
        PrismaStaffRoleRepository,
        PrismaStaffPermissionsRepository,
        AUDIT_SERVICE,
      ],
    },
    {
      provide: RemoveRoleFromStaffUseCase,
      useFactory: (
        staff: PrismaStaffRepository,
        roles: PrismaRoleRepository,
        staffRoles: PrismaStaffRoleRepository,
        staffPermissions: PrismaStaffPermissionsRepository,
        audit: AuditService,
      ) =>
        new RemoveRoleFromStaffUseCase(staff, roles, staffRoles, staffPermissions, audit),
      inject: [
        PrismaStaffRepository,
        PrismaRoleRepository,
        PrismaStaffRoleRepository,
        PrismaStaffPermissionsRepository,
        AUDIT_SERVICE,
      ],
    },
    {
      provide: ListPermissionOverridesUseCase,
      useFactory: (
        staff: PrismaStaffRepository,
        overrides: PrismaPermissionOverrideRepository,
      ) => new ListPermissionOverridesUseCase(staff, overrides),
      inject: [PrismaStaffRepository, PrismaPermissionOverrideRepository],
    },
    {
      provide: CreatePermissionOverrideUseCase,
      useFactory: (
        staff: PrismaStaffRepository,
        overrides: PrismaPermissionOverrideRepository,
        staffPermissions: PrismaStaffPermissionsRepository,
        permissionRegistry: PrismaPermissionRegistry,
        audit: AuditService,
      ) =>
        new CreatePermissionOverrideUseCase(
          staff,
          overrides,
          staffPermissions,
          permissionRegistry,
          audit,
        ),
      inject: [
        PrismaStaffRepository,
        PrismaPermissionOverrideRepository,
        PrismaStaffPermissionsRepository,
        PrismaPermissionRegistry,
        AUDIT_SERVICE,
      ],
    },
    {
      provide: DeletePermissionOverrideUseCase,
      useFactory: (
        staff: PrismaStaffRepository,
        overrides: PrismaPermissionOverrideRepository,
        staffPermissions: PrismaStaffPermissionsRepository,
        audit: AuditService,
      ) =>
        new DeletePermissionOverrideUseCase(staff, overrides, staffPermissions, audit),
      inject: [
        PrismaStaffRepository,
        PrismaPermissionOverrideRepository,
        PrismaStaffPermissionsRepository,
        AUDIT_SERVICE,
      ],
    },
    {
      provide: SetActiveBranchUseCase,
      useFactory: (
        staffRepository: PrismaStaffRepository,
        activeBranchStore: RedisStaffActiveBranchStore,
        config: AppConfigService,
      ) =>
        new SetActiveBranchUseCase(
          staffRepository,
          activeBranchStore,
          config.jwtRefreshTtlSeconds,
        ),
      inject: [PrismaStaffRepository, RedisStaffActiveBranchStore, AppConfigService],
    },
  ],
})
export class StaffModule {}
