import { randomUUID } from 'node:crypto';

import type {
  ISaleCopyRelatedRepository,
  OutboxTransaction,
  SaleCopyGuarantorRecord,
  SaleCopyLineItemRecord,
} from '@hivork/application';
import { Injectable } from '@nestjs/common';
import type { GuarantorRelationship } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service.js';

function toGuarantorCopyRecord(row: {
  tenantCustomerId: string | null;
  fullName: string | null;
  nationalId: string | null;
  phone: string | null;
  relationship: GuarantorRelationship;
  note: string | null;
  sortOrder: number;
  metadata: unknown;
}): SaleCopyGuarantorRecord {
  return {
    tenantCustomerId: row.tenantCustomerId,
    fullName: row.fullName,
    nationalId: row.nationalId,
    phone: row.phone,
    relationship: row.relationship,
    note: row.note,
    sortOrder: row.sortOrder,
    metadata: row.metadata,
  };
}

function toLineItemCopyRecord(row: {
  title: string;
  sku: string | null;
  quantity: number;
  unitPriceRial: bigint;
  discountRial: bigint;
  taxRial: bigint;
  lineTotalRial: bigint;
  sortOrder: number;
  metadata: unknown;
}): SaleCopyLineItemRecord {
  return {
    title: row.title,
    sku: row.sku,
    quantity: row.quantity,
    unitPriceRial: row.unitPriceRial.toString(),
    discountRial: row.discountRial.toString(),
    taxRial: row.taxRial.toString(),
    lineTotalRial: row.lineTotalRial.toString(),
    sortOrder: row.sortOrder,
    metadata: row.metadata,
  };
}

@Injectable()
export class MetadataSaleCopyRelatedRepository implements ISaleCopyRelatedRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listLineItems(
    tenantId: string,
    saleId: string,
    tx?: OutboxTransaction,
  ): Promise<SaleCopyLineItemRecord[]> {
    const client = (tx ?? this.prisma) as PrismaService;
    const rows = await client.saleLineItem.findMany({
      where: { tenantId, saleId, deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: {
        title: true,
        sku: true,
        quantity: true,
        unitPriceRial: true,
        discountRial: true,
        taxRial: true,
        lineTotalRial: true,
        sortOrder: true,
        metadata: true,
      },
    });

    return rows.map(toLineItemCopyRecord);
  }

  async listGuarantors(
    tenantId: string,
    saleId: string,
    tx?: OutboxTransaction,
  ): Promise<SaleCopyGuarantorRecord[]> {
    const client = (tx ?? this.prisma) as PrismaService;
    const rows = await client.contractGuarantor.findMany({
      where: { tenantId, saleId, deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: {
        tenantCustomerId: true,
        fullName: true,
        nationalId: true,
        phone: true,
        relationship: true,
        note: true,
        sortOrder: true,
        metadata: true,
      },
    });

    return rows.map(toGuarantorCopyRecord);
  }

  async copyLineItemsToSale(
    tenantId: string,
    targetSaleId: string,
    items: SaleCopyLineItemRecord[],
    actorId: string,
    tx?: OutboxTransaction,
  ): Promise<void> {
    if (items.length === 0) {
      return;
    }

    const client = (tx ?? this.prisma) as PrismaService;

    for (const item of items) {
      const quantity =
        typeof item.quantity === 'number'
          ? item.quantity
          : Number.parseInt(String(item.quantity ?? '1'), 10);
      const unitPriceRial = BigInt(String(item.unitPriceRial ?? '0'));
      const discountRial = BigInt(String(item.discountRial ?? '0'));
      const taxRial = BigInt(String(item.taxRial ?? '0'));
      const lineTotalRial = BigInt(
        String(item.lineTotalRial ?? quantity * Number(unitPriceRial) - Number(discountRial) + Number(taxRial)),
      );

      await client.saleLineItem.create({
        data: {
          id: randomUUID(),
          tenantId,
          saleId: targetSaleId,
          title: typeof item.title === 'string' ? item.title : 'Copied item',
          sku: typeof item.sku === 'string' ? item.sku : null,
          quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
          unitPriceRial,
          discountRial,
          taxRial,
          lineTotalRial,
          sortOrder: typeof item.sortOrder === 'number' ? item.sortOrder : 0,
          createdById: actorId,
          updatedById: actorId,
          metadata:
            item.metadata && typeof item.metadata === 'object'
              ? (item.metadata as object)
              : undefined,
        },
      });
    }
  }

  async copyGuarantorsToSale(
    tenantId: string,
    targetSaleId: string,
    guarantors: SaleCopyGuarantorRecord[],
    actorId: string,
    tx?: OutboxTransaction,
  ): Promise<void> {
    if (guarantors.length === 0) {
      return;
    }

    const client = (tx ?? this.prisma) as PrismaService;

    for (const guarantor of guarantors) {
      await client.contractGuarantor.create({
        data: {
          id: randomUUID(),
          tenantId,
          saleId: targetSaleId,
          tenantCustomerId:
            typeof guarantor.tenantCustomerId === 'string'
              ? guarantor.tenantCustomerId
              : null,
          fullName: typeof guarantor.fullName === 'string' ? guarantor.fullName : null,
          nationalId: typeof guarantor.nationalId === 'string' ? guarantor.nationalId : null,
          phone: typeof guarantor.phone === 'string' ? guarantor.phone : null,
          relationship:
            typeof guarantor.relationship === 'string'
              ? (guarantor.relationship as GuarantorRelationship)
              : 'OTHER',
          note: typeof guarantor.note === 'string' ? guarantor.note : null,
          sortOrder: typeof guarantor.sortOrder === 'number' ? guarantor.sortOrder : 0,
          createdById: actorId,
          updatedById: actorId,
          metadata:
            guarantor.metadata && typeof guarantor.metadata === 'object'
              ? (guarantor.metadata as object)
              : undefined,
        },
      });
    }
  }
}
