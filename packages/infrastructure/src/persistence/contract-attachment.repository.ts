import type {
  ContractAttachmentRecord,
  CreateContractAttachmentInput,
  IContractAttachmentRepository,
  ListContractAttachmentsOptions,
  OutboxTransaction,
  RestoreCommand,
  SoftDeleteCommand,
} from '@hivork/application';
import { ApplicationError } from '@hivork/application';
import { Injectable } from '@nestjs/common';
import type { ContractAttachment as ContractAttachmentRow } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service.js';

function toRecord(row: ContractAttachmentRow): ContractAttachmentRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    saleId: row.saleId,
    fileId: row.fileId,
    attachmentType: row.attachmentType,
    label: row.label,
    description: row.description,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    createdById: row.createdById,
    updatedById: row.updatedById,
    deletedAt: row.deletedAt,
    deletedById: row.deletedById,
    deleteReason: row.deleteReason,
    version: row.version,
    metadata: row.metadata as Record<string, unknown> | null,
  };
}

@Injectable()
export class PrismaContractAttachmentRepository implements IContractAttachmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, tenantId: string): Promise<ContractAttachmentRecord | null> {
    const row = await this.prisma.contractAttachment.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    return row ? toRecord(row) : null;
  }

  async listBySale(
    options: ListContractAttachmentsOptions,
    tx?: OutboxTransaction,
  ): Promise<ContractAttachmentRecord[]> {
    const client = (tx ?? this.prisma) as PrismaService;
    const rows = await client.contractAttachment.findMany({
      where: {
        tenantId: options.tenantId,
        saleId: options.saleId,
        ...(options.attachmentType ? { attachmentType: options.attachmentType } : {}),
        ...(options.includeDeleted ? {} : { deletedAt: null }),
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    return rows.map(toRecord);
  }

  async countActiveBySale(tenantId: string, saleId: string): Promise<number> {
    return this.prisma.contractAttachment.count({
      where: { tenantId, saleId, deletedAt: null },
    });
  }

  async create(
    input: CreateContractAttachmentInput,
    tx?: OutboxTransaction,
  ): Promise<ContractAttachmentRecord> {
    const client = (tx ?? this.prisma) as PrismaService;

    const sale = await client.sale.findFirst({
      where: { id: input.saleId, tenantId: input.tenantId, deletedAt: null },
      select: { id: true },
    });

    if (!sale) {
      throw new ApplicationError('SALE_NOT_FOUND', 'Sale was not found for this tenant.', 404);
    }

    const row = await client.contractAttachment.create({
      data: {
        id: input.id,
        tenantId: input.tenantId,
        saleId: input.saleId,
        fileId: input.fileId,
        attachmentType: input.attachmentType,
        label: input.label ?? null,
        description: input.description ?? null,
        sortOrder: input.sortOrder ?? 0,
        createdById: input.createdById,
        updatedById: input.createdById,
        metadata: input.metadata ?? undefined,
      },
    });

    return toRecord(row);
  }

  async softDelete(command: SoftDeleteCommand): Promise<ContractAttachmentRecord> {
    const row = await this.prisma.contractAttachment.findFirst({
      where: { id: command.id, tenantId: command.tenantId, deletedAt: null },
    });

    if (!row) {
      throw new ApplicationError(
        'ATTACHMENT_NOT_FOUND',
        'Contract attachment was not found.',
        404,
      );
    }

    const updated = await this.prisma.contractAttachment.update({
      where: { id: row.id },
      data: {
        deletedAt: new Date(),
        deletedById: command.deletedById,
        deleteReason: command.deleteReason ?? null,
        updatedById: command.deletedById,
        version: { increment: 1 },
      },
    });

    return toRecord(updated);
  }

  async restore(command: RestoreCommand): Promise<ContractAttachmentRecord> {
    const row = await this.prisma.contractAttachment.findFirst({
      where: { id: command.id, tenantId: command.tenantId, deletedAt: { not: null } },
    });

    if (!row) {
      throw new ApplicationError(
        'ATTACHMENT_NOT_FOUND',
        'Contract attachment was not found.',
        404,
      );
    }

    const updated = await this.prisma.contractAttachment.update({
      where: { id: row.id },
      data: {
        deletedAt: null,
        deletedById: null,
        deleteReason: null,
        updatedById: command.restoredById,
        version: { increment: 1 },
      },
    });

    return toRecord(updated);
  }
}
