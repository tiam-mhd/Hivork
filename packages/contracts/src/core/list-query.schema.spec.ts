import { describe, expect, it } from 'vitest';

import { FilterAstSchema } from '../ui/filter-ast.schema.js';
import { ListQuerySchema, parseFilterQueryParam } from './list-query.schema.js';

describe('ListQuerySchema', () => {
  it('accepts search with cursor pagination fields', () => {
    const parsed = ListQuerySchema.safeParse({
      search: 'رضا',
      limit: 20,
      sortBy: 'createdAt',
      sortDir: 'desc',
    });

    expect(parsed.success).toBe(true);
  });

  it('rejects search longer than 200 chars', () => {
    const parsed = ListQuerySchema.safeParse({
      search: 'x'.repeat(201),
    });

    expect(parsed.success).toBe(false);
  });
});

describe('parseFilterQueryParam', () => {
  it('parses raw JSON filter', () => {
    const ast = {
      root: {
        type: 'group',
        logic: 'and',
        children: [
          { type: 'condition', field: 'name', operator: 'contains', value: 'a' },
        ],
      },
    };

    const parsed = parseFilterQueryParam(JSON.stringify(ast));
    expect(FilterAstSchema.safeParse(parsed).success).toBe(true);
  });
});
