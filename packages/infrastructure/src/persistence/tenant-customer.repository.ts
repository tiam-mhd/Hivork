import {
  type CreateTenantCustomerLinkInput,
  type DeletedTenantCustomerRecord,
  type ITenantCustomerRepository,
  type ListActiveTenantCustomersOptions,
  type ListActiveTenantCustomersResult,
  type OutboxTransaction,
  type RestoreTenantCustomerLinkInput,
  type TenantCustomerDetailWithRelationsRecord,
  type TenantCustomerFullDetail,
  type TenantCustomerRecord,
  type UpdateTenantCustomerLinkInput,
  ApplicationError,
  mapDomainError,
} from '@hivork/application';
import { TenantCustomer } from '@hivork/domain';
import { Injectable } from '@nestjs/common';

import { runWithBypassSoftDelete } from '../context/request-context.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { tenantCustomerToDetailRecord, tenantCustomerToRecord } from './mappers/tenant-customer.mapper.js';
import {
  globalCustomerListSelect,
  globalCustomerWithPhoneSelect,
  resolveGlobalCustomerPhone,
} from './mappers/global-customer-phone.js';
import {
  buildTenantCustomerListOrderBy,
  buildTenantCustomerListWhere,
} from './repositories/tenant-customer-list.query.js';

type TenantCustomerWriteClient = Pick<PrismaService, 'tenantCustomer'>;

function resolveLinkStatus(row: {
  archivedAt: Date | null;
  isBlacklisted: boolean;
}): 'active' | 'archived' | 'blacklisted' {
  if (row.isBlacklisted) {
    return 'blacklisted';
  }

  if (row.archivedAt) {
    return 'archived';
  }

  return 'active';
}

function resolveClient(prisma: PrismaService, tx?: OutboxTransaction): TenantCustomerWriteClient {
  return (tx ?? prisma) as TenantCustomerWriteClient;
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

  async findDetailWithRelationsById(
    id: string,
    tenantId: string,
    tx?: OutboxTransaction,
  ): Promise<TenantCustomerDetailWithRelationsRecord | null> {
    const client = (tx ?? this.prisma) as PrismaService;
    const row = await client.tenantCustomer.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        addresses: { where: { deletedAt: null }, orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] },
        emergencyContacts: {
          where: { deletedAt: null },
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        },
        contactPhones: {
          where: { deletedAt: null },
          orderBy: [{ isPrimarySecondary: 'desc' }, { createdAt: 'asc' }],
        },
      },
    });

    if (!row) {
      return null;
    }

    const detail = tenantCustomerToDetailRecord(row);

    return {
      ...detail,
      addresses: row.addresses.map((address) => ({
        id: address.id,
        tenantId: address.tenantId,
        tenantCustomerId: address.tenantCustomerId,
        label: address.label,
        line1: address.line1,
        line2: address.line2,
        city: address.city,
        province: address.province,
        postalCode: address.postalCode,
        isPrimary: address.isPrimary,
        latitude: address.latitude === null ? null : Number(address.latitude),
        longitude: address.longitude === null ? null : Number(address.longitude),
        createdAt: address.createdAt,
        updatedAt: address.updatedAt,
        createdById: address.createdById,
        updatedById: address.updatedById,
        deletedAt: address.deletedAt,
        deletedById: address.deletedById,
        deleteReason: address.deleteReason,
        version: address.version,
        metadata: address.metadata as Record<string, unknown> | null,
      })),
      emergencyContacts: row.emergencyContacts.map((contact) => ({
        id: contact.id,
        tenantId: contact.tenantId,
        tenantCustomerId: contact.tenantCustomerId,
        name: contact.name,
        phone: contact.phone,
        relation: contact.relation,
        isPrimary: contact.isPrimary,
        createdAt: contact.createdAt,
        updatedAt: contact.updatedAt,
        createdById: contact.createdById,
        updatedById: contact.updatedById,
        deletedAt: contact.deletedAt,
        deletedById: contact.deletedById,
        deleteReason: contact.deleteReason,
        version: contact.version,
        metadata: contact.metadata as Record<string, unknown> | null,
      })),
      contactPhones: row.contactPhones.map((phone) => ({
        id: phone.id,
        tenantId: phone.tenantId,
        tenantCustomerId: phone.tenantCustomerId,
        phone: phone.phone,
        label: phone.label,
        isWhatsApp: phone.isWhatsApp,
        isPrimarySecondary: phone.isPrimarySecondary,
        isVerified: phone.isVerified,
        notes: phone.notes,
        createdAt: phone.createdAt,
        updatedAt: phone.updatedAt,
        createdById: phone.createdById,
        updatedById: phone.updatedById,
        deletedAt: phone.deletedAt,
        deletedById: phone.deletedById,
        deleteReason: phone.deleteReason,
        version: phone.version,
        metadata: phone.metadata as Record<string, unknown> | null,
      })),
    };
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

  async createLink(input: CreateTenantCustomerLinkInput, tx?: OutboxTransaction) {
    const entity = this.buildLinkEntity(input);
    const client = resolveClient(this.prisma, tx);

    const row = await client.tenantCustomer.create({
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
        categoryId: entity.categoryId,
        assignedStaffId: entity.assignedStaffId,
        status: entity.status,
        isBlacklisted: entity.isBlacklisted,
        blacklistReason: entity.blacklistReason,
        blacklistedAt: entity.blacklistedAt,
        blacklistedById: entity.blacklistedById,
        createdById: input.createdById,
        updatedById: input.createdById,
      },
    });

    return tenantCustomerToDetailRecord(row);
  }

  async restoreLinkAndUpdate(input: RestoreTenantCustomerLinkInput, tx?: OutboxTransaction) {
    return runWithBypassSoftDelete(async () => {
      const client = resolveClient(this.prisma, tx);
      const row = await client.tenantCustomer.findFirst({
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
          categoryId: input.categoryId,
          assignedStaffId: input.assignedStaffId,
        });
        if (input.isBlacklisted && input.blacklistReason) {
          if (!entity.isBlacklisted) {
            entity.blacklist(input.blacklistReason, input.restoredById);
          }
        } else if (entity.isBlacklisted) {
          entity.removeBlacklist();
        }
      } catch (error) {
        throw mapDomainError(error);
      }

      const updated = await client.tenantCustomer.update({
        where: { id: input.id },
        data: {
          localCode: entity.localCode,
          notes: entity.notes,
          internalNotes: entity.internalNotes,
          defaultBranchId: entity.defaultBranchId,
          tags: [...entity.tags],
          preferredContactChannel: entity.preferredContactChannel,
          marketingOptIn: input.marketingOptIn ?? null,
          categoryId: entity.categoryId,
          assignedStaffId: entity.assignedStaffId,
          status: entity.status,
          isBlacklisted: entity.isBlacklisted,
          blacklistReason: entity.blacklistReason,
          blacklistedAt: entity.blacklistedAt,
          blacklistedById: entity.blacklistedById,
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

  async softDelete(
    command: {
      id: string;
      tenantId: string;
      deletedById: string;
      deleteReason?: string;
      expectedVersion?: number;
    },
    tx?: OutboxTransaction,
  ): Promise<TenantCustomerRecord> {
    const client = resolveClient(this.prisma, tx);
    const row = await client.tenantCustomer.findFirst({
      where: {
        id: command.id,
        tenantId: command.tenantId,
        deletedAt: null,
        ...(command.expectedVersion !== undefined ? { version: command.expectedVersion } : {}),
      },
    });

    if (!row) {
      const current = await client.tenantCustomer.findFirst({
        where: { id: command.id, tenantId: command.tenantId },
      });

      if (!current) {
        throw new ApplicationError(
          'CUSTOMER_NOT_FOUND',
          'Customer was not found for this tenant.',
          404,
        );
      }

      if (current.deletedAt) {
        throw new ApplicationError('ALREADY_DELETED', 'Customer is already deleted.', 409);
      }

      if (command.expectedVersion !== undefined) {
        throw new ApplicationError(
          'OPTIMISTIC_LOCK_CONFLICT',
          'Customer was updated by another user. Refresh and try again.',
          409,
        );
      }

      throw new ApplicationError(
        'CUSTOMER_NOT_FOUND',
        'Customer was not found for this tenant.',
        404,
      );
    }

    const entity = this.toDomain(row);

    try {
      entity.softDelete(command.deletedById, command.deleteReason);
    } catch (error) {
      throw mapDomainError(error);
    }

    const updated = await client.tenantCustomer.update({
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

  async archive(
    command: {
      id: string;
      tenantId: string;
      archivedById: string;
    },
    tx?: OutboxTransaction,
  ) {
    const client = resolveClient(this.prisma, tx);
    const row = await client.tenantCustomer.findFirst({
      where: { id: command.id, tenantId: command.tenantId, deletedAt: null },
    });

    if (!row) {
      throw new ApplicationError(
        'CUSTOMER_NOT_FOUND',
        'Customer was not found for this tenant.',
        404,
      );
    }

    const entity = this.toDomain(row);

    try {
      entity.archive(command.archivedById);
    } catch (error) {
      throw mapDomainError(error);
    }

    const updated = await client.tenantCustomer.update({
      where: { id: command.id },
      data: {
        archivedAt: entity.archivedAt,
        archivedById: entity.archivedById,
        status: entity.status,
        updatedById: command.archivedById,
        version: { increment: 1 },
      },
    });

    return tenantCustomerToDetailRecord(updated);
  }

  async unarchive(
    command: {
      id: string;
      tenantId: string;
      unarchivedById: string;
    },
    tx?: OutboxTransaction,
  ) {
    const client = resolveClient(this.prisma, tx);
    const row = await client.tenantCustomer.findFirst({
      where: { id: command.id, tenantId: command.tenantId, deletedAt: null },
    });

    if (!row) {
      throw new ApplicationError(
        'CUSTOMER_NOT_FOUND',
        'Customer was not found for this tenant.',
        404,
      );
    }

    const entity = this.toDomain(row);

    try {
      entity.unarchive();
    } catch (error) {
      throw mapDomainError(error);
    }

    const updated = await client.tenantCustomer.update({
      where: { id: command.id },
      data: {
        archivedAt: entity.archivedAt,
        archivedById: entity.archivedById,
        status: entity.status,
        updatedById: command.unarchivedById,
        version: { increment: 1 },
      },
    });

    return tenantCustomerToDetailRecord(updated);
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
        const active = await this.prisma.tenantCustomer.findFirst({
          where: { id: command.id, tenantId: command.tenantId, deletedAt: null },
        });
        if (active) {
          throw new ApplicationError('NOT_DELETED', 'Customer is not deleted.', 409);
        }

        throw new ApplicationError(
          'CUSTOMER_NOT_FOUND',
          'Customer was not found for this tenant.',
          404,
        );
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
    const where = buildTenantCustomerListWhere(tenantId, options);
    const includeDeleted = options.linkStatus === 'deleted';

    const query = async () => {
      const rows = await this.prisma.tenantCustomer.findMany({
        where,
        include: {
          globalCustomer: {
            select: globalCustomerListSelect,
          },
          category: {
            select: { id: true, name: true },
          },
          addresses: {
            where: { deletedAt: null, isPrimary: true },
            take: 1,
            select: { city: true },
          },
        },
        orderBy: buildTenantCustomerListOrderBy(options.sort),
        take: options.limit + 1,
      });

      const total =
        options.includeCount === true
          ? await this.prisma.tenantCustomer.count({ where })
          : undefined;

      return { rows, total };
    };

    const { rows, total } = includeDeleted
      ? await runWithBypassSoftDelete(query)
      : await query();

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
        categoryId: row.categoryId,
        categoryName: row.category?.name ?? null,
        primaryAddressCity: row.addresses[0]?.city ?? null,
        linkStatus: resolveLinkStatus(row),
        isBlacklisted: row.isBlacklisted,
      })),
      hasMore,
      total,
    };
  }

  async updateLink(input: UpdateTenantCustomerLinkInput, tx?: OutboxTransaction) {
    const client = (tx ?? this.prisma) as PrismaService;
    const row = await client.tenantCustomer.findFirst({
      where: {
        id: input.id,
        tenantId: input.tenantId,
        deletedAt: null,
        version: input.version,
      },
    });

    if (!row) {
      const current = await client.tenantCustomer.findFirst({
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
        categoryId: input.categoryId,
        assignedStaffId: input.assignedStaffId,
      });

      if (input.isBlacklisted === true && input.blacklistReason) {
        entity.blacklist(input.blacklistReason, input.updatedById);
      } else if (input.isBlacklisted === false && entity.isBlacklisted) {
        entity.removeBlacklist();
      }
    } catch (error) {
      throw mapDomainError(error);
    }

    const updated = await client.tenantCustomer.update({
      where: { id: input.id },
      data: {
        localCode: entity.localCode,
        notes: entity.notes,
        internalNotes: entity.internalNotes,
        defaultBranchId: entity.defaultBranchId,
        tags: [...entity.tags],
        preferredContactChannel: entity.preferredContactChannel,
        marketingOptIn: input.marketingOptIn ?? entity.marketingOptIn,
        categoryId: entity.categoryId,
        assignedStaffId: entity.assignedStaffId,
        status: entity.status,
        isBlacklisted: entity.isBlacklisted,
        blacklistReason: entity.blacklistReason,
        blacklistedAt: entity.blacklistedAt,
        blacklistedById: entity.blacklistedById,
        ...(input.metadata !== undefined ? { metadata: input.metadata as object } : {}),
        ...(input.creditScore !== undefined ? { creditScore: input.creditScore } : {}),
        ...(input.overdueCount !== undefined ? { overdueCount: input.overdueCount } : {}),
        ...(input.totalPurchaseRial !== undefined
          ? { totalPurchaseRial: input.totalPurchaseRial }
          : {}),
        ...(input.lastPurchaseAt !== undefined ? { lastPurchaseAt: input.lastPurchaseAt } : {}),
        updatedById: input.updatedById,
        version: { increment: 1 },
      },
    });

    return tenantCustomerToDetailRecord(updated);
  }

  private buildLinkEntity(input: CreateTenantCustomerLinkInput): TenantCustomer {
    const entity = TenantCustomer.link(input.tenantId, input.globalCustomerId, {
      localCode: input.localCode,
      notes: input.notes,
      internalNotes: input.internalNotes,
      defaultBranchId: input.defaultBranchId,
      tags: input.tags,
      preferredContactChannel: input.preferredContactChannel,
      marketingOptIn: input.marketingOptIn ?? undefined,
      categoryId: input.categoryId,
      assignedStaffId: input.assignedStaffId,
    });

    if (input.isBlacklisted && input.blacklistReason) {
      entity.blacklist(input.blacklistReason, input.createdById);
    }

    return entity;
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
    categoryId?: string | null;
    status?: 'active' | 'archived' | 'blacklisted';
    isBlacklisted?: boolean;
    blacklistReason?: string | null;
    blacklistedAt?: Date | null;
    blacklistedById?: string | null;
    archivedAt?: Date | null;
    archivedById?: string | null;
    assignedStaffId?: string | null;
  }): TenantCustomer {
    return TenantCustomer.reconstitute({
      id: row.id,
      tenantId: row.tenantId,
      globalCustomerId: row.globalCustomerId,
      localCode: row.localCode,
      notes: row.notes,
      internalNotes: row.internalNotes,
      defaultBranchId: row.defaultBranchId,
      tags: row.tags,
      marketingOptIn: row.marketingOptIn ?? false,
      preferredContactChannel: row.preferredContactChannel,
      deletedAt: row.deletedAt,
      deletedById: row.deletedById,
      deleteReason: row.deleteReason,
      categoryId: row.categoryId ?? null,
      status: row.status ?? 'active',
      isBlacklisted: row.isBlacklisted ?? false,
      blacklistReason: row.blacklistReason ?? null,
      blacklistedAt: row.blacklistedAt ?? null,
      blacklistedById: row.blacklistedById ?? null,
      archivedAt: row.archivedAt ?? null,
      archivedById: row.archivedById ?? null,
      assignedStaffId: row.assignedStaffId ?? null,
    });
  }
}
