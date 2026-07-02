import type { OutboxTransaction } from './outbox.port.js';

export type ReassignCustomerRelatedRecordsInput = {
  tenantId: string;
  sourceTenantCustomerId: string;
  targetTenantCustomerId: string;
  updatedById: string;
};

export type ReassignCustomerRelatedRecordsResult = {
  documentsCount: number;
  notesCount: number;
  addressesCount: number;
  contactPhonesCount: number;
  emergencyContactsCount: number;
};

export interface ITenantCustomerMergeRepository {
  reassignRelatedRecords(
    input: ReassignCustomerRelatedRecordsInput,
    tx?: OutboxTransaction,
  ): Promise<ReassignCustomerRelatedRecordsResult>;
}

export const TENANT_CUSTOMER_MERGE_REPOSITORY = Symbol('TENANT_CUSTOMER_MERGE_REPOSITORY');
