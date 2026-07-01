import type {
  IInstallmentRepository,
  InstallmentListItem,
  InstallmentRecord,
  ListInstallmentsQueryOptions,
  ListInstallmentsResult,
  OutboxTransaction,
  SaveInstallmentPersistenceInput,
} from '@hivork/application';
import { Injectable } from '@nestjs/common';
import { Prisma, type Installment } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service.js';
import {
  globalCustomerListSelect,
  resolveGlobalCustomerPhone,
} from './mappers/global-customer-phone.js';

type InstallmentWriteClient = Pick<PrismaService, 'installment'>;

function resolveClient(prisma: PrismaService, tx?: OutboxTransaction): InstallmentWriteClient {
  return (tx ?? prisma) as InstallmentWriteClient;
}

function installmentToRecord(row: Installment): InstallmentRecord {
  return {
    id: row.id,
    saleId: row.saleId,
    tenantId: row.tenantId,
    sequenceNumber: row.sequenceNumber,
    dueDate: row.dueDate,
    amountRial: row.amountRial,
    status: row.status,
    paidAt: row.paidAt,
    confirmedByStaffId: row.confirmedByStaffId,
    waivedByStaffId: row.waivedByStaffId,
    waiveReason: row.waiveReason,
    version: row.version,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

type InstallmentWithSale = Installment & {
  sale: {
    branchId: string;
    tenantCustomer: {
      id: string;
      globalCustomer: {
        id: string;
        name: string | null;
        user: { phone: string };
      };
    };
  };
};

function toListItem(row: InstallmentWithSale): InstallmentListItem {
  return {
    installment: installmentToRecord(row),
    branchId: row.sale.branchId,
    customer: {
      id: row.sale.tenantCustomer.id,
      phone: resolveGlobalCustomerPhone(row.sale.tenantCustomer.globalCustomer),
      name: row.sale.tenantCustomer.globalCustomer.name,
    },
  };
}

function buildSaleWhere(
  tenantId: string,
  options: ListInstallmentsQueryOptions,
): Prisma.SaleWhereInput {
  return {
    deletedAt: null,
    tenantId,
    ...(options.activeSaleOnly ? { status: 'ACTIVE' } : {}),
    ...(options.branchIds?.length ? { branchId: { in: options.branchIds } } : {}),
    ...(options.createdByStaffId ? { createdByStaffId: options.createdByStaffId } : {}),
    ...(options.saleId ? { id: options.saleId } : {}),
    ...(options.tenantCustomerId ? { tenantCustomerId: options.tenantCustomerId } : {}),
    ...(options.search
      ? {
          tenantCustomer: {
            globalCustomer: {
              OR: [
                { name: { contains: options.search, mode: 'insensitive' } },
                { user: { phone: { contains: options.search } } },
              ],
            },
          },
        }
      : {}),
  };
}

function buildCursorWhere(
  options: ListInstallmentsQueryOptions,
): Prisma.InstallmentWhereInput | undefined {
  if (!options.cursor) {
    return undefined;
  }

  const { id, dueDate, sequenceNumber } = options.cursor;

  switch (options.sort) {
    case 'dueDate:asc':
      return {
        OR: [
          { dueDate: { gt: dueDate! } },
          { dueDate: dueDate!, sequenceNumber: { gt: sequenceNumber ?? 0 } },
          {
            dueDate: dueDate!,
            sequenceNumber: sequenceNumber ?? 0,
            id: { gt: id },
          },
        ],
      };
    case 'dueDate:desc':
      return {
        OR: [
          { dueDate: { lt: dueDate! } },
          { dueDate: dueDate!, id: { lt: id } },
        ],
      };
    case 'sequenceNumber:asc':
      return {
        OR: [
          { sequenceNumber: { gt: sequenceNumber! } },
          { sequenceNumber: sequenceNumber!, id: { gt: id } },
        ],
      };
    case 'daysOverdue:desc':
      return {
        OR: [
          { dueDate: { gt: dueDate! } },
          { dueDate: dueDate!, sequenceNumber: { gt: sequenceNumber ?? 0 } },
          {
            dueDate: dueDate!,
            sequenceNumber: sequenceNumber ?? 0,
            id: { gt: id },
          },
        ],
      };
  }
}

function buildOrderBy(
  sort: ListInstallmentsQueryOptions['sort'],
): Prisma.InstallmentOrderByWithRelationInput[] {
  switch (sort) {
    case 'dueDate:desc':
      return [{ dueDate: 'desc' }, { id: 'desc' }];
    case 'sequenceNumber:asc':
      return [{ sequenceNumber: 'asc' }, { id: 'asc' }];
    case 'daysOverdue:desc':
      return [{ dueDate: 'asc' }, { sequenceNumber: 'asc' }, { id: 'asc' }];
    case 'dueDate:asc':
    default:
      return [{ dueDate: 'asc' }, { sequenceNumber: 'asc' }, { id: 'asc' }];
  }
}

function buildWhere(
  tenantId: string,
  options: ListInstallmentsQueryOptions,
): Prisma.InstallmentWhereInput {
  const cursorWhere = buildCursorWhere(options);
  const andFilters: Prisma.InstallmentWhereInput[] = [];

  if (cursorWhere) {
    andFilters.push(cursorWhere);
  }

  if (options.overdueOnly && options.overdueBefore) {
    andFilters.push({
      OR: [
        { status: 'OVERDUE' },
        { status: 'PENDING', dueDate: { lt: options.overdueBefore } },
      ],
    });
  }

  if (options.maxDueDate) {
    andFilters.push({ dueDate: { lte: options.maxDueDate } });
  }

  return {
    tenantId,
    deletedAt: null,
    ...(options.statuses?.length
      ? { status: { in: options.statuses } }
      : options.status
        ? { status: options.status }
        : {}),
    ...(options.from || options.to
      ? {
          dueDate: {
            ...(options.from ? { gte: options.from } : {}),
            ...(options.to ? { lte: options.to } : {}),
          },
        }
      : {}),
    sale: buildSaleWhere(tenantId, options),
    ...(andFilters.length > 0 ? { AND: andFilters } : {}),
  };
}

@Injectable()
export class PrismaInstallmentRepository implements IInstallmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async saveMany(
    inputs: SaveInstallmentPersistenceInput[],
    tx?: OutboxTransaction,
  ): Promise<InstallmentRecord[]> {
    const client = resolveClient(this.prisma, tx);

    const rows = await Promise.all(
      inputs.map((input) =>
        client.installment.create({
          data: {
            id: input.id,
            saleId: input.saleId,
            tenantId: input.tenantId,
            sequenceNumber: input.sequenceNumber,
            dueDate: input.dueDate,
            amountRial: input.amountRial,
            status: input.status,
            createdById: input.createdById,
            updatedById: input.createdById,
          },
        }),
      ),
    );

    return rows.map(installmentToRecord);
  }

  async findBySaleId(
    tenantId: string,
    saleId: string,
    tx?: OutboxTransaction,
  ): Promise<InstallmentRecord[]> {
    const client = resolveClient(this.prisma, tx);

    const rows = await client.installment.findMany({
      where: { tenantId, saleId, deletedAt: null },
      orderBy: { sequenceNumber: 'asc' },
    });

    return rows.map(installmentToRecord);
  }

  async list(
    tenantId: string,
    options: ListInstallmentsQueryOptions,
  ): Promise<ListInstallmentsResult> {
    const where = buildWhere(tenantId, options);

    const [rows, total, amountAggregate] = await Promise.all([
      this.prisma.installment.findMany({
        where,
        include: {
          sale: {
            include: {
              tenantCustomer: {
                include: {
                  globalCustomer: {
                    select: globalCustomerListSelect,
                  },
                },
              },
            },
          },
        },
        orderBy: buildOrderBy(options.sort),
        take: options.limit + 1,
      }),
      this.prisma.installment.count({ where }),
      options.includeTotalAmountRial
        ? this.prisma.installment.aggregate({
            where,
            _sum: { amountRial: true },
          })
        : Promise.resolve(null),
    ]);

    const hasMore = rows.length > options.limit;
    const page = hasMore ? rows.slice(0, options.limit) : rows;

    return {
      items: page.map((row) => toListItem(row as InstallmentWithSale)),
      hasMore,
      total,
      ...(options.includeTotalAmountRial
        ? { totalAmountRial: amountAggregate?._sum.amountRial ?? 0n }
        : {}),
    };
  }
}
