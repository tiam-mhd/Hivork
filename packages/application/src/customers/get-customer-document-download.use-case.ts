import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import type { ICustomerDocumentRepository } from '../ports/customer-document.repository.port.js';
import {
  FILE_SIGNED_DOWNLOAD_TTL_SECONDS,
  type IFileStoragePort,
} from '../ports/file-storage.port.js';
import type { ISaleRepository } from '../ports/sale.repository.port.js';
import type { ITenantCustomerRepository } from '../ports/tenant-customer.repository.port.js';
import type { DataScopeStaffContext } from '../rbac/build-data-scope-filter.js';
import { resolveActiveCustomerForDocuments } from './resolve-customer-document-access.js';

export type GetCustomerDocumentDownloadInput = {
  tenantId: string;
  tenantCustomerId: string;
  documentId: string;
  actorId: string;
  staffContext: DataScopeStaffContext;
};

export type GetCustomerDocumentDownloadOutput = {
  url: string;
  expiresAt: Date;
};

export class GetCustomerDocumentDownloadUseCase
  implements UseCase<GetCustomerDocumentDownloadInput, GetCustomerDocumentDownloadOutput>
{
  constructor(
    private readonly tenantCustomers: ITenantCustomerRepository,
    private readonly sales: ISaleRepository,
    private readonly documents: ICustomerDocumentRepository,
    private readonly storage: IFileStoragePort,
  ) {}

  async execute(
    input: GetCustomerDocumentDownloadInput,
  ): Promise<GetCustomerDocumentDownloadOutput> {
    await resolveActiveCustomerForDocuments(
      input.tenantId,
      input.tenantCustomerId,
      input.staffContext,
      input.actorId,
      this.tenantCustomers,
      this.sales,
    );

    const document = await this.documents.findById(input.documentId, input.tenantId);
    if (!document || document.tenantCustomerId !== input.tenantCustomerId) {
      throw new ApplicationError(
        'DOCUMENT_NOT_FOUND',
        'Customer document was not found.',
        404,
      );
    }

    const expiresAt = new Date(Date.now() + FILE_SIGNED_DOWNLOAD_TTL_SECONDS * 1000);
    const url = await this.storage.getSignedDownloadUrl(
      document.fileStorageKey,
      FILE_SIGNED_DOWNLOAD_TTL_SECONDS,
    );

    return { url, expiresAt };
  }
}
