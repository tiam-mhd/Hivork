import { describe, expect, it } from 'vitest';

import {
  CustomerContractListItemSchema,
  CustomerContractStatusSchema,
  ListCustomerContractsQuerySchema,
} from './list-customer-contracts.schema.js';

describe('ListCustomerContractsQuerySchema', () => {
  it('defaults limit to 20', () => {
    const query = ListCustomerContractsQuerySchema.parse({});
    expect(query.limit).toBe(20);
  });

  it('accepts status filter', () => {
    const query = ListCustomerContractsQuerySchema.parse({ status: 'overdue' });
    expect(query.status).toBe('overdue');
  });

  it('rejects invalid status', () => {
    expect(() => ListCustomerContractsQuerySchema.parse({ status: 'draft' })).toThrow();
  });
});

describe('CustomerContractStatusSchema', () => {
  it('includes UI buckets from state-machines', () => {
    expect(CustomerContractStatusSchema.options).toEqual([
      'active',
      'cancelled',
      'closed',
      'overdue',
    ]);
  });
});

describe('CustomerContractListItemSchema', () => {
  it('parses contract list item shape', () => {
    const item = CustomerContractListItemSchema.parse({
      saleId: '00000000-0000-4000-8000-000000000001',
      title: 'قرارداد تست',
      status: 'active',
      totalAmountRial: '2000000',
      paidAmountRial: '500000',
      installmentCount: 4,
      contractDate: '2026-07-01',
      branchName: 'شعبه مرکزی',
      sellerName: 'کارمند تست',
      overdueCount: 0,
    });

    expect(item.status).toBe('active');
  });
});
