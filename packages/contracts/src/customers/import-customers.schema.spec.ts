import { describe, expect, it } from 'vitest';

import { ImportCustomersResultSchema } from './import-customers.schema.js';

describe('ImportCustomersResultSchema', () => {
  it('parses result with failedCount', () => {
    const result = ImportCustomersResultSchema.parse({
      totalRows: 50,
      successCount: 47,
      failedCount: 3,
      errors: [{ row: 12, phone: '0912xxx', error: 'INVALID_PHONE' }],
    });

    expect(result.failedCount).toBe(3);
    expect(result.errors[0]?.error).toBe('INVALID_PHONE');
  });

  it('accepts legacy errorCount alias', () => {
    const result = ImportCustomersResultSchema.parse({
      totalRows: 1,
      successCount: 1,
      failedCount: 0,
      errorCount: 0,
      errors: [],
    });

    expect(result.errorCount).toBe(0);
  });
});
