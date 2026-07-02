import { describe, expect, it } from 'vitest';

import { phoneSchema } from '../common/phone.schema.js';
import { ArchiveCustomerSchema, DeleteCustomerSchema } from './index.js';
import { CreateTenantCustomerSchema } from './create-tenant-customer.schema.js';
import { customerValidationMessages } from './customer-validation-messages.js';
import { ListCustomersQuerySchema } from './list-customers-query.schema.js';
import { MergeCustomersSchema } from './merge-customers.schema.js';
import { TenantCustomerDetailResponseSchema } from './tenant-customer-detail.schema.js';
import { UpdateTenantCustomerSchema } from './update-tenant-customer.schema.js';

describe('CreateTenantCustomerSchema (IFP-039)', () => {
  it('normalizes phone via shared phoneSchema', () => {
    const dto = CreateTenantCustomerSchema.parse({ phone: '9123456789' });
    expect(dto.phone).toBe('09123456789');
  });

  it('rejects multiple primary addresses', () => {
    const result = CreateTenantCustomerSchema.safeParse({
      phone: '09123456789',
      addresses: [
        { line1: 'a', isPrimary: true },
        { line1: 'b', isPrimary: true },
      ],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message === customerValidationMessages.multiplePrimaryAddresses)).toBe(
        true,
      );
    }
  });

  it('rejects secondary phone equal to primary', () => {
    const result = CreateTenantCustomerSchema.safeParse({
      phone: '09123456789',
      contactPhones: [{ phone: '09123456789' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects address coordinates outside Iran', () => {
    const result = CreateTenantCustomerSchema.safeParse({
      phone: '09123456789',
      addresses: [{ line1: 'خیابان', latitude: 48, longitude: 2 }],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message === customerValidationMessages.coordinateOutOfIran)).toBe(
        true,
      );
    }
  });

  it('accepts address with valid Iran coordinates', () => {
    const result = CreateTenantCustomerSchema.safeParse({
      phone: '09123456789',
      addresses: [{ line1: 'خیابان', latitude: 35.6892, longitude: 51.389 }],
    });
    expect(result.success).toBe(true);
  });
});

describe('UpdateTenantCustomerSchema (IFP-039)', () => {
  it('requires version with fa-friendly error path', () => {
    expect(() => UpdateTenantCustomerSchema.parse({ name: 'علی' })).toThrow();
    expect(UpdateTenantCustomerSchema.parse({ version: 2, name: 'علی' }).name).toBe('علی');
  });

  it('rejects phone field on strict schema', () => {
    expect(() =>
      UpdateTenantCustomerSchema.parse({ version: 2, phone: '09123456789', name: 'علی' }),
    ).toThrow();
  });
});

describe('ListCustomersQuerySchema (IFP-039)', () => {
  it('maps q to search', () => {
    const query = ListCustomersQuerySchema.parse({ q: 'علی' });
    expect(query.search).toBe('علی');
  });

  it('maps branchId to defaultBranchId', () => {
    const branchId = '00000000-0000-4000-8000-000000000001';
    const query = ListCustomersQuerySchema.parse({ branchId });
    expect(query.defaultBranchId).toBe(branchId);
  });

  it('accepts creditScore sort', () => {
    const query = ListCustomersQuerySchema.parse({ sort: 'creditScore:desc' });
    expect(query.sort).toBe('creditScore:desc');
  });

  it('coerces isBlacklisted boolean query', () => {
    const query = ListCustomersQuerySchema.parse({ isBlacklisted: 'true' });
    expect(query.isBlacklisted).toBe(true);
  });

  it('accepts totalPurchaseRial sort and totalEstimate flag', () => {
    const query = ListCustomersQuerySchema.parse({
      sort: 'totalPurchaseRial:desc',
      totalEstimate: 'true',
    });
    expect(query.sort).toBe('totalPurchaseRial:desc');
    expect(query.includeCount).toBe(true);
  });

  it('parses date range filters', () => {
    const query = ListCustomersQuerySchema.parse({
      createdAtFrom: '2026-01-01T00:00:00.000Z',
      lastPurchaseAtTo: '2026-12-31T23:59:59.000Z',
    });
    expect(query.createdAtFrom).toBe('2026-01-01T00:00:00.000Z');
    expect(query.lastPurchaseAtTo).toBe('2026-12-31T23:59:59.000Z');
  });
});

describe('TenantCustomerDetailResponseSchema (IFP-039)', () => {
  it('parses enterprise detail fixture with nested relations', () => {
    const detail = TenantCustomerDetailResponseSchema.parse({
      id: '00000000-0000-4000-8000-000000000010',
      version: 3,
      globalCustomer: {
        id: '00000000-0000-4000-8000-000000000001',
        phone: '09121234567',
        name: 'حسین',
        email: null,
        nationalId: null,
        birthDate: null,
        gender: null,
        address: null,
      },
      localCode: 'C-001',
      tags: ['vip'],
      notes: null,
      internalNotes: null,
      creditScore: 85,
      overdueCount: 0,
      totalPurchaseRial: '15000000',
      lastPurchaseAt: null,
      preferredContactChannel: null,
      marketingOptIn: false,
      defaultBranchId: null,
      metadata: null,
      linkStatus: 'active',
      isBlacklisted: false,
      categoryId: null,
      addresses: [
        {
          id: '00000000-0000-4000-8000-000000000020',
          line1: 'خیابان آزادی',
          isPrimary: true,
        },
      ],
      emergencyContacts: [],
      contactPhones: [],
      createdAt: '2025-01-01T08:00:00.000Z',
      updatedAt: '2025-01-02T08:00:00.000Z',
    });

    expect(detail.totalPurchaseRial).toBe('15000000');
    expect(detail.addresses).toHaveLength(1);
  });
});

describe('Lifecycle schemas', () => {
  it('DeleteCustomerSchema accepts optional reason', () => {
    expect(DeleteCustomerSchema.parse({}).deleteReason).toBeUndefined();
    expect(DeleteCustomerSchema.parse({ deleteReason: 'duplicate' }).deleteReason).toBe('duplicate');
  });

  it('ArchiveCustomerSchema accepts empty body', () => {
    expect(ArchiveCustomerSchema.parse({})).toEqual({});
  });
});

describe('MergeCustomersSchema (IFP-050 prep)', () => {
  it('rejects same source and target', () => {
    const id = '00000000-0000-4000-8000-000000000099';
    expect(() =>
      MergeCustomersSchema.parse({
        sourceTenantCustomerId: id,
        targetTenantCustomerId: id,
        reason: 'duplicate profile',
      }),
    ).toThrow();
  });
});

describe('phoneSchema normalization', () => {
  it('normalizes international format', () => {
    expect(phoneSchema.parse('+98 912 345 6789')).toBe('09123456789');
  });
});
