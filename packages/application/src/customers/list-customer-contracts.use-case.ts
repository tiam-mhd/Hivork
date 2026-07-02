import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import type {
  CustomerContractListRecord,
  CustomerContractStatus,
  ICustomerContractsRepository,
} from '../ports/customer-contracts.repository.port.js';
import type { ISaleRepository } from '../ports/sale.repository.port.js';
import type { ITenantCustomerRepository } from '../ports/tenant-customer.repository.port.js';
import type { DataScopeStaffContext } from '../rbac/build-data-scope-filter.js';
import { resolveEffectiveBranchIds } from '../rbac/build-data-scope-filter.js';
import { assertTenantCustomerInScope } from './customer-data-scope.js';
import {
  contractDateFromCursor,
  decodeCustomerContractCursor,
  encodeCustomerContractCursor,
} from './customer-contract-cursor.js';

export type ListCustomerContractsInput = {
  tenantId: string;
  tenantCustomerId: string;
  limit?: number;
  cursor?: string;
  status?: CustomerContractStatus;
  staffContext: DataScopeStaffContext;
};

export type ListCustomerContractsOutput = {
  items: CustomerContractListRecord[];
  meta: {
    hasNext: boolean;
    nextCursor: string | null;
  };
};

export class ListCustomerContractsUseCase
  implements UseCase<ListCustomerContractsInput, ListCustomerContractsOutput>
{
  constructor(
    private readonly tenantCustomers: ITenantCustomerRepository,
    private readonly sales: ISaleRepository,
    private readonly contracts: ICustomerContractsRepository,
  ) {}

  async execute(input: ListCustomerContractsInput): Promise<ListCustomerContractsOutput> {
    const limit = Math.min(input.limit ?? 20, 50);

    const customer = await this.tenantCustomers.findFullDetailById(
      input.tenantCustomerId,
      input.tenantId,
    );
    if (!customer) {
      throw new ApplicationError(
        'CUSTOMER_NOT_FOUND',
        'Customer was not found for this tenant.',
        404,
      );
    }

    await assertTenantCustomerInScope(
      customer,
      input.staffContext,
      input.staffContext.staffId,
      this.sales,
    );

    const cursor = input.cursor ? decodeCustomerContractCursor(input.cursor) : undefined;

    const rows = await this.contracts.listByCustomer({
      tenantId: input.tenantId,
      tenantCustomerId: input.tenantCustomerId,
      status: input.status,
      limit: limit + 1,
      cursor: cursor
        ? {
            contractDate: contractDateFromCursor(cursor.contractDate),
            id: cursor.id,
          }
        : undefined,
      scope: this.buildScope(input.staffContext),
    });

    const hasNext = rows.length > limit;
    const pageItems = hasNext ? rows.slice(0, limit) : rows;
    const lastItem = pageItems.at(-1);

    return {
      items: pageItems,
      meta: {
        hasNext,
        nextCursor:
          hasNext && lastItem
            ? encodeCustomerContractCursor({
                contractDate: lastItem.contractDate,
                id: lastItem.saleId,
              })
            : null,
      },
    };
  }

  private buildScope(staffContext: DataScopeStaffContext) {
    switch (staffContext.dataScope) {
      case 'all':
        return { dataScope: 'all' as const };
      case 'branch':
        return {
          dataScope: 'branch' as const,
          branchIds: resolveEffectiveBranchIds(staffContext),
        };
      case 'own':
        return {
          dataScope: 'own' as const,
          staffId: staffContext.staffId,
        };
    }
  }
}
