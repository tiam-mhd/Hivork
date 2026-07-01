import { ApplicationError } from '../errors/application.error.js';
import type { ISaleRepository } from '../ports/sale.repository.port.js';
import type { TenantCustomerRecord } from '../ports/tenant-customer.repository.port.js';
import {
  resolveEffectiveBranchIds,
  type DataScopeStaffContext,
} from '../rbac/build-data-scope-filter.js';

export async function assertTenantCustomerInScope(
  tenantCustomer: TenantCustomerRecord,
  staffContext: DataScopeStaffContext,
  actorId: string,
  sales: ISaleRepository,
): Promise<void> {
  switch (staffContext.dataScope) {
    case 'all':
      return;
    case 'branch': {
      const effective = resolveEffectiveBranchIds(staffContext);
      if (effective.length === 0) {
        throw notFound();
      }

      if (
        tenantCustomer.defaultBranchId &&
        effective.includes(tenantCustomer.defaultBranchId)
      ) {
        return;
      }

      const hasSales = await sales.hasSaleForTenantCustomerInBranches(
        tenantCustomer.tenantId,
        tenantCustomer.id,
        effective,
      );
      if (!hasSales) {
        throw notFound();
      }

      return;
    }
    case 'own': {
      const hasSales = await sales.hasSaleForTenantCustomerByStaff(
        tenantCustomer.tenantId,
        tenantCustomer.id,
        actorId,
      );
      if (!hasSales) {
        throw notFound();
      }
    }
  }
}

function notFound(): ApplicationError {
  return new ApplicationError('CUSTOMER_NOT_FOUND', 'Customer was not found for this tenant.', 404);
}
