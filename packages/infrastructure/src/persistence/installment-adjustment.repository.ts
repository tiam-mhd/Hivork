import { randomUUID } from 'node:crypto';

import type {
  CreateInstallmentAdjustmentInput,
  IInstallmentAdjustmentRepository,
  InstallmentAdjustmentRecord,
  OutboxTransaction,
} from '@hivork/application';
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

function resolveClient(prisma: PrismaService, tx?: OutboxTransaction) {
  return (tx ?? prisma) as PrismaService;
}

function toRecord(row: {
  id: string;
  tenantId: string;
  installmentId: string;
  adjustmentType: 'PENALTY' | 'DISCOUNT';
  amountRial: bigint;
  reason: string;
  appliedAt: Date;
  appliedById: string;
  reversedAt: Date | null;
}): InstallmentAdjustmentRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    installmentId: row.installmentId,
    adjustmentType: row.adjustmentType,
    amountRial: row.amountRial,
    reason: row.reason,
    appliedAt: row.appliedAt,
    appliedById: row.appliedById,
    reversedAt: row.reversedAt,
  };
}

@Injectable()
export class PrismaInstallmentAdjustmentRepository implements IInstallmentAdjustmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    input: CreateInstallmentAdjustmentInput,
    tx?: OutboxTransaction,
  ): Promise<InstallmentAdjustmentRecord> {
    const client = resolveClient(this.prisma, tx);
    const row = await client.installmentAdjustment.create({
      data: {
        id: randomUUID(),
        tenantId: input.tenantId,
        installmentId: input.installmentId,
        adjustmentType: input.adjustmentType,
        amountRial: input.amountRial,
        reason: input.reason,
        appliedById: input.appliedById,
        createdById: input.createdById,
        updatedById: input.createdById,
      },
    });

    return toRecord(row);
  }

  async sumActivePenaltyRialByInstallmentId(
    tenantId: string,
    installmentId: string,
    tx?: OutboxTransaction,
  ): Promise<bigint> {
    const client = resolveClient(this.prisma, tx);
    const rows = await client.installmentAdjustment.findMany({
      where: {
        tenantId,
        installmentId,
        adjustmentType: 'PENALTY',
        reversedAt: null,
        deletedAt: null,
      },
      select: { amountRial: true },
    });

    return rows.reduce((sum, row) => sum + row.amountRial, 0n);
  }

  async listRecentPenaltiesByInstallmentId(
    tenantId: string,
    installmentId: string,
    since: Date,
    tx?: OutboxTransaction,
  ): Promise<InstallmentAdjustmentRecord[]> {
    const client = resolveClient(this.prisma, tx);
    const rows = await client.installmentAdjustment.findMany({
      where: {
        tenantId,
        installmentId,
        adjustmentType: 'PENALTY',
        reversedAt: null,
        deletedAt: null,
        appliedAt: { gte: since },
      },
      orderBy: { appliedAt: 'desc' },
    });

    return rows.map(toRecord);
  }
}
