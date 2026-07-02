import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import type { AuditService } from '../ports/audit.port.js';
import type { ICustomerDocumentRepository } from '../ports/customer-document.repository.port.js';
import type { ISaleRepository } from '../ports/sale.repository.port.js';
import type { ITenantCustomerRepository } from '../ports/tenant-customer.repository.port.js';
import type { DataScopeStaffContext } from '../rbac/build-data-scope-filter.js';
import { resolveActiveCustomerForDocuments } from './resolve-customer-document-access.js';

export type DeleteCustomerDocumentInput = {
  tenantId: string;
  tenantCustomerId: string;
  documentId: string;
  actorId: string;
  staffContext: DataScopeStaffContext;
  deleteReason?: string;
  ip?: string;
  userAgent?: string;
};

export type DeleteCustomerDocumentOutput = {
  id: string;
  deletedAt: Date;
};

export class DeleteCustomerDocumentUseCase
  implements UseCase<DeleteCustomerDocumentInput, DeleteCustomerDocumentOutput>
{
  constructor(
    private readonly tenantCustomers: ITenantCustomerRepository,
    private readonly sales: ISaleRepository,
    private readonly documents: ICustomerDocumentRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(input: DeleteCustomerDocumentInput): Promise<DeleteCustomerDocumentOutput> {
    await resolveActiveCustomerForDocuments(
      input.tenantId,
      input.tenantCustomerId,
      input.staffContext,
      input.actorId,
      this.tenantCustomers,
      this.sales,
    );

    const existing = await this.documents.findById(input.documentId, input.tenantId);
    if (!existing || existing.tenantCustomerId !== input.tenantCustomerId) {
      throw new ApplicationError(
        'DOCUMENT_NOT_FOUND',
        'Customer document was not found.',
        404,
      );
    }

    const deleted = await this.documents.softDelete({
      id: input.documentId,
      tenantId: input.tenantId,
      deletedById: input.actorId,
      deleteReason: input.deleteReason,
    });

    await this.audit.log({
      tenantId: input.tenantId,
      actorType: 'staff',
      actorId: input.actorId,
      action: 'customer.document.delete',
      entityType: 'customer_document',
      entityId: deleted.id,
      oldValue: {
        tenantCustomerId: input.tenantCustomerId,
        documentType: existing.documentType,
      },
      ip: input.ip,
      userAgent: input.userAgent,
    });

    return {
      id: deleted.id,
      deletedAt: deleted.deletedAt!,
    };
  }
}
