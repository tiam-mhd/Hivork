import { UseCase } from '../core/use-case.js';
import type {
  CustomerDocumentRecord,
  CustomerDocumentType,
  ICustomerDocumentRepository,
} from '../ports/customer-document.repository.port.js';
import type { ISaleRepository } from '../ports/sale.repository.port.js';
import type { ITenantCustomerRepository } from '../ports/tenant-customer.repository.port.js';
import type { DataScopeStaffContext } from '../rbac/build-data-scope-filter.js';
import { resolveActiveCustomerForDocuments } from './resolve-customer-document-access.js';

export type ListCustomerDocumentsInput = {
  tenantId: string;
  tenantCustomerId: string;
  actorId: string;
  staffContext: DataScopeStaffContext;
  documentType?: CustomerDocumentType;
};

export type ListCustomerDocumentsOutput = {
  items: CustomerDocumentRecord[];
};

export class ListCustomerDocumentsUseCase
  implements UseCase<ListCustomerDocumentsInput, ListCustomerDocumentsOutput>
{
  constructor(
    private readonly tenantCustomers: ITenantCustomerRepository,
    private readonly sales: ISaleRepository,
    private readonly documents: ICustomerDocumentRepository,
  ) {}

  async execute(input: ListCustomerDocumentsInput): Promise<ListCustomerDocumentsOutput> {
    await resolveActiveCustomerForDocuments(
      input.tenantId,
      input.tenantCustomerId,
      input.staffContext,
      input.actorId,
      this.tenantCustomers,
      this.sales,
    );

    const items = await this.documents.listByCustomer({
      tenantId: input.tenantId,
      tenantCustomerId: input.tenantCustomerId,
      documentType: input.documentType,
    });

    return { items };
  }
}
