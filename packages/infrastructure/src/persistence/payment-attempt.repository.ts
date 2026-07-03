import type {
  ConfirmPaymentAttemptInput,
  ConfirmPaymentAttemptResult,
  CreatePaymentAttemptInput,
  IPaymentAttemptRepository,
  OutboxTransaction,
  PaymentAttemptRecord,
  RejectPaymentAttemptInput,
  RejectPaymentAttemptResult,
  VoidPaymentAttemptInput,
  VoidPaymentAttemptResult,
  UpdatePaymentAttemptMetadataInput,
} from '@hivork/application';
import { Injectable } from '@nestjs/common';
import { Prisma, type PaymentAttempt } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service.js';

type PaymentAttemptWriteClient = Pick<PrismaService, 'paymentAttempt'>;

function resolveClient(prisma: PrismaService, tx?: OutboxTransaction): PaymentAttemptWriteClient {
  return (tx ?? prisma) as PaymentAttemptWriteClient;
}

function metadataToRecord(value: Prisma.JsonValue | null): Record<string, unknown> | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return null;
}

function paymentAttemptToRecord(row: PaymentAttempt): PaymentAttemptRecord {
  return {
    id: row.id,
    installmentId: row.installmentId,
    tenantId: row.tenantId,
    reportedByType: row.reportedByType,
    reportedById: row.reportedById,
    amountRial: row.amountRial,
    status: row.status,
    evidenceFileId: row.evidenceFileId,
    note: row.note,
    confirmedByStaffId: row.confirmedByStaffId,
    rejectedReason: row.rejectedReason,
    idempotencyKey: row.idempotencyKey,
    confirmedAt: row.confirmedAt,
    rejectedAt: row.rejectedAt,
    version: row.version,
    metadata: metadataToRecord(row.metadata),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

@Injectable()
export class PrismaPaymentAttemptRepository implements IPaymentAttemptRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(
    tenantId: string,
    id: string,
    tx?: OutboxTransaction,
  ): Promise<PaymentAttemptRecord | null> {
    const row = await resolveClient(this.prisma, tx).paymentAttempt.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
    });

    return row ? paymentAttemptToRecord(row) : null;
  }

  async findByIdGlobal(id: string, tx?: OutboxTransaction): Promise<PaymentAttemptRecord | null> {
    const row = await resolveClient(this.prisma, tx).paymentAttempt.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    return row ? paymentAttemptToRecord(row) : null;
  }

  async findByIdempotencyKey(
    tenantId: string,
    idempotencyKey: string,
    tx?: OutboxTransaction,
  ): Promise<PaymentAttemptRecord | null> {
    const row = await resolveClient(this.prisma, tx).paymentAttempt.findFirst({
      where: {
        tenantId,
        idempotencyKey,
        deletedAt: null,
      },
    });

    return row ? paymentAttemptToRecord(row) : null;
  }

  async sumAllocatedAmountByInstallmentId(
    tenantId: string,
    installmentId: string,
    tx?: OutboxTransaction,
  ): Promise<bigint> {
    const aggregate = await resolveClient(this.prisma, tx).paymentAttempt.aggregate({
      where: {
        tenantId,
        installmentId,
        deletedAt: null,
        status: { in: ['PENDING', 'CONFIRMED'] },
        NOT: {
          metadata: { path: ['method'], equals: 'fee' },
        },
      },
      _sum: { amountRial: true },
    });

    return aggregate._sum.amountRial ?? 0n;
  }

  async sumConfirmedPrincipalAmountByInstallmentId(
    tenantId: string,
    installmentId: string,
    tx?: OutboxTransaction,
  ): Promise<bigint> {
    const aggregate = await resolveClient(this.prisma, tx).paymentAttempt.aggregate({
      where: {
        tenantId,
        installmentId,
        deletedAt: null,
        status: 'CONFIRMED',
        NOT: {
          metadata: { path: ['method'], equals: 'fee' },
        },
      },
      _sum: { amountRial: true },
    });

    return aggregate._sum.amountRial ?? 0n;
  }

  async create(input: CreatePaymentAttemptInput, tx?: OutboxTransaction): Promise<PaymentAttemptRecord> {
    const row = await resolveClient(this.prisma, tx).paymentAttempt.create({
      data: {
        id: input.id,
        tenantId: input.tenantId,
        installmentId: input.installmentId,
        reportedByType: input.reportedByType,
        reportedById: input.reportedById,
        amountRial: input.amountRial,
        status: 'PENDING',
        evidenceFileId: input.evidenceFileId ?? null,
        note: input.note ?? null,
        idempotencyKey: input.idempotencyKey ?? null,
        metadata: input.metadata as Prisma.InputJsonValue,
        createdById: input.createdById,
        updatedById: input.createdById,
      },
    });

    return paymentAttemptToRecord(row);
  }

  async findByBankReference(
    tenantId: string,
    bankName: string,
    referenceNumber: string,
    tx?: OutboxTransaction,
  ): Promise<PaymentAttemptRecord | null> {
    const row = await resolveClient(this.prisma, tx).paymentAttempt.findFirst({
      where: {
        tenantId,
        deletedAt: null,
        status: { in: ['PENDING', 'CONFIRMED'] },
        AND: [
          { metadata: { path: ['method'], equals: 'bank_transfer' } },
          { metadata: { path: ['bankName'], equals: bankName } },
          { metadata: { path: ['referenceNumber'], equals: referenceNumber } },
        ],
      },
    });

    return row ? paymentAttemptToRecord(row) : null;
  }

  async findByGatewayTransactionId(
    tenantId: string,
    gateway: string,
    transactionId: string,
    tx?: OutboxTransaction,
  ): Promise<PaymentAttemptRecord | null> {
    const row = await resolveClient(this.prisma, tx).paymentAttempt.findFirst({
      where: {
        tenantId,
        deletedAt: null,
        AND: [
          { metadata: { path: ['gateway'], equals: gateway } },
          { metadata: { path: ['gatewayTransactionId'], equals: transactionId } },
        ],
      },
    });

    return row ? paymentAttemptToRecord(row) : null;
  }

  async findByPosTrace(
    tenantId: string,
    terminalId: string,
    traceNumber: string,
    tx?: OutboxTransaction,
  ): Promise<PaymentAttemptRecord | null> {
    const row = await resolveClient(this.prisma, tx).paymentAttempt.findFirst({
      where: {
        tenantId,
        deletedAt: null,
        status: { in: ['PENDING', 'CONFIRMED'] },
        AND: [
          { metadata: { path: ['method'], equals: 'pos' } },
          { metadata: { path: ['terminalId'], equals: terminalId } },
          { metadata: { path: ['traceNumber'], equals: traceNumber } },
        ],
      },
    });

    return row ? paymentAttemptToRecord(row) : null;
  }

  async findByCheckNumber(
    tenantId: string,
    bankName: string,
    checkNumber: string,
    tx?: OutboxTransaction,
  ): Promise<PaymentAttemptRecord | null> {
    const row = await resolveClient(this.prisma, tx).paymentAttempt.findFirst({
      where: {
        tenantId,
        deletedAt: null,
        status: { in: ['PENDING', 'CONFIRMED'] },
        AND: [
          { metadata: { path: ['method'], equals: 'check' } },
          { metadata: { path: ['bankName'], equals: bankName } },
          { metadata: { path: ['checkNumber'], equals: checkNumber } },
        ],
      },
    });

    return row ? paymentAttemptToRecord(row) : null;
  }

  async updateMetadata(
    input: UpdatePaymentAttemptMetadataInput,
    tx?: OutboxTransaction,
  ): Promise<PaymentAttemptRecord | null> {
    const existing = await this.findById(input.tenantId, input.id, tx);
    if (!existing) {
      return null;
    }

    const mergedMetadata = {
      ...(existing.metadata ?? {}),
      ...input.metadataPatch,
    };

    const row = await resolveClient(this.prisma, tx).paymentAttempt.update({
      where: { id: input.id },
      data: {
        metadata: mergedMetadata as Prisma.InputJsonValue,
        updatedById: input.updatedById ?? undefined,
        version: { increment: 1 },
      },
    });

    return paymentAttemptToRecord(row);
  }

  async confirm(
    input: ConfirmPaymentAttemptInput,
    tx?: OutboxTransaction,
  ): Promise<ConfirmPaymentAttemptResult> {
    const client = resolveClient(this.prisma, tx);
    const confirmedAt = new Date();

    const updated = await client.paymentAttempt.updateMany({
      where: {
        id: input.id,
        tenantId: input.tenantId,
        version: input.expectedVersion,
        status: 'PENDING',
        deletedAt: null,
      },
      data: {
        status: 'CONFIRMED',
        confirmedByStaffId: input.confirmedByStaffId,
        confirmedAt,
        updatedById: input.updatedById,
        version: { increment: 1 },
      },
    });

    if (updated.count === 1) {
      const row = await client.paymentAttempt.findFirstOrThrow({
        where: { id: input.id, tenantId: input.tenantId, deletedAt: null },
      });
      return { outcome: 'updated', attempt: paymentAttemptToRecord(row) };
    }

    const existing = await client.paymentAttempt.findFirst({
      where: { id: input.id, tenantId: input.tenantId, deletedAt: null },
    });

    if (!existing) {
      return { outcome: 'not_found' };
    }

    if (existing.status !== 'PENDING') {
      return { outcome: 'status_invalid', status: existing.status };
    }

    return { outcome: 'version_conflict', currentVersion: existing.version };
  }

  async reject(
    input: RejectPaymentAttemptInput,
    tx?: OutboxTransaction,
  ): Promise<RejectPaymentAttemptResult> {
    const client = resolveClient(this.prisma, tx);
    const rejectedAt = new Date();

    const updated = await client.paymentAttempt.updateMany({
      where: {
        id: input.id,
        tenantId: input.tenantId,
        version: input.expectedVersion,
        status: 'PENDING',
        deletedAt: null,
      },
      data: {
        status: 'REJECTED',
        rejectedReason: input.rejectedReason,
        rejectedAt,
        updatedById: input.updatedById,
        version: { increment: 1 },
      },
    });

    if (updated.count === 1) {
      const row = await client.paymentAttempt.findFirstOrThrow({
        where: { id: input.id, tenantId: input.tenantId, deletedAt: null },
      });
      return { outcome: 'updated', attempt: paymentAttemptToRecord(row) };
    }

    const existing = await client.paymentAttempt.findFirst({
      where: { id: input.id, tenantId: input.tenantId, deletedAt: null },
    });

    if (!existing) {
      return { outcome: 'not_found' };
    }

    if (existing.status !== 'PENDING') {
      return { outcome: 'status_invalid', status: existing.status };
    }

    return { outcome: 'version_conflict', currentVersion: existing.version };
  }

  async void(
    input: VoidPaymentAttemptInput,
    tx?: OutboxTransaction,
  ): Promise<VoidPaymentAttemptResult> {
    const client = resolveClient(this.prisma, tx);

    const updated = await client.paymentAttempt.updateMany({
      where: {
        id: input.id,
        tenantId: input.tenantId,
        version: input.expectedVersion,
        status: 'CONFIRMED',
        deletedAt: null,
      },
      data: {
        status: 'VOIDED',
        metadata: input.metadata as Prisma.InputJsonValue,
        updatedById: input.updatedById,
        version: { increment: 1 },
      },
    });

    if (updated.count === 1) {
      const row = await client.paymentAttempt.findFirstOrThrow({
        where: { id: input.id, tenantId: input.tenantId, deletedAt: null },
      });
      return { outcome: 'updated', attempt: paymentAttemptToRecord(row) };
    }

    const existing = await client.paymentAttempt.findFirst({
      where: { id: input.id, tenantId: input.tenantId, deletedAt: null },
    });

    if (!existing) {
      return { outcome: 'not_found' };
    }

    if (existing.status !== 'CONFIRMED') {
      return { outcome: 'status_invalid', status: existing.status };
    }

    return { outcome: 'version_conflict', currentVersion: existing.version };
  }

  async listPendingByInstallmentId(
    tenantId: string,
    installmentId: string,
    tx?: OutboxTransaction,
  ): Promise<PaymentAttemptRecord[]> {
    const client = resolveClient(this.prisma, tx);
    const rows = await client.paymentAttempt.findMany({
      where: {
        tenantId,
        installmentId,
        status: 'PENDING',
        deletedAt: null,
      },
      orderBy: { createdAt: 'asc' },
    });

    return rows.map(paymentAttemptToRecord);
  }

  async countPendingByMetadataMethods(
    tenantId: string,
    internalMethods: string[],
    tx?: OutboxTransaction,
  ): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    if (internalMethods.length === 0) {
      return counts;
    }

    const client = resolveClient(this.prisma, tx);
    const rows = await client.paymentAttempt.findMany({
      where: {
        tenantId,
        status: 'PENDING',
        deletedAt: null,
        OR: internalMethods.map((method) => ({
          metadata: {
            path: ['method'],
            equals: method,
          },
        })),
      },
      select: {
        metadata: true,
      },
    });

    for (const row of rows) {
      const metadata = row.metadata;
      const method =
        metadata &&
        typeof metadata === 'object' &&
        !Array.isArray(metadata) &&
        typeof (metadata as Record<string, unknown>).method === 'string'
          ? ((metadata as Record<string, unknown>).method as string)
          : null;

      if (!method) {
        continue;
      }

      counts.set(method, (counts.get(method) ?? 0) + 1);
    }

    return counts;
  }
}
