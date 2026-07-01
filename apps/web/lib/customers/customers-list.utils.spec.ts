import { describe, expect, it } from 'vitest';

import { appendCustomersPage, parseTagsParam, serializeTagsParam } from './customers-list.utils';

const sampleItem = {
  id: '00000000-0000-4000-8000-000000000001',
  globalCustomer: {
    id: '00000000-0000-4000-8000-000000000099',
    phone: '09120000001',
    name: 'علی',
  },
  localCode: 'C-001',
  tags: ['vip'],
  creditScore: 80,
  overdueCount: 0,
  totalPurchaseRial: '0',
  lastPurchaseAt: null,
  preferredContactChannel: null,
  createdAt: '2025-01-01T00:00:00.000Z',
};

describe('appendCustomersPage', () => {
  it('appends next page items and updates cursor meta', () => {
    const next = {
      data: [{ ...sampleItem, id: '00000000-0000-4000-8000-000000000002' }],
      meta: { total: 2, hasNext: false, nextCursor: null },
    };

    const result = appendCustomersPage([sampleItem], next);

    expect(result.items).toHaveLength(2);
    expect(result.items[1]?.id).toBe('00000000-0000-4000-8000-000000000002');
    expect(result.hasNext).toBe(false);
    expect(result.nextCursor).toBeNull();
    expect(result.total).toBe(2);
  });
});

describe('tags param helpers', () => {
  it('parses comma-separated unique tags', () => {
    expect(parseTagsParam('vip, regular, vip')).toEqual(['vip', 'regular']);
  });

  it('serializes tags for URL', () => {
    expect(serializeTagsParam(['vip', 'regular'])).toBe('vip,regular');
  });
});
