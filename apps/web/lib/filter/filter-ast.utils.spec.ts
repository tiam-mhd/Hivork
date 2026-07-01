import { describe, expect, it } from 'vitest';

import type { FilterFieldDef } from '@hivork/contracts/ui';

import {
  countActiveFilterConditions,
  createEmptyFilterAst,
  decodeFilterAstFromUrl,
  encodeFilterAstToUrl,
  validateFilterAstForApply,
} from './filter-ast.utils';

const FIELDS: FilterFieldDef[] = [
  { id: 'name', label: 'نام', type: 'string' },
  { id: 'balanceRial', label: 'مانده', type: 'money_rial' },
];

describe('filter-ast.utils', () => {
  it('counts only complete conditions', () => {
    const ast = createEmptyFilterAst('name');
    ast.root.children[0] = {
      type: 'condition',
      field: 'name',
      operator: 'contains',
      value: 'رضا',
    };

    expect(countActiveFilterConditions(ast, FIELDS)).toBe(1);
    expect(validateFilterAstForApply(ast, FIELDS)).toEqual({ valid: true });
  });

  it('rejects apply when no valid conditions exist', () => {
    const ast = createEmptyFilterAst();
    expect(validateFilterAstForApply(ast, FIELDS)).toEqual({
      valid: false,
      message: 'حداقل یک شرط معتبر اضافه کنید.',
    });
  });

  it('round-trips URL encoding', () => {
    const ast = createEmptyFilterAst('name');
    ast.root.children[0] = {
      type: 'condition',
      field: 'name',
      operator: 'eq',
      value: 'test',
    };

    const encoded = encodeFilterAstToUrl(ast);
    expect(encoded).toBeTruthy();
    expect(decodeFilterAstFromUrl(encoded!)).toEqual(ast);
  });
});
