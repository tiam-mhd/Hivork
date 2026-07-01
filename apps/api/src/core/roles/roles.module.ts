import {
  AUDIT_SERVICE,
  CreateRoleUseCase,
  GetRoleUseCase,
  ListRolesUseCase,
  SoftDeleteRoleUseCase,
  UpdateRoleUseCase,
  type AuditService,
} from '@hivork/application';
import {
  PrismaModule,
  PrismaPermissionRegistry,
  PrismaRoleRepository,
  PrismaStaffPermissionsRepository,
  PrismaStaffRepository,
} from '@hivork/infrastructure';
import { Module } from '@nestjs/common';

import { AuthCommonModule } from '../../common/auth-common.module';
import { RolesController } from './roles.controller';

@Module({
  imports: [PrismaModule, AuthCommonModule],
  controllers: [RolesController],
  providers: [
    PrismaRoleRepository,
    PrismaPermissionRegistry,
    {
      provide: ListRolesUseCase,
      useFactory: (roles: PrismaRoleRepository) => new ListRolesUseCase(roles),
      inject: [PrismaRoleRepository],
    },
    {
      provide: GetRoleUseCase,
      useFactory: (roles: PrismaRoleRepository) => new GetRoleUseCase(roles),
      inject: [PrismaRoleRepository],
    },
    {
      provide: CreateRoleUseCase,
      useFactory: (
        roles: PrismaRoleRepository,
        staff: PrismaStaffRepository,
        staffPermissions: PrismaStaffPermissionsRepository,
        permissionRegistry: PrismaPermissionRegistry,
        audit: AuditService,
      ) =>
        new CreateRoleUseCase(roles, staff, staffPermissions, permissionRegistry, audit),
      inject: [
        PrismaRoleRepository,
        PrismaStaffRepository,
        PrismaStaffPermissionsRepository,
        PrismaPermissionRegistry,
        AUDIT_SERVICE,
      ],
    },
    {
      provide: UpdateRoleUseCase,
      useFactory: (
        roles: PrismaRoleRepository,
        staff: PrismaStaffRepository,
        staffPermissions: PrismaStaffPermissionsRepository,
        permissionRegistry: PrismaPermissionRegistry,
        audit: AuditService,
      ) =>
        new UpdateRoleUseCase(roles, staff, staffPermissions, permissionRegistry, audit),
      inject: [
        PrismaRoleRepository,
        PrismaStaffRepository,
        PrismaStaffPermissionsRepository,
        PrismaPermissionRegistry,
        AUDIT_SERVICE,
      ],
    },
    {
      provide: SoftDeleteRoleUseCase,
      useFactory: (
        roles: PrismaRoleRepository,
        staff: PrismaStaffRepository,
        staffPermissions: PrismaStaffPermissionsRepository,
        audit: AuditService,
      ) => new SoftDeleteRoleUseCase(roles, staff, staffPermissions, audit),
      inject: [
        PrismaRoleRepository,
        PrismaStaffRepository,
        PrismaStaffPermissionsRepository,
        AUDIT_SERVICE,
      ],
    },
  ],
})
export class RolesModule {}
