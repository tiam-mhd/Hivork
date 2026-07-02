import { describe, expect, it } from 'vitest';

import { ContractGuarantor } from './contract-guarantor.entity.js';
import { MAX_CONTRACT_GUARANTORS_PER_SALE } from './contract-guarantor.constants.js';
import { DomainError } from '../errors/domain.error.js';

describe('ContractGuarantor (IFP-065)', () => {
  const baseInput = {
    tenantId: 'tenant-1',
    saleId: 'sale-1',
    relationship: 'PARENT' as const,
    createdById: 'staff-1',
  };

  it('creates guarantor linked to tenant customer', () => {
    const guarantor = ContractGuarantor.create({
      ...baseInput,
      tenantCustomerId: 'customer-1',
    });

    expect(guarantor.tenantCustomerId).toBe('customer-1');
    expect(guarantor.fullName).toBeNull();
    expect(guarantor.phone).toBeNull();
  });

  it('creates external guarantor with fullName and phone', () => {
    const guarantor = ContractGuarantor.create({
      ...baseInput,
      fullName: '  علی رضایی  ',
      phone: '09123456789',
      nationalId: '1234567890',
    });

    expect(guarantor.fullName).toBe('علی رضایی');
    expect(guarantor.phone).toBe('09123456789');
    expect(guarantor.nationalId).toBe('1234567890');
  });

  it('rejects identity without tenant customer or external fields', () => {
    expect(() => ContractGuarantor.assertIdentity({})).toThrow(DomainError);
    expect(() => ContractGuarantor.assertIdentity({})).toThrow(/GUARANTOR_IDENTITY_REQUIRED/);
  });

  it('rejects external fields when tenant customer is linked', () => {
    expect(() =>
      ContractGuarantor.create({
        ...baseInput,
        tenantCustomerId: 'customer-1',
        fullName: 'نام اضافی',
      }),
    ).toThrow(/GUARANTOR_EXTERNAL_FIELDS_NOT_ALLOWED/);
  });

  it('enforces max guarantors per sale', () => {
    expect(() => ContractGuarantor.assertLimit(MAX_CONTRACT_GUARANTORS_PER_SALE)).toThrow(
      /GUARANTOR_LIMIT_EXCEEDED/,
    );
  });

  it('soft deletes active guarantor', () => {
    const guarantor = ContractGuarantor.create({
      ...baseInput,
      fullName: 'ضامن',
      phone: '09121111111',
    });

    guarantor.softDelete('staff-2', 'removed');

    expect(guarantor.isDeleted).toBe(true);
    expect(guarantor.toProps().deleteReason).toBe('removed');
  });
});
