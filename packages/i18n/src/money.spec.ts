import { describe, expect, it } from 'vitest';

import { formatToman } from './money.js';

describe('formatToman', () => {
  it('formats zero', () => {
    expect(formatToman(0n)).toBe('۰ تومان');
  });

  it('converts rial to toman with fa-IR grouping', () => {
    expect(formatToman(1_500_000n)).toBe('۱۵۰٬۰۰۰ تومان');
  });

  it('handles large amounts', () => {
    expect(formatToman(10_000_000_000_000n)).toBe('۱٬۰۰۰٬۰۰۰٬۰۰۰٬۰۰۰ تومان');
  });

  it('truncates sub-toman rial (integer division)', () => {
    expect(formatToman(15n)).toBe('۱ تومان');
    expect(formatToman(9n)).toBe('۰ تومان');
  });

  it('rejects negative rial amounts', () => {
    expect(() => formatToman(-1n)).toThrow();
  });
});

describe('parseTomanInputToRialString', () => {
  it('converts 1,500,000 toman display to rial string', async () => {
    const { parseTomanInputToRialString } = await import('./money.js');
    expect(parseTomanInputToRialString('1,500,000')).toBe('15000000');
    expect(parseTomanInputToRialString('۱٬۵۰۰٬۰۰۰')).toBe('15000000');
  });

  it('returns zero rial for empty input', async () => {
    const { parseTomanInputToRialString } = await import('./money.js');
    expect(parseTomanInputToRialString('')).toBe('0');
  });
});
