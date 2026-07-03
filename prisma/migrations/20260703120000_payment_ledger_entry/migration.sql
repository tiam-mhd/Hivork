-- IFP-101: PaymentLedgerEntry — unified tenant financial ledger (append-only, void via reversal)

CREATE TYPE "payment_ledger_entry_type" AS ENUM (
  'PAYMENT_IN',
  'PAYMENT_OUT',
  'REFUND',
  'FEE',
  'PENALTY',
  'DISCOUNT',
  'ADJUSTMENT',
  'SETTLEMENT'
);

CREATE TYPE "payment_ledger_direction" AS ENUM ('CREDIT', 'DEBIT');

CREATE TYPE "payment_ledger_entry_status" AS ENUM ('POSTED', 'VOIDED');

CREATE TABLE "payment_ledger_entries" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "entry_type" "payment_ledger_entry_type" NOT NULL,
    "direction" "payment_ledger_direction" NOT NULL,
    "amount_rial" BIGINT NOT NULL,
    "status" "payment_ledger_entry_status" NOT NULL DEFAULT 'POSTED',
    "occurred_at" TIMESTAMPTZ NOT NULL,
    "recorded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payment_method" TEXT,
    "description" TEXT,
    "payment_attempt_id" UUID,
    "installment_id" UUID,
    "sale_id" UUID,
    "check_id" UUID,
    "settlement_batch_id" UUID,
    "reverses_entry_id" UUID,
    "voided_at" TIMESTAMPTZ,
    "voided_by_id" UUID,
    "void_reason" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by_id" UUID,
    "delete_reason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,

    CONSTRAINT "payment_ledger_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "payment_ledger_entries_tenant_id_occurred_at_idx"
  ON "payment_ledger_entries"("tenant_id", "occurred_at");

CREATE INDEX "payment_ledger_entries_tenant_id_status_idx"
  ON "payment_ledger_entries"("tenant_id", "status");

CREATE INDEX "payment_ledger_entries_tenant_id_branch_id_idx"
  ON "payment_ledger_entries"("tenant_id", "branch_id");

CREATE INDEX "payment_ledger_entries_tenant_id_payment_attempt_id_idx"
  ON "payment_ledger_entries"("tenant_id", "payment_attempt_id");

CREATE INDEX "payment_ledger_entries_tenant_id_installment_id_idx"
  ON "payment_ledger_entries"("tenant_id", "installment_id");

CREATE INDEX "payment_ledger_entries_tenant_id_sale_id_idx"
  ON "payment_ledger_entries"("tenant_id", "sale_id");

CREATE INDEX "payment_ledger_entries_tenant_id_deleted_at_idx"
  ON "payment_ledger_entries"("tenant_id", "deleted_at");

-- Idempotent confirm: one posted entry per (paymentAttemptId, entryType)
CREATE UNIQUE INDEX "payment_ledger_entries_payment_attempt_entry_posted_uidx"
  ON "payment_ledger_entries"("payment_attempt_id", "entry_type")
  WHERE "status" = 'POSTED'
    AND "payment_attempt_id" IS NOT NULL
    AND "deleted_at" IS NULL;

ALTER TABLE "payment_ledger_entries"
  ADD CONSTRAINT "payment_ledger_entries_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payment_ledger_entries"
  ADD CONSTRAINT "payment_ledger_entries_branch_id_fkey"
  FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payment_ledger_entries"
  ADD CONSTRAINT "payment_ledger_entries_payment_attempt_id_fkey"
  FOREIGN KEY ("payment_attempt_id") REFERENCES "payment_attempts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payment_ledger_entries"
  ADD CONSTRAINT "payment_ledger_entries_installment_id_fkey"
  FOREIGN KEY ("installment_id") REFERENCES "installments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payment_ledger_entries"
  ADD CONSTRAINT "payment_ledger_entries_sale_id_fkey"
  FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payment_ledger_entries"
  ADD CONSTRAINT "payment_ledger_entries_reverses_entry_id_fkey"
  FOREIGN KEY ("reverses_entry_id") REFERENCES "payment_ledger_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payment_ledger_entries"
  ADD CONSTRAINT "payment_ledger_entries_voided_by_id_fkey"
  FOREIGN KEY ("voided_by_id") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
