import type { CustomerDocumentRecord } from '@hivork/application';
import type { CustomerDocumentDto } from '@hivork/contracts/customers';

export function toCustomerDocumentResponse(record: CustomerDocumentRecord): CustomerDocumentDto {
  return {
    id: record.id,
    documentType: record.documentType,
    originalFileName: record.originalFileName,
    mimeType: record.mimeType,
    sizeBytes: record.sizeBytes.toString(),
    description: record.description,
    expiresAt: record.expiresAt?.toISOString() ?? null,
    uploadedById: record.uploadedById,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    version: record.version,
  };
}
