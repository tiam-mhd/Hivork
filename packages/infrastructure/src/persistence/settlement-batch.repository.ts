import type {
  CloseSettlementBatchPersistResult,
  FindEligibleSettlementEntriesInput,
  ISettlementBatchRepository,
  ListSettlementBatchesQuery,
  PaymentLedgerEntryRecord,
  PersistSettlementBatchCloseInput,
  PersistSettlementBatchInput,
  SettlementBatchDetailRecord,
  SettlementBatchLedgerReconciliationEntry,
  SettlementBatchListPage,
  SettlementBatchRecord,
} from '@hivork/application';
import type { OutboxTransaction } from '@hivork/application';
import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service.js';

function resolveClient(
  prisma: PrismaService,
  tx?: OutboxTransaction,
): Pick<
  PrismaService,
  'paymentLedgerEntry' | 'settlementBatch' | 'settlementBatchEntry'
> {
  return (tx ?? prisma) as Pick<
    PrismaService,
    'paymentLedgerEntry' | 'settlementBatch' | 'settlementBatchEntry'
  >;
}

function entryToRecord(row: {
  id: string;
  tenantId: string;
  branchId: string;
  entryType: string;
  direction: string;
  amountRial: bigint;
  status: string;
  occurredAt: Date;
  recordedAt: Date;
  paymentMethod: string | null;
  description: string | null;
  paymentAttemptId: string | null;
  installmentId: string | null;
  saleId: string | null;
  settlementBatchId: string | null;
  reversesEntryId: string | null;
  metadata: unknown;
  version: number;
}): PaymentLedgerEntryRecord {
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
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    version: row.version,
  };
}

function batchToRecord(row: {
  id: string;
  tenantId: string;
  branchId: string;
  batchNumber: string;
  status: 'OPEN' | 'CLOSED';
  periodFrom: Date;
  periodTo: Date;
  totalAmountRial: bigint;
  entryCount: number;
  note: string | null;
  closedAt: Date | null;
  closedById: string | null;
  version: number;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
}): SettlementBatchRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    branchId: row.branchId,
    batchNumber: row.batchNumber,
    status: row.status,
    periodFrom: row.periodFrom,
    periodTo: row.periodTo,
    totalAmountRial: row.totalAmountRial,
    entryCount: row.entryCount,
    note: row.note,
    closedAt: row.closedAt,
    closedById: row.closedById,
    version: row.version,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

@Injectable()
export class PrismaSettlementBatchRepository implements ISettlementBatchRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findEligibleLedgerEntries(
    input: FindEligibleSettlementEntriesInput,
    tx?: OutboxTransaction,
  ): Promise<PaymentLedgerEntryRecord[]> {
    const client = resolveClient(this.prisma, tx);
    const rows = await client.paymentLedgerEntry.findMany({
      where: {
        tenantId: input.tenantId,
        branchId: input.branchId,
        deletedAt: null,
        status: 'POSTED',
        entryType: 'PAYMENT_IN',
        reversesEntryId: null,
        settlementBatchId: null,
        paymentMethod: { in: input.paymentMethods },
        occurredAt: {
          gte: input.periodFrom,
          lte: input.periodTo,
        },
      },
      orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }],
    });

    return rows.map(entryToRecord);
  }

  async findLedgerEntriesInOpenBatch(
    tenantId: string,
    ledgerEntryIds: string[],
    tx?: OutboxTransaction,
  ): Promise<string[]> {
    if (ledgerEntryIds.length === 0) {
      return [];
    }

    const client = resolveClient(this.prisma, tx);
    const rows = await client.settlementBatchEntry.findMany({
      where: {
        ledgerEntryId: { in: ledgerEntryIds },
        settlementBatch: {
          tenantId,
          status: 'OPEN',
          deletedAt: null,
        },
      },
      select: { ledgerEntryId: true },
    });

    return rows.map((row: { ledgerEntryId: string }) => row.ledgerEntryId);
  }

  async findById(
    tenantId: string,
    id: string,
    tx?: OutboxTransaction,
  ): Promise<SettlementBatchRecord | null> {
    const client = resolveClient(this.prisma, tx);
    const row = await client.settlementBatch.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    return row ? batchToRecord(row) : null;
  }

  async findByIdWithEntries(
    tenantId: string,
    id: string,
  ): Promise<SettlementBatchDetailRecord | null> {
    const row = await this.prisma.settlementBatch.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        entries: {
          include: {
            ledgerEntry: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!row) {
      return null;
    }

    return {
      ...batchToRecord(row),
      entries: row.entries.map((entry) => ({
        id: entry.id,
        settlementBatchId: entry.settlementBatchId,
        ledgerEntryId: entry.ledgerEntryId,
        createdAt: entry.createdAt,
        ledgerEntry: entryToRecord(entry.ledgerEntry),
      })),
    };
  }

  async list(
    tenantId: string,
    options: ListSettlementBatchesQuery,
  ): Promise<SettlementBatchListPage> {
    const where: Prisma.SettlementBatchWhereInput = {
      tenantId,
      deletedAt: null,
      ...(options.status ? { status: options.status } : {}),
      ...(options.branchIds && options.branchIds.length > 0
        ? { branchId: { in: options.branchIds } }
        : {}),
      ...(options.cursor
        ? {
            OR: [
              { createdAt: { lt: options.cursor.createdAt } },
              {
                createdAt: options.cursor.createdAt,
                id: { lt: options.cursor.id },
              },
            ],
          }
        : {}),
    };

    const rows = await this.prisma.settlementBatch.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: options.limit + 1,
    });

    const hasMore = rows.length > options.limit;
    const page = hasMore ? rows.slice(0, options.limit) : rows;

    return {
      items: page.map(batchToRecord),
      hasMore,
    };
  }

  async createWithEntries(
    input: PersistSettlementBatchInput,
    tx: OutboxTransaction,
  ): Promise<SettlementBatchRecord> {
    const client = resolveClient(this.prisma, tx);

    const batch = await client.settlementBatch.create({
      data: {
        id: input.id,
        tenantId: input.tenantId,
        branchId: input.branchId,
        batchNumber: input.batchNumber,
        periodFrom: input.periodFrom,
        periodTo: input.periodTo,
        totalAmountRial: input.totalAmountRial,
        entryCount: input.entryCount,
        note: input.note ?? null,
        metadata: { paymentMethods: input.paymentMethods } as Prisma.InputJsonValue,
        createdById: input.createdById,
        updatedById: input.createdById,
      },
    });

    if (input.ledgerEntryIds.length > 0) {
      await client.settlementBatchEntry.createMany({
        data: input.ledgerEntryIds.map((ledgerEntryId) => ({
          settlementBatchId: batch.id,
          ledgerEntryId,
        })),
      });

      await client.paymentLedgerEntry.updateMany({
        where: {
          tenantId: input.tenantId,
          id: { in: input.ledgerEntryIds },
          settlementBatchId: null,
        },
        data: {
          settlementBatchId: batch.id,
          updatedById: input.createdById,
        },
      });
    }

    return batchToRecord(batch);
  }

  async listLedgerEntryIdsForBatch(
    tenantId: string,
    batchId: string,
    tx?: OutboxTransaction,
  ): Promise<Array<{ ledgerEntryId: string; paymentAttemptId: string | null }>> {
    const client = resolveClient(this.prisma, tx);
    const rows = await client.settlementBatchEntry.findMany({
      where: {
        settlementBatchId: batchId,
        settlementBatch: { tenantId, deletedAt: null },
      },
      include: {
        ledgerEntry: {
          select: {
            id: true,
            paymentAttemptId: true,
          },
        },
      },
    });

    return rows.map((row) => ({
      ledgerEntryId: row.ledgerEntry.id,
      paymentAttemptId: row.ledgerEntry.paymentAttemptId,
    }));
  }

  async close(
    input: PersistSettlementBatchCloseInput,
    tx: OutboxTransaction,
  ): Promise<CloseSettlementBatchPersistResult> {
    const client = resolveClient(this.prisma, tx);
    const existing = await client.settlementBatch.findFirst({
      where: { id: input.id, tenantId: input.tenantId, deletedAt: null },
    });

    if (!existing) {
      return { outcome: 'not_found' };
    }

    if (existing.status === 'CLOSED') {
      return { outcome: 'already_closed' };
    }

    if (existing.version !== input.expectedVersion) {
      return { outcome: 'version_conflict', currentVersion: existing.version };
    }

    const row = await client.settlementBatch.update({
      where: { id: input.id },
      data: {
        status: 'CLOSED',
        closedAt: input.closedAt,
        closedById: input.closedById,
        updatedById: input.updatedById,
        version: { increment: 1 },
      },
    });

    return { outcome: 'updated', batch: batchToRecord(row) };
  }

  async findLedgerEntriesForReconciliation(
    tenantId: string,
    settlementBatchId: string,
  ): Promise<SettlementBatchLedgerReconciliationEntry[]> {
    const rows = await this.prisma.settlementBatchEntry.findMany({
      where: {
        settlementBatchId,
        settlementBatch: { tenantId, deletedAt: null },
      },
      include: {
        ledgerEntry: {
          include: {
            paymentAttempt: {
              select: { metadata: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return rows.map((row) => {
      const entry = entryToRecord(row.ledgerEntry);
      const paymentAttemptMetadata =
        (row.ledgerEntry.paymentAttempt?.metadata as Record<string, unknown> | null) ?? null;

      return {
        ...entry,
        paymentAttemptMetadata,
      };
    });
  }
}
