import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const MIGRATION_SQL = readFileSync(
  join(
    import.meta.dirname,
    '../../../../../prisma/migrations/20260701110000_customer_contact_phone/migration.sql',
  ),
  'utf8',
);

describe('customer contact phone migration', () => {
  it('enforces tenant phone uniqueness for active rows and RESTRICT FKs', () => {
    expect(MIGRATION_SQL).toContain(
      'CREATE UNIQUE INDEX "customer_contact_phones_tenant_phone_active_key"',
    );
    expect(MIGRATION_SQL).toContain('WHERE "deleted_at" IS NULL');
    expect(MIGRATION_SQL).toContain(
      'FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT',
    );
    expect(MIGRATION_SQL).toContain(
      'FOREIGN KEY ("tenant_customer_id") REFERENCES "tenant_customers"("id") ON DELETE RESTRICT',
    );
  });
});
