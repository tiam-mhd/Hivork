import type { RestoreCommand, SoftDeleteCommand } from './soft-deletable.repository.port.js';
import type { OutboxTransaction } from './outbox.port.js';

export type SaleLineItemRecord = {
  id: string;
  tenantId: string;
  saleId: string;
  title: string;
  sku: string | null;
  quantity: number;
  unitPriceRial: bigint;
  discountRial: bigint;
  taxRial: bigint;
  lineTotalRial: bigint;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  createdById: string | null;
  updatedById: string | null;
  deletedAt: Date | null;
  deletedById: string | null;
  deleteReason: string | null;
  version: number;
  metadata: Record<string, unknown> | null;
};

export type CreateSaleLineItemInput = {
  id: string;
  tenantId: string;
  saleId: string;
  title: string;
  sku?: string | null;
  quantity?: number;
  unitPriceRial: bigint;
  discountRial?: bigint;
  taxRial?: bigint;
  lineTotalRial: bigint;
  sortOrder?: number;
  createdById: string;
  metadata?: Record<string, unknown>;
};

export type UpdateSaleLineItemInput = {
  id: string;
  tenantId: string;
  title?: string;
  sku?: string | null;
  quantity?: number;
  unitPriceRial?: bigint;
  discountRial?: bigint;
  taxRial?: bigint;
  lineTotalRial?: bigint;
  sortOrder?: number;
  updatedById: string;
};

export type ListSaleLineItemsOptions = {
  tenantId: string;
  saleId: string;
  includeDeleted?: boolean;
};

export type ReplaceSaleLineItemsInput = {
  tenantId: string;
  saleId: string;
  items: CreateSaleLineItemInput[];
  replacedById: string;
  deleteReason: string;
};

/** Repository port — Prisma implementation in IFP-068. */
export interface ISaleLineItemRepository {
  findById(id: string, tenantId: string): Promise<SaleLineItemRecord | null>;
  listBySale(
    options: ListSaleLineItemsOptions,
    tx?: OutboxTransaction,
  ): Promise<SaleLineItemRecord[]>;
  countActiveBySale(tenantId: string, saleId: string): Promise<number>;
  sumLineTotalsBySale(tenantId: string, saleId: string): Promise<bigint>;
  create(input: CreateSaleLineItemInput, tx?: OutboxTransaction): Promise<SaleLineItemRecord>;
  createMany(
    inputs: CreateSaleLineItemInput[],
    tx?: OutboxTransaction,
  ): Promise<SaleLineItemRecord[]>;
  update(input: UpdateSaleLineItemInput, tx?: OutboxTransaction): Promise<SaleLineItemRecord>;
  replaceAllForSale(
    input: ReplaceSaleLineItemsInput,
    tx?: OutboxTransaction,
  ): Promise<SaleLineItemRecord[]>;
  softDelete(command: SoftDeleteCommand, tx?: OutboxTransaction): Promise<SaleLineItemRecord>;
  restore(command: RestoreCommand, tx?: OutboxTransaction): Promise<SaleLineItemRecord>;
}

export const SALE_LINE_ITEM_REPOSITORY = Symbol('SALE_LINE_ITEM_REPOSITORY');
