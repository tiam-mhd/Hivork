import type {
  CreatePaymentLedgerEntryInput,
  IPaymentLedgerRepository,
  ListPaymentTransactionsQueryOptions,
  ListPaymentTransactionsResult,
  MarkPaymentLedgerEntryVoidedInput,
  MarkPaymentLedgerEntryVoidedResult,
  PaymentLedgerEntryRecord,
  PaymentTransactionListItem,
} from '@hivork/application';
import { Injectable } from '@nestjs/common';
import { Prisma, type PaymentLedgerEntry } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service.js';
import type { OutboxTransaction } from '@hivork/application';
import {
  globalCustomerListSelect,
  resolveGlobalCustomerPhone,
} from './mappers/global-customer-phone.js';

type SaleWithCustomer = {
  id: string;
  contractNumber: string | null;
  tenantCustomerId: string;
  createdByStaffId: string;
  tenantCustomer: {
    id: string;
    globalCustomer: {
      id: string;
      name: string | null;
      user: { phone: string };
    };
  };
};

type LedgerRow = PaymentLedgerEntry & {
  sale: SaleWithCustomer | null;
  installment: {
    id: string;
    sequenceNumber: number;
    sale: SaleWithCustomer;
  } | null;
};

function entryToRecord(row: PaymentLedgerEntry): PaymentTransactionListItem['entry'] {
  return {
    id: row.id,
    tenantId: row.tenantId,
    branchId: row.branchId,
    entryType: row.entryType,
    direction: row.direction,
    amountRial: row.amountRial,
    status: row.status,
    occurredAt: row.occurredAt,
    recordedAt: row.recordedAt,
    paymentMethod: row.paymentMethod,
    description: row.description,
    paymentAttemptId: row.paymentAttemptId,
    installmentId: row.installmentId,
    saleId: row.saleId,
    settlementBatchId: row.settlementBatchId,
    reversesEntryId: row.reversesEntryId,
    metadata: parseMetadata(row.metadata),
    version: row.version,
  };
}

function parseMetadata(value: Prisma.JsonValue | null): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function resolveClient(prisma: PrismaService, tx?: OutboxTransaction) {
  return (tx ?? prisma) as Pick<PrismaService, 'paymentLedgerEntry'>;
}

function resolveSale(row: LedgerRow): SaleWithCustomer | null {
  return row.sale ?? row.installment?.sale ?? null;
}

function toListItem(row: LedgerRow): PaymentTransactionListItem {
  const sale = resolveSale(row);
  const customer = sale
    ? {
        id: sale.tenantCustomer.id,
        displayName:
          sale.tenantCustomer.globalCustomer.name?.trim() ||
          resolveGlobalCustomerPhone(sale.tenantCustomer.globalCustomer),
      }
    : null;

  return {
    entry: entryToRecord(row),
    customer,
    sale: sale
      ? {
          id: sale.id,
          contractNumber: sale.contractNumber,
        }
      : null,
    installment: row.installment
      ? {
          id: row.installment.id,
          sequenceNumber: row.installment.sequenceNumber,
        }
      : null,
  };
}

function buildSaleRelationFilter(
  options: ListPaymentTransactionsQueryOptions,
): Prisma.SaleWhereInput {
  return {
    deletedAt: null,
    ...(options.createdByStaffId ? { createdByStaffId: options.createdByStaffId } : {}),
    ...(options.tenantCustomerId ? { tenantCustomerId: options.tenantCustomerId } : {}),
    ...(options.saleId ? { id: options.saleId } : {}),
  };
}

function buildSearchWhere(search: string): Prisma.PaymentLedgerEntryWhereInput {
  const customerSearch: Prisma.GlobalCustomerWhereInput = {
    OR: [
      { name: { contains: search, mode: 'insensitive' } },
      { user: { phone: { contains: search } } },
    ],
  };

  const saleSearch: Prisma.SaleWhereInput = {
    deletedAt: null,
    OR: [
      { contractNumber: { contains: search, mode: 'insensitive' } },
      { tenantCustomer: { globalCustomer: customerSearch } },
    ],
  };

  return {
    OR: [
      { description: { contains: search, mode: 'insensitive' } },
      { sale: saleSearch },
      { installment: { sale: saleSearch } },
    ],
  };
}

function buildCursorWhere(
  options: ListPaymentTransactionsQueryOptions,
): Prisma.PaymentLedgerEntryWhereInput | undefined {
  if (!options.cursor) {
    return undefined;
  }

  const { id, occurredAt } = options.cursor;

  return {
    OR: [{ occurredAt: { lt: occurredAt } }, { occurredAt, id: { lt: id } }],
  };
}

function buildWhere(
  tenantId: string,
  options: ListPaymentTransactionsQueryOptions,
): Prisma.PaymentLedgerEntryWhereInput {
  const andFilters: Prisma.PaymentLedgerEntryWhereInput[] = [];
  const cursorWhere = buildCursorWhere(options);

  if (cursorWhere) {
    andFilters.push(cursorWhere);
  }

  if (options.search) {
    andFilters.push(buildSearchWhere(options.search));
  } else if (
    options.createdByStaffId ||
    options.tenantCustomerId ||
    options.saleId
  ) {
    const saleFilter = buildSaleRelationFilter(options);
    andFilters.push({
      OR: [{ sale: saleFilter }, { installment: { sale: saleFilter } }],
    });
  }

  return {
    tenantId,
    deletedAt: null,
    ...(options.branchIds?.length ? { branchId: { in: options.branchIds } } : {}),
    ...(options.status ? { status: options.status } : {}),
    ...(options.entryType ? { entryType: options.entryType as PaymentLedgerEntry['entryType'] } : {}),
    ...(options.paymentMethod ? { paymentMethod: options.paymentMethod } : {}),
    ...(options.occurredFrom || options.occurredTo
      ? {
          occurredAt: {
            ...(options.occurredFrom ? { gte: options.occurredFrom } : {}),
            ...(options.occurredTo ? { lte: options.occurredTo } : {}),
          },
        }
      : {}),
    ...(andFilters.length > 0 ? { AND: andFilters } : {}),
  };
}

@Injectable()
export class PrismaPaymentLedgerRepository implements IPaymentLedgerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    tenantId: string,
    options: ListPaymentTransactionsQueryOptions,
  ): Promise<ListPaymentTransactionsResult> {
    const where = buildWhere(tenantId, options);

    const rows = await this.prisma.paymentLedgerEntry.findMany({
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
        installment: {
          select: {
            id: true,
            sequenceNumber: true,
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
        },
      },
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
      take: options.limit + 1,
    });

    const hasMore = rows.length > options.limit;
    const page = hasMore ? rows.slice(0, options.limit) : rows;

    return {
      items: page.map((row) => toListItem(row as LedgerRow)),
      hasMore,
    };
  }

  async findById(
    tenantId: string,
    id: string,
    tx?: OutboxTransaction,
  ): Promise<PaymentLedgerEntryRecord | null> {
    const client = resolveClient(this.prisma, tx);
    const row = await client.paymentLedgerEntry.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    return row ? entryToRecord(row) : null;
  }

  async create(
    input: CreatePaymentLedgerEntryInput,
    tx?: OutboxTransaction,
  ): Promise<PaymentLedgerEntryRecord> {
    const client = resolveClient(this.prisma, tx);
    const row = await client.paymentLedgerEntry.create({
      data: {
        id: input.id,
        tenantId: input.tenantId,
        branchId: input.branchId,
        entryType: input.entryType as PaymentLedgerEntry['entryType'],
        direction: input.direction as PaymentLedgerEntry['direction'],
        amountRial: input.amountRial,
        status: input.status as PaymentLedgerEntry['status'],
        occurredAt: input.occurredAt,
        recordedAt: input.recordedAt,
        paymentMethod: input.paymentMethod,
        description: input.description,
        paymentAttemptId: input.paymentAttemptId,
        installmentId: input.installmentId,
        saleId: input.saleId,
        checkId: input.checkId ?? null,
        settlementBatchId: input.settlementBatchId,
        reversesEntryId: input.reversesEntryId,
        metadata: input.metadata as Prisma.InputJsonValue | undefined,
        createdById: input.createdById,
        updatedById: input.createdById,
      },
    });

    return entryToRecord(row);
  }

  async sumPostedRefundsForEntry(
    tenantId: string,
    reversesEntryId: string,
    tx?: OutboxTransaction,
  ): Promise<bigint> {
    const client = resolveClient(this.prisma, tx);
    const aggregate = await client.paymentLedgerEntry.aggregate({
      where: {
        tenantId,
        deletedAt: null,
        entryType: 'REFUND',
        status: 'POSTED',
        reversesEntryId,
      },
      _sum: { amountRial: true },
    });

    return aggregate._sum.amountRial ?? 0n;
  }

  async findRefundByIdempotencyKey(
    tenantId: string,
    idempotencyKey: string,
    tx?: OutboxTransaction,
  ): Promise<PaymentLedgerEntryRecord | null> {
    const client = resolveClient(this.prisma, tx);
    const row = await client.paymentLedgerEntry.findFirst({
      where: {
        tenantId,
        deletedAt: null,
        entryType: 'REFUND',
        metadata: {
          path: ['idempotencyKey'],
          equals: idempotencyKey,
        },
      },
    });

    return row ? entryToRecord(row) : null;
  }

  async markVoided(
    input: MarkPaymentLedgerEntryVoidedInput,
    tx?: OutboxTransaction,
  ): Promise<MarkPaymentLedgerEntryVoidedResult> {
    const client = resolveClient(this.prisma, tx);
    const existing = await client.paymentLedgerEntry.findFirst({
      where: { id: input.id, tenantId: input.tenantId, deletedAt: null },
    });

    if (!existing) {
      return { outcome: 'not_found' };
    }

    if (existing.status === 'VOIDED') {
      return { outcome: 'already_voided' };
    }

    if (existing.version !== input.expectedVersion) {
      return { outcome: 'version_conflict', currentVersion: existing.version };
    }

    const row = await client.paymentLedgerEntry.update({
      where: { id: input.id },
      data: {
        status: 'VOIDED',
        voidedAt: input.voidedAt,
        voidedById: input.voidedById,
        voidReason: input.voidReason,
        updatedById: input.updatedById,
        version: { increment: 1 },
      },
    });

    return { outcome: 'updated', entry: entryToRecord(row) };
  }
}
