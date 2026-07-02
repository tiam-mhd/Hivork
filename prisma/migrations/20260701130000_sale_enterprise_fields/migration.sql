-- IFP-055 — Sale enterprise fields (contract number, signature, lineage, lifecycle, insurance)
-- Backward-compatible: nullable columns + enum extensions; existing rows unchanged.

-- Extend sale_status enum (Phase 1: ACTIVE, COMPLETED, CANCELLED)
ALTER TYPE "sale_status" ADD VALUE IF NOT EXISTS 'TERMINATED';
ALTER TYPE "sale_status" ADD VALUE IF NOT EXISTS 'CLOSED';
ALTER TYPE "sale_status" ADD VALUE IF NOT EXISTS 'ARCHIVED';

-- Contract signature status
CREATE TYPE "contract_signature_status" AS ENUM ('UNSIGNED', 'PENDING', 'SIGNED');

-- Enterprise contract fields
ALTER TABLE "sales" ADD COLUMN "contract_number" TEXT;
ALTER TABLE "sales" ADD COLUMN "custom_terms" TEXT;
ALTER TABLE "sales" ADD COLUMN "signature_status" "contract_signature_status" NOT NULL DEFAULT 'UNSIGNED';
ALTER TABLE "sales" ADD COLUMN "signed_at" TIMESTAMPTZ;
ALTER TABLE "sales" ADD COLUMN "signed_by_staff_id" UUID;

ALTER TABLE "sales" ADD COLUMN "extended_from_sale_id" UUID;
ALTER TABLE "sales" ADD COLUMN "copied_from_sale_id" UUID;

ALTER TABLE "sales" ADD COLUMN "terminated_at" TIMESTAMPTZ;
ALTER TABLE "sales" ADD COLUMN "terminated_by_id" UUID;
ALTER TABLE "sales" ADD COLUMN "terminate_reason" TEXT;

ALTER TABLE "sales" ADD COLUMN "closed_at" TIMESTAMPTZ;
ALTER TABLE "sales" ADD COLUMN "closed_by_id" UUID;
ALTER TABLE "sales" ADD COLUMN "close_reason" TEXT;

ALTER TABLE "sales" ADD COLUMN "archived_at" TIMESTAMPTZ;
ALTER TABLE "sales" ADD COLUMN "archived_by_id" UUID;
ALTER TABLE "sales" ADD COLUMN "archive_reason" TEXT;

ALTER TABLE "sales" ADD COLUMN "insurance_rial" BIGINT;
ALTER TABLE "sales" ADD COLUMN "insurance_provider" TEXT;
ALTER TABLE "sales" ADD COLUMN "insurance_policy_number" TEXT;

-- Self-relations (lineage) — ON DELETE RESTRICT (ADR-013)
ALTER TABLE "sales" ADD CONSTRAINT "sales_extended_from_sale_id_fkey"
  FOREIGN KEY ("extended_from_sale_id") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "sales" ADD CONSTRAINT "sales_copied_from_sale_id_fkey"
  FOREIGN KEY ("copied_from_sale_id") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Staff FKs for signature / lifecycle actors — ON DELETE RESTRICT (ADR-013)
ALTER TABLE "sales" ADD CONSTRAINT "sales_signed_by_staff_id_fkey"
  FOREIGN KEY ("signed_by_staff_id") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "sales" ADD CONSTRAINT "sales_terminated_by_id_fkey"
  FOREIGN KEY ("terminated_by_id") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "sales" ADD CONSTRAINT "sales_closed_by_id_fkey"
  FOREIGN KEY ("closed_by_id") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "sales" ADD CONSTRAINT "sales_archived_by_id_fkey"
  FOREIGN KEY ("archived_by_id") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Partial unique: contract number per tenant among non-deleted rows (allows reuse after soft delete)
CREATE UNIQUE INDEX "sales_tenant_contract_number_unique"
  ON "sales" ("tenant_id", "contract_number")
  WHERE "deleted_at" IS NULL AND "contract_number" IS NOT NULL;

-- Lookup indexes
CREATE INDEX "sales_tenant_id_contract_number_idx" ON "sales" ("tenant_id", "contract_number");
CREATE INDEX "sales_tenant_id_archived_at_idx" ON "sales" ("tenant_id", "archived_at");
