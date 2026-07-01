export type CustomerImportIdempotencyResult = {
  totalRows: number;
  successCount: number;
  errorCount: number;
  errors: Array<{
    row: number;
    phone: string | null;
    error: string;
  }>;
};

export type CustomerImportIdempotencyCachedRecord = {
  requestHash: string;
  response: CustomerImportIdempotencyResult;
};

export interface ICustomerImportIdempotencyStore {
  find(
    tenantId: string,
    idempotencyKey: string,
  ): Promise<CustomerImportIdempotencyCachedRecord | null>;

  store(
    tenantId: string,
    idempotencyKey: string,
    requestHash: string,
    response: CustomerImportIdempotencyResult,
  ): Promise<void>;
}

export const CUSTOMER_IMPORT_IDEMPOTENCY_STORE = Symbol('CUSTOMER_IMPORT_IDEMPOTENCY_STORE');

export const CUSTOMER_IMPORT_IDEMPOTENCY_TTL_SECONDS = 86_400;
