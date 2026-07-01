import { parseTomanInputToRialString } from '@hivork/i18n';
import { describe, expect, it } from 'vitest';

describe('TomanInput money conversion', () => {
  it('converts 1,500,000 toman to 15000000 rial string', () => {
    expect(parseTomanInputToRialString('1,500,000')).toBe('15000000');
    expect(parseTomanInputToRialString('۱٬۵۰۰٬۰۰۰')).toBe('15000000');
  });
});
