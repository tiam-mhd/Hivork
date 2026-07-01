import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import type { ITenantCustomerRepository } from '../ports/tenant-customer.repository.port.js';

export type ListDeletedTenantCustomersInput = {
  tenantId: string;
  limit?: number;
};

export type ListDeletedTenantCustomersOutput = {
  items: Awaited<ReturnType<ITenantCustomerRepository['listDeleted']>>;
};

export class ListDeletedTenantCustomersUseCase
  implements UseCase<ListDeletedTenantCustomersInput, ListDeletedTenantCustomersOutput>
{
  constructor(private readonly repository: ITenantCustomerRepository) {}

  async execute(input: ListDeletedTenantCustomersInput): Promise<ListDeletedTenantCustomersOutput> {
    const limit = input.limit ?? 50;
    if (limit < 1 || limit > 100) {
      throw new ApplicationError('VALIDATION_ERROR', 'Limit must be between 1 and 100.', 400);
    }

    const items = await this.repository.listDeleted(input.tenantId, limit);
    return { items };
  }
}
