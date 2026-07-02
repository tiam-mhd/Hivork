import { randomUUID } from 'node:crypto';

import { CustomerDocument } from '@hivork/domain';

import { mergeInstallmentsSettings } from '../installments/settings/merge-installments-settings.js';
import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import type { AuditService } from '../ports/audit.port.js';
import type {
  CustomerDocumentRecord,
  ICustomerDocumentRepository,
} from '../ports/customer-document.repository.port.js';
import type { IFileStoragePort } from '../ports/file-storage.port.js';
import type { IFileVirusScanPort } from '../ports/file-virus-scan.port.js';
import type { ISaleRepository } from '../ports/sale.repository.port.js';
import type { ITenantCustomerRepository } from '../ports/tenant-customer.repository.port.js';
import type { ITenantSettingsRepository } from '../ports/tenant-settings.repository.port.js';
import type { DataScopeStaffContext } from '../rbac/build-data-scope-filter.js';
import {
  ALLOWED_CUSTOMER_DOCUMENT_MIMES,
  buildCustomerDocumentStorageKey,
} from './customer-document.constants.js';
import { mapDomainError } from '../errors/map-domain-error.js';
import { resolveActiveCustomerForDocuments } from './resolve-customer-document-access.js';

export type UploadCustomerDocumentInput = {
  tenantId: string;
  tenantCustomerId: string;
  actorId: string;
  staffContext: DataScopeStaffContext;
  fileBuffer: Buffer;
  originalFileName: string;
  mimeType: string;
  documentType: CustomerDocumentRecord['documentType'];
  description?: string;
  expiresAt?: Date;
  ip?: string;
  userAgent?: string;
};

export type UploadCustomerDocumentOutput = CustomerDocumentRecord;

export class UploadCustomerDocumentUseCase
  implements UseCase<UploadCustomerDocumentInput, UploadCustomerDocumentOutput>
{
  constructor(
    private readonly tenantCustomers: ITenantCustomerRepository,
    private readonly sales: ISaleRepository,
    private readonly documents: ICustomerDocumentRepository,
    private readonly settings: ITenantSettingsRepository,
    private readonly storage: IFileStoragePort,
    private readonly virusScan: IFileVirusScanPort,
    private readonly audit: AuditService,
  ) {}

  async execute(input: UploadCustomerDocumentInput): Promise<UploadCustomerDocumentOutput> {
    await resolveActiveCustomerForDocuments(
      input.tenantId,
      input.tenantCustomerId,
      input.staffContext,
      input.actorId,
      this.tenantCustomers,
      this.sales,
    );

    const mimeType = input.mimeType.trim().toLowerCase();
    if (!(ALLOWED_CUSTOMER_DOCUMENT_MIMES as readonly string[]).includes(mimeType)) {
      throw new ApplicationError(
        'UNSUPPORTED_FILE_TYPE',
        'Only JPEG, PNG, and PDF files are allowed.',
        422,
      );
    }

    const sizeBytes = BigInt(input.fileBuffer.byteLength);
    const maxBytes = await this.resolveMaxBytes(input.tenantId);
    if (sizeBytes > maxBytes) {
      throw new ApplicationError(
        'FILE_TOO_LARGE',
        `File exceeds the maximum size of ${maxBytes} bytes.`,
        413,
      );
    }

    const documentId = randomUUID();
    const storageKey = buildCustomerDocumentStorageKey(
      input.tenantId,
      input.tenantCustomerId,
      documentId,
      mimeType,
    );

    try {
      CustomerDocument.create({
        id: documentId,
        tenantId: input.tenantId,
        tenantCustomerId: input.tenantCustomerId,
        documentType: input.documentType,
        fileStorageKey: storageKey,
        originalFileName: input.originalFileName,
        mimeType,
        sizeBytes,
        uploadedById: input.actorId,
        description: input.description,
        expiresAt: input.expiresAt,
      });
    } catch (error) {
      throw mapDomainError(error);
    }

    try {
      await this.storage.upload({
        key: storageKey,
        body: input.fileBuffer,
        mimeType,
        sizeBytes,
      });
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      throw new ApplicationError(
        'STORAGE_ERROR',
        'File could not be stored. Please try again later.',
        503,
      );
    }

    let record: CustomerDocumentRecord;
    try {
      record = await this.documents.create({
        id: documentId,
        tenantId: input.tenantId,
        tenantCustomerId: input.tenantCustomerId,
        documentType: input.documentType,
        fileStorageKey: storageKey,
        originalFileName: input.originalFileName,
        mimeType,
        sizeBytes,
        uploadedById: input.actorId,
        createdById: input.actorId,
        description: input.description,
        expiresAt: input.expiresAt,
      });
    } catch (error) {
      await this.storage.deleteObject(storageKey);
      throw error;
    }

    await this.virusScan.enqueueScan({
      storageKey,
      mimeType,
      sizeBytes,
      tenantId: input.tenantId,
    });

    await this.audit.log({
      tenantId: input.tenantId,
      actorType: 'staff',
      actorId: input.actorId,
      action: 'customer.document.upload',
      entityType: 'customer_document',
      entityId: record.id,
      newValue: {
        tenantCustomerId: input.tenantCustomerId,
        documentType: input.documentType,
        mimeType,
        sizeBytes: sizeBytes.toString(),
      },
      ip: input.ip,
      userAgent: input.userAgent,
    });

    return record;
  }

  private async resolveMaxBytes(tenantId: string): Promise<bigint> {
    const stored = await this.settings.findByModule(tenantId, 'installments');
    const installments = mergeInstallmentsSettings(stored);
    return BigInt(installments.customer_document_max_bytes);
  }
}
