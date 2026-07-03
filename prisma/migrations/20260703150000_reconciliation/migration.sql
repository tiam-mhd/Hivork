-- IFP-110: ReconciliationReport + ReconciliationDiscrepancy

CREATE TYPE "reconciliation_discrepancy_type" AS ENUM (
  'MISSING_IN_SYSTEM',
  'MISSING_IN_BANK',
  'AMOUNT_MISMATCH'
);

CREATE TYPE "reconciliation_discrepancy_status" AS ENUM (
  'OPEN',
  'RESOLVED',
  'IGNORED'
);

CREATE TABLE "reconciliation_reports" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "settlement_batch_id" UUID NOT NULL,
    "matched_count" INTEGER NOT NULL,
    "discrepancy_count" INTEGER NOT NULL,
    "bank_total_rial" BIGINT NOT NULL,
    "system_total_rial" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by_id" UUID,
    "delete_reason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,

    CONSTRAINT "reconciliation_reports_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reconciliation_discrepancies" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "reconciliation_report_id" UUID NOT NULL,
    "discrepancy_type" "reconciliation_discrepancy_type" NOT NULL,
    "status" "reconciliation_discrepancy_status" NOT NULL DEFAULT 'OPEN',
    "bank_reference" TEXT,
    "bank_amount_rial" BIGINT,
    "ledger_entry_id" UUID,
    "system_amount_rial" BIGINT,
    "resolve_note" TEXT,
    "resolved_at" TIMESTAMPTZ,
    "resolved_by_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by_id" UUID,
    "delete_reason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,

    CONSTRAINT "reconciliation_discrepancies_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "reconciliation_reports_tenant_id_settlement_batch_id_idx"
  ON "reconciliation_reports"("tenant_id", "settlement_batch_id");

CREATE INDEX "reconciliation_reports_tenant_id_deleted_at_idx"
  ON "reconciliation_reports"("tenant_id", "deleted_at");

CREATE INDEX "reconciliation_discrepancies_tenant_id_reconciliation_report_id_idx"
  ON "reconciliation_discrepancies"("tenant_id", "reconciliation_report_id");

CREATE INDEX "reconciliation_discrepancies_tenant_id_status_idx"
  ON "reconciliation_discrepancies"("tenant_id", "status");

CREATE INDEX "reconciliation_discrepancies_tenant_id_deleted_at_idx"
  ON "reconciliation_discrepancies"("tenant_id", "deleted_at");

ALTER TABLE "reconciliation_reports"
  ADD CONSTRAINT "reconciliation_reports_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "reconciliation_reports"
  ADD CONSTRAINT "reconciliation_reports_settlement_batch_id_fkey"
  FOREIGN KEY ("settlement_batch_id") REFERENCES "settlement_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "reconciliation_discrepancies"
  ADD CONSTRAINT "reconciliation_discrepancies_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "reconciliation_discrepancies"
  ADD CONSTRAINT "reconciliation_discrepancies_reconciliation_report_id_fkey"
  FOREIGN KEY ("reconciliation_report_id") REFERENCES "reconciliation_reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "reconciliation_discrepancies"
  ADD CONSTRAINT "reconciliation_discrepancies_ledger_entry_id_fkey"
  FOREIGN KEY ("ledger_entry_id") REFERENCES "payment_ledger_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "reconciliation_discrepancies"
  ADD CONSTRAINT "reconciliation_discrepancies_resolved_by_id_fkey"
  FOREIGN KEY ("resolved_by_id") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
