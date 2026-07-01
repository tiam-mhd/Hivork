import { describe, expect, it } from 'vitest';

import {
  FilterAstSchema,
  FilterConditionSchema,
  isMoneyRialValue,
} from './filter-ast.schema.js';

describe('FilterAstSchema', () => {
  it('accepts a valid nested AST', () => {
    const parsed = FilterAstSchema.safeParse({
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
          {
            type: 'group',
            logic: 'or',
            children: [
              {
                type: 'condition',
                field: 'status',
                operator: 'eq',
                value: 'active',
              },
            ],
          },
        ],
      },
    });

    expect(parsed.success).toBe(true);
  });

  it('rejects empty groups', () => {
    const parsed = FilterAstSchema.safeParse({
      root: {
        type: 'group',
        logic: 'and',
        children: [],
      },
    });

    expect(parsed.success).toBe(false);
  });

  it('rejects invalid operators', () => {
    const parsed = FilterConditionSchema.safeParse({
      type: 'condition',
      field: 'name',
      operator: 'like',
      value: 'x',
    });

    expect(parsed.success).toBe(false);
  });
});

describe('isMoneyRialValue', () => {
  it('accepts bigint string rials only', () => {
    expect(isMoneyRialValue('1000')).toBe(true);
    expect(isMoneyRialValue('12.5')).toBe(false);
    expect(isMoneyRialValue('-1')).toBe(false);
  });
});
