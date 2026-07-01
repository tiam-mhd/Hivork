import {
  type CreateTenantCustomerLinkInput,
  type DeletedTenantCustomerRecord,
  type ITenantCustomerRepository,
  type ListActiveTenantCustomersOptions,
  type ListActiveTenantCustomersResult,
  type RestoreTenantCustomerLinkInput,
  type TenantCustomerListScope,
  type TenantCustomerFullDetail,
  type TenantCustomerRecord,
  type UpdateTenantCustomerLinkInput,
  ApplicationError,
  mapDomainError,
} from '@hivork/application';
import { TenantCustomer } from '@hivork/domain';
import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { runWithBypassSoftDelete } from '../context/request-context.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { tenantCustomerToDetailRecord, tenantCustomerToRecord } from './mappers/tenant-customer.mapper.js';
import {
  globalCustomerListSelect,
  globalCustomerWithPhoneSelect,
  resolveGlobalCustomerPhone,
} from './mappers/global-customer-phone.js';

function buildScopeWhere(scope: TenantCustomerListScope): Prisma.TenantCustomerWhereInput | undefined {
  switch (scope.dataScope) {
    case 'all':
      return undefined;
    case 'branch':
      if (!scope.branchIds?.length) {
        return { id: { in: [] } };
      }

      return {
        OR: [
          { defaultBranchId: { in: scope.branchIds } },
          {
            sales: {
              some: {
                deletedAt: null,
                branchId: { in: scope.branchIds },
              },
            },
          },
        ],
      };
    case 'own':
      return {
        sales: {
          some: {
            deletedAt: null,
            createdByStaffId: scope.actorId,
          },
        },
      };
  }
}

function buildSearchWhere(search: string): Prisma.TenantCustomerWhereInput {
  const trimmed = search.trim();

  return {
    OR: [
      { globalCustomer: { name: { contains: trimmed, mode: 'insensitive' } } },
      { globalCustomer: { user: { phone: { contains: trimmed } } } },
      { localCode: { contains: trimmed, mode: 'insensitive' } },
    ],
  };
}

function buildCursorWhere(
  options: ListActiveTenantCustomersOptions,
): Prisma.TenantCustomerWhereInput | undefined {
  if (!options.cursor) {
    return undefined;
  }

  const { id, createdAt, name, lastPurchaseAt, overdueCount } = options.cursor;

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
        OR: [
          { globalCustomer: { name: { lt: name ?? '', mode: 'insensitive' } } },
          {
            globalCustomer: { name: name ?? '' },
            id: { lt: id },
          },
        ],
      };
    case 'name:asc':
      return {
        OR: [
          { globalCustomer: { name: { gt: name ?? '', mode: 'insensitive' } } },
          {
            globalCustomer: { name: name ?? '' },
            id: { gt: id },
          },
        ],
      };
    case 'lastPurchaseAt:desc':
      if (lastPurchaseAt === null || lastPurchaseAt === undefined) {
        return {
          OR: [
            { lastPurchaseAt: { not: null } },
            { lastPurchaseAt: null, id: { lt: id } },
          ],
        };
      }

      return {
        OR: [
          { lastPurchaseAt: { lt: lastPurchaseAt } },
          { lastPurchaseAt, id: { lt: id } },
        ],
      };
    case 'lastPurchaseAt:asc':
      if (lastPurchaseAt === null || lastPurchaseAt === undefined) {
        return {
          OR: [{ lastPurchaseAt: { not: null } }, { lastPurchaseAt: null, id: { gt: id } }],
        };
      }

      return {
        OR: [
          { lastPurchaseAt: { gt: lastPurchaseAt } },
          { lastPurchaseAt, id: { gt: id } },
        ],
      };
    case 'overdueCount:desc':
      return {
        OR: [
          { overdueCount: { lt: overdueCount! } },
          { overdueCount: overdueCount!, id: { lt: id } },
        ],
      };
    case 'overdueCount:asc':
      return {
        OR: [
          { overdueCount: { gt: overdueCount! } },
          { overdueCount: overdueCount!, id: { gt: id } },
        ],
      };
  }
}

function buildOrderBy(
  sort: ListActiveTenantCustomersOptions['sort'],
): Prisma.TenantCustomerOrderByWithRelationInput[] {
  switch (sort) {
    case 'createdAt:asc':
      return [{ createdAt: 'asc' }, { id: 'asc' }];
    case 'name:asc':
      return [{ globalCustomer: { name: 'asc' } }, { id: 'asc' }];
    case 'name:desc':
      return [{ globalCustomer: { name: 'desc' } }, { id: 'desc' }];
    case 'lastPurchaseAt:asc':
      return [{ lastPurchaseAt: { sort: 'asc', nulls: 'last' } }, { id: 'asc' }];
    case 'lastPurchaseAt:desc':
      return [{ lastPurchaseAt: { sort: 'desc', nulls: 'last' } }, { id: 'desc' }];
    case 'overdueCount:asc':
      return [{ overdueCount: 'asc' }, { id: 'asc' }];
    case 'overdueCount:desc':
      return [{ overdueCount: 'desc' }, { id: 'desc' }];
    case 'createdAt:desc':
    default:
      return [{ createdAt: 'desc' }, { id: 'desc' }];
  }
}

@Injectable()
export class PrismaTenantCustomerRepository implements ITenantCustomerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveById(id: string, tenantId: string): Promise<TenantCustomerRecord | null> {
    const row = await this.prisma.tenantCustomer.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    return row ? tenantCustomerToRecord(row) : null;
  }

  async findDetailById(id: string, tenantId: string) {
    const row = await this.prisma.tenantCustomer.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    return row ? tenantCustomerToDetailRecord(row) : null;
  }

  async findFullDetailById(
    id: string,
    tenantId: string,
  ): Promise<TenantCustomerFullDetail | null> {
    const row = await this.prisma.tenantCustomer.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        globalCustomer: {
          select: globalCustomerWithPhoneSelect,
        },
      },
    });

    if (!row) {
      return null;
    }

    return {
      ...tenantCustomerToDetailRecord(row),
      globalCustomer: {
        id: row.globalCustomer.id,
        phone: resolveGlobalCustomerPhone(row.globalCustomer),
        name: row.globalCustomer.name,
        email: row.globalCustomer.email,
        nationalId: row.globalCustomer.nationalId,
        birthDate: row.globalCustomer.birthDate,
        gender: row.globalCustomer.gender,
        address: row.globalCustomer.address,
        status: row.globalCustomer.status,
      },
      metadata: this.toMetadataRecord(row.metadata),
      updatedAt: row.updatedAt,
    };
  }

  private toMetadataRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    return value as Record<string, unknown>;
  }

  async findDeletedById(id: string, tenantId: string): Promise<TenantCustomerRecord | null> {
    return runWithBypassSoftDelete(async () => {
      const row = await this.prisma.tenantCustomer.findFirst({
        where: { id, tenantId, deletedAt: { not: null } },
      });

      return row ? tenantCustomerToRecord(row) : null;
    });
  }

  async findLinkByGlobalCustomerId(tenantId: string, globalCustomerId: string) {
    return runWithBypassSoftDelete(async () => {
      const row = await this.prisma.tenantCustomer.findFirst({
        where: { tenantId, globalCustomerId },
      });

      return row ? tenantCustomerToDetailRecord(row) : null;
    });
  }

  async countActive(tenantId: string): Promise<number> {
    return this.prisma.tenantCustomer.count({
      where: { tenantId, deletedAt: null },
    });
  }

  async createLink(input: CreateTenantCustomerLinkInput) {
    const entity = TenantCustomer.link(input.tenantId, input.globalCustomerId, {
      localCode: input.localCode,
      notes: input.notes,
      internalNotes: input.internalNotes,
      defaultBranchId: input.defaultBranchId,
      tags: input.tags,
      preferredContactChannel: input.preferredContactChannel,
      marketingOptIn: input.marketingOptIn ?? undefined,
    });

    const row = await this.prisma.tenantCustomer.create({
      data: {
        id: entity.id,
        tenantId: entity.tenantId,
        globalCustomerId: entity.globalCustomerId,
        localCode: entity.localCode,
        notes: entity.notes,
        internalNotes: entity.internalNotes,
        defaultBranchId: entity.defaultBranchId,
        tags: [...entity.tags],
        preferredContactChannel: input.preferredContactChannel ?? null,
        marketingOptIn: input.marketingOptIn ?? null,
        createdById: input.createdById,
        updatedById: input.createdById,
      },
    });

    return tenantCustomerToDetailRecord(row);
  }

  async restoreLinkAndUpdate(input: RestoreTenantCustomerLinkInput) {
    return runWithBypassSoftDelete(async () => {
      const row = await this.prisma.tenantCustomer.findFirst({
        where: { id: input.id, tenantId: input.tenantId, globalCustomerId: input.globalCustomerId },
      });

      if (!row) {
        throw new Error('Deleted tenant customer not found for restore');
      }

      const entity = this.toDomain(row);

      try {
        entity.restore();
        entity.updateProfile({
          localCode: input.localCode,
          notes: input.notes,
          internalNotes: input.internalNotes,
          defaultBranchId: input.defaultBranchId,
          tags: input.tags,
          preferredContactChannel: input.preferredContactChannel,
          marketingOptIn: input.marketingOptIn ?? undefined,
        });
      } catch (error) {
        throw mapDomainError(error);
      }

      const updated = await this.prisma.tenantCustomer.update({
        where: { id: input.id },
        data: {
          localCode: entity.localCode,
          notes: entity.notes,
          internalNotes: entity.internalNotes,
          defaultBranchId: entity.defaultBranchId,
          tags: [...entity.tags],
          preferredContactChannel: entity.preferredContactChannel,
          marketingOptIn: input.marketingOptIn ?? null,
          deletedAt: null,
          deletedById: null,
          deleteReason: null,
          updatedById: input.restoredById,
          version: { increment: 1 },
        },
      });

      return tenantCustomerToDetailRecord(updated);
    });
  }

  async softDelete(command: {
    id: string;
    tenantId: string;
    deletedById: string;
    deleteReason?: string;
  }): Promise<TenantCustomerRecord> {
    const row = await this.prisma.tenantCustomer.findFirst({
      where: { id: command.id, tenantId: command.tenantId, deletedAt: null },
    });

    if (!row) {
      throw new Error('Tenant customer not found for soft delete');
    }

    const entity = this.toDomain(row);

    try {
      entity.softDelete(command.deletedById, command.deleteReason);
    } catch (error) {
      throw mapDomainError(error);
    }

    const updated = await this.prisma.tenantCustomer.update({
      where: { id: command.id },
      data: {
        deletedAt: entity.deletedAt,
        deletedById: entity.deletedById,
        deleteReason: entity.deleteReason,
        updatedById: command.deletedById,
        version: { increment: 1 },
      },
    });

    return tenantCustomerToRecord(updated);
  }

  async restore(command: {
    id: string;
    tenantId: string;
    restoredById: string;
  }): Promise<TenantCustomerRecord> {
    return runWithBypassSoftDelete(async () => {
      const row = await this.prisma.tenantCustomer.findFirst({
        where: { id: command.id, tenantId: command.tenantId, deletedAt: { not: null } },
      });

      if (!row) {
        throw new Error('Deleted tenant customer not found for restore');
      }

      const entity = this.toDomain(row);

      try {
        entity.restore();
      } catch (error) {
        throw mapDomainError(error);
      }

      const updated = await this.prisma.tenantCustomer.update({
        where: { id: command.id },
        data: {
          deletedAt: null,
          deletedById: null,
          deleteReason: null,
          updatedById: command.restoredById,
          version: { increment: 1 },
        },
      });

      return tenantCustomerToRecord(updated);
    });
  }

  async listDeleted(tenantId: string, limit = 50): Promise<DeletedTenantCustomerRecord[]> {
    return runWithBypassSoftDelete(async () => {
      const rows = await this.prisma.tenantCustomer.findMany({
        where: { tenantId, deletedAt: { not: null } },
        include: {
          globalCustomer: {
            select: globalCustomerListSelect,
          },
        },
        orderBy: { deletedAt: 'desc' },
        take: limit,
      });

      return rows.map((row) => ({
        ...tenantCustomerToRecord(row),
        deletedAt: row.deletedAt!,
        globalCustomer: {
          phone: resolveGlobalCustomerPhone(row.globalCustomer),
          name: row.globalCustomer.name,
        },
      }));
    });
  }

  async listActive(
    tenantId: string,
    options: ListActiveTenantCustomersOptions,
  ): Promise<ListActiveTenantCustomersResult> {
    const andFilters: Prisma.TenantCustomerWhereInput[] = [];
    const scopeWhere = buildScopeWhere(options.scope);

    if (scopeWhere) {
      andFilters.push(scopeWhere);
    }

    if (options.listWhere) {
      andFilters.push(options.listWhere as Prisma.TenantCustomerWhereInput);
    } else if (options.search) {
      andFilters.push(buildSearchWhere(options.search));
    }

    if (options.tags?.length) {
      andFilters.push({ tags: { hasEvery: options.tags } });
    }

    if (options.ids?.length) {
      andFilters.push({ id: { in: options.ids } });
    }

    const cursorWhere = buildCursorWhere(options);
    if (cursorWhere) {
      andFilters.push(cursorWhere);
    }

    const where: Prisma.TenantCustomerWhereInput = {
      tenantId,
      deletedAt: null,
      ...(options.defaultBranchId ? { defaultBranchId: options.defaultBranchId } : {}),
      ...(options.status === 'suspended'
        ? { globalCustomer: { status: 'suspended', deletedAt: null } }
        : { globalCustomer: { status: 'active', deletedAt: null } }),
      ...(andFilters.length > 0 ? { AND: andFilters } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.tenantCustomer.findMany({
        where,
        include: {
          globalCustomer: {
            select: globalCustomerListSelect,
          },
        },
        orderBy: buildOrderBy(options.sort),
        take: options.limit + 1,
      }),
      this.prisma.tenantCustomer.count({ where }),
    ]);

    const hasMore = rows.length > options.limit;
    const page = hasMore ? rows.slice(0, options.limit) : rows;

    return {
      items: page.map((row) => ({
        id: row.id,
        globalCustomer: {
          id: row.globalCustomer.id,
          phone: resolveGlobalCustomerPhone(row.globalCustomer),
          name: row.globalCustomer.name,
        },
        localCode: row.localCode,
        tags: row.tags,
        creditScore: row.creditScore,
        overdueCount: row.overdueCount,
        totalPurchaseRial: row.totalPurchaseRial,
        lastPurchaseAt: row.lastPurchaseAt,
        preferredContactChannel: row.preferredContactChannel,
        createdAt: row.createdAt,
      })),
      hasMore,
      total,
    };
  }

  async updateLink(input: UpdateTenantCustomerLinkInput) {
    const row = await this.prisma.tenantCustomer.findFirst({
      where: {
        id: input.id,
        tenantId: input.tenantId,
        deletedAt: null,
        version: input.version,
      },
    });

    if (!row) {
      const current = await this.prisma.tenantCustomer.findFirst({
        where: { id: input.id, tenantId: input.tenantId },
      });

      if (!current) {
        throw new ApplicationError(
          'CUSTOMER_NOT_FOUND',
          'Customer was not found for this tenant.',
          404,
        );
      }

      if (current.deletedAt) {
        throw new ApplicationError('RECORD_DELETED', 'Customer has been deleted.', 404);
      }

      throw new ApplicationError(
        'OPTIMISTIC_LOCK_CONFLICT',
        'Customer was updated by another user. Refresh and try again.',
        409,
      );
    }

    const entity = this.toDomain(row);

    try {
      entity.updateProfile({
        localCode: input.localCode,
        notes: input.notes,
        internalNotes: input.internalNotes,
        defaultBranchId: input.defaultBranchId,
        tags: input.tags,
        preferredContactChannel: input.preferredContactChannel,
        marketingOptIn: input.marketingOptIn ?? undefined,
      });
    } catch (error) {
      throw mapDomainError(error);
    }

    const updated = await this.prisma.tenantCustomer.update({
      where: { id: input.id },
      data: {
        localCode: entity.localCode,
        notes: entity.notes,
        internalNotes: entity.internalNotes,
        defaultBranchId: entity.defaultBranchId,
        tags: [...entity.tags],
        preferredContactChannel: entity.preferredContactChannel,
        marketingOptIn: input.marketingOptIn ?? entity.marketingOptIn,
        ...(input.metadata !== undefined ? { metadata: input.metadata as object } : {}),
        updatedById: input.updatedById,
        version: { increment: 1 },
      },
    });

    return tenantCustomerToDetailRecord(updated);
  }

  private toDomain(row: {
    id: string;
    tenantId: string;
    globalCustomerId: string;
    localCode: string | null;
    notes: string | null;
    internalNotes: string | null;
    defaultBranchId: string | null;
    tags: string[];
    marketingOptIn: boolean | null;
    preferredContactChannel: 'telegram' | 'bale' | 'sms' | 'phone' | null;
    deletedAt: Date | null;
    deletedById: string | null;
    deleteReason: string | null;
  }): TenantCustomer {
    return new TenantCustomer(
      row.id,
      row.tenantId,
      row.globalCustomerId,
      row.localCode,
      row.notes,
      row.internalNotes,
      row.defaultBranchId,
      row.tags,
      row.marketingOptIn ?? false,
      row.preferredContactChannel,
      row.deletedAt,
      row.deletedById,
      row.deleteReason,
    );
  }
}
