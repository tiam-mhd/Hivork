import {
  ApplicationError,
  type CreateStaffPersistenceInput,
  type IStaffRepository,
  type ListStaffOptions,
  type ListStaffResult,
  type PreviousStaffLoginSnapshot,
  type RecordStaffLoginInput,
  type RestoreCommand,
  type SoftDeleteCommand,
  type StaffContextRecord,
  type StaffLoginDisplayFields,
  type StaffWithTenantRecord,
  type UpdateStaffPersistenceInput,
} from '@hivork/application';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { runWithBypassSoftDelete } from '../context/request-context.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { staffToListItem, staffToRecord } from './mappers/staff.mapper.js';

const staffUserSelect = { phone: true } as const;

const staffRolesInclude = {
  user: { select: staffUserSelect },
  staffRoles: {
    where: { deletedAt: null },
    select: { roleId: true, deletedAt: true },
  },
} as const;

function buildScopeWhere(scope: ListStaffOptions['scope']): Prisma.StaffWhereInput | undefined {
  switch (scope.dataScope) {
    case 'all':
      return undefined;
    case 'own':
      return { id: scope.staffId };
    case 'branch':
      if (!scope.branchIds.length) {
        return { id: { in: [] } };
      }
      return {
        OR: [
          { assignedBranchIds: { hasSome: scope.branchIds } },
          { primaryBranchId: { in: scope.branchIds } },
        ],
      };
    default: {
      const _exhaustive: never = scope;
      return _exhaustive;
    }
  }
}

function buildBranchFilter(branchId: string): Prisma.StaffWhereInput {
  return {
    OR: [{ assignedBranchIds: { has: branchId } }, { primaryBranchId: branchId }],
  };
}

function buildCursorWhere(options: ListStaffOptions): Prisma.StaffWhereInput | undefined {
  if (!options.cursor) {
    return undefined;
  }

  const { id, createdAt, name } = options.cursor;

  switch (options.sort) {
    case 'createdAt:desc':
      return {
        OR: [{ createdAt: { lt: createdAt } }, { createdAt, id: { lt: id } }],
      };
    case 'createdAt:asc':
      return {
        OR: [{ createdAt: { gt: createdAt } }, { createdAt, id: { gt: id } }],
      };
    case 'name:desc':
      return {
        OR: [{ name: { lt: name ?? '' } }, { name: name ?? '', id: { lt: id } }],
      };
    case 'name:asc':
      return {
        OR: [{ name: { gt: name ?? '' } }, { name: name ?? '', id: { gt: id } }],
      };
    default: {
      const _exhaustive: never = options.sort;
      return _exhaustive;
    }
  }
}

function buildOrderBy(sort: ListStaffOptions['sort']): Prisma.StaffOrderByWithRelationInput[] {
  switch (sort) {
    case 'createdAt:desc':
      return [{ createdAt: 'desc' }, { id: 'desc' }];
    case 'createdAt:asc':
      return [{ createdAt: 'asc' }, { id: 'asc' }];
    case 'name:desc':
      return [{ name: 'desc' }, { id: 'desc' }];
    case 'name:asc':
      return [{ name: 'asc' }, { id: 'asc' }];
    default: {
      const _exhaustive: never = sort;
      return _exhaustive;
    }
  }
}

@Injectable()
export class PrismaStaffRepository implements IStaffRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByTenantSlugAndUserId(
    tenantSlug: string,
    userId: string,
  ): Promise<StaffWithTenantRecord | null> {
    const row = await this.prisma.staff.findFirst({
      where: {
        userId,
        deletedAt: null,
        tenant: { slug: tenantSlug, deletedAt: null },
      },
      include: {
        user: { select: staffUserSelect },
        tenant: { select: { slug: true, name: true, status: true } },
      },
    });

    return row ? this.toAuthWithTenantRecord(row) : null;
  }

  async findAllByUserId(userId: string): Promise<StaffWithTenantRecord[]> {
    const rows = await this.prisma.staff.findMany({
      where: {
        userId,
        deletedAt: null,
        tenant: { deletedAt: null },
      },
      include: {
        user: { select: staffUserSelect },
        tenant: { select: { slug: true, name: true, status: true } },
      },
    });

    return rows.map((row) => this.toAuthWithTenantRecord(row));
  }

  async findById(id: string): Promise<StaffWithTenantRecord | null> {
    const row = await this.prisma.staff.findFirst({
      where: { id, deletedAt: null, tenant: { deletedAt: null } },
      include: {
        user: { select: staffUserSelect },
        tenant: { select: { slug: true, name: true, status: true } },
      },
    });

    return row ? this.toAuthWithTenantRecord(row) : null;
  }

  async findContextById(id: string): Promise<StaffContextRecord | null> {
    const row = await this.prisma.staff.findFirst({
      where: { id, deletedAt: null, tenant: { deletedAt: null } },
      include: { user: { select: staffUserSelect } },
    });
    if (!row) return null;

    return {
      id: row.id,
      tenantId: row.tenantId,
      userId: row.userId,
      phone: row.user.phone,
      name: row.name,
      status: row.status,
      dataScope: row.dataScope,
      assignedBranchIds: row.assignedBranchIds,
      primaryBranchId: row.primaryBranchId,
    };
  }

  async updateLastLoginAt(staffId: string): Promise<void> {
    await this.prisma.staff.update({
      where: { id: staffId },
      data: { lastLoginAt: new Date() },
    });
  }

  async recordStaffLogin(
    staffId: string,
    tenantId: string,
    input: RecordStaffLoginInput,
  ): Promise<PreviousStaffLoginSnapshot> {
    const row = await this.prisma.staff.findFirst({
      where: { id: staffId, tenantId, deletedAt: null },
      select: {
        lastLoginAt: true,
        lastLoginIp: true,
        lastLoginDeviceLabel: true,
      },
    });

    if (!row) {
      return {
        previousAt: null,
        previousIp: null,
        previousDeviceLabel: null,
      };
    }

    const previous = {
      previousAt: row.lastLoginAt,
      previousIp: row.lastLoginIp,
      previousDeviceLabel: row.lastLoginDeviceLabel,
    };

    await this.prisma.staff.update({
      where: { id: staffId },
      data: {
        previousLoginAt: row.lastLoginAt,
        previousLoginIp: row.lastLoginIp,
        previousLoginDeviceLabel: row.lastLoginDeviceLabel,
        lastLoginAt: input.at,
        lastLoginIp: input.ipAddress ?? null,
        lastLoginDeviceLabel: input.deviceLabel ?? null,
      },
    });

    return previous;
  }

  async getStaffLoginDisplay(
    staffId: string,
    tenantId: string,
  ): Promise<StaffLoginDisplayFields | null> {
    const row = await this.prisma.staff.findFirst({
      where: { id: staffId, tenantId, deletedAt: null },
      select: {
        lastLoginAt: true,
        lastLoginIp: true,
        lastLoginDeviceLabel: true,
        previousLoginAt: true,
        previousLoginIp: true,
        previousLoginDeviceLabel: true,
      },
    });

    return row;
  }

  async findActiveByIdForTenant(id: string, tenantId: string) {
    const row = await this.prisma.staff.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: staffRolesInclude,
    });

    return row ? staffToRecord(row) : null;
  }

  async findDeletedByIdForTenant(id: string, tenantId: string) {
    return runWithBypassSoftDelete(async () => {
      const row = await this.prisma.staff.findFirst({
        where: { id, tenantId, deletedAt: { not: null } },
        include: staffRolesInclude,
      });

      return row ? staffToRecord(row) : null;
    });
  }

  async findActiveByUserInTenant(tenantId: string, userId: string) {
    const row = await this.prisma.staff.findFirst({
      where: { tenantId, userId, deletedAt: null },
      include: staffRolesInclude,
    });

    return row ? staffToRecord(row) : null;
  }

  async countActive(tenantId: string): Promise<number> {
    return this.prisma.staff.count({
      where: { tenantId, deletedAt: null },
    });
  }

  async isOwner(staffId: string, tenantId: string): Promise<boolean> {
    const row = await this.prisma.staffRole.findFirst({
      where: {
        staffId,
        deletedAt: null,
        staff: { tenantId, deletedAt: null },
        role: { code: 'owner', tenantId, deletedAt: null },
      },
      select: { staffId: true },
    });

    return row !== null;
  }

  async create(input: CreateStaffPersistenceInput) {
    try {
      if (input.roleIds?.length) {
        await this.assertRolesInTenant(this.prisma, input.tenantId, input.roleIds);
      }

      const created = await this.prisma.staff.create({
        data: {
          id: input.id,
          tenantId: input.tenantId,
          userId: input.userId,
          name: input.name,
          email: input.email ?? null,
          jobTitle: input.jobTitle ?? null,
          dataScope: input.dataScope,
          assignedBranchIds: input.assignedBranchIds,
          primaryBranchId: input.primaryBranchId ?? null,
          invitedAt: new Date(),
          invitedById: input.invitedById,
          createdById: input.createdById,
        },
        include: staffRolesInclude,
      });

      if (input.roleIds?.length) {
        await this.prisma.staffRole.createMany({
          data: input.roleIds.map((roleId: string) => ({
            staffId: created.id,
            roleId,
          })),
          skipDuplicates: true,
        });

        const withRoles = await this.prisma.staff.findFirstOrThrow({
          where: { id: created.id },
          include: staffRolesInclude,
        });

        return staffToRecord(withRoles);
      }

      return staffToRecord(created);
    } catch (error) {
      throw mapUniqueMembershipError(error);
    }
  }

  async update(input: UpdateStaffPersistenceInput) {
    try {
      const row = await this.prisma.staff.update({
        where: { id: input.id, tenantId: input.tenantId, deletedAt: null },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.email !== undefined ? { email: input.email } : {}),
          ...(input.jobTitle !== undefined ? { jobTitle: input.jobTitle } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(input.dataScope !== undefined ? { dataScope: input.dataScope } : {}),
          ...(input.assignedBranchIds !== undefined
            ? { assignedBranchIds: input.assignedBranchIds }
            : {}),
          ...(input.primaryBranchId !== undefined
            ? { primaryBranchId: input.primaryBranchId }
            : {}),
          updatedById: input.updatedById,
          version: { increment: 1 },
        },
        include: staffRolesInclude,
      });

      return staffToRecord(row);
    } catch (error) {
      throw mapUniqueMembershipError(error);
    }
  }

  async softDelete(command: SoftDeleteCommand) {
    const row = await this.prisma.staff.update({
      where: { id: command.id, tenantId: command.tenantId, deletedAt: null },
      data: {
        deletedAt: new Date(),
        deletedById: command.deletedById,
        deleteReason: command.deleteReason ?? null,
        status: 'suspended',
        updatedById: command.deletedById,
        version: { increment: 1 },
      },
      include: staffRolesInclude,
    });

    return staffToRecord(row);
  }

  async restore(command: RestoreCommand) {
    return runWithBypassSoftDelete(async () => {
      const row = await this.prisma.staff.update({
        where: { id: command.id, tenantId: command.tenantId },
        data: {
          deletedAt: null,
          deletedById: null,
          deleteReason: null,
          status: 'active',
          updatedById: command.restoredById,
          version: { increment: 1 },
        },
        include: staffRolesInclude,
      });

      return staffToRecord(row);
    });
  }

  async listActive(tenantId: string, options: ListStaffOptions): Promise<ListStaffResult> {
    const search = options.search?.trim();
    const searchWhere: Prisma.StaffWhereInput | undefined = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { user: { phone: { contains: search } } },
          ],
        }
      : undefined;

    const where: Prisma.StaffWhereInput = {
      tenantId,
      deletedAt: null,
      ...(options.status !== undefined ? { status: options.status } : {}),
      ...(options.branchId ? buildBranchFilter(options.branchId) : {}),
      ...(buildScopeWhere(options.scope) ?? {}),
      ...(buildCursorWhere(options) ?? {}),
      ...(searchWhere ?? {}),
    };

    const countWhere: Prisma.StaffWhereInput = {
      tenantId,
      deletedAt: null,
      ...(options.status !== undefined ? { status: options.status } : {}),
      ...(options.branchId ? buildBranchFilter(options.branchId) : {}),
      ...(buildScopeWhere(options.scope) ?? {}),
      ...(searchWhere ?? {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.staff.findMany({
        where,
        orderBy: buildOrderBy(options.sort),
        take: options.limit + 1,
        include: staffRolesInclude,
      }),
      this.prisma.staff.count({ where: countWhere }),
    ]);

    const hasMore = rows.length > options.limit;
    const items = (hasMore ? rows.slice(0, options.limit) : rows).map(staffToListItem);

    return { items, hasMore, total };
  }

  async listDeleted(tenantId: string, limit = 50) {
    return runWithBypassSoftDelete(async () => {
      const rows = await this.prisma.staff.findMany({
        where: { tenantId, deletedAt: { not: null } },
        orderBy: { deletedAt: 'desc' },
        take: limit,
        include: staffRolesInclude,
      });

      return rows.map(staffToRecord);
    });
  }

  private async assertRolesInTenant(
    client: Pick<PrismaService, 'role'>,
    tenantId: string,
    roleIds: string[],
  ): Promise<void> {
    const unique = [...new Set(roleIds)];
    const count = await client.role.count({
      where: {
        id: { in: unique },
        tenantId,
        deletedAt: null,
      },
    });

    if (count !== unique.length) {
      throw new ApplicationError('ROLE_NOT_FOUND', 'One or more roles were not found.', 400);
    }
  }

  private toAuthWithTenantRecord(row: {
    id: string;
    tenantId: string;
    userId: string;
    name: string;
    status: 'active' | 'suspended';
    user: { phone: string };
    tenant: { slug: string; name: string; status: 'trial' | 'active' | 'suspended' };
  }): StaffWithTenantRecord {
    return {
      id: row.id,
      tenantId: row.tenantId,
      userId: row.userId,
      phone: row.user.phone,
      name: row.name,
      status: row.status,
      tenantSlug: row.tenant.slug,
      tenantName: row.tenant.name,
      tenantStatus: row.tenant.status,
    };
  }
}

function mapUniqueMembershipError(error: unknown): unknown {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'P2002'
  ) {
    return new ApplicationError(
      'STAFF_PHONE_DUPLICATE',
      'Phone number is already used by another staff member.',
      409,
    );
  }

  return error;
}
