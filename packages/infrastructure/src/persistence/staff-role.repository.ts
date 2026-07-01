import { Injectable } from '@nestjs/common';
import {
  type AssignStaffRoleInput,
  type AssignStaffRoleResult,
  type IStaffRoleRepository,
  type StaffRoleAssignment,
} from '@hivork/application';

import { runWithBypassSoftDelete } from '../context/request-context.js';
import { PrismaService } from '../prisma/prisma.service.js';

function toAssignment(row: {
  staffId: string;
  roleId: string;
  createdAt: Date;
  role: { code: string; name: string };
}): StaffRoleAssignment {
  return {
    staffId: row.staffId,
    roleId: row.roleId,
    role: {
      code: row.role.code,
      name: row.role.name,
    },
    assignedAt: row.createdAt,
  };
}

const roleSelect = {
  select: { code: true, name: true, tenantId: true, deletedAt: true },
} as const;

@Injectable()
export class PrismaStaffRoleRepository implements IStaffRoleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveAssignment(
    tenantId: string,
    staffId: string,
    roleId: string,
  ): Promise<StaffRoleAssignment | null> {
    const row = await this.prisma.staffRole.findFirst({
      where: {
        staffId,
        roleId,
        deletedAt: null,
        staff: { tenantId, deletedAt: null },
        role: { tenantId, deletedAt: null },
      },
      include: { role: roleSelect },
    });

    return row ? toAssignment(row) : null;
  }

  async assign(input: AssignStaffRoleInput): Promise<AssignStaffRoleResult> {
    const existing = await runWithBypassSoftDelete(async () =>
      this.prisma.staffRole.findUnique({
        where: {
          staffId_roleId: { staffId: input.staffId, roleId: input.roleId },
        },
        include: { role: roleSelect },
      }),
    );

    if (existing?.deletedAt === null) {
      return { ...toAssignment(existing), created: false };
    }

    if (existing) {
      const restored = await runWithBypassSoftDelete(async () =>
        this.prisma.staffRole.update({
          where: {
            staffId_roleId: { staffId: input.staffId, roleId: input.roleId },
          },
          data: { deletedAt: null },
          include: { role: roleSelect },
        }),
      );

      return { ...toAssignment(restored), created: true };
    }

    const created = await this.prisma.staffRole.create({
      data: {
        staffId: input.staffId,
        roleId: input.roleId,
      },
      include: { role: roleSelect },
    });

    return { ...toAssignment(created), created: true };
  }

  async remove(tenantId: string, staffId: string, roleId: string): Promise<void> {
    const assignment = await this.prisma.staffRole.findFirst({
      where: {
        staffId,
        roleId,
        deletedAt: null,
        staff: { tenantId, deletedAt: null },
        role: { tenantId, deletedAt: null },
      },
      select: { staffId: true, roleId: true },
    });

    if (!assignment) {
      return;
    }

    await this.prisma.staffRole.update({
      where: {
        staffId_roleId: { staffId, roleId },
      },
      data: { deletedAt: new Date() },
    });
  }

  async countStaffWithOwnerRole(tenantId: string): Promise<number> {
    return this.prisma.staffRole.count({
      where: {
        deletedAt: null,
        role: { tenantId, code: 'owner', deletedAt: null },
        staff: { tenantId, deletedAt: null },
      },
    });
  }
}
