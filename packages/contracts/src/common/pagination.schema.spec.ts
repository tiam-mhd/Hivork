import { describe, expect, it } from 'vitest';

import { CursorPaginationSchema, PaginationQuerySchema } from './pagination.schema.js';

describe('PaginationQuerySchema', () => {
  it('applies defaults', () => {
    expect(PaginationQuerySchema.parse({})).toEqual({ page: 1, limit: 20 });
  });

  it('coerces string query params', () => {
    expect(PaginationQuerySchema.parse({ page: '2', limit: '50' })).toEqual({
      page: 2,
      limit: 50,
    });
  });
});

describe('CursorPaginationSchema', () => {
  it('applies defaults', () => {
    expect(CursorPaginationSchema.parse({})).toEqual({
      limit: 20,
      includeDeleted: false,
    });
  });
});
