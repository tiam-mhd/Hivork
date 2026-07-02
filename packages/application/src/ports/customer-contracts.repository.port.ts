export type CustomerContractStatus = 'active' | 'cancelled' | 'closed' | 'overdue';

export type CustomerContractScopeFilter =
  | { dataScope: 'all' }
  | { dataScope: 'branch'; branchIds: string[] }
  | { dataScope: 'own'; staffId: string };

export type CustomerContractListRecord = {
  saleId: string;
  title: string | null;
  status: CustomerContractStatus;
  totalAmountRial: bigint;
  paidAmountRial: bigint;
  installmentCount: number;
  contractDate: Date;
  branchName: string;
  sellerName: string;
  overdueCount: number;
};

export type ListCustomerContractsOptions = {
  tenantId: string;
  tenantCustomerId: string;
  limit: number;
  status?: CustomerContractStatus;
  cursor?: {
    contractDate: Date;
    id: string;
  };
  scope: CustomerContractScopeFilter;
};

export interface ICustomerContractsRepository {
  listByCustomer(options: ListCustomerContractsOptions): Promise<CustomerContractListRecord[]>;
}
