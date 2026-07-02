import type { OutboxTransaction } from './outbox.port.js';

export type SaleCopyLineItemRecord = Record<string, unknown>;
export type SaleCopyGuarantorRecord = Record<string, unknown>;

/** Line items / guarantors copy — SaleLineItem + ContractGuarantor tables (IFP-068 / IFP-065). */
export interface ISaleCopyRelatedRepository {
  listLineItems(
    tenantId: string,
    saleId: string,
    tx?: OutboxTransaction,
  ): Promise<SaleCopyLineItemRecord[]>;
  listGuarantors(
    tenantId: string,
    saleId: string,
    tx?: OutboxTransaction,
  ): Promise<SaleCopyGuarantorRecord[]>;
  copyLineItemsToSale(
    tenantId: string,
    targetSaleId: string,
    items: SaleCopyLineItemRecord[],
    actorId: string,
    tx?: OutboxTransaction,
  ): Promise<void>;
  copyGuarantorsToSale(
    tenantId: string,
    targetSaleId: string,
    guarantors: SaleCopyGuarantorRecord[],
    actorId: string,
    tx?: OutboxTransaction,
  ): Promise<void>;
}

export const SALE_COPY_RELATED_REPOSITORY = Symbol('SALE_COPY_RELATED_REPOSITORY');
