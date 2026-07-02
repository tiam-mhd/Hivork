import { describe, expect, it } from 'vitest';

import { getJalaliPartsFromIso } from '@hivork/i18n';

import { formatContractNumber, resolveContractNumberYear } from './contract-number.format.js';

describe('formatContractNumber (IFP-074)', () => {
  it('formats prefix + Jalali year + padded sequence', () => {
    const referenceDateIso = '2026-03-20';
    const jalaliYear = getJalaliPartsFromIso(referenceDateIso)?.year;

    expect(
      formatContractNumber(
        {
          calendar_display_mode: 'jalali',
          calendar_input_mode: 'jalali',
          contract_numbering_enabled: true,
          contract_number_prefix: 'CTR',
          contract_number_pad_length: 6,
          contract_number_include_year: true,
        },
        42,
        referenceDateIso,
      ),
    ).toBe(`CTR-${jalaliYear}-000042`);
  });

  it('formats prefix + padded sequence without year', () => {
    expect(
      formatContractNumber(
        {
          calendar_display_mode: 'jalali',
          calendar_input_mode: 'jalali',
          contract_numbering_enabled: true,
          contract_number_prefix: 'SH',
          contract_number_pad_length: 4,
          contract_number_include_year: false,
        },
        7,
        '2026-03-20',
      ),
    ).toBe('SH-0007');
  });

  it('appends suffix when configured', () => {
    expect(
      formatContractNumber(
        {
          calendar_display_mode: 'gregorian',
          calendar_input_mode: 'gregorian',
          contract_numbering_enabled: true,
          contract_number_prefix: 'CTR',
          contract_number_suffix: 'HQ',
          contract_number_pad_length: 6,
          contract_number_include_year: true,
        },
        1,
        '2026-01-15',
      ),
    ).toBe('CTR-2026-000001-HQ');
  });
});

describe('resolveContractNumberYear', () => {
  it('uses Jalali year when calendar display is jalali', () => {
    const iso = '2026-03-20';
    expect(resolveContractNumberYear('jalali', iso)).toBe(getJalaliPartsFromIso(iso)?.year);
  });

  it('uses Gregorian year when calendar display is gregorian', () => {
    expect(resolveContractNumberYear('gregorian', '2026-03-20')).toBe(2026);
  });
});
