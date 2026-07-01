import { describe, expect, it } from 'vitest';

import { formatRialAsTomanDisplay, formatRialRaw } from './export-money.js';

describe('export money formatting', () => {
  it('formats rial as toman display', () => {
    expect(formatRialAsTomanDisplay('10000')).toContain('تومان');
    expect(formatRialAsTomanDisplay(10000n)).toContain('۰۰۰');
  });

  it('returns raw rial string', () => {
    expect(formatRialRaw('12345')).toBe('12345');
    expect(formatRialRaw(99n)).toBe('99');
  });
});
