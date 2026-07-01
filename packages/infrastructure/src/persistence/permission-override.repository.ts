import {
  ApplicationError,
  type CreatePermissionOverridePersistenceInput,
  type IPermissionOverrideRepository,
} from '@hivork/application';
import { Injectable } from '@nestjs/common';

import { runWithBypassSoftDelete } from '../context/request-context.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { overrideToRecord } from './mappers/permission-override.mapper.js';

const permissionSelect = {
  select: { code: true, deletedAt: true },
} as const;

const staffTenantWhere = (tenantId: string) => ({
  staff: { tenantId, deletedAt: null },
});

@Injectable()
export class PrismaPermissionOverrideRepository implements IPermissionOverrideRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveByIdForStaff(id: string, staffId: string, tenantId: string) {
    const row = await this.prisma.userPermissionOverride.findFirst({
      where: {
        id,
        staffId,
        deletedAt: null,
        ...staffTenantWhere(tenantId),
        permission: { deletedAt: null },
      },
      include: { permission: permissionSelect },
    });

    return row ? overrideToRecord(row) : null;
  }

  async findActiveByStaffAndPermission(staffId: string, permissionId: string, tenantId: string) {
    const row = await this.prisma.userPermissionOverride.findFirst({
      where: {
        staffId,
        permissionId,
        deletedAt: null,
        ...staffTenantWhere(tenantId),
        permission: { deletedAt: null },
      },
      include: { permission: permissionSelect },
    });

    return row ? overrideToRecord(row) : null;
  }

  async listActiveByStaff(staffId: string, tenantId: string) {
    const now = new Date();
    const rows = await this.prisma.userPermissionOverride.findMany({
      where: {
        staffId,
        deletedAt: null,
        ...staffTenantWhere(tenantId),
        permission: { deletedAt: null },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      include: { permission: permissionSelect },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map(overrideToRecord);
  }

  async create(input: CreatePermissionOverridePersistenceInput) {
    try {
      const existing = await runWithBypassSoftDelete(async () =>
        this.prisma.userPermissionOverride.findUnique({
          where: {
            staffId_permissionId: {
              staffId: input.staffId,
              permissionId: input.permissionId,
            },
          },
        }),
      );

      if (existing?.deletedAt === null) {
        throw new ApplicationError(
          'OVERRIDE_ALREADY_EXISTS',
          'An active override already exists for this permission.',
          409,
        );
      }

      if (existing) {
        const restored = await runWithBypassSoftDelete(async () =>
          this.prisma.userPermissionOverride.update({
            where: {
              staffId_permissionId: {
                staffId: input.staffId,
                permissionId: input.permissionId,
              },
            },
            data: {
              deletedAt: null,
              effect: input.effect,
              reason: input.reason,
              expiresAt: input.expiresAt ?? null,
              createdById: input.createdById,
              updatedById: input.createdById,
            },
            include: { permission: permissionSelect },
          }),
        );

        return overrideToRecord(restored);
      }

      const created = await this.prisma.userPermissionOverride.create({
        data: {
          id: input.id,
          staffId: input.staffId,
          permissionId: input.permissionId,
          effect: input.effect,
          reason: input.reason,
          expiresAt: input.expiresAt ?? null,
          createdById: input.createdById,
        },
        include: { permission: permissionSelect },
      });

      return overrideToRecord(created);
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }

      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code?: string }).code === 'P2002'
      ) {
        throw new ApplicationError(
          'OVERRIDE_ALREADY_EXISTS',
          'An active override already exists for this permission.',
          409,
        );
      }

      throw error;
    }
  }

  async softDelete(id: string, staffId: string, tenantId: string, deletedById: string) {
    const existing = await this.prisma.userPermissionOverride.findFirst({
      where: {
        id,
        staffId,
        deletedAt: null,
        ...staffTenantWhere(tenantId),
      },
      select: { id: true },
    });

    if (!existing) {
      throw new ApplicationError(
        'OVERRIDE_NOT_FOUND',
        'Permission override was not found.',
        404,
      );
    }

    const row = await this.prisma.userPermissionOverride.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedById: deletedById,
      },
      include: { permission: permissionSelect },
    });

    return overrideToRecord(row);
  }
}
