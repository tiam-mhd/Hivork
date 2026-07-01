import type {
  ISaleRepository,
  ListSalesQueryOptions,
  ListSalesResult,
  OutboxTransaction,
  SaleDetailRecord,
  SaleListItem,
  SaleRecord,
  SaveSalePersistenceInput,
  TenantCustomerSalesSummary,
  TenantCustomerSalesSummaryScope,
  UpdateSalePersistenceInput,
} from '@hivork/application';
import { ApplicationError } from '@hivork/application';
import { Injectable } from '@nestjs/common';
import { Prisma, type Sale } from '@prisma/client';

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
    totalAmountRial: row.totalAmountRial,
    downPaymentRial: row.downPaymentRial,
    discountRial: row.discountRial,
    taxRial: row.taxRial,
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
}
