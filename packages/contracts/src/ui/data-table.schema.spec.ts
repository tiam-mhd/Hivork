import { describe, expect, it } from 'vitest';

import { clampDataTableLimit, DataTableQuerySchema } from './data-table.schema.js';

describe('DataTableQuerySchema', () => {
  it('defaults limit to 20', () => {
    expect(DataTableQuerySchema.parse({})).toEqual({ limit: 20 });
  });

  it('parses sortBy and sortDir', () => {
    expect(
      DataTableQuerySchema.parse({ sortBy: 'createdAt', sortDir: 'desc', limit: 50 }),
    ).toMatchObject({ sortBy: 'createdAt', sortDir: 'desc', limit: 50 });
  });

  it('rejects limit above 100', () => {
    expect(() => DataTableQuerySchema.parse({ limit: 200 })).toThrow();
  });
});

describe('clampDataTableLimit', () => {
  it('clamps to 1..100', () => {
    expect(clampDataTableLimit(0)).toBe(1);
    expect(clampDataTableLimit(150)).toBe(100);
    expect(clampDataTableLimit(25)).toBe(25);
  });
});
