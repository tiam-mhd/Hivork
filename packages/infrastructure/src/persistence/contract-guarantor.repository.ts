import type {
  ContractGuarantorRecord,
  CreateContractGuarantorInput,
  IContractGuarantorRepository,
  ListContractGuarantorsOptions,
  OutboxTransaction,
  RestoreCommand,
  SoftDeleteCommand,
  UpdateContractGuarantorInput,
} from '@hivork/application';
import { ApplicationError } from '@hivork/application';
import { Injectable } from '@nestjs/common';
import type { ContractGuarantor as ContractGuarantorRow } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service.js';

function toRecord(row: ContractGuarantorRow): ContractGuarantorRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    saleId: row.saleId,
    tenantCustomerId: row.tenantCustomerId,
    fullName: row.fullName,
    nationalId: row.nationalId,
    phone: row.phone,
    relationship: row.relationship,
    note: row.note,
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
export class PrismaContractGuarantorRepository implements IContractGuarantorRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, tenantId: string): Promise<ContractGuarantorRecord | null> {
    const row = await this.prisma.contractGuarantor.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    return row ? toRecord(row) : null;
  }

  async listBySale(
    options: ListContractGuarantorsOptions,
    tx?: OutboxTransaction,
  ): Promise<ContractGuarantorRecord[]> {
    const client = (tx ?? this.prisma) as PrismaService;
    const rows = await client.contractGuarantor.findMany({
      where: {
        tenantId: options.tenantId,
        saleId: options.saleId,
        ...(options.includeDeleted ? {} : { deletedAt: null }),
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    return rows.map(toRecord);
  }

  async countActiveBySale(tenantId: string, saleId: string): Promise<number> {
    return this.prisma.contractGuarantor.count({
      where: { tenantId, saleId, deletedAt: null },
    });
  }

  async create(
    input: CreateContractGuarantorInput,
    tx?: OutboxTransaction,
  ): Promise<ContractGuarantorRecord> {
    const client = (tx ?? this.prisma) as PrismaService;

    const sale = await client.sale.findFirst({
      where: { id: input.saleId, tenantId: input.tenantId, deletedAt: null },
      select: { id: true },
    });

    if (!sale) {
      throw new ApplicationError('SALE_NOT_FOUND', 'Sale was not found for this tenant.', 404);
    }

    if (input.tenantCustomerId) {
      const tenantCustomer = await client.tenantCustomer.findFirst({
        where: {
          id: input.tenantCustomerId,
          tenantId: input.tenantId,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (!tenantCustomer) {
        throw new ApplicationError(
          'CUSTOMER_NOT_FOUND',
          'Tenant customer was not found for this tenant.',
          404,
        );
      }
    }

    const row = await client.contractGuarantor.create({
      data: {
        id: input.id,
        tenantId: input.tenantId,
        saleId: input.saleId,
        tenantCustomerId: input.tenantCustomerId ?? null,
        fullName: input.fullName ?? null,
        nationalId: input.nationalId ?? null,
        phone: input.phone ?? null,
        relationship: input.relationship,
        note: input.note ?? null,
        sortOrder: input.sortOrder ?? 0,
        createdById: input.createdById,
        updatedById: input.createdById,
        metadata: input.metadata ?? undefined,
      },
    });

    return toRecord(row);
  }

  async update(
    input: UpdateContractGuarantorInput,
    tx?: OutboxTransaction,
  ): Promise<ContractGuarantorRecord> {
    const client = (tx ?? this.prisma) as PrismaService;

    const row = await client.contractGuarantor.findFirst({
      where: { id: input.id, tenantId: input.tenantId, deletedAt: null },
    });

    if (!row) {
      throw new ApplicationError('GUARANTOR_NOT_FOUND', 'Contract guarantor was not found.', 404);
    }

    if (input.tenantCustomerId) {
      const tenantCustomer = await client.tenantCustomer.findFirst({
        where: {
          id: input.tenantCustomerId,
          tenantId: input.tenantId,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (!tenantCustomer) {
        throw new ApplicationError(
          'CUSTOMER_NOT_FOUND',
          'Tenant customer was not found for this tenant.',
          404,
        );
      }
    }

    const updated = await client.contractGuarantor.update({
      where: { id: row.id },
      data: {
        ...(input.tenantCustomerId !== undefined
          ? { tenantCustomerId: input.tenantCustomerId }
          : {}),
        ...(input.fullName !== undefined ? { fullName: input.fullName } : {}),
        ...(input.nationalId !== undefined ? { nationalId: input.nationalId } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.relationship !== undefined ? { relationship: input.relationship } : {}),
        ...(input.note !== undefined ? { note: input.note } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
        updatedById: input.updatedById,
        version: { increment: 1 },
      },
    });

    return toRecord(updated);
  }

  async softDelete(command: SoftDeleteCommand): Promise<ContractGuarantorRecord> {
    const row = await this.prisma.contractGuarantor.findFirst({
      where: { id: command.id, tenantId: command.tenantId, deletedAt: null },
    });

    if (!row) {
      throw new ApplicationError('GUARANTOR_NOT_FOUND', 'Contract guarantor was not found.', 404);
    }

    const updated = await this.prisma.contractGuarantor.update({
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

  async restore(command: RestoreCommand): Promise<ContractGuarantorRecord> {
    const row = await this.prisma.contractGuarantor.findFirst({
      where: { id: command.id, tenantId: command.tenantId, deletedAt: { not: null } },
    });

    if (!row) {
      throw new ApplicationError('GUARANTOR_NOT_FOUND', 'Contract guarantor was not found.', 404);
    }

    const updated = await this.prisma.contractGuarantor.update({
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
