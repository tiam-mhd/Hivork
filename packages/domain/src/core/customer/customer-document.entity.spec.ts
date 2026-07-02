import { describe, expect, it } from 'vitest';

import {
  ALLOWED_CUSTOMER_DOCUMENT_MIME_TYPES,
  CustomerDocument,
} from './customer-document.entity.js';

describe('CustomerDocument', () => {
  it('creates document with valid type and mime', () => {
    const document = CustomerDocument.create({
      tenantId: 'tenant-1',
      tenantCustomerId: 'customer-1',
      documentType: 'national_id',
      fileStorageKey: 'tenants/tenant-1/customers/customer-1/national-id.pdf',
      originalFileName: 'کارت ملی.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1024n,
      uploadedById: 'staff-1',
      description: 'روی کارت',
    });

    expect(document.documentType).toBe('national_id');
    expect(document.mimeType).toBe('application/pdf');
    expect(document.sizeBytes).toBe(1024n);
    expect(document.isDeleted).toBe(false);
    expect(ALLOWED_CUSTOMER_DOCUMENT_MIME_TYPES).toContain(document.mimeType);
  });

  it('rejects unsupported mime types', () => {
    expect(() =>
      CustomerDocument.create({
        tenantId: 'tenant-1',
        tenantCustomerId: 'customer-1',
        documentType: 'photo',
        fileStorageKey: 'path/file.exe',
        originalFileName: 'virus.exe',
        mimeType: 'application/x-msdownload',
        sizeBytes: 10n,
        uploadedById: 'staff-1',
      }),
    ).toThrow(expect.objectContaining({ code: 'MIME_TYPE_NOT_ALLOWED' }));
  });

  it('soft deletes and restores without removing storage key', () => {
    const document = CustomerDocument.create({
      tenantId: 'tenant-1',
      tenantCustomerId: 'customer-1',
      documentType: 'contract',
      fileStorageKey: 'tenants/tenant-1/contracts/1.pdf',
      originalFileName: 'contract.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 2048n,
      uploadedById: 'staff-1',
    });

    document.softDelete('staff-2', 'outdated');
    expect(document.isDeleted).toBe(true);
    expect(document.fileStorageKey).toBe('tenants/tenant-1/contracts/1.pdf');

    document.restore();
    expect(document.isDeleted).toBe(false);
  });
});
