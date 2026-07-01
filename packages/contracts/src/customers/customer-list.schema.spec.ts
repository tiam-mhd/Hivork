import { describe, expect, it } from 'vitest';

import { ListCustomersQuerySchema } from './customer-list.schema.js';

describe('ListCustomersQuerySchema', () => {
  it('applies defaults', () => {
    const query = ListCustomersQuerySchema.parse({});
    expect(query.limit).toBe(20);
    expect(query.sort).toBe('createdAt:desc');
  });

  it('parses comma-separated tags with dedupe', () => {
    const query = ListCustomersQuerySchema.parse({ tags: 'vip, gold, vip' });
    expect(query.tags).toEqual(['vip', 'gold']);
  });

  it('supports overdue and lastPurchaseAt sort', () => {
    expect(ListCustomersQuerySchema.parse({ sort: 'overdueCount:desc' }).sort).toBe(
      'overdueCount:desc',
    );
    expect(ListCustomersQuerySchema.parse({ sort: 'lastPurchaseAt:asc' }).sort).toBe(
      'lastPurchaseAt:asc',
    );
  });
});
