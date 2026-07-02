import { ApplicationError } from '../errors/application.error.js';
import type { ISaleRepository } from '../ports/sale.repository.port.js';
import type { ITenantCustomerRepository } from '../ports/tenant-customer.repository.port.js';
import type { DataScopeStaffContext } from '../rbac/build-data-scope-filter.js';
import { assertTenantCustomerInScope } from './customer-data-scope.js';

export async function resolveActiveCustomerForDocuments(
  tenantId: string,
  tenantCustomerId: string,
  staffContext: DataScopeStaffContext,
  actorId: string,
  tenantCustomers: ITenantCustomerRepository,
  sales: ISaleRepository,
) {
  const customer = await tenantCustomers.findActiveById(tenantCustomerId, tenantId);

  if (!customer) {
    const deleted = await tenantCustomers.findDeletedById(tenantCustomerId, tenantId);
    if (deleted) {
      throw new ApplicationError('RECORD_DELETED', 'Customer has been deleted.', 404);
    }

    throw new ApplicationError(
      'CUSTOMER_NOT_FOUND',
      'Customer was not found for this tenant.',
      404,
    );
  }

  await assertTenantCustomerInScope(customer, staffContext, actorId, sales);

  return customer;
}
