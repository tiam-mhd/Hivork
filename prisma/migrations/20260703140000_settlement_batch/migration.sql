-- IFP-109: SettlementBatch + SettlementBatchEntry — POS/online reconciliation batches

CREATE TYPE "settlement_batch_status" AS ENUM ('OPEN', 'CLOSED');

CREATE TABLE "settlement_batches" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "batch_number" TEXT NOT NULL,
    "status" "settlement_batch_status" NOT NULL DEFAULT 'OPEN',
    "period_from" TIMESTAMPTZ NOT NULL,
    "period_to" TIMESTAMPTZ NOT NULL,
    "total_amount_rial" BIGINT NOT NULL,
    "entry_count" INTEGER NOT NULL,
    "note" TEXT,
    "closed_at" TIMESTAMPTZ,
    "closed_by_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by_id" UUID,
    "delete_reason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,

    CONSTRAINT "settlement_batches_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "settlement_batch_entries" (
    "id" UUID NOT NULL,
    "settlement_batch_id" UUID NOT NULL,
    "ledger_entry_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settlement_batch_entries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "settlement_batches_tenant_id_batch_number_key"
  ON "settlement_batches"("tenant_id", "batch_number");

CREATE INDEX "settlement_batches_tenant_id_status_idx"
  ON "settlement_batches"("tenant_id", "status");

CREATE INDEX "settlement_batches_tenant_id_branch_id_idx"
  ON "settlement_batches"("tenant_id", "branch_id");

CREATE INDEX "settlement_batches_tenant_id_deleted_at_idx"
  ON "settlement_batches"("tenant_id", "deleted_at");

CREATE UNIQUE INDEX "settlement_batch_entries_ledger_entry_id_key"
  ON "settlement_batch_entries"("ledger_entry_id");

CREATE INDEX "settlement_batch_entries_settlement_batch_id_idx"
  ON "settlement_batch_entries"("settlement_batch_id");

CREATE INDEX "payment_ledger_entries_tenant_id_settlement_batch_id_idx"
  ON "payment_ledger_entries"("tenant_id", "settlement_batch_id");

ALTER TABLE "settlement_batches"
  ADD CONSTRAINT "settlement_batches_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "settlement_batches"
  ADD CONSTRAINT "settlement_batches_branch_id_fkey"
  FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "settlement_batches"
  ADD CONSTRAINT "settlement_batches_closed_by_id_fkey"
  FOREIGN KEY ("closed_by_id") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "settlement_batch_entries"
  ADD CONSTRAINT "settlement_batch_entries_settlement_batch_id_fkey"
  FOREIGN KEY ("settlement_batch_id") REFERENCES "settlement_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "settlement_batch_entries"
  ADD CONSTRAINT "settlement_batch_entries_ledger_entry_id_fkey"
  FOREIGN KEY ("ledger_entry_id") REFERENCES "payment_ledger_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payment_ledger_entries"
  ADD CONSTRAINT "payment_ledger_entries_settlement_batch_id_fkey"
  FOREIGN KEY ("settlement_batch_id") REFERENCES "settlement_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
