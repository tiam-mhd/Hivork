import { IStaffPermissionsRepository, StaffPermissionSources } from '@hivork/application';
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class PrismaStaffPermissionsRepository implements IStaffPermissionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findPermissionSourcesByStaffId(staffId: string): Promise<StaffPermissionSources> {
    const now = new Date();

    const staffRoles = await this.prisma.staffRole.findMany({
      where: {
        staffId,
        deletedAt: null,
        role: { deletedAt: null },
      },
      select: {
        role: {
          select: {
            rolePermissions: {
              select: {
                permission: {
                  select: { code: true, deletedAt: true },
                },
              },
            },
          },
        },
      },
    });

    const rolePermissions = new Set<string>();
    for (const staffRole of staffRoles) {
      for (const rolePermission of staffRole.role.rolePermissions) {
        if (!rolePermission.permission.deletedAt) {
          rolePermissions.add(rolePermission.permission.code);
        }
      }
    }

    const overrides = await this.prisma.userPermissionOverride.findMany({
      where: {
        staffId,
        deletedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        permission: { deletedAt: null },
      },
      select: {
        effect: true,
        permission: { select: { code: true } },
      },
    });

    const grants: string[] = [];
    const denies: string[] = [];
    for (const override of overrides) {
      if (override.effect === 'grant') {
        grants.push(override.permission.code);
      } else {
        denies.push(override.permission.code);
      }
    }

    return {
      rolePermissions: [...rolePermissions],
      grants,
      denies,
    };
  }
}
