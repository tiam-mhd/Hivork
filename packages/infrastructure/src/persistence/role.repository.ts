import {
  ApplicationError,
  type CreateRolePersistenceInput,
  type IRoleRepository,
  type RestoreCommand,
  type SoftDeleteCommand,
  type UpdateRolePersistenceInput,
} from '@hivork/application';
import { Injectable } from '@nestjs/common';

import { runWithBypassSoftDelete } from '../context/request-context.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { roleToRecord } from './mappers/role.mapper.js';

const rolePermissionsInclude = {
  rolePermissions: {
    select: {
      permission: {
        select: { code: true, deletedAt: true },
      },
    },
  },
} as const;

@Injectable()
export class PrismaRoleRepository implements IRoleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveById(id: string, tenantId: string) {
    const row = await this.prisma.role.findFirst({
      where: { id, tenantId, deletedAt: null, isTemplate: false },
      include: rolePermissionsInclude,
    });

    return row ? roleToRecord(row) : null;
  }

  async findDeletedById(id: string, tenantId: string) {
    return runWithBypassSoftDelete(async () => {
      const row = await this.prisma.role.findFirst({
        where: { id, tenantId, deletedAt: { not: null }, isTemplate: false },
        include: rolePermissionsInclude,
      });

      return row ? roleToRecord(row) : null;
    });
  }

  async findActiveByCode(tenantId: string, code: string) {
    const row = await this.prisma.role.findFirst({
      where: { tenantId, code, deletedAt: null, isTemplate: false },
      include: rolePermissionsInclude,
    });

    return row ? roleToRecord(row) : null;
  }

  async listActive(tenantId: string) {
    const rows = await this.prisma.role.findMany({
      where: { tenantId, deletedAt: null, isTemplate: false },
      include: rolePermissionsInclude,
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    });

    return rows.map(roleToRecord);
  }

  async countActiveStaffAssignments(roleId: string, tenantId: string): Promise<number> {
    return this.prisma.staffRole.count({
      where: {
        roleId,
        deletedAt: null,
        staff: { tenantId, deletedAt: null },
      },
    });
  }

  async create(input: CreateRolePersistenceInput) {
    try {
      const row = await this.prisma.role.create({
        data: {
          id: input.id,
          scope: 'tenant',
          tenantId: input.tenantId,
          code: input.code,
          name: input.name,
          isSystem: false,
          isTemplate: false,
          dataScope: input.dataScope,
          createdById: input.createdById,
          rolePermissions: {
            create: input.permissionIds.map((permissionId) => ({ permissionId })),
          },
        },
        include: rolePermissionsInclude,
      });

      return roleToRecord(row);
    } catch (error) {
      throw mapUniqueCodeError(error);
    }
  }

  async update(input: UpdateRolePersistenceInput) {
    try {
      if (input.permissionIds !== undefined) {
        await this.prisma.rolePermission.deleteMany({
          where: { roleId: input.id },
        });
      }

      const row = await this.prisma.role.update({
        where: { id: input.id, tenantId: input.tenantId, deletedAt: null, isTemplate: false },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.dataScope !== undefined ? { dataScope: input.dataScope } : {}),
          updatedById: input.updatedById,
          version: { increment: 1 },
          ...(input.permissionIds !== undefined
            ? {
                rolePermissions: {
                  create: input.permissionIds.map((permissionId) => ({ permissionId })),
                },
              }
            : {}),
        },
        include: rolePermissionsInclude,
      });

      return roleToRecord(row);
    } catch (error) {
      throw mapUniqueCodeError(error);
    }
  }

  async softDelete(command: SoftDeleteCommand) {
    const row = await this.prisma.role.update({
      where: { id: command.id, tenantId: command.tenantId, deletedAt: null, isTemplate: false },
      data: {
        deletedAt: new Date(),
        deletedById: command.deletedById,
        updatedById: command.deletedById,
        version: { increment: 1 },
      },
      include: rolePermissionsInclude,
    });

    return roleToRecord(row);
  }

  async restore(command: RestoreCommand) {
    return runWithBypassSoftDelete(async () => {
      const row = await this.prisma.role.update({
        where: { id: command.id, tenantId: command.tenantId },
        data: {
          deletedAt: null,
          deletedById: null,
          updatedById: command.restoredById,
          version: { increment: 1 },
        },
        include: rolePermissionsInclude,
      });

      return roleToRecord(row);
    });
  }

  async listDeleted(tenantId: string, limit = 50) {
    return runWithBypassSoftDelete(async () => {
      const rows = await this.prisma.role.findMany({
        where: { tenantId, deletedAt: { not: null }, isTemplate: false },
        orderBy: { deletedAt: 'desc' },
        take: limit,
        include: rolePermissionsInclude,
      });

      return rows.map(roleToRecord);
    });
  }
}

function mapUniqueCodeError(error: unknown): unknown {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'P2002'
  ) {
    return new ApplicationError(
      'ROLE_CODE_DUPLICATE',
      'Role code is reserved or already exists.',
      409,
      { field: 'code' },
    );
  }

  return error;
}
