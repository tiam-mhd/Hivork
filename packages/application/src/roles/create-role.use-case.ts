import { randomUUID } from 'node:crypto';

import { UseCase } from '../core/use-case.js';
import { ApplicationError } from '../errors/application.error.js';
import type { AuditService } from '../ports/audit.port.js';
import type { IPermissionRegistry } from '../ports/permission.registry.port.js';
import type { IRoleRepository } from '../ports/role.repository.port.js';
import type { IStaffPermissionsRepository } from '../ports/staff-permissions.repository.port.js';
import type { IStaffRepository } from '../ports/staff.repository.port.js';
import {
  assertValidRoleCode,
  isReservedSystemRoleCode,
  normalizeRoleCode,
} from './role-code.js';
import { assertRoleMutationAllowed } from './role-mutation-auth.js';
import { resolveValidatedPermissionIds } from './role-permissions.js';

export type CreateRoleInput = {
  tenantId: string;
  actorId: string;
  code: string;
  name: string;
  permissions: string[];
  dataScope: 'all' | 'branch' | 'own';
  ip?: string;
  userAgent?: string;
};

export type CreateRoleOutput = Awaited<ReturnType<IRoleRepository['create']>>;

export class CreateRoleUseCase implements UseCase<CreateRoleInput, CreateRoleOutput> {
  constructor(
    private readonly roles: IRoleRepository,
    private readonly staff: IStaffRepository,
    private readonly staffPermissions: IStaffPermissionsRepository,
    private readonly permissionRegistry: IPermissionRegistry,
    private readonly audit: AuditService,
  ) {}

  async execute(input: CreateRoleInput): Promise<CreateRoleOutput> {
    await assertRoleMutationAllowed(
      this.staff,
      this.staffPermissions,
      input.actorId,
      input.tenantId,
      'core.role.create',
    );

    const code = normalizeRoleCode(input.code);
    try {
      assertValidRoleCode(code);
    } catch {
      throw new ApplicationError('VALIDATION_ERROR', 'Role code is invalid.', 400, { field: 'code' });
    }

    if (isReservedSystemRoleCode(code)) {
      throw new ApplicationError(
        'ROLE_CODE_DUPLICATE',
        'Role code is reserved or already exists.',
        409,
        { field: 'code' },
      );
    }

    const duplicate = await this.roles.findActiveByCode(input.tenantId, code);
    if (duplicate) {
      throw new ApplicationError(
        'ROLE_CODE_DUPLICATE',
        'Role code is reserved or already exists.',
        409,
        { field: 'code' },
      );
    }

    const permissionIds = await resolveValidatedPermissionIds(
      this.permissionRegistry,
      input.permissions,
    );

    const created = await this.roles.create({
      id: randomUUID(),
      tenantId: input.tenantId,
      code,
      name: input.name.trim(),
      dataScope: input.dataScope,
      permissionIds: [...permissionIds.values()],
      createdById: input.actorId,
    });

    await this.audit.log({
      tenantId: input.tenantId,
      actorType: 'staff',
      actorId: input.actorId,
      action: 'role.create',
      entityType: 'role',
      entityId: created.id,
      newValue: this.auditSnapshot(created),
      ip: input.ip,
      userAgent: input.userAgent,
    });

    return created;
  }

  private auditSnapshot(role: CreateRoleOutput) {
    return {
      code: role.code,
      name: role.name,
      isSystem: role.isSystem,
      dataScope: role.dataScope,
      permissions: role.permissions,
    };
  }
}
