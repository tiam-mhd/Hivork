import { describe, expect, it } from 'vitest';

import { buildListWhere } from './build-list-where.js';

describe('buildListWhere', () => {
  it('always injects tenantId and deletedAt null', () => {
    const where = buildListWhere({
      tenantId: 'tenant-1',
      searchFields: [],
      fieldMap: {},
    });

    expect(where).toEqual({
      tenantId: 'tenant-1',
      deletedAt: null,
    });
  });

  it('merges search OR with tenant guard', () => {
    const where = buildListWhere({
      tenantId: 'tenant-1',
      search: 'رضا',
      searchFields: [
        { field: 'name', mode: 'contains', prismaPath: ['globalCustomer', 'name'] },
      ],
      fieldMap: {},
    });

    expect(where).toEqual({
      AND: [
        { tenantId: 'tenant-1', deletedAt: null },
        {
          OR: [{ globalCustomer: { name: { contains: 'رضا', mode: 'insensitive' } } }],
        },
      ],
    });
  });
});
