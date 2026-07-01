import { describe, expect, it } from 'vitest';

import { validateCustomerImportFile } from './import-file-validation';

function makeFile(name: string, size: number, type = ''): File {
  const buffer = new Uint8Array(size);
  return new File([buffer], name, { type });
}

describe('validateCustomerImportFile', () => {
  it('accepts xlsx under size limit', () => {
    expect(validateCustomerImportFile(makeFile('customers.xlsx', 1024)).ok).toBe(true);
  });

  it('rejects non-xlsx extension', () => {
    const result = validateCustomerImportFile(makeFile('customers.csv', 100));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('invalid_type');
    }
  });

  it('rejects files larger than 5MB', () => {
    const result = validateCustomerImportFile(makeFile('customers.xlsx', 5 * 1024 * 1024 + 1));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('too_large');
    }
  });

  it('rejects empty files', () => {
    const result = validateCustomerImportFile(makeFile('customers.xlsx', 0));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('empty');
    }
  });
});
