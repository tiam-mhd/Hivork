import type {
  AppendContractVersionInput,
  ContractVersionRecord,
  IContractVersionRepository,
} from '@hivork/application';
import type { OutboxTransaction } from '@hivork/application';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service.js';

function toRecord(row: {
  id: string;
  tenantId: string;
  saleId: string;
  versionNumber: number;
  changeType: ContractVersionRecord['changeType'];
  changeReason: string;
  snapshot: unknown;
  createdAt: Date;
  createdById: string | null;
}): ContractVersionRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    saleId: row.saleId,
    versionNumber: row.versionNumber,
    changeType: row.changeType,
    changeReason: row.changeReason,
    snapshot: row.snapshot as ContractVersionRecord['snapshot'],
    createdAt: row.createdAt,
    createdById: row.createdById,
  };
}

@Injectable()
export class PrismaContractVersionRepository implements IContractVersionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async appendVersion(
    input: AppendContractVersionInput,
    tx?: OutboxTransaction,
  ): Promise<ContractVersionRecord> {
    const client = (tx ?? this.prisma) as Pick<PrismaService, 'contractVersion'>;

    const row = await client.contractVersion.create({
      data: {
        tenantId: input.tenantId,
        saleId: input.saleId,
        versionNumber: input.versionNumber,
        changeType: input.changeType,
        changeReason: input.changeReason,
        snapshot: input.snapshot as Prisma.InputJsonValue,
        createdById: input.createdById ?? null,
      },
    });

    return toRecord(row);
  }

  async listBySale(tenantId: string, saleId: string): Promise<ContractVersionRecord[]> {
    const rows = await this.prisma.contractVersion.findMany({
      where: { tenantId, saleId },
      orderBy: { versionNumber: 'asc' },
    });

    return rows.map(toRecord);
  }

  async findLatestVersionNumber(tenantId: string, saleId: string): Promise<number | null> {
    const row = await this.prisma.contractVersion.findFirst({
      where: { tenantId, saleId },
      orderBy: { versionNumber: 'desc' },
      select: { versionNumber: true },
    });

    return row?.versionNumber ?? null;
  }

  async findByVersionNumber(
    tenantId: string,
    saleId: string,
    versionNumber: number,
  ): Promise<ContractVersionRecord | null> {
    const row = await this.prisma.contractVersion.findFirst({
      where: { tenantId, saleId, versionNumber },
    });

    return row ? toRecord(row) : null;
  }
}
