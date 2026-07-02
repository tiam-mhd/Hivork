import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const MIGRATION_SQL = readFileSync(
  join(
    import.meta.dirname,
    '../../../../../prisma/migrations/20260701100000_customer_document_note_models/migration.sql',
  ),
  'utf8',
);

describe('customer document/note migration', () => {
  it('uses ON DELETE RESTRICT for tenant and customer foreign keys', () => {
    expect(MIGRATION_SQL).toContain(
      'FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT',
    );
    expect(MIGRATION_SQL).toContain(
      'FOREIGN KEY ("tenant_customer_id") REFERENCES "tenant_customers"("id") ON DELETE RESTRICT',
    );
    expect(MIGRATION_SQL).toContain(
      'FOREIGN KEY ("uploaded_by_id") REFERENCES "staff"("id") ON DELETE RESTRICT',
    );
    expect(MIGRATION_SQL).toContain(
      'FOREIGN KEY ("author_staff_id") REFERENCES "staff"("id") ON DELETE RESTRICT',
    );
  });
});
