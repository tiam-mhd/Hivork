import type {
  ApplyInstallmentPaymentInput,
  ApplyInstallmentPaymentResult,
  ApplyInstallmentPenaltyInput,
  ApplyInstallmentPenaltyResult,
  ApplyInstallmentDiscountInput,
  ApplyInstallmentDiscountResult,
  IInstallmentRepository,
  InstallmentListItem,
  InstallmentRecord,
  InstallmentWithSaleRecord,
  ListInstallmentsQueryOptions,
  ListInstallmentsResult,
  OutboxTransaction,
  RegenerateInstallmentScheduleInput,
  RescheduleInstallmentDueDateInput,
  RescheduleInstallmentDueDateResult,
  SaveInstallmentPersistenceInput,
  SoftDeleteInstallmentsForRegenerateInput,
  SoftDeleteInstallmentsForMergeInput,
  WaiveInstallmentPersistenceInput,
  WaiveInstallmentPersistenceResult,
} from '@hivork/application';
import { ApplicationError } from '@hivork/application';
import { calculateInstallmentSchedule } from '@hivork/domain';
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
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
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

  async regeneratePendingAmounts(
    input: RegenerateInstallmentScheduleInput,
    tx?: OutboxTransaction,
  ): Promise<InstallmentRecord[]> {
    const client = resolveClient(this.prisma, tx);
    const installments = await this.findBySaleId(input.tenantId, input.saleId, tx);

    if (installments.length === 0) {
      throw new ApplicationError('INSTALLMENT_NOT_FOUND', 'Sale has no installments.', 404);
    }

    const schedule = calculateInstallmentSchedule({
      totalAmountRial: input.totalAmountRial,
      downPaymentRial: input.downPaymentRial,
      installmentCount: input.installmentCount,
      firstDueDate: input.firstDueDate,
      intervalDays: input.intervalDays,
    });

    const scheduleBySequence = new Map(schedule.map((item) => [item.sequenceNumber, item]));

    const updatedRows = await Promise.all(
      installments.map(async (installment) => {
        if (installment.status === 'PAID' || installment.status === 'WAIVED') {
          return installment;
        }

        const scheduled = scheduleBySequence.get(installment.sequenceNumber);
        if (!scheduled) {
          return installment;
        }

        const row = await client.installment.update({
          where: { id: installment.id },
          data: {
            amountRial: scheduled.amountRial,
            updatedById: input.updatedById,
            version: { increment: 1 },
          },
        });

        return installmentToRecord(row);
      }),
    );

    return updatedRows;
  }

  async findByIdWithSale(
    tenantId: string,
    installmentId: string,
    tx?: OutboxTransaction,
  ): Promise<InstallmentWithSaleRecord | null> {
    const client = resolveClient(this.prisma, tx);

    const row = await client.installment.findFirst({
      where: { id: installmentId, tenantId, deletedAt: null },
      include: {
        sale: {
          select: {
            id: true,
            branchId: true,
            tenantCustomerId: true,
            status: true,
            archivedAt: true,
            createdByStaffId: true,
            deletedAt: true,
          },
        },
      },
    });

    if (!row || row.sale.deletedAt) {
      return null;
    }

    return {
      installment: installmentToRecord(row),
      sale: {
        id: row.sale.id,
        branchId: row.sale.branchId,
        tenantCustomerId: row.sale.tenantCustomerId,
        status: row.sale.status,
        archivedAt: row.sale.archivedAt,
        createdByStaffId: row.sale.createdByStaffId,
      },
    };
  }

  async findByIdsForSale(
    tenantId: string,
    saleId: string,
    installmentIds: string[],
    tx?: OutboxTransaction,
  ): Promise<InstallmentRecord[]> {
    if (installmentIds.length === 0) {
      return [];
    }

    const client = resolveClient(this.prisma, tx);

    const rows = await client.installment.findMany({
      where: {
        tenantId,
        saleId,
        id: { in: installmentIds },
        deletedAt: null,
      },
    });

    return rows.map(installmentToRecord);
  }

  async rescheduleDueDate(
    input: RescheduleInstallmentDueDateInput,
    tx?: OutboxTransaction,
  ): Promise<RescheduleInstallmentDueDateResult> {
    const client = resolveClient(this.prisma, tx);

    const updated = await client.installment.updateMany({
      where: {
        id: input.installmentId,
        tenantId: input.tenantId,
        version: input.expectedVersion,
        deletedAt: null,
      },
      data: {
        dueDate: input.newDueDate,
        ...(input.status ? { status: input.status } : {}),
        updatedById: input.updatedById,
        version: { increment: 1 },
      },
    });

    if (updated.count === 1) {
      const row = await client.installment.findFirstOrThrow({
        where: { id: input.installmentId, tenantId: input.tenantId, deletedAt: null },
      });
      return { outcome: 'updated', installment: installmentToRecord(row) };
    }

    const existing = await client.installment.findFirst({
      where: { id: input.installmentId, tenantId: input.tenantId, deletedAt: null },
    });

    if (!existing) {
      return { outcome: 'not_found' };
    }

    return { outcome: 'version_conflict', currentVersion: existing.version };
  }

  async applyPaymentConfirm(
    input: ApplyInstallmentPaymentInput,
    tx?: OutboxTransaction,
  ): Promise<ApplyInstallmentPaymentResult> {
    const client = resolveClient(this.prisma, tx);

    const updated = await client.installment.updateMany({
      where: {
        id: input.installmentId,
        tenantId: input.tenantId,
        version: input.expectedVersion,
        deletedAt: null,
      },
      data: {
        status: input.status,
        paidAt: input.paidAt,
        confirmedByStaffId: input.confirmedByStaffId,
        metadata: input.metadata as Prisma.InputJsonValue,
        updatedById: input.updatedById,
        version: { increment: 1 },
      },
    });

    if (updated.count === 1) {
      const row = await client.installment.findFirstOrThrow({
        where: { id: input.installmentId, tenantId: input.tenantId, deletedAt: null },
      });
      return { outcome: 'updated', installment: installmentToRecord(row) };
    }

    const existing = await client.installment.findFirst({
      where: { id: input.installmentId, tenantId: input.tenantId, deletedAt: null },
    });

    if (!existing) {
      return { outcome: 'not_found' };
    }

    return { outcome: 'version_conflict', currentVersion: existing.version };
  }

  async waive(
    input: WaiveInstallmentPersistenceInput,
    tx?: OutboxTransaction,
  ): Promise<WaiveInstallmentPersistenceResult> {
    const client = resolveClient(this.prisma, tx);

    const updated = await client.installment.updateMany({
      where: {
        id: input.installmentId,
        tenantId: input.tenantId,
        version: input.expectedVersion,
        status: { in: ['PENDING', 'OVERDUE'] },
        deletedAt: null,
      },
      data: {
        status: 'WAIVED',
        waivedByStaffId: input.waivedByStaffId,
        waiveReason: input.waiveReason,
        updatedById: input.updatedById,
        version: { increment: 1 },
      },
    });

    if (updated.count === 1) {
      const row = await client.installment.findFirstOrThrow({
        where: { id: input.installmentId, tenantId: input.tenantId, deletedAt: null },
      });
      return { outcome: 'updated', installment: installmentToRecord(row) };
    }

    const existing = await client.installment.findFirst({
      where: { id: input.installmentId, tenantId: input.tenantId, deletedAt: null },
    });

    if (!existing) {
      return { outcome: 'not_found' };
    }

    if (existing.status !== 'PENDING' && existing.status !== 'OVERDUE') {
      return { outcome: 'status_invalid', status: existing.status };
    }

    return { outcome: 'version_conflict', currentVersion: existing.version };
  }

  async applyPenaltyAmount(
    input: ApplyInstallmentPenaltyInput,
    tx?: OutboxTransaction,
  ): Promise<ApplyInstallmentPenaltyResult> {
    const client = resolveClient(this.prisma, tx);

    const updated = await client.installment.updateMany({
      where: {
        id: input.installmentId,
        tenantId: input.tenantId,
        version: input.expectedVersion,
        status: 'OVERDUE',
        deletedAt: null,
      },
      data: {
        amountRial: { increment: input.penaltyAmountRial },
        updatedById: input.updatedById,
        version: { increment: 1 },
      },
    });

    if (updated.count === 1) {
      const row = await client.installment.findFirstOrThrow({
        where: { id: input.installmentId, tenantId: input.tenantId, deletedAt: null },
      });
      return { outcome: 'updated', installment: installmentToRecord(row) };
    }

    const existing = await client.installment.findFirst({
      where: { id: input.installmentId, tenantId: input.tenantId, deletedAt: null },
    });

    if (!existing) {
      return { outcome: 'not_found' };
    }

    if (existing.status !== 'OVERDUE') {
      return { outcome: 'status_invalid', status: existing.status };
    }

    return { outcome: 'version_conflict', currentVersion: existing.version };
  }

  async applyDiscountAmount(
    input: ApplyInstallmentDiscountInput,
    tx?: OutboxTransaction,
  ): Promise<ApplyInstallmentDiscountResult> {
    const client = resolveClient(this.prisma, tx);

    const updated = await client.installment.updateMany({
      where: {
        id: input.installmentId,
        tenantId: input.tenantId,
        version: input.expectedVersion,
        status: { in: ['PENDING', 'OVERDUE'] },
        deletedAt: null,
        amountRial: { gte: input.discountAmountRial },
      },
      data: {
        amountRial: { decrement: input.discountAmountRial },
        updatedById: input.updatedById,
        version: { increment: 1 },
      },
    });

    if (updated.count === 1) {
      const row = await client.installment.findFirstOrThrow({
        where: { id: input.installmentId, tenantId: input.tenantId, deletedAt: null },
      });
      return { outcome: 'updated', installment: installmentToRecord(row) };
    }

    const existing = await client.installment.findFirst({
      where: { id: input.installmentId, tenantId: input.tenantId, deletedAt: null },
    });

    if (!existing) {
      return { outcome: 'not_found' };
    }

    if (existing.status !== 'PENDING' && existing.status !== 'OVERDUE') {
      return { outcome: 'status_invalid', status: existing.status };
    }

    if (existing.amountRial < input.discountAmountRial) {
      return { outcome: 'amount_invalid' };
    }

    return { outcome: 'version_conflict', currentVersion: existing.version };
  }

  async syncSaleOutstandingRial(
    tenantId: string,
    saleId: string,
    tx?: OutboxTransaction,
  ): Promise<bigint> {
    const client = (tx ?? this.prisma) as PrismaService;
    const rows = await client.installment.findMany({
      where: { tenantId, saleId, deletedAt: null },
      select: { status: true, amountRial: true },
    });

    const outstanding = rows
      .filter((row) => row.status === 'PENDING' || row.status === 'OVERDUE')
      .reduce((sum, row) => sum + row.amountRial, 0n);

    const sale = await client.sale.findFirst({
      where: { id: saleId, tenantId, deletedAt: null },
      select: { metadata: true },
    });

    if (sale) {
      const metadata =
        sale.metadata && typeof sale.metadata === 'object' && !Array.isArray(sale.metadata)
          ? { ...(sale.metadata as Record<string, unknown>) }
          : {};

      metadata.remainingRial = outstanding.toString();

      await client.sale.updateMany({
        where: { id: saleId, tenantId, deletedAt: null },
        data: { metadata: metadata as Prisma.InputJsonValue },
      });
    }

    return outstanding;
  }

  async getMaxSequenceNumber(
    tenantId: string,
    saleId: string,
    tx?: OutboxTransaction,
  ): Promise<number> {
    const client = (tx ?? this.prisma) as Pick<PrismaService, '$queryRaw'>;

    const rows = await client.$queryRaw<Array<{ max: number | null }>>`
      SELECT MAX(sequence_number) AS max
      FROM installments
      WHERE tenant_id = ${tenantId}::uuid
        AND sale_id = ${saleId}::uuid
    `;

    return rows[0]?.max ?? 0;
  }

  async softDeleteForRegenerate(
    input: SoftDeleteInstallmentsForRegenerateInput,
    tx?: OutboxTransaction,
  ): Promise<number> {
    if (input.installmentIds.length === 0) {
      return 0;
    }

    const client = (tx ?? this.prisma) as Pick<PrismaService, '$executeRaw'>;

    return client.$executeRaw`
      UPDATE installments
      SET
        deleted_at = NOW(),
        deleted_by_id = ${input.deletedById}::uuid,
        delete_reason = ${input.deleteReason},
        updated_by_id = ${input.deletedById}::uuid,
        version = version + 1
      WHERE tenant_id = ${input.tenantId}::uuid
        AND id = ANY(${input.installmentIds}::uuid[])
        AND deleted_at IS NULL
    `;
  }

  async softDeleteForMerge(
    input: SoftDeleteInstallmentsForMergeInput,
    tx?: OutboxTransaction,
  ): Promise<number> {
    if (input.installmentIds.length === 0) {
      return 0;
    }

    const client = (tx ?? this.prisma) as Pick<PrismaService, '$executeRaw'>;

    return client.$executeRaw`
      UPDATE installments
      SET
        deleted_at = NOW(),
        deleted_by_id = ${input.deletedById}::uuid,
        delete_reason = ${input.deleteReason},
        sequence_number = 1000000 + sequence_number,
        updated_by_id = ${input.deletedById}::uuid,
        version = version + 1
      WHERE tenant_id = ${input.tenantId}::uuid
        AND id = ANY(${input.installmentIds}::uuid[])
        AND deleted_at IS NULL
    `;
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
