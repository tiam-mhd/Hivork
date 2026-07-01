import { describe, expect, it } from 'vitest';

import { UpdateTenantCustomerSchema } from './update-tenant-customer.schema.js';

describe('UpdateTenantCustomerSchema', () => {
  it('requires version and at least one patch field', () => {
    expect(() => UpdateTenantCustomerSchema.parse({ version: 2 })).toThrow();
    expect(UpdateTenantCustomerSchema.parse({ version: 2, name: 'علی' }).name).toBe('علی');
  });

  it('rejects unknown fields such as phone', () => {
    expect(() =>
      UpdateTenantCustomerSchema.parse({ version: 2, phone: '09123456789', name: 'علی' }),
    ).toThrow();
  });

  it('allows clearing defaultBranchId', () => {
    const dto = UpdateTenantCustomerSchema.parse({ version: 2, defaultBranchId: null });
    expect(dto.defaultBranchId).toBeNull();
  });
});
