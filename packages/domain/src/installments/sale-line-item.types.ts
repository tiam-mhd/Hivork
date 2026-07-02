export type SaleLineItemProps = {
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
  tenantId: string;
  saleId: string;
  title: string;
  sku?: string | null;
  quantity?: number;
  unitPriceRial: bigint;
  discountRial?: bigint;
  taxRial?: bigint;
  sortOrder?: number;
  createdById: string;
  metadata?: Record<string, unknown>;
};

export type ComputeLineTotalInput = {
  quantity: number;
  unitPriceRial: bigint;
  discountRial?: bigint;
  taxRial?: bigint;
};
