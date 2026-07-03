import type {
  AppendInstallmentOperationLogInput,
  IInstallmentOperationLogRepository,
  InstallmentOperationLogRecord,
  OutboxTransaction,
} from '@hivork/application';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service.js';

function toRecord(row: {
  id: string;
  tenantId: string;
  saleId: string;
  operationType: string;
  installmentIds: string[];
  previousSnapshot: unknown;
  newSnapshot: unknown;
  reason: string | null;
  performedById: string;
  createdAt: Date;
  createdById: string | null;
  version: number;
  metadata?: unknown | null;
}): InstallmentOperationLogRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    saleId: row.saleId,
    operationType: row.operationType,
    installmentIds: row.installmentIds,
    previousSnapshot: row.previousSnapshot,
    newSnapshot: row.newSnapshot,
    reason: row.reason,
    performedById: row.performedById,
    createdAt: row.createdAt,
    createdById: row.createdById,
    version: row.version,
    metadata: row.metadata ?? null,
  };
}

@Injectable()
export class PrismaInstallmentOperationLogRepository implements IInstallmentOperationLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async append(
    input: AppendInstallmentOperationLogInput,
    tx?: OutboxTransaction,
  ): Promise<InstallmentOperationLogRecord> {
    const client = (tx ?? this.prisma) as Pick<PrismaService, 'installmentOperationLog'>;

    const row = await client.installmentOperationLog.create({
      data: {
        tenantId: input.tenantId,
        saleId: input.saleId,
        operationType: input.operationType,
        installmentIds: input.installmentIds,
        previousSnapshot: input.previousSnapshot as Prisma.InputJsonValue,
        newSnapshot: input.newSnapshot as Prisma.InputJsonValue,
        reason: input.reason ?? null,
        performedById: input.performedById,
        createdById: input.createdById,
        ...(input.metadata !== undefined
          ? { metadata: input.metadata as Prisma.InputJsonValue }
          : {}),
      },
    });

    return toRecord(row);
  }

  async findLatestDeferLogForInstallment(
    tenantId: string,
    installmentId: string,
    tx?: OutboxTransaction,
  ): Promise<InstallmentOperationLogRecord | null> {
    const client = (tx ?? this.prisma) as Pick<PrismaService, 'installmentOperationLog'>;

    const row = await client.installmentOperationLog.findFirst({
      where: {
        tenantId,
        operationType: 'defer',
        installmentIds: { has: installmentId },
      },
      orderBy: { createdAt: 'desc' },
    });

    return row ? toRecord(row) : null;
  }
}
