import type {
  ContractCollateralRecord,
  CreateContractCollateralInput,
  IContractCollateralRepository,
  ListContractCollateralsOptions,
  OutboxTransaction,
  RestoreCommand,
  SoftDeleteCommand,
  UpdateContractCollateralStatusInput,
  UpdateContractCollateralInput,
} from '@hivork/application';
import { ApplicationError } from '@hivork/application';
import { Injectable } from '@nestjs/common';
import type { ContractCollateral as ContractCollateralRow } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service.js';

function toRecord(row: ContractCollateralRow): ContractCollateralRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    saleId: row.saleId,
    collateralType: row.collateralType,
    title: row.title,
    description: row.description,
    estimatedValueRial: row.estimatedValueRial,
    documentFileId: row.documentFileId,
    registrationNumber: row.registrationNumber,
    issuedAt: row.issuedAt,
    status: row.status,
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
export class PrismaContractCollateralRepository implements IContractCollateralRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, tenantId: string): Promise<ContractCollateralRecord | null> {
    const row = await this.prisma.contractCollateral.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    return row ? toRecord(row) : null;
  }

  async listBySale(
    options: ListContractCollateralsOptions,
    tx?: OutboxTransaction,
  ): Promise<ContractCollateralRecord[]> {
    const client = (tx ?? this.prisma) as PrismaService;
    const rows = await client.contractCollateral.findMany({
      where: {
        tenantId: options.tenantId,
        saleId: options.saleId,
        ...(options.status ? { status: options.status } : {}),
        ...(options.includeDeleted ? {} : { deletedAt: null }),
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    return rows.map(toRecord);
  }

  async countActiveBySale(tenantId: string, saleId: string): Promise<number> {
    return this.prisma.contractCollateral.count({
      where: { tenantId, saleId, deletedAt: null },
    });
  }

  async create(
    input: CreateContractCollateralInput,
    tx?: OutboxTransaction,
  ): Promise<ContractCollateralRecord> {
    const client = (tx ?? this.prisma) as PrismaService;

    const sale = await client.sale.findFirst({
      where: { id: input.saleId, tenantId: input.tenantId, deletedAt: null },
      select: { id: true },
    });

    if (!sale) {
      throw new ApplicationError('SALE_NOT_FOUND', 'Sale was not found for this tenant.', 404);
    }

    const row = await client.contractCollateral.create({
      data: {
        id: input.id,
        tenantId: input.tenantId,
        saleId: input.saleId,
        collateralType: input.collateralType,
        title: input.title,
        description: input.description ?? null,
        estimatedValueRial: input.estimatedValueRial,
        documentFileId: input.documentFileId ?? null,
        registrationNumber: input.registrationNumber ?? null,
        issuedAt: input.issuedAt ?? null,
        sortOrder: input.sortOrder ?? 0,
        createdById: input.createdById,
        updatedById: input.createdById,
        metadata: input.metadata ?? undefined,
      },
    });

    return toRecord(row);
  }

  async update(
    input: UpdateContractCollateralInput,
    tx?: OutboxTransaction,
  ): Promise<ContractCollateralRecord> {
    const client = (tx ?? this.prisma) as PrismaService;

    const row = await client.contractCollateral.findFirst({
      where: { id: input.id, tenantId: input.tenantId, deletedAt: null },
    });

    if (!row) {
      throw new ApplicationError('COLLATERAL_NOT_FOUND', 'Contract collateral was not found.', 404);
    }

    const updated = await client.contractCollateral.update({
      where: { id: row.id },
      data: {
        ...(input.collateralType !== undefined ? { collateralType: input.collateralType } : {}),
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.estimatedValueRial !== undefined
          ? { estimatedValueRial: input.estimatedValueRial }
          : {}),
        ...(input.documentFileId !== undefined ? { documentFileId: input.documentFileId } : {}),
        ...(input.registrationNumber !== undefined
          ? { registrationNumber: input.registrationNumber }
          : {}),
        ...(input.issuedAt !== undefined ? { issuedAt: input.issuedAt } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
        updatedById: input.updatedById,
        version: { increment: 1 },
      },
    });

    return toRecord(updated);
  }

  async updateStatus(
    input: UpdateContractCollateralStatusInput,
    tx?: OutboxTransaction,
  ): Promise<ContractCollateralRecord> {
    const client = (tx ?? this.prisma) as PrismaService;

    const row = await client.contractCollateral.findFirst({
      where: { id: input.id, tenantId: input.tenantId, deletedAt: null },
    });

    if (!row) {
      throw new ApplicationError('COLLATERAL_NOT_FOUND', 'Contract collateral was not found.', 404);
    }

    const updated = await client.contractCollateral.update({
      where: { id: row.id },
      data: {
        status: input.status,
        updatedById: input.updatedById,
        version: { increment: 1 },
      },
    });

    return toRecord(updated);
  }

  async softDelete(command: SoftDeleteCommand): Promise<ContractCollateralRecord> {
    const row = await this.prisma.contractCollateral.findFirst({
      where: { id: command.id, tenantId: command.tenantId, deletedAt: null },
    });

    if (!row) {
      throw new ApplicationError('COLLATERAL_NOT_FOUND', 'Contract collateral was not found.', 404);
    }

    const updated = await this.prisma.contractCollateral.update({
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

  async restore(command: RestoreCommand): Promise<ContractCollateralRecord> {
    const row = await this.prisma.contractCollateral.findFirst({
      where: { id: command.id, tenantId: command.tenantId, deletedAt: { not: null } },
    });

    if (!row) {
      throw new ApplicationError('COLLATERAL_NOT_FOUND', 'Contract collateral was not found.', 404);
    }

    const updated = await this.prisma.contractCollateral.update({
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
