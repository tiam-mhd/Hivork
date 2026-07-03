import type {
  CheckListPage,
  CheckRecord,
  ICheckRepository,
  ListChecksQuery,
  PersistCheckBouncedInput,
  PersistCheckBouncedResult,
  PersistCheckCollectedInput,
  PersistCheckCollectedResult,
  PersistCheckInput,
  PersistCheckTransferredInput,
  PersistCheckTransferredResult,
  PersistCheckImageUpdateInput,
  PersistCheckImageUpdateResult,
} from '@hivork/application';
import type { OutboxTransaction } from '@hivork/application';
import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service.js';

function resolveClient(prisma: PrismaService, tx?: OutboxTransaction) {
  return (tx ?? prisma) as Pick<PrismaService, 'check'>;
}

function rowToRecord(row: {
  id: string;
  tenantId: string;
  branchId: string;
  checkType: 'RECEIVED' | 'PAYABLE';
  status: 'REGISTERED' | 'DUE' | 'COLLECTED' | 'BOUNCED' | 'TRANSFERRED' | 'CANCELLED';
  checkNumber: string;
  bankName: string;
  bankBranchCode: string | null;
  amountRial: bigint;
  dueDate: Date;
  drawerName: string;
  payeeName: string | null;
  sayadId: string | null;
  paymentAttemptId: string | null;
  ledgerEntryId: string | null;
  installmentId: string | null;
  saleId: string | null;
  imageFileId: string | null;
  collectedAt: Date | null;
  bouncedAt: Date | null;
  bounceReason: string | null;
  transferredTo: string | null;
  transferredAt: Date | null;
  trackingNotes: string | null;
  version: number;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
}): CheckRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    branchId: row.branchId,
    checkType: row.checkType,
    status: row.status,
    checkNumber: row.checkNumber,
    bankName: row.bankName,
    bankBranchCode: row.bankBranchCode,
    amountRial: row.amountRial,
    dueDate: row.dueDate,
    drawerName: row.drawerName,
    payeeName: row.payeeName,
    sayadId: row.sayadId,
    paymentAttemptId: row.paymentAttemptId,
    ledgerEntryId: row.ledgerEntryId,
    installmentId: row.installmentId,
    saleId: row.saleId,
    imageFileId: row.imageFileId,
    collectedAt: row.collectedAt,
    bouncedAt: row.bouncedAt,
    bounceReason: row.bounceReason,
    transferredTo: row.transferredTo,
    transferredAt: row.transferredAt,
    trackingNotes: row.trackingNotes,
    version: row.version,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

@Injectable()
export class PrismaCheckRepository implements ICheckRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveByCheckNumber(
    tenantId: string,
    bankName: string,
    checkNumber: string,
    tx?: OutboxTransaction,
  ): Promise<CheckRecord | null> {
    const client = resolveClient(this.prisma, tx);
    const row = await client.check.findFirst({
      where: {
        tenantId,
        bankName,
        checkNumber,
        deletedAt: null,
      },
    });

    return row ? rowToRecord(row) : null;
  }

  async findByCollectIdempotencyKey(
    tenantId: string,
    idempotencyKey: string,
    tx?: OutboxTransaction,
  ): Promise<CheckRecord | null> {
    const client = resolveClient(this.prisma, tx);
    const row = await client.check.findFirst({
      where: {
        tenantId,
        deletedAt: null,
        status: 'COLLECTED',
        metadata: {
          path: ['collectIdempotencyKey'],
          equals: idempotencyKey,
        },
      },
    });

    return row ? rowToRecord(row) : null;
  }

  async create(input: PersistCheckInput, tx: OutboxTransaction): Promise<CheckRecord> {
    const client = resolveClient(this.prisma, tx);
    const row = await client.check.create({
      data: {
        id: input.id,
        tenantId: input.tenantId,
        branchId: input.branchId,
        checkType: input.checkType,
        status: input.status,
        checkNumber: input.checkNumber,
        bankName: input.bankName,
        bankBranchCode: input.bankBranchCode ?? null,
        amountRial: input.amountRial,
        dueDate: input.dueDate,
        drawerName: input.drawerName,
        payeeName: input.payeeName ?? null,
        sayadId: input.sayadId ?? null,
        paymentAttemptId: input.paymentAttemptId ?? null,
        installmentId: input.installmentId ?? null,
        saleId: input.saleId ?? null,
        imageFileId: input.imageFileId ?? null,
        trackingNotes: input.trackingNotes ?? null,
        createdById: input.createdById,
        updatedById: input.createdById,
        metadata: (input.metadata ?? null) as Prisma.InputJsonValue,
      },
    });

    return rowToRecord(row);
  }

  async findById(
    tenantId: string,
    id: string,
    tx?: OutboxTransaction,
  ): Promise<CheckRecord | null> {
    const client = resolveClient(this.prisma, tx);
    const row = await client.check.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    return row ? rowToRecord(row) : null;
  }

  async list(tenantId: string, options: ListChecksQuery): Promise<CheckListPage> {
    const where: Prisma.CheckWhereInput = {
      tenantId,
      deletedAt: null,
      ...(options.branchIds?.length ? { branchId: { in: options.branchIds } } : {}),
      ...(options.checkType ? { checkType: options.checkType } : {}),
      ...(options.status ? { status: options.status } : {}),
      ...(options.dueFrom || options.dueTo
        ? {
            dueDate: {
              ...(options.dueFrom ? { gte: options.dueFrom } : {}),
              ...(options.dueTo ? { lte: options.dueTo } : {}),
            },
          }
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

    const rows = await this.prisma.check.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: options.limit + 1,
    });

    const hasMore = rows.length > options.limit;
    const items = (hasMore ? rows.slice(0, options.limit) : rows).map(rowToRecord);

    return { items, hasMore };
  }

  async markCollected(
    input: PersistCheckCollectedInput,
    tx: OutboxTransaction,
  ): Promise<PersistCheckCollectedResult> {
    const client = resolveClient(this.prisma, tx);
    const existing = await client.check.findFirst({
      where: { id: input.id, tenantId: input.tenantId, deletedAt: null },
    });

    if (!existing) {
      return { outcome: 'not_found' };
    }

    if (existing.version !== input.expectedVersion) {
      return { outcome: 'version_conflict', currentVersion: existing.version };
    }

    const row = await client.check.update({
      where: { id: input.id },
      data: {
        status: 'COLLECTED',
        collectedAt: input.collectedAt,
        ledgerEntryId: input.ledgerEntryId,
        updatedById: input.updatedById,
        metadata: input.metadata as Prisma.InputJsonValue,
        version: { increment: 1 },
      },
    });

    return { outcome: 'updated', check: rowToRecord(row) };
  }

  async markTransferred(
    input: PersistCheckTransferredInput,
    tx: OutboxTransaction,
  ): Promise<PersistCheckTransferredResult> {
    const client = resolveClient(this.prisma, tx);
    const existing = await client.check.findFirst({
      where: { id: input.id, tenantId: input.tenantId, deletedAt: null },
    });

    if (!existing) {
      return { outcome: 'not_found' };
    }

    if (existing.version !== input.expectedVersion) {
      return { outcome: 'version_conflict', currentVersion: existing.version };
    }

    const row = await client.check.update({
      where: { id: input.id },
      data: {
        status: 'TRANSFERRED',
        transferredTo: input.transferredTo,
        transferredAt: input.transferredAt,
        updatedById: input.updatedById,
        metadata: input.metadata as Prisma.InputJsonValue,
        version: { increment: 1 },
      },
    });

    return { outcome: 'updated', check: rowToRecord(row) };
  }

  async markBounced(
    input: PersistCheckBouncedInput,
    tx: OutboxTransaction,
  ): Promise<PersistCheckBouncedResult> {
    const client = resolveClient(this.prisma, tx);
    const existing = await client.check.findFirst({
      where: { id: input.id, tenantId: input.tenantId, deletedAt: null },
    });

    if (!existing) {
      return { outcome: 'not_found' };
    }

    if (existing.version !== input.expectedVersion) {
      return { outcome: 'version_conflict', currentVersion: existing.version };
    }

    const row = await client.check.update({
      where: { id: input.id },
      data: {
        status: input.status,
        bounceReason: input.bounceReason,
        bouncedAt: input.bouncedAt,
        updatedById: input.updatedById,
        version: { increment: 1 },
      },
    });

    return { outcome: 'updated', check: rowToRecord(row) };
  }

  async updateImageFile(
    input: PersistCheckImageUpdateInput,
    tx: OutboxTransaction,
  ): Promise<PersistCheckImageUpdateResult> {
    const client = resolveClient(this.prisma, tx);
    const existing = await client.check.findFirst({
      where: { id: input.id, tenantId: input.tenantId, deletedAt: null },
    });

    if (!existing) {
      return { outcome: 'not_found' };
    }

    if (existing.version !== input.expectedVersion) {
      return { outcome: 'version_conflict', currentVersion: existing.version };
    }

    const row = await client.check.update({
      where: { id: input.id },
      data: {
        imageFileId: input.imageFileId,
        updatedById: input.updatedById,
        version: { increment: 1 },
      },
    });

    return { outcome: 'updated', check: rowToRecord(row) };
  }
}
