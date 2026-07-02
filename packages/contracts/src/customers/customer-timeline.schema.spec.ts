import { describe, expect, it } from 'vitest';

import {
  CustomerTimelineEventSchema,
  ListCustomerTimelineQuerySchema,
} from './customer-timeline.schema.js';

describe('ListCustomerTimelineQuerySchema', () => {
  it('accepts cursor pagination defaults', () => {
    const query = ListCustomerTimelineQuerySchema.parse({});
    expect(query.limit).toBe(20);
  });

  it('rejects invalid type filter', () => {
    expect(() => ListCustomerTimelineQuerySchema.parse({ types: ['invalid'] })).toThrow();
  });

  it('parses comma-separated types', () => {
    const query = ListCustomerTimelineQuerySchema.parse({ types: 'payment,note' });
    expect(query.types).toEqual(['payment', 'note']);
  });
});

describe('CustomerTimelineEventSchema', () => {
  it('parses unified timeline event shape', () => {
    const event = CustomerTimelineEventSchema.parse({
      id: 'payment:00000000-0000-4000-8000-000000000001',
      type: 'payment',
      occurredAt: '2026-07-01T12:00:00.000Z',
      title: 'پرداخت تأیید شد',
      summary: 'مبلغ ۱۰۰۰۰۰ ریال',
      actor: { type: 'staff', id: '00000000-0000-4000-8000-000000000002' },
      entityRef: { type: 'payment_attempt', id: '00000000-0000-4000-8000-000000000001' },
    });

    expect(event.type).toBe('payment');
  });
});
