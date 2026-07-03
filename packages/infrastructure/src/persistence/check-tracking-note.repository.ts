import type {
  CheckTrackingNoteRecord,
  CreateCheckTrackingNoteInput,
  ICheckTrackingNoteRepository,
} from '@hivork/application';
import type { OutboxTransaction } from '@hivork/application';
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

function resolveClient(prisma: PrismaService, tx?: OutboxTransaction) {
  return (tx ?? prisma) as Pick<PrismaService, 'checkTrackingNote'>;
}

function toRecord(row: {
  id: string;
  tenantId: string;
  checkId: string;
  body: string;
  authorStaffId: string;
  createdAt: Date;
  updatedAt: Date;
  createdById: string | null;
  version: number;
  metadata: unknown;
}): CheckTrackingNoteRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    checkId: row.checkId,
    body: row.body,
    authorStaffId: row.authorStaffId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    createdById: row.createdById,
    version: row.version,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
  };
}

@Injectable()
export class PrismaCheckTrackingNoteRepository implements ICheckTrackingNoteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    input: CreateCheckTrackingNoteInput,
    tx?: OutboxTransaction,
  ): Promise<CheckTrackingNoteRecord> {
    const client = resolveClient(this.prisma, tx);
    const row = await client.checkTrackingNote.create({
      data: {
        id: input.id,
        tenantId: input.tenantId,
        checkId: input.checkId,
        body: input.body,
        authorStaffId: input.authorStaffId,
        createdById: input.createdById,
      },
    });

    return toRecord(row);
  }

  async listByCheckId(tenantId: string, checkId: string): Promise<CheckTrackingNoteRecord[]> {
    const rows = await this.prisma.checkTrackingNote.findMany({
      where: { tenantId, checkId, deletedAt: null },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });

    return rows.map(toRecord);
  }
}
