import {
  ApplicationError,
  type CreateBranchPersistenceInput,
  type IBranchReader,
  type IBranchRepository,
  type ListBranchesOptions,
  type ListBranchesResult,
  type RestoreCommand,
  type SoftDeleteCommand,
  type UpdateBranchPersistenceInput,
} from '@hivork/application';
import { Injectable } from '@nestjs/common';
import { Prisma, type Prisma as PrismaTypes } from '@prisma/client';

import { runWithBypassSoftDelete } from '../context/request-context.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { branchToRecord } from './mappers/branch.mapper.js';

function buildScopeWhere(scope: ListBranchesOptions['scope']): Prisma.BranchWhereInput | undefined {
  if (scope.dataScope === 'all') {
    return undefined;
  }

  if (!scope.branchIds?.length) {
    return { id: { in: [] } };
  }

  return { id: { in: scope.branchIds } };
}

function buildCursorWhere(options: ListBranchesOptions): Prisma.BranchWhereInput | undefined {
  if (!options.cursor) {
    return undefined;
  }

  const { id, createdAt, name } = options.cursor;

  switch (options.sort) {
    case 'createdAt:desc':
      return {
        OR: [{ createdAt: { lt: createdAt! } }, { createdAt: createdAt!, id: { lt: id } }],
      };
    case 'createdAt:asc':
      return {
        OR: [{ createdAt: { gt: createdAt! } }, { createdAt: createdAt!, id: { gt: id } }],
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

function buildOrderBy(sort: ListBranchesOptions['sort']): Prisma.BranchOrderByWithRelationInput[] {
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
export class PrismaBranchRepository implements IBranchRepository, IBranchReader {
  constructor(private readonly prisma: PrismaService) {}

  async existsActiveInTenant(tenantId: string, branchId: string): Promise<boolean> {
    const row = await this.prisma.branch.findFirst({
      where: { id: branchId, tenantId, deletedAt: null, isActive: true },
      select: { id: true },
    });

    return row !== null;
  }

  async findActiveById(id: string, tenantId: string) {
    const row = await this.prisma.branch.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    return row ? branchToRecord(row) : null;
  }

  async findDeletedById(id: string, tenantId: string) {
    return runWithBypassSoftDelete(async () => {
      const row = await this.prisma.branch.findFirst({
        where: { id, tenantId, deletedAt: { not: null } },
      });

      return row ? branchToRecord(row) : null;
    });
  }

  async findActiveByName(tenantId: string, name: string) {
    const row = await this.prisma.branch.findFirst({
      where: { tenantId, name, deletedAt: null },
    });

    return row ? branchToRecord(row) : null;
  }

  async countActive(tenantId: string): Promise<number> {
    return this.prisma.branch.count({
      where: { tenantId, deletedAt: null },
    });
  }

  async hasActiveSales(tenantId: string, branchId: string): Promise<boolean> {
    const count = await this.prisma.sale.count({
      where: {
        tenantId,
        branchId,
        deletedAt: null,
        status: 'ACTIVE',
      },
    });

    return count > 0;
  }

  async create(input: CreateBranchPersistenceInput) {
    try {
      const row = await this.prisma.branch.create({
        data: {
          id: input.id,
          tenantId: input.tenantId,
          name: input.name,
          address: input.address ?? null,
          phone: input.phone ?? null,
          isDefault: false,
          isActive: input.isActive,
          createdById: input.createdById,
          metadata: input.metadata ?? undefined,
        },
      });

      return branchToRecord(row);
    } catch (error) {
      throw mapUniqueNameError(error);
    }
  }

  async update(input: UpdateBranchPersistenceInput) {
    try {
      const row = await this.prisma.branch.update({
        where: { id: input.id, tenantId: input.tenantId, deletedAt: null },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.address !== undefined ? { address: input.address } : {}),
          ...(input.phone !== undefined ? { phone: input.phone } : {}),
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
          ...(input.metadata !== undefined
            ? {
                metadata:
                  input.metadata === null
                    ? Prisma.JsonNull
                    : (input.metadata as PrismaTypes.InputJsonValue),
              }
            : {}),
          updatedById: input.updatedById,
          version: { increment: 1 },
        },
      });

      return branchToRecord(row);
    } catch (error) {
      throw mapUniqueNameError(error);
    }
  }

  async softDelete(command: SoftDeleteCommand) {
    const row = await this.prisma.branch.update({
      where: { id: command.id, tenantId: command.tenantId, deletedAt: null },
      data: {
        deletedAt: new Date(),
        deletedById: command.deletedById,
        deleteReason: command.deleteReason ?? null,
        isActive: false,
        updatedById: command.deletedById,
        version: { increment: 1 },
      },
    });

    return branchToRecord(row);
  }

  async restore(command: RestoreCommand) {
    return runWithBypassSoftDelete(async () => {
      const row = await this.prisma.branch.update({
        where: { id: command.id, tenantId: command.tenantId },
        data: {
          deletedAt: null,
          deletedById: null,
          deleteReason: null,
          isActive: true,
          updatedById: command.restoredById,
          version: { increment: 1 },
        },
      });

      return branchToRecord(row);
    });
  }

  async listActive(tenantId: string, options: ListBranchesOptions): Promise<ListBranchesResult> {
    const where: Prisma.BranchWhereInput = {
      tenantId,
      deletedAt: null,
      ...(options.isActive !== undefined ? { isActive: options.isActive } : {}),
      ...(buildScopeWhere(options.scope) ?? {}),
      ...(buildCursorWhere(options) ?? {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.branch.findMany({
        where,
        orderBy: buildOrderBy(options.sort),
        take: options.limit + 1,
      }),
      this.prisma.branch.count({
        where: {
          tenantId,
          deletedAt: null,
          ...(options.isActive !== undefined ? { isActive: options.isActive } : {}),
          ...(buildScopeWhere(options.scope) ?? {}),
        },
      }),
    ]);

    const hasMore = rows.length > options.limit;
    const items = (hasMore ? rows.slice(0, options.limit) : rows).map((row) => ({
      id: row.id,
      name: row.name,
      address: row.address,
      phone: row.phone,
      isDefault: row.isDefault,
      isActive: row.isActive,
      createdAt: row.createdAt,
    }));

    return { items, hasMore, total };
  }

  async listDeleted(tenantId: string, limit = 50) {
    return runWithBypassSoftDelete(async () => {
      const rows = await this.prisma.branch.findMany({
        where: { tenantId, deletedAt: { not: null } },
        orderBy: { deletedAt: 'desc' },
        take: limit,
      });

      return rows.map(branchToRecord);
    });
  }
}

function mapUniqueNameError(error: unknown): unknown {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'P2002'
  ) {
    return new ApplicationError('VALIDATION_ERROR', 'Branch name already exists.', 409, {
      field: 'name',
    });
  }

  return error;
}

export { PrismaBranchRepository as PrismaBranchReader };
