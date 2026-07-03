export type CustomerPaymentStatus = 'pending' | 'confirmed' | 'rejected' | 'voided';

export type CustomerPaymentScopeFilter =
  | { dataScope: 'all' }
  | { dataScope: 'branch'; branchIds: string[] }
  | { dataScope: 'own'; staffId: string };

export type CustomerPaymentListRecord = {
  paymentId: string;
  amountRial: bigint;
  status: CustomerPaymentStatus;
  method: string;
  confirmedAt: Date | null;
  sortAt: Date;
  installmentNumber: number;
  saleTitle: string | null;
  saleId: string;
};

export type ListCustomerPaymentsOptions = {
  tenantId: string;
  tenantCustomerId: string;
  limit: number;
  status?: CustomerPaymentStatus;
  occurredFrom?: Date;
  occurredTo?: Date;
  cursor?: {
    sortAt: Date;
    id: string;
  };
  scope: CustomerPaymentScopeFilter;
};

export type CustomerPaymentSummaryRecord = {
  totalPaidRial: bigint;
  pendingCount: number;
};

export type SummarizeCustomerPaymentsOptions = {
  tenantId: string;
  tenantCustomerId: string;
  occurredFrom?: Date;
  occurredTo?: Date;
  scope: CustomerPaymentScopeFilter;
};

export interface ICustomerPaymentsRepository {
  listByCustomer(options: ListCustomerPaymentsOptions): Promise<CustomerPaymentListRecord[]>;
  summarizeByCustomer(options: SummarizeCustomerPaymentsOptions): Promise<CustomerPaymentSummaryRecord>;
}
