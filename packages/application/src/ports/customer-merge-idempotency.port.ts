export type CustomerMergeIdempotencyResult = {
  targetCustomerId: string;
  mergedSalesCount: number;
  mergedDocumentsCount: number;
};

export type CustomerMergeIdempotencyCachedRecord = {
  requestHash: string;
  response: CustomerMergeIdempotencyResult;
};

export interface ICustomerMergeIdempotencyStore {
  find(
    tenantId: string,
    idempotencyKey: string,
  ): Promise<CustomerMergeIdempotencyCachedRecord | null>;

  store(
    tenantId: string,
    idempotencyKey: string,
    requestHash: string,
    response: CustomerMergeIdempotencyResult,
  ): Promise<void>;
}

export const CUSTOMER_MERGE_IDEMPOTENCY_STORE = Symbol('CUSTOMER_MERGE_IDEMPOTENCY_STORE');

export const CUSTOMER_MERGE_IDEMPOTENCY_TTL_SECONDS = 86_400;
