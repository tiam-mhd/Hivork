import type {
  CreateSaleLineItemInput,
  ISaleLineItemRepository,
  ListSaleLineItemsOptions,
  OutboxTransaction,
  ReplaceSaleLineItemsInput,
  RestoreCommand,
  SaleLineItemRecord,
  SoftDeleteCommand,
  UpdateSaleLineItemInput,
} from '@hivork/application';
import { ApplicationError } from '@hivork/application';
import { Injectable } from '@nestjs/common';
import type { SaleLineItem as SaleLineItemRow } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service.js';

function toRecord(row: SaleLineItemRow): SaleLineItemRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    saleId: row.saleId,
    title: row.title,
    sku: row.sku,
    quantity: row.quantity,
    unitPriceRial: row.unitPriceRial,
    discountRial: row.discountRial,
    taxRial: row.taxRial,
    lineTotalRial: row.lineTotalRial,
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
export class PrismaSaleLineItemRepository implements ISaleLineItemRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, tenantId: string): Promise<SaleLineItemRecord | null> {
    const row = await this.prisma.saleLineItem.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    return row ? toRecord(row) : null;
  }

  async listBySale(
    options: ListSaleLineItemsOptions,
    tx?: OutboxTransaction,
  ): Promise<SaleLineItemRecord[]> {
    const client = (tx ?? this.prisma) as PrismaService;
    const rows = await client.saleLineItem.findMany({
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
    return this.prisma.saleLineItem.count({
      where: { tenantId, saleId, deletedAt: null },
    });
  }

  async sumLineTotalsBySale(tenantId: string, saleId: string): Promise<bigint> {
    const result = await this.prisma.saleLineItem.aggregate({
      where: { tenantId, saleId, deletedAt: null },
      _sum: { lineTotalRial: true },
    });

    return result._sum.lineTotalRial ?? 0n;
  }

  async create(
    input: CreateSaleLineItemInput,
    tx?: OutboxTransaction,
  ): Promise<SaleLineItemRecord> {
    const client = (tx ?? this.prisma) as PrismaService;
    await this.assertSaleExists(client, input.tenantId, input.saleId);

    const row = await client.saleLineItem.create({
      data: {
        id: input.id,
        tenantId: input.tenantId,
        saleId: input.saleId,
        title: input.title,
        sku: input.sku ?? null,
        quantity: input.quantity ?? 1,
        unitPriceRial: input.unitPriceRial,
        discountRial: input.discountRial ?? 0n,
        taxRial: input.taxRial ?? 0n,
        lineTotalRial: input.lineTotalRial,
        sortOrder: input.sortOrder ?? 0,
        createdById: input.createdById,
        updatedById: input.createdById,
        metadata: input.metadata ?? undefined,
      },
    });

    return toRecord(row);
  }

  async createMany(
    inputs: CreateSaleLineItemInput[],
    tx?: OutboxTransaction,
  ): Promise<SaleLineItemRecord[]> {
    if (inputs.length === 0) {
      return [];
    }

    const client = (tx ?? this.prisma) as PrismaService;
    const { tenantId, saleId } = inputs[0]!;
    await this.assertSaleExists(client, tenantId, saleId);

    const rows = await Promise.all(inputs.map((input) => this.create(input, tx)));
    return rows;
  }

  async update(
    input: UpdateSaleLineItemInput,
    tx?: OutboxTransaction,
  ): Promise<SaleLineItemRecord> {
    const client = (tx ?? this.prisma) as PrismaService;

    const row = await client.saleLineItem.findFirst({
      where: { id: input.id, tenantId: input.tenantId, deletedAt: null },
    });

    if (!row) {
      throw new ApplicationError('LINE_ITEM_NOT_FOUND', 'Sale line item was not found.', 404);
    }

    const updated = await client.saleLineItem.update({
      where: { id: row.id },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.sku !== undefined ? { sku: input.sku } : {}),
        ...(input.quantity !== undefined ? { quantity: input.quantity } : {}),
        ...(input.unitPriceRial !== undefined ? { unitPriceRial: input.unitPriceRial } : {}),
        ...(input.discountRial !== undefined ? { discountRial: input.discountRial } : {}),
        ...(input.taxRial !== undefined ? { taxRial: input.taxRial } : {}),
        ...(input.lineTotalRial !== undefined ? { lineTotalRial: input.lineTotalRial } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
        updatedById: input.updatedById,
        version: { increment: 1 },
      },
    });

    return toRecord(updated);
  }

  async replaceAllForSale(
    input: ReplaceSaleLineItemsInput,
    tx?: OutboxTransaction,
  ): Promise<SaleLineItemRecord[]> {
    const client = (tx ?? this.prisma) as PrismaService;
    await this.assertSaleExists(client, input.tenantId, input.saleId);

    const existing = await client.saleLineItem.findMany({
      where: { tenantId: input.tenantId, saleId: input.saleId, deletedAt: null },
      select: { id: true },
    });

    const now = new Date();
    if (existing.length > 0) {
      await client.saleLineItem.updateMany({
        where: { tenantId: input.tenantId, saleId: input.saleId, deletedAt: null },
        data: {
          deletedAt: now,
          deletedById: input.replacedById,
          deleteReason: input.deleteReason,
          updatedById: input.replacedById,
        },
      });
    }

    return this.createMany(input.items, tx);
  }

  async softDelete(
    command: SoftDeleteCommand,
    tx?: OutboxTransaction,
  ): Promise<SaleLineItemRecord> {
    const client = (tx ?? this.prisma) as PrismaService;

    const row = await client.saleLineItem.findFirst({
      where: { id: command.id, tenantId: command.tenantId, deletedAt: null },
    });

    if (!row) {
      throw new ApplicationError('LINE_ITEM_NOT_FOUND', 'Sale line item was not found.', 404);
    }

    const updated = await client.saleLineItem.update({
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

  async restore(command: RestoreCommand): Promise<SaleLineItemRecord> {
    const row = await this.prisma.saleLineItem.findFirst({
      where: { id: command.id, tenantId: command.tenantId, deletedAt: { not: null } },
    });

    if (!row) {
      throw new ApplicationError('LINE_ITEM_NOT_FOUND', 'Sale line item was not found.', 404);
    }

    const updated = await this.prisma.saleLineItem.update({
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

  private async assertSaleExists(
    client: PrismaService,
    tenantId: string,
    saleId: string,
  ): Promise<void> {
    const sale = await client.sale.findFirst({
      where: { id: saleId, tenantId, deletedAt: null },
      select: { id: true },
    });

    if (!sale) {
      throw new ApplicationError('SALE_NOT_FOUND', 'Sale was not found for this tenant.', 404);
    }
  }
}
