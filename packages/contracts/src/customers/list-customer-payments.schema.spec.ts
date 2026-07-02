import { describe, expect, it } from 'vitest';

import {
  CustomerPaymentListItemSchema,
  ListCustomerPaymentsQuerySchema,
} from './list-customer-payments.schema.js';

describe('ListCustomerPaymentsQuerySchema', () => {
  it('defaults limit to 20', () => {
    const query = ListCustomerPaymentsQuerySchema.parse({});
    expect(query.limit).toBe(20);
  });

  it('accepts status filter', () => {
    const query = ListCustomerPaymentsQuerySchema.parse({ status: 'confirmed' });
    expect(query.status).toBe('confirmed');
  });

  it('rejects invalid status', () => {
    expect(() => ListCustomerPaymentsQuerySchema.parse({ status: 'paid' })).toThrow();
  });
});

describe('CustomerPaymentListItemSchema', () => {
  it('parses payment list item shape', () => {
    const item = CustomerPaymentListItemSchema.parse({
      paymentId: '00000000-0000-4000-8000-000000000001',
      amountRial: '1000000',
      status: 'confirmed',
      method: 'manual',
      confirmedAt: '2026-07-01T12:00:00.000Z',
      installmentNumber: 1,
      saleTitle: 'فروش تست',
      saleId: '00000000-0000-4000-8000-000000000002',
    });

    expect(item.status).toBe('confirmed');
  });
});
