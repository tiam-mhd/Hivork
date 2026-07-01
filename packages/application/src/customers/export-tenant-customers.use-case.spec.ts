import { describe, expect, it } from 'vitest';

import { buildExportFilename, hashExportPayload } from './export-tenant-customers.use-case.js';

describe('export tenant customers helpers', () => {
  it('builds xlsx filename with resource and tenant slug', () => {
    expect(buildExportFilename('customers', 'demo-shop')).toMatch(
      /^customers-demo-shop-\d{4}-\d{2}-\d{2}\.xlsx$/,
    );
  });

  it('builds pdf filename with pdf extension', () => {
    expect(buildExportFilename('customers', 'demo-shop', 'pdf')).toMatch(
      /^customers-demo-shop-\d{4}-\d{2}-\d{2}\.pdf$/,
    );
  });

  it('hashes export payload deterministically', () => {
    const hashA = hashExportPayload({ search: 'a' });
    const hashB = hashExportPayload({ search: 'a' });
    const hashC = hashExportPayload({ search: 'b' });

    expect(hashA).toBe(hashB);
    expect(hashA).not.toBe(hashC);
  });
});
