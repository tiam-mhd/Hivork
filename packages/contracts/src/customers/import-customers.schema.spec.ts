import { describe, expect, it } from 'vitest';

import { ImportCustomersResultSchema } from './import-customers.schema.js';

describe('ImportCustomersResultSchema', () => {
  it('parses result with errorCount', () => {
    const result = ImportCustomersResultSchema.parse({
      totalRows: 50,
      successCount: 47,
      errorCount: 3,
      errors: [{ row: 12, phone: '0912xxx', error: 'INVALID_PHONE' }],
    });

    expect(result.errorCount).toBe(3);
    expect(result.errors[0]?.error).toBe('INVALID_PHONE');
  });
});
