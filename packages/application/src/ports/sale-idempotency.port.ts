import type { OutboxTransaction } from './outbox.port.js';

export type SaleIdempotencyCachedRecord = {
  requestHash: string;
  response: Record<string, unknown>;
};

export interface ISaleIdempotencyStore {
  find(
    tenantId: string,
    idempotencyKey: string,
  ): Promise<SaleIdempotencyCachedRecord | null>;

  store(
    tenantId: string,
    idempotencyKey: string,
    requestHash: string,
    response: Record<string, unknown>,
    tx?: OutboxTransaction,
  ): Promise<void>;
}

export const SALE_IDEMPOTENCY_STORE = Symbol('SALE_IDEMPOTENCY_STORE');
