import type {
  ISaleRepository,
  ListSalesQueryOptions,
  ListSalesResult,
  OutboxTransaction,
  RestoreCommand,
  SaleDetailRecord,
  SaleListItem,
  SaleRecord,
  SaveSalePersistenceInput,
  SoftDeleteCommand,
  TenantCustomerSalesSummary,
  TenantCustomerSalesSummaryScope,
  UpdateSalePersistenceInput,
  UpdateSaleFinancialsPersistenceInput,
  ExtendSalePersistenceInput,
  TerminateSalePersistenceInput,
  CloseSalePersistenceInput,
  ArchiveSalePersistenceInput,
  UnarchiveSalePersistenceInput,
} from '@hivork/application';
import { ApplicationError } from '@hivork/application';
import { Injectable } from '@nestjs/common';
import { Prisma, type Sale } from '@prisma/client';

import { runWithBypassSoftDelete } from '../context/request-context.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  globalCustomerListSelect,
  resolveGlobalCustomerPhone,
} from './mappers/global-customer-phone.js';

type SaleWriteClient = Pick<PrismaService, 'sale'>;

function resolveClient(prisma: PrismaService, tx?: OutboxTransaction): SaleWriteClient {
  return (tx ?? prisma) as SaleWriteClient;
}

function saleToRecord(row: Sale): SaleRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    branchId: row.branchId,
    tenantCustomerId: row.tenantCustomerId,
    createdByStaffId: row.createdByStaffId,
    title: row.title,
    description: row.description,
    invoiceNumber: row.invoiceNumber,
    contractNumber: row.contractNumber,
    customTerms: row.customTerms,
    signatureStatus: row.signatureStatus,
    signedAt: row.signedAt,
    extendedFromSaleId: row.extendedFromSaleId,
    copiedFromSaleId: row.copiedFromSaleId,
    terminatedAt: row.terminatedAt,
    terminatedById: row.terminatedById,
    terminateReason: row.terminateReason,
    closedAt: row.closedAt,
    closedById: row.closedById,
    closeReason: row.closeReason,
    archivedAt: row.archivedAt,
    archivedById: row.archivedById,
    archiveReason: row.archiveReason,
    insuranceRial: row.insuranceRial,
    insuranceProvider: row.insuranceProvider,
    insurancePolicyNumber: row.insurancePolicyNumber,
    insuranceExpiresAt: row.insuranceExpiresAt,
    totalAmountRial: row.totalAmountRial,
    downPaymentRial: row.downPaymentRial,
    discountRial: row.discountRial,
    taxRial: row.taxRial,
    taxRateBps: row.taxRateBps,
    taxInclusive: row.taxInclusive,
    installmentCount: row.installmentCount,
    firstDueDate: row.firstDueDate,
    intervalDays: row.intervalDays,
    contractDate: row.contractDate,
    status: row.status,
    cancelledAt: row.cancelledAt,
    cancelledById: row.cancelledById,
    cancelReason: row.cancelReason,
    deletedAt: row.deletedAt,
    deletedById: row.deletedById,
    deleteReason: row.deleteReason,
    metadata: row.metadata as Record<string, unknown> | null,
    version: row.version,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

type SaleWithRelations = Sale & {
  tenantCustomer: {
    id: string;
    globalCustomer: {
      id: string;
      name: string | null;
      user: { phone: string };
    };
  };
  _count: {
    installments: number;
  };
};

function toListItem(row: SaleWithRelations): SaleListItem {
  return {
    sale: saleToRecord(row),
    customer: {
      id: row.tenantCustomer.id,
      phone: resolveGlobalCustomerPhone(row.tenantCustomer.globalCustomer),
      name: row.tenantCustomer.globalCustomer.name,
    },
    paidCount: row._count.installments,
  };
}

function buildCursorWhere(
  options: ListSalesQueryOptions,
): Prisma.SaleWhereInput | undefined {
  if (!options.cursor) {
    return undefined;
  }

  const { createdAt, id, contractDate } = options.cursor;

  switch (options.sort) {
    case 'createdAt:desc':
      return {
        OR: [{ createdAt: { lt: createdAt } }, { createdAt, id: { lt: id } }],
      };
    case 'createdAt:asc':
      return {
        OR: [{ createdAt: { gt: createdAt } }, { createdAt, id: { gt: id } }],
      };
    case 'contractDate:desc': {
      const cursorContractDate = contractDate ?? createdAt;
      return {
        OR: [
          { contractDate: { lt: cursorContractDate } },
          { contractDate: cursorContractDate, id: { lt: id } },
        ],
      };
    }
  }
}

function buildOrderBy(sort: ListSalesQueryOptions['sort']): Prisma.SaleOrderByWithRelationInput[] {
  switch (sort) {
    case 'createdAt:asc':
      return [{ createdAt: 'asc' }, { id: 'asc' }];
    case 'contractDate:desc':
      return [{ contractDate: 'desc' }, { id: 'desc' }];
    case 'createdAt:desc':
    default:
      return [{ createdAt: 'desc' }, { id: 'desc' }];
  }
}

@Injectable()
export class PrismaSaleRepository implements ISaleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(input: SaveSalePersistenceInput, tx?: OutboxTransaction): Promise<SaleRecord> {
    const client = resolveClient(this.prisma, tx);

    const row = await client.sale.create({
      data: {
        id: input.id,
        tenantId: input.tenantId,
        branchId: input.branchId,
        tenantCustomerId: input.tenantCustomerId,
        createdByStaffId: input.createdByStaffId,
        title: input.title ?? null,
        description: input.description ?? null,
        invoiceNumber: input.invoiceNumber ?? null,
        totalAmountRial: input.totalAmountRial,
        downPaymentRial: input.downPaymentRial,
        discountRial: input.discountRial ?? null,
        taxRial: input.taxRial ?? null,
        installmentCount: input.installmentCount,
        firstDueDate: input.firstDueDate,
        intervalDays: input.intervalDays,
        contractDate: input.contractDate,
        status: input.status,
        version: input.version,
        contractNumber: input.contractNumber ?? null,
        copiedFromSaleId: input.copiedFromSaleId ?? null,
        customTerms: input.customTerms ?? null,
        insuranceRial: input.insuranceRial ?? null,
        insuranceProvider: input.insuranceProvider ?? null,
        insurancePolicyNumber: input.insurancePolicyNumber ?? null,
        insuranceExpiresAt: input.insuranceExpiresAt ?? null,
        taxRateBps: input.taxRateBps ?? null,
        taxInclusive: input.taxInclusive ?? false,
        metadata: input.metadata ?? undefined,
        createdById: input.createdById,
        updatedById: input.createdById,
      },
    });

    return saleToRecord(row);
  }

  async findById(
    tenantId: string,
    saleId: string,
    tx?: OutboxTransaction,
  ): Promise<SaleRecord | null> {
    const client = resolveClient(this.prisma, tx);

    const row = await client.sale.findFirst({
      where: { id: saleId, tenantId, deletedAt: null },
    });

    return row ? saleToRecord(row) : null;
  }

  async findDetailById(tenantId: string, saleId: string): Promise<SaleDetailRecord | null> {
    const row = await this.prisma.sale.findFirst({
      where: { id: saleId, tenantId, deletedAt: null },
      include: {
        tenantCustomer: {
          include: {
            globalCustomer: {
              select: globalCustomerListSelect,
            },
          },
        },
      },
    });

    if (!row) {
      return null;
    }

    return {
      sale: saleToRecord(row),
      customer: {
        id: row.tenantCustomer.id,
        phone: resolveGlobalCustomerPhone(row.tenantCustomer.globalCustomer),
        name: row.tenantCustomer.globalCustomer.name,
      },
    };
  }

  async list(tenantId: string, options: ListSalesQueryOptions): Promise<ListSalesResult> {
    const search = options.search?.trim();
    const cursorWhere = buildCursorWhere(options);

    const andFilters: Prisma.SaleWhereInput[] = [];

    if (search) {
      andFilters.push({
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { invoiceNumber: { contains: search, mode: 'insensitive' } },
          {
            tenantCustomer: {
              globalCustomer: {
                OR: [
                  { user: { phone: { contains: search } } },
                  { name: { contains: search, mode: 'insensitive' } },
                ],
              },
            },
          },
        ],
      });
    }

    if (cursorWhere) {
      andFilters.push(cursorWhere);
    }

    const hasExplicitStatusFilter = Boolean(options.statuses?.length || options.status);
    if (!options.includeArchived && !hasExplicitStatusFilter) {
      andFilters.push({ status: { not: 'ARCHIVED' } });
    }

    if (options.contractNumber?.trim()) {
      andFilters.push({ contractNumber: options.contractNumber.trim() });
    }

    if (options.includeDeleted) {
      return runWithBypassSoftDelete(async () => {
        const deletedWhere: Prisma.SaleWhereInput = {
          tenantId,
          deletedAt: { not: null },
          ...(options.branchIds?.length ? { branchId: { in: options.branchIds } } : {}),
          ...(options.createdByStaffId ? { createdByStaffId: options.createdByStaffId } : {}),
          ...(andFilters.length > 0 ? { AND: andFilters } : {}),
        };

        const rows = await this.prisma.sale.findMany({
          where: deletedWhere,
          include: {
            tenantCustomer: {
              include: {
                globalCustomer: {
                  select: globalCustomerListSelect,
                },
              },
            },
            _count: {
              select: {
                installments: {
                  where: { status: 'PAID', deletedAt: null },
                },
              },
            },
          },
          orderBy: buildOrderBy(options.sort),
          take: options.limit + 1,
        });

        const hasMore = rows.length > options.limit;
        const page = hasMore ? rows.slice(0, options.limit) : rows;

        return {
          items: page.map((row) => toListItem(row as SaleWithRelations)),
          hasMore,
        };
      });
    }

    const where: Prisma.SaleWhereInput = {
      tenantId,
      deletedAt: null,
      ...(options.statuses?.length
        ? { status: { in: options.statuses } }
        : options.status
          ? { status: options.status }
          : {}),
      ...(options.branchIds?.length ? { branchId: { in: options.branchIds } } : {}),
      ...(options.createdByStaffId ? { createdByStaffId: options.createdByStaffId } : {}),
      ...(options.from || options.to
        ? {
            contractDate: {
              ...(options.from ? { gte: options.from } : {}),
              ...(options.to ? { lte: options.to } : {}),
            },
          }
        : {}),
      ...(andFilters.length > 0 ? { AND: andFilters } : {}),
    };

    const rows = await this.prisma.sale.findMany({
      where,
      include: {
        tenantCustomer: {
          include: {
            globalCustomer: {
              select: globalCustomerListSelect,
            },
          },
        },
        _count: {
          select: {
            installments: {
              where: { status: 'PAID', deletedAt: null },
            },
          },
        },
      },
      orderBy: buildOrderBy(options.sort),
      take: options.limit + 1,
    });

    const hasMore = rows.length > options.limit;
    const page = hasMore ? rows.slice(0, options.limit) : rows;

    return {
      items: page.map((row) => toListItem(row as SaleWithRelations)),
      hasMore,
    };
  }

  async update(input: UpdateSalePersistenceInput, tx?: OutboxTransaction): Promise<SaleRecord> {
    const client = resolveClient(this.prisma, tx);

    const row = await client.sale.findFirst({
      where: {
        id: input.id,
        tenantId: input.tenantId,
        deletedAt: null,
        version: input.version,
      },
    });

    if (!row) {
      const current = await client.sale.findFirst({
        where: { id: input.id, tenantId: input.tenantId },
      });

      if (!current) {
        throw new ApplicationError('SALE_NOT_FOUND', 'Sale was not found.', 404);
      }

      if (current.deletedAt) {
        throw new ApplicationError('SALE_NOT_FOUND', 'Sale was not found.', 404);
      }

      throw new ApplicationError(
        'OPTIMISTIC_LOCK_CONFLICT',
        'Sale was updated by another user. Refresh and try again.',
        409,
      );
    }

    const updated = await client.sale.update({
      where: { id: input.id },
      data: {
        status: input.status,
        cancelledAt: input.cancelledAt,
        cancelledById: input.cancelledById,
        cancelReason: input.cancelReason,
        version: { increment: 1 },
        updatedById: input.updatedById,
      },
    });

    return saleToRecord(updated);
  }

  async updateFinancials(
    input: UpdateSaleFinancialsPersistenceInput,
    tx?: OutboxTransaction,
  ): Promise<SaleRecord> {
    const client = resolveClient(this.prisma, tx);

    const row = await client.sale.findFirst({
      where: {
        id: input.id,
        tenantId: input.tenantId,
        deletedAt: null,
        version: input.version,
      },
    });

    if (!row) {
      const current = await client.sale.findFirst({
        where: { id: input.id, tenantId: input.tenantId },
      });

      if (!current || current.deletedAt) {
        throw new ApplicationError('SALE_NOT_FOUND', 'Sale was not found.', 404);
      }

      throw new ApplicationError(
        'VERSION_CONFLICT',
        'Sale was updated by another user. Refresh and try again.',
        409,
      );
    }

    const updated = await client.sale.update({
      where: { id: input.id },
      data: {
        ...(input.totalAmountRial !== undefined ? { totalAmountRial: input.totalAmountRial } : {}),
        ...(input.taxRial !== undefined ? { taxRial: input.taxRial } : {}),
        ...(input.taxRateBps !== undefined ? { taxRateBps: input.taxRateBps } : {}),
        ...(input.taxInclusive !== undefined ? { taxInclusive: input.taxInclusive } : {}),
        ...(input.insuranceRial !== undefined ? { insuranceRial: input.insuranceRial } : {}),
        ...(input.insuranceProvider !== undefined
          ? { insuranceProvider: input.insuranceProvider }
          : {}),
        ...(input.insurancePolicyNumber !== undefined
          ? { insurancePolicyNumber: input.insurancePolicyNumber }
          : {}),
        ...(input.insuranceExpiresAt !== undefined
          ? { insuranceExpiresAt: input.insuranceExpiresAt }
          : {}),
        version: { increment: 1 },
        updatedById: input.updatedById,
      },
    });

    return saleToRecord(updated);
  }

  async extend(input: ExtendSalePersistenceInput, tx?: OutboxTransaction): Promise<SaleRecord> {
    const client = resolveClient(this.prisma, tx);

    const row = await client.sale.findFirst({
      where: {
        id: input.id,
        tenantId: input.tenantId,
        deletedAt: null,
        version: input.version,
      },
    });

    if (!row) {
      const current = await client.sale.findFirst({
        where: { id: input.id, tenantId: input.tenantId },
      });

      if (!current || current.deletedAt) {
        throw new ApplicationError('SALE_NOT_FOUND', 'Sale was not found.', 404);
      }

      throw new ApplicationError(
        'VERSION_CONFLICT',
        'Sale was updated by another user. Refresh and try again.',
        409,
      );
    }

    const updated = await client.sale.update({
      where: { id: input.id },
      data: {
        extendedFromSaleId: input.extendedFromSaleId,
        installmentCount: input.installmentCount,
        metadata: input.metadata ?? undefined,
        version: { increment: 1 },
        updatedById: input.updatedById,
      },
    });

    return saleToRecord(updated);
  }

  async terminate(
    input: TerminateSalePersistenceInput,
    tx?: OutboxTransaction,
  ): Promise<SaleRecord> {
    const client = resolveClient(this.prisma, tx);

    const row = await client.sale.findFirst({
      where: {
        id: input.id,
        tenantId: input.tenantId,
        deletedAt: null,
        version: input.version,
      },
    });

    if (!row) {
      const current = await client.sale.findFirst({
        where: { id: input.id, tenantId: input.tenantId },
      });

      if (!current || current.deletedAt) {
        throw new ApplicationError('SALE_NOT_FOUND', 'Sale was not found.', 404);
      }

      throw new ApplicationError(
        'VERSION_CONFLICT',
        'Sale was updated by another user. Refresh and try again.',
        409,
      );
    }

    const updated = await client.sale.update({
      where: { id: input.id },
      data: {
        status: 'TERMINATED',
        terminatedAt: input.terminatedAt,
        terminatedById: input.terminatedById,
        terminateReason: input.terminateReason,
        version: { increment: 1 },
        updatedById: input.updatedById,
      },
    });

    return saleToRecord(updated);
  }

  async close(input: CloseSalePersistenceInput, tx?: OutboxTransaction): Promise<SaleRecord> {
    const client = resolveClient(this.prisma, tx);

    const row = await client.sale.findFirst({
      where: {
        id: input.id,
        tenantId: input.tenantId,
        deletedAt: null,
        version: input.version,
      },
    });

    if (!row) {
      const current = await client.sale.findFirst({
        where: { id: input.id, tenantId: input.tenantId },
      });

      if (!current || current.deletedAt) {
        throw new ApplicationError('SALE_NOT_FOUND', 'Sale was not found.', 404);
      }

      throw new ApplicationError(
        'VERSION_CONFLICT',
        'Sale was updated by another user. Refresh and try again.',
        409,
      );
    }

    const updated = await client.sale.update({
      where: { id: input.id },
      data: {
        status: 'CLOSED',
        closedAt: input.closedAt,
        closedById: input.closedById,
        closeReason: input.closeReason,
        version: { increment: 1 },
        updatedById: input.updatedById,
      },
    });

    return saleToRecord(updated);
  }

  async archive(input: ArchiveSalePersistenceInput, tx?: OutboxTransaction): Promise<SaleRecord> {
    const client = resolveClient(this.prisma, tx);

    const row = await client.sale.findFirst({
      where: {
        id: input.id,
        tenantId: input.tenantId,
        deletedAt: null,
        version: input.version,
      },
    });

    if (!row) {
      const current = await client.sale.findFirst({
        where: { id: input.id, tenantId: input.tenantId },
      });

      if (!current || current.deletedAt) {
        throw new ApplicationError('SALE_NOT_FOUND', 'Sale was not found.', 404);
      }

      throw new ApplicationError(
        'VERSION_CONFLICT',
        'Sale was updated by another user. Refresh and try again.',
        409,
      );
    }

    const updated = await client.sale.update({
      where: { id: input.id },
      data: {
        status: 'ARCHIVED',
        archivedAt: input.archivedAt,
        archivedById: input.archivedById,
        archiveReason: input.archiveReason,
        metadata:
          input.metadata === null
            ? Prisma.JsonNull
            : (input.metadata as Prisma.InputJsonValue | undefined),
        version: { increment: 1 },
        updatedById: input.updatedById,
      },
    });

    return saleToRecord(updated);
  }

  async unarchive(
    input: UnarchiveSalePersistenceInput,
    tx?: OutboxTransaction,
  ): Promise<SaleRecord> {
    const client = resolveClient(this.prisma, tx);

    const row = await client.sale.findFirst({
      where: {
        id: input.id,
        tenantId: input.tenantId,
        deletedAt: null,
        version: input.version,
      },
    });

    if (!row) {
      const current = await client.sale.findFirst({
        where: { id: input.id, tenantId: input.tenantId },
      });

      if (!current || current.deletedAt) {
        throw new ApplicationError('SALE_NOT_FOUND', 'Sale was not found.', 404);
      }

      throw new ApplicationError(
        'VERSION_CONFLICT',
        'Sale was updated by another user. Refresh and try again.',
        409,
      );
    }

    const updated = await client.sale.update({
      where: { id: input.id },
      data: {
        status: input.status,
        archivedAt: null,
        archivedById: null,
        archiveReason: null,
        metadata:
          input.metadata === null
            ? Prisma.JsonNull
            : (input.metadata as Prisma.InputJsonValue | undefined),
        version: { increment: 1 },
        updatedById: input.updatedById,
      },
    });

    return saleToRecord(updated);
  }

  async softDelete(command: SoftDeleteCommand, tx?: OutboxTransaction): Promise<SaleRecord> {
    const client = resolveClient(this.prisma, tx);

    const row = await client.sale.findFirst({
      where: {
        id: command.id,
        tenantId: command.tenantId,
        deletedAt: null,
      },
    });

    if (!row) {
      throw new ApplicationError('SALE_NOT_FOUND', 'Sale was not found.', 404);
    }

    const updated = await client.sale.update({
      where: { id: command.id },
      data: {
        deletedAt: new Date(),
        deletedById: command.deletedById,
        deleteReason: command.deleteReason ?? null,
        version: { increment: 1 },
        updatedById: command.deletedById,
      },
    });

    return saleToRecord(updated);
  }

  async restore(command: RestoreCommand, tx?: OutboxTransaction): Promise<SaleRecord> {
    const client = resolveClient(this.prisma, tx);

    return runWithBypassSoftDelete(async () => {
      const row = await client.sale.findFirst({
        where: {
          id: command.id,
          tenantId: command.tenantId,
          deletedAt: { not: null },
        },
      });

      if (!row) {
        throw new ApplicationError('SALE_NOT_FOUND', 'Sale was not found.', 404);
      }

      const updated = await client.sale.update({
        where: { id: command.id },
        data: {
          deletedAt: null,
          deletedById: null,
          deleteReason: null,
          version: { increment: 1 },
          updatedById: command.restoredById,
        },
      });

      return saleToRecord(updated);
    });
  }

  async findDeletedById(
    tenantId: string,
    saleId: string,
    _tx?: OutboxTransaction,
  ): Promise<SaleRecord | null> {
    return runWithBypassSoftDelete(async () => {
      const row = await this.prisma.sale.findFirst({
        where: { id: saleId, tenantId, deletedAt: { not: null } },
      });

      return row ? saleToRecord(row) : null;
    });
  }

  async countActive(tenantId: string, tx?: OutboxTransaction): Promise<number> {
    const client = resolveClient(this.prisma, tx);

    return client.sale.count({
      where: { tenantId, status: 'ACTIVE', deletedAt: null },
    });
  }

  async hasSaleForTenantCustomerInBranches(
    tenantId: string,
    tenantCustomerId: string,
    branchIds: string[],
  ): Promise<boolean> {
    if (branchIds.length === 0) {
      return false;
    }

    const count = await this.prisma.sale.count({
      where: {
        tenantId,
        tenantCustomerId,
        deletedAt: null,
        branchId: { in: branchIds },
      },
    });

    return count > 0;
  }

  async hasSaleForTenantCustomerByStaff(
    tenantId: string,
    tenantCustomerId: string,
    createdByStaffId: string,
  ): Promise<boolean> {
    const count = await this.prisma.sale.count({
      where: {
        tenantId,
        tenantCustomerId,
        deletedAt: null,
        createdByStaffId,
      },
    });

    return count > 0;
  }

  async getSalesSummaryForTenantCustomer(
    tenantId: string,
    tenantCustomerId: string,
    scope: TenantCustomerSalesSummaryScope,
  ): Promise<TenantCustomerSalesSummary> {
    const saleWhere = this.buildCustomerSaleScopeWhere(tenantId, tenantCustomerId, scope);

    const [activeSalesCount, completedSalesCount, lastSale, overdueAggregate] =
      await Promise.all([
        this.prisma.sale.count({
          where: { ...saleWhere, status: 'ACTIVE' },
        }),
        this.prisma.sale.count({
          where: { ...saleWhere, status: 'COMPLETED' },
        }),
        this.prisma.sale.findFirst({
          where: saleWhere,
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
        }),
        this.prisma.installment.aggregate({
          where: {
            tenantId,
            deletedAt: null,
            status: 'OVERDUE',
            sale: saleWhere,
          },
          _sum: { amountRial: true },
        }),
      ]);

    return {
      activeSalesCount,
      completedSalesCount,
      totalOverdueRial: overdueAggregate._sum.amountRial ?? 0n,
      lastSaleAt: lastSale?.createdAt ?? null,
    };
  }

  private buildCustomerSaleScopeWhere(
    tenantId: string,
    tenantCustomerId: string,
    scope: TenantCustomerSalesSummaryScope,
  ): Prisma.SaleWhereInput {
    const base: Prisma.SaleWhereInput = {
      tenantId,
      tenantCustomerId,
      deletedAt: null,
    };

    switch (scope.dataScope) {
      case 'all':
        return base;
      case 'branch':
        if (!scope.branchIds?.length) {
          return { ...base, id: { in: [] } };
        }

        return { ...base, branchId: { in: scope.branchIds } };
      case 'own':
        return { ...base, createdByStaffId: scope.actorId };
      default: {
        const _exhaustive: never = scope.dataScope;
        return _exhaustive;
      }
    }
  }

  async reassignTenantCustomer(
    tenantId: string,
    sourceTenantCustomerId: string,
    targetTenantCustomerId: string,
    updatedById: string,
    tx?: OutboxTransaction,
  ): Promise<number> {
    const client = resolveClient(this.prisma, tx);
    const result = await client.sale.updateMany({
      where: {
        tenantId,
        tenantCustomerId: sourceTenantCustomerId,
        deletedAt: null,
      },
      data: {
        tenantCustomerId: targetTenantCustomerId,
        updatedById,
        version: { increment: 1 },
      },
    });

    return result.count;
  }

  async countPendingPaymentAttemptsForCustomer(
    tenantId: string,
    tenantCustomerId: string,
  ): Promise<number> {
    return this.prisma.paymentAttempt.count({
      where: {
        tenantId,
        deletedAt: null,
        status: 'PENDING',
        installment: {
          deletedAt: null,
          sale: {
            tenantId,
            tenantCustomerId,
            deletedAt: null,
          },
        },
      },
    });
  }
}
