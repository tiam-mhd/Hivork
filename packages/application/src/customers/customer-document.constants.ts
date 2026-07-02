import { ALLOWED_CUSTOMER_DOCUMENT_MIME_TYPES } from '@hivork/domain';

/** Multer hard cap — tenant setting may be lower. */
export const CUSTOMER_DOCUMENT_ABSOLUTE_MAX_BYTES = 100 * 1024 * 1024;

export const ALLOWED_CUSTOMER_DOCUMENT_MIMES = ALLOWED_CUSTOMER_DOCUMENT_MIME_TYPES;

export const CUSTOMER_DOCUMENT_MIME_EXTENSIONS: Record<
  (typeof ALLOWED_CUSTOMER_DOCUMENT_MIME_TYPES)[number],
  string
> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'application/pdf': 'pdf',
};

export function buildCustomerDocumentStorageKey(
  tenantId: string,
  tenantCustomerId: string,
  documentId: string,
  mimeType: string,
): string {
  const extension = CUSTOMER_DOCUMENT_MIME_EXTENSIONS[mimeType as keyof typeof CUSTOMER_DOCUMENT_MIME_EXTENSIONS];
  if (!extension) {
    throw new Error(`Unsupported mime type for storage key: ${mimeType}`);
  }
  return `${tenantId}/customers/${tenantCustomerId}/${documentId}.${extension}`;
}
