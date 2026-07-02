import type { FilterFieldDef } from '@hivork/contracts/ui';
import { describe, expect, it } from 'vitest';


import {
  getDefaultOperatorForField,
  getOperatorsForField,
  isOperatorAllowedForField,
} from './filter-operators';

const STRING_FIELD: FilterFieldDef = {
  id: 'name',
  label: 'نام',
  type: 'string',
};

const MONEY_FIELD: FilterFieldDef = {
  id: 'balanceRial',
  label: 'مانده',
  type: 'money_rial',
};

describe('filter operator matrix', () => {
  it('returns string operators by default', () => {
    expect(getOperatorsForField(STRING_FIELD)).toContain('contains');
    expect(isOperatorAllowedForField(STRING_FIELD, 'between')).toBe(false);
  });

  it('returns money operators by default', () => {
    expect(getOperatorsForField(MONEY_FIELD)).toContain('gte');
    expect(getDefaultOperatorForField(MONEY_FIELD)).toBe('eq');
  });
});
