import { describe, expect, it } from 'vitest';

import {
  CreateTenantCustomerSchema,
  ImportCustomersResultSchema,
  ListCustomersQuerySchema,
  TenantCustomerSummarySchema,
} from './tenant-customer.schema.js';
import { UpdateTenantCustomerSchema } from './update-tenant-customer.schema.js';

describe('CreateTenantCustomerSchema', () => {
  it('valid minimal payload — phone only', () => {
    const dto = CreateTenantCustomerSchema.parse({ phone: '9123456789' });
    expect(dto.phone).toBe('09123456789');
  });

  it('invalid phone fails', () => {
    expect(() => CreateTenantCustomerSchema.parse({ phone: '12345' })).toThrow();
  });

  it('tags array max 20', () => {
    const tags = Array.from({ length: 21 }, (_, index) => `tag-${index}`);
    expect(() => CreateTenantCustomerSchema.parse({ phone: '09123456789', tags })).toThrow();
  });

  it('rejects invalid nationalId', () => {
    expect(() =>
      CreateTenantCustomerSchema.parse({ phone: '09123456789', nationalId: '123' }),
    ).toThrow();
  });
});

describe('UpdateTenantCustomerSchema', () => {
  it('requires version', () => {
    expect(() => UpdateTenantCustomerSchema.parse({ name: 'علی' })).toThrow();
    expect(UpdateTenantCustomerSchema.parse({ version: 2, name: 'علی' }).version).toBe(2);
  });
});

describe('ListCustomersQuerySchema', () => {
  it('applies defaults', () => {
    const query = ListCustomersQuerySchema.parse({});
    expect(query.limit).toBe(20);
    expect(query.sort).toBe('createdAt:desc');
  });
});

describe('TenantCustomerSummarySchema', () => {
  it('parses api-contracts list sample', () => {
    const item = TenantCustomerSummarySchema.parse({
      id: '00000000-0000-0000-0000-000000000010',
      globalCustomer: {
        id: '00000000-0000-0000-0000-000000000001',
        phone: '09121234567',
        name: 'حسین احمدی',
      },
      localCode: 'C-001',
      tags: ['vip'],
      creditScore: 85,
      overdueCount: 1,
      totalPurchaseRial: '15000000',
      lastPurchaseAt: '2025-01-10T00:00:00.000Z',
      preferredContactChannel: 'telegram',
      createdAt: '2025-01-01T08:00:00.000Z',
    });

    expect(item.globalCustomer.phone).toBe('09121234567');
    expect(item.totalPurchaseRial).toBe('15000000');
  });
});

describe('ImportCustomersResultSchema', () => {
  it('parses result with errors array', () => {
    const result = ImportCustomersResultSchema.parse({
      totalRows: 50,
      successCount: 47,
      errorCount: 3,
      errors: [{ row: 12, phone: '0912xxx', error: 'INVALID_PHONE' }],
    });

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.row).toBe(12);
  });
});
