import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const MIGRATION_DIR = join(
  import.meta.dirname,
  '../../../../prisma/migrations/20260629213000_installments_module',
);
const MIGRATION_SQL = readFileSync(join(MIGRATION_DIR, 'migration.sql'), 'utf8');

describe('installments_module migration SQL (TASK-064)', () => {
  it('creates all required enums', () => {
    expect(MIGRATION_SQL).toContain('CREATE TYPE "sale_status"');
    expect(MIGRATION_SQL).toContain('CREATE TYPE "installment_status"');
    expect(MIGRATION_SQL).toContain('CREATE TYPE "reported_by_type"');
    expect(MIGRATION_SQL).toContain('CREATE TYPE "payment_attempt_status"');
  });

  it('creates sales, installments, and payment_attempts tables', () => {
    expect(MIGRATION_SQL).toContain('CREATE TABLE "sales"');
    expect(MIGRATION_SQL).toContain('CREATE TABLE "installments"');
    expect(MIGRATION_SQL).toContain('CREATE TABLE "payment_attempts"');
  });

  it('uses ON DELETE RESTRICT — no CASCADE deletes', () => {
    expect(MIGRATION_SQL).not.toMatch(/ON DELETE CASCADE/i);
    expect(MIGRATION_SQL.match(/ON DELETE RESTRICT/g)?.length).toBeGreaterThanOrEqual(12);
  });

  it('includes report and idempotency indexes from TASK-061/062/063', () => {
    expect(MIGRATION_SQL).toContain('sales_tenant_id_status_idx');
    expect(MIGRATION_SQL).toContain('installments_sale_id_sequence_number_key');
    expect(MIGRATION_SQL).toContain('payment_attempts_tenant_id_idempotency_key_key');
    expect(MIGRATION_SQL).toContain('installments_tenant_id_status_due_date_idx');
    expect(MIGRATION_SQL).toContain('payment_attempts_tenant_id_installment_id_status_idx');
  });
});
