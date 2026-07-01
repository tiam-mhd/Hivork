import { describe, expect, it } from 'vitest';

import { filterAstToWhere } from './filter-ast-to-prisma.js';

describe('filterAstToWhere', () => {
  it('always injects tenantId and deletedAt null', () => {
    const where = filterAstToWhere(
      {
        root: {
          type: 'group',
          logic: 'and',
          children: [
            {
              type: 'condition',
              field: 'name',
              operator: 'contains',
              value: 'علی',
            },
          ],
        },
      },
      {
        name: { prismaPath: 'globalCustomer.name' },
      },
      {
        tenantId: 'tenant-1',
        dataScope: 'all',
      },
    );

    expect(where).toEqual({
      AND: [
        { tenantId: 'tenant-1', deletedAt: null },
        {
          globalCustomer: {
            name: { contains: 'علی', mode: 'insensitive' },
          },
        },
      ],
    });
  });
});
