import { describe, expect, it } from 'vitest';

import { isImmediateSearchTerm, shouldCommitSearchTerm } from './search-term.utils';

describe('search-term utils', () => {
  it('treats 4+ digit terms as immediate', () => {
    expect(isImmediateSearchTerm('0912')).toBe(true);
    expect(isImmediateSearchTerm('ab')).toBe(false);
  });

  it('gates short alphabetic terms', () => {
    expect(shouldCommitSearchTerm('a')).toBe(false);
    expect(shouldCommitSearchTerm('ab')).toBe(true);
    expect(shouldCommitSearchTerm('')).toBe(true);
  });
});
