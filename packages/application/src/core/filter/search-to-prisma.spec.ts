import { describe, expect, it } from 'vitest';

import { normalizePhone } from '@hivork/contracts';

import { normalizeSearchTerm, escapeLikePattern, searchToWhere } from './search-to-prisma.js';

describe('normalizeSearchTerm', () => {
  it('normalizes phone-like search terms', () => {
    expect(
      normalizeSearchTerm('0912 345 6789', { phoneNormalize: normalizePhone }),
    ).toBe('09123456789');
  });
});

describe('escapeLikePattern', () => {
  it('escapes SQL wildcard characters', () => {
    expect(escapeLikePattern('100%_off')).toBe('100\\%\\_off');
  });
});

describe('searchToWhere', () => {
  it('builds OR conditions for configured fields', () => {
    const where = searchToWhere('رضا', [
      { field: 'name', mode: 'contains', prismaPath: ['globalCustomer', 'name'] },
      { field: 'code', mode: 'contains', prismaPath: ['localCode'] },
    ]);

    expect(where).toEqual({
      OR: [
        { globalCustomer: { name: { contains: 'رضا', mode: 'insensitive' } } },
        { localCode: { contains: 'رضا', mode: 'insensitive' } },
      ],
    });
  });
});
