import { describe, expect, it } from 'vitest';

import {
  ArchiveContractSchema,
  ChangeSaleStatusSchema,
  CloseContractSchema,
  CopyContractSchema,
  ExtendContractSchema,
  SaleDetailEnterpriseSchema,
  SaleStatusSchema,
  TerminateContractSchema,
} from './sale-enterprise.schema.js';

const SALE_ID = '00000000-0000-0000-0000-000000000010';
const CUSTOMER_ID = '00000000-0000-0000-0000-000000000001';
const BRANCH_ID = '00000000-0000-0000-0000-000000000002';
const STAFF_ID = '00000000-0000-0000-0000-000000000099';

const BASE_SALE_DETAIL = {
  id: SALE_ID,
  tenantCustomerId: CUSTOMER_ID,
  branchId: BRANCH_ID,
  title: 'موبایل سامسونگ S23',
  totalAmountRial: '25000000',
  downPaymentRial: '5000000',
  installmentCount: 10,
  status: 'active' as const,
  createdAt: '2025-01-15T10:30:00.000Z',
  installments: [
    {
      id: '00000000-0000-0000-0000-000000000020',
      sequenceNumber: 1,
      dueDate: '2025-02-01T00:00:00.000Z',
      amountRial: '2000000',
      status: 'pending' as const,
    },
  ],
};

const ENTERPRISE_FIELDS = {
  contractNumber: 'CN-2026-001',
  customTerms: 'شرایط ویژه',
  signatureStatus: 'signed' as const,
  signedAt: '2026-06-01T12:00:00.000Z',
  insuranceRial: '500000',
  insuranceProvider: 'بیمه ایران',
  insurancePolicyNumber: 'POL-2026-001',
  insuranceExpiresAt: '2027-06-01',
  taxRateBps: 900,
  taxInclusive: false,
  extendedFromSaleId: null,
  copiedFromSaleId: null,
  terminatedAt: null,
  closedAt: null,
  archivedAt: null,
};

describe('SaleStatusSchema', () => {
  it('includes all six enterprise statuses', () => {
    expect(SaleStatusSchema.options).toEqual([
      'active',
      'completed',
      'cancelled',
      'terminated',
      'closed',
      'archived',
    ]);
  });
});

describe('SaleDetailEnterpriseSchema (IFP-058)', () => {
  it('parses full enterprise sale detail payload', () => {
    const parsed = SaleDetailEnterpriseSchema.parse({
      ...BASE_SALE_DETAIL,
      ...ENTERPRISE_FIELDS,
      versions: [
        {
          id: '00000000-0000-0000-0000-000000000030',
          versionNumber: 1,
          changeType: 'create',
          changeReason: 'initial creation',
          createdAt: '2026-07-01T10:00:00.000Z',
          createdById: STAFF_ID,
        },
      ],
      attachments: [
        {
          id: '00000000-0000-0000-0000-000000000040',
          saleId: SALE_ID,
          fileId: '00000000-0000-0000-0000-000000000050',
          attachmentType: 'contract_scan',
          label: 'Scan',
          description: null,
          sortOrder: 0,
          createdAt: '2026-07-01T10:00:00.000Z',
          updatedAt: '2026-07-01T10:00:00.000Z',
          createdById: STAFF_ID,
          version: 1,
        },
      ],
    });

    expect(parsed.contractNumber).toBe('CN-2026-001');
    expect(parsed.signatureStatus).toBe('signed');
    expect(parsed.insuranceRial).toBe('500000');
    expect(parsed.insurancePolicyNumber).toBe('POL-2026-001');
    expect(parsed.taxRateBps).toBe(900);
    expect(parsed.taxInclusive).toBe(false);
    expect(parsed.versions).toHaveLength(1);
    expect(parsed.attachments).toHaveLength(1);
  });

  it('rejects taxRateBps above 10000', () => {
    expect(() =>
      SaleDetailEnterpriseSchema.parse({
        ...BASE_SALE_DETAIL,
        ...ENTERPRISE_FIELDS,
        taxRateBps: 10_001,
      }),
    ).toThrow();
  });

  it('rejects negative insuranceRial', () => {
    expect(() =>
      SaleDetailEnterpriseSchema.parse({
        ...BASE_SALE_DETAIL,
        ...ENTERPRISE_FIELDS,
        insuranceRial: '-1',
      }),
    ).toThrow();
  });

  it('accepts terminated status', () => {
    const parsed = SaleDetailEnterpriseSchema.parse({
      ...BASE_SALE_DETAIL,
      ...ENTERPRISE_FIELDS,
      status: 'terminated',
      terminatedAt: '2026-07-15T10:00:00.000Z',
    });

    expect(parsed.status).toBe('terminated');
  });
});

describe('ExtendContractSchema', () => {
  it('parses valid extend payload with defaults', () => {
    const parsed = ExtendContractSchema.parse({
      newLastDueDate: '2027-01-01',
      reason: 'تمدید قرارداد',
    });

    expect(parsed.regenerateSchedule).toBe(false);
    expect(parsed.additionalInstallmentCount).toBeUndefined();
  });

  it('enforces additionalInstallmentCount bounds', () => {
    expect(() =>
      ExtendContractSchema.parse({
        newLastDueDate: '2027-01-01',
        additionalInstallmentCount: 121,
        reason: 'تمدید',
      }),
    ).toThrow();

    expect(
      ExtendContractSchema.parse({
        newLastDueDate: '2027-01-01',
        additionalInstallmentCount: 0,
        reason: 'تمدید',
      }).additionalInstallmentCount,
    ).toBe(0);
  });

  it('rejects reason shorter than 3 chars', () => {
    expect(() =>
      ExtendContractSchema.parse({
        newLastDueDate: '2027-01-01',
        reason: 'ab',
      }),
    ).toThrow();
  });
});

describe('CopyContractSchema', () => {
  it('applies default copyAttachments and copyGuarantors', () => {
    const parsed = CopyContractSchema.parse({
      contractDate: '2026-07-01',
      firstDueDate: '2026-08-01',
      reason: 'کپی قرارداد برای مشتری جدید',
    });

    expect(parsed.copyAttachments).toBe(false);
    expect(parsed.copyGuarantors).toBe(true);
    expect(parsed.tenantCustomerId).toBeUndefined();
  });
});

describe('TerminateContractSchema', () => {
  it('allows optional effectiveDate', () => {
    const parsed = TerminateContractSchema.parse({ reason: 'فسخ توافقی' });
    expect(parsed.effectiveDate).toBeUndefined();
  });
});

describe('CloseContractSchema', () => {
  it('defaults waiveRemaining to false', () => {
    expect(CloseContractSchema.parse({ reason: 'تسویه کامل' }).waiveRemaining).toBe(false);
  });
});

describe('ArchiveContractSchema', () => {
  it('requires reason min 3 chars', () => {
    expect(ArchiveContractSchema.parse({ reason: 'بایگانی' }).reason).toBe('بایگانی');
    expect(() => ArchiveContractSchema.parse({ reason: 'x' })).toThrow();
  });
});

describe('ChangeSaleStatusSchema', () => {
  it('accepts all sale statuses as targetStatus', () => {
    for (const targetStatus of SaleStatusSchema.options) {
      expect(
        ChangeSaleStatusSchema.parse({ targetStatus, reason: 'تغییر وضعیت' }).targetStatus,
      ).toBe(targetStatus);
    }
  });
});
