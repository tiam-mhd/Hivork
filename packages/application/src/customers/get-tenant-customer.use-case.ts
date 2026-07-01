import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import type { ISaleRepository } from '../ports/sale.repository.port.js';
import type {
  ITenantCustomerRepository,
  TenantCustomerFullDetail,
  TenantCustomerSalesSummary,
} from '../ports/tenant-customer.repository.port.js';
import type { DataScopeStaffContext } from '../rbac/build-data-scope-filter.js';
import { resolveEffectiveBranchIds } from '../rbac/build-data-scope-filter.js';
import { assertTenantCustomerInScope } from './customer-data-scope.js';

const ALLOWED_INCLUDES = ['salesSummary'] as const;
export type TenantCustomerInclude = (typeof ALLOWED_INCLUDES)[number];

export type GetTenantCustomerInput = {
  tenantId: string;
  tenantCustomerId: string;
  include?: TenantCustomerInclude[];
  staffContext: DataScopeStaffContext;
};

export type GetTenantCustomerOutput = TenantCustomerFullDetail & {
  salesSummary?: TenantCustomerSalesSummary;
};

export class GetTenantCustomerUseCase
  implements UseCase<GetTenantCustomerInput, GetTenantCustomerOutput>
{
  constructor(
    private readonly tenantCustomers: ITenantCustomerRepository,
    private readonly sales: ISaleRepository,
  ) {}

  async execute(input: GetTenantCustomerInput): Promise<GetTenantCustomerOutput> {
    this.validateIncludes(input.include);

    const detail = await this.tenantCustomers.findFullDetailById(
      input.tenantCustomerId,
      input.tenantId,
    );

    if (!detail) {
      const deleted = await this.tenantCustomers.findDeletedById(
        input.tenantCustomerId,
        input.tenantId,
      );
      if (deleted) {
        throw new ApplicationError('RECORD_DELETED', 'Customer has been deleted.', 404);
      }

      throw new ApplicationError(
        'CUSTOMER_NOT_FOUND',
        'Customer was not found for this tenant.',
        404,
      );
    }

    await assertTenantCustomerInScope(
      detail,
      input.staffContext,
      input.staffContext.staffId,
      this.sales,
    );

    const output: GetTenantCustomerOutput = { ...detail };

    if (input.include?.includes('salesSummary')) {
      output.salesSummary = await this.sales.getSalesSummaryForTenantCustomer(
        input.tenantId,
        input.tenantCustomerId,
        this.buildScope(input.staffContext),
      );
    }

    return output;
  }

  private validateIncludes(include?: TenantCustomerInclude[]): void {
    if (!include?.length) {
      return;
    }

    const invalid = include.filter(
      (value) => !ALLOWED_INCLUDES.includes(value as TenantCustomerInclude),
    );
    if (invalid.length > 0) {
      throw new ApplicationError('VALIDATION_ERROR', 'Invalid include parameter.', 400);
    }
  }

  private buildScope(staffContext: DataScopeStaffContext) {
    switch (staffContext.dataScope) {
      case 'all':
        return { dataScope: 'all' as const, actorId: staffContext.staffId };
      case 'branch':
        return {
          dataScope: 'branch' as const,
          actorId: staffContext.staffId,
          branchIds: resolveEffectiveBranchIds(staffContext),
        };
      case 'own':
        return { dataScope: 'own' as const, actorId: staffContext.staffId };
    }
  }
}
