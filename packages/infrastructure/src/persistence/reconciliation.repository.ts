import type {
  IReconciliationRepository,
  PersistReconciliationReportInput,
  ReconciliationDiscrepancyRecord,
  ReconciliationReportDetailRecord,
  ReconciliationReportRecord,
  ResolveReconciliationDiscrepancyInput,
  ResolveReconciliationDiscrepancyResult,
} from '@hivork/application';
import type { OutboxTransaction } from '@hivork/application';
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

function resolveClient(
  prisma: PrismaService,
  tx?: OutboxTransaction,
): Pick<
  PrismaService,
  'reconciliationReport' | 'reconciliationDiscrepancy'
> {
  return (tx ?? prisma) as Pick<
    PrismaService,
    'reconciliationReport' | 'reconciliationDiscrepancy'
  >;
}

function reportToRecord(row: {
  id: string;
  tenantId: string;
  settlementBatchId: string;
  matchedCount: number;
  discrepancyCount: number;
  bankTotalRial: bigint;
  systemTotalRial: bigint;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}): ReconciliationReportRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    settlementBatchId: row.settlementBatchId,
    matchedCount: row.matchedCount,
    discrepancyCount: row.discrepancyCount,
    bankTotalRial: row.bankTotalRial,
    systemTotalRial: row.systemTotalRial,
    version: row.version,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function discrepancyToRecord(row: {
  id: string;
  tenantId: string;
  reconciliationReportId: string;
  discrepancyType: 'MISSING_IN_SYSTEM' | 'MISSING_IN_BANK' | 'AMOUNT_MISMATCH';
  status: 'OPEN' | 'RESOLVED' | 'IGNORED';
  bankReference: string | null;
  bankAmountRial: bigint | null;
  ledgerEntryId: string | null;
  systemAmountRial: bigint | null;
  resolveNote: string | null;
  resolvedAt: Date | null;
  resolvedById: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}): ReconciliationDiscrepancyRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    reconciliationReportId: row.reconciliationReportId,
    discrepancyType: row.discrepancyType,
    status: row.status,
    bankReference: row.bankReference,
    bankAmountRial: row.bankAmountRial,
    ledgerEntryId: row.ledgerEntryId,
    systemAmountRial: row.systemAmountRial,
    resolveNote: row.resolveNote,
    resolvedAt: row.resolvedAt,
    resolvedById: row.resolvedById,
    version: row.version,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

@Injectable()
export class PrismaReconciliationRepository implements IReconciliationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findReportById(
    tenantId: string,
    id: string,
  ): Promise<ReconciliationReportDetailRecord | null> {
    const row = await this.prisma.reconciliationReport.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        discrepancies: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!row) {
      return null;
    }

    return {
      ...reportToRecord(row),
      discrepancies: row.discrepancies.map(discrepancyToRecord),
    };
  }

  async createReportWithDiscrepancies(
    input: PersistReconciliationReportInput,
    tx: OutboxTransaction,
  ): Promise<ReconciliationReportDetailRecord> {
    const client = resolveClient(this.prisma, tx);

    const report = await client.reconciliationReport.create({
      data: {
        id: input.id,
        tenantId: input.tenantId,
        settlementBatchId: input.settlementBatchId,
        matchedCount: input.matchedCount,
        discrepancyCount: input.discrepancyCount,
        bankTotalRial: input.bankTotalRial,
        systemTotalRial: input.systemTotalRial,
        createdById: input.createdById,
        updatedById: input.createdById,
      },
    });

    if (input.discrepancies.length > 0) {
      await client.reconciliationDiscrepancy.createMany({
        data: input.discrepancies.map((discrepancy) => ({
          id: discrepancy.id,
          tenantId: discrepancy.tenantId,
          reconciliationReportId: input.id,
          discrepancyType: discrepancy.discrepancyType,
          bankReference: discrepancy.bankReference ?? null,
          bankAmountRial: discrepancy.bankAmountRial ?? null,
          ledgerEntryId: discrepancy.ledgerEntryId ?? null,
          systemAmountRial: discrepancy.systemAmountRial ?? null,
          createdById: discrepancy.createdById,
          updatedById: discrepancy.createdById,
        })),
      });
    }

    const loaded = await client.reconciliationReport.findFirstOrThrow({
      where: { id: report.id },
      include: {
        discrepancies: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return {
      ...reportToRecord(loaded),
      discrepancies: loaded.discrepancies.map(discrepancyToRecord),
    };
  }

  async findDiscrepancyById(
    tenantId: string,
    id: string,
    tx?: OutboxTransaction,
  ): Promise<ReconciliationDiscrepancyRecord | null> {
    const client = resolveClient(this.prisma, tx);
    const row = await client.reconciliationDiscrepancy.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    return row ? discrepancyToRecord(row) : null;
  }

  async resolveDiscrepancy(
    input: ResolveReconciliationDiscrepancyInput,
    tx: OutboxTransaction,
  ): Promise<ResolveReconciliationDiscrepancyResult> {
    const client = resolveClient(this.prisma, tx);
    const existing = await client.reconciliationDiscrepancy.findFirst({
      where: { id: input.id, tenantId: input.tenantId, deletedAt: null },
    });

    if (!existing) {
      return { outcome: 'not_found' };
    }

    if (existing.status === 'RESOLVED' || existing.status === 'IGNORED') {
      return { outcome: 'already_resolved' };
    }

    if (existing.version !== input.expectedVersion) {
      return { outcome: 'version_conflict', currentVersion: existing.version };
    }

    const row = await client.reconciliationDiscrepancy.update({
      where: { id: input.id },
      data: {
        status: 'RESOLVED',
        resolveNote: input.resolveNote,
        resolvedAt: input.resolvedAt,
        resolvedById: input.resolvedById,
        updatedById: input.updatedById,
        version: { increment: 1 },
      },
    });

    return { outcome: 'updated', discrepancy: discrepancyToRecord(row) };
  }
}
