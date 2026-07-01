import { describe, expect, it } from 'vitest';

import { CreateSavedFilterSchema } from './saved-filter.schema.js';

describe('CreateSavedFilterSchema', () => {
  it('requires valid filterAst', () => {
    const parsed = CreateSavedFilterSchema.safeParse({
      resourceKey: 'customers',
      name: 'معوقات',
      filterAst: {
        root: {
          type: 'group',
          logic: 'and',
          children: [
            { type: 'condition', field: 'name', operator: 'contains', value: 'a' },
          ],
        },
      },
    });

    expect(parsed.success).toBe(true);
  });

  it('rejects empty name', () => {
    const parsed = CreateSavedFilterSchema.safeParse({
      resourceKey: 'customers',
      name: '   ',
      filterAst: {
        root: { type: 'group', logic: 'and', children: [] },
      },
    });

    expect(parsed.success).toBe(false);
  });
});
