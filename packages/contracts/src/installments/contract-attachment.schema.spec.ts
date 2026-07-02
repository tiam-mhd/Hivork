import { describe, expect, it } from 'vitest';

import {
  ContractAttachmentSchema,
  ContractAttachmentTypeSchema,
  CreateContractAttachmentSchema,
} from './contract-attachment.schema.js';

const ATTACHMENT_ID = '00000000-0000-0000-0000-000000000040';
const SALE_ID = '00000000-0000-0000-0000-000000000010';
const FILE_ID = '00000000-0000-0000-0000-000000000050';
const STAFF_ID = '00000000-0000-0000-0000-000000000099';

describe('CreateContractAttachmentSchema (IFP-058)', () => {
  it('parses valid create payload', () => {
    const parsed = CreateContractAttachmentSchema.parse({
      fileId: FILE_ID,
      attachmentType: 'contract_scan',
      label: 'Signed scan',
      description: 'Front page',
    });

    expect(parsed.fileId).toBe(FILE_ID);
    expect(parsed.attachmentType).toBe('contract_scan');
  });

  it('accepts all attachment types', () => {
    for (const attachmentType of ContractAttachmentTypeSchema.options) {
      expect(
        CreateContractAttachmentSchema.parse({ fileId: FILE_ID, attachmentType }).attachmentType,
      ).toBe(attachmentType);
    }
  });

  it('rejects invalid fileId', () => {
    expect(() =>
      CreateContractAttachmentSchema.parse({
        fileId: 'not-a-uuid',
        attachmentType: 'other',
      }),
    ).toThrow();
  });
});

describe('ContractAttachmentSchema', () => {
  it('parses full attachment response', () => {
    const parsed = ContractAttachmentSchema.parse({
      id: ATTACHMENT_ID,
      saleId: SALE_ID,
      fileId: FILE_ID,
      attachmentType: 'signed_contract',
      label: 'Signed contract',
      description: null,
      sortOrder: 0,
      createdAt: '2026-07-01T10:00:00.000Z',
      updatedAt: '2026-07-01T10:00:00.000Z',
      createdById: STAFF_ID,
      version: 1,
    });

    expect(parsed.sortOrder).toBe(0);
    expect(parsed.version).toBe(1);
  });
});
