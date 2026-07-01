import { describe, expect, it } from 'vitest';

import { GetTenantCustomerQuerySchema } from './tenant-customer-detail.schema.js';

describe('GetTenantCustomerQuerySchema', () => {
  it('parses include=salesSummary', () => {
    const query = GetTenantCustomerQuerySchema.parse({ include: 'salesSummary' });
    expect(query.include).toEqual(['salesSummary']);
  });

  it('defaults include to empty array', () => {
    const query = GetTenantCustomerQuerySchema.parse({});
    expect(query.include).toEqual([]);
  });

  it('rejects unknown include values', () => {
    expect(() => GetTenantCustomerQuerySchema.parse({ include: 'unknown' })).toThrow();
  });
});
