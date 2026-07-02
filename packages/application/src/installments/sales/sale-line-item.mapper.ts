import type { SaleLineItemRecord } from '../../ports/sale-line-item.repository.port.js';

export function mapSaleLineItemToDto(record: SaleLineItemRecord) {
  return {
    id: record.id,
    saleId: record.saleId,
    title: record.title,
    sku: record.sku,
    quantity: record.quantity,
    unitPriceRial: record.unitPriceRial.toString(),
    discountRial: record.discountRial.toString(),
    taxRial: record.taxRial.toString(),
    lineTotalRial: record.lineTotalRial.toString(),
    sortOrder: record.sortOrder,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    createdById: record.createdById,
    version: record.version,
  };
}

export type SaleLineItemDto = ReturnType<typeof mapSaleLineItemToDto>;
