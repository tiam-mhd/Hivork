-- IFP-111: Check — received/payable check lifecycle (links to ledger, payment attempt, sale/installment)

CREATE TYPE "check_type" AS ENUM ('RECEIVED', 'PAYABLE');

CREATE TYPE "check_status" AS ENUM (
  'REGISTERED',
  'DUE',
  'COLLECTED',
  'BOUNCED',
  'TRANSFERRED',
  'CANCELLED'
);

CREATE TABLE "checks" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "check_type" "check_type" NOT NULL,
    "status" "check_status" NOT NULL DEFAULT 'REGISTERED',
    "check_number" TEXT NOT NULL,
    "bank_name" TEXT NOT NULL,
    "bank_branch_code" TEXT,
    "amount_rial" BIGINT NOT NULL,
    "due_date" TIMESTAMPTZ NOT NULL,
    "drawer_name" TEXT NOT NULL,
    "payee_name" TEXT,
    "sayad_id" TEXT,
    "payment_attempt_id" UUID,
    "ledger_entry_id" UUID,
    "installment_id" UUID,
    "sale_id" UUID,
    "image_file_id" UUID,
    "collected_at" TIMESTAMPTZ,
    "bounced_at" TIMESTAMPTZ,
    "bounce_reason" TEXT,
    "transferred_to" TEXT,
    "transferred_at" TIMESTAMPTZ,
    "tracking_notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by_id" UUID,
    "delete_reason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,

    CONSTRAINT "checks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "checks_ledger_entry_id_key"
  ON "checks"("ledger_entry_id");

CREATE INDEX "checks_tenant_id_status_idx"
  ON "checks"("tenant_id", "status");

CREATE INDEX "checks_tenant_id_due_date_idx"
  ON "checks"("tenant_id", "due_date");

CREATE INDEX "checks_tenant_id_check_number_bank_name_idx"
  ON "checks"("tenant_id", "check_number", "bank_name");

CREATE INDEX "checks_tenant_id_branch_id_idx"
  ON "checks"("tenant_id", "branch_id");

CREATE INDEX "checks_tenant_id_deleted_at_idx"
  ON "checks"("tenant_id", "deleted_at");

CREATE UNIQUE INDEX "checks_tenant_check_number_bank_active_uidx"
  ON "checks"("tenant_id", "check_number", "bank_name")
  WHERE "deleted_at" IS NULL;

CREATE INDEX "payment_ledger_entries_tenant_id_check_id_idx"
  ON "payment_ledger_entries"("tenant_id", "check_id");

ALTER TABLE "checks"
  ADD CONSTRAINT "checks_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "checks"
  ADD CONSTRAINT "checks_branch_id_fkey"
  FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "checks"
  ADD CONSTRAINT "checks_payment_attempt_id_fkey"
  FOREIGN KEY ("payment_attempt_id") REFERENCES "payment_attempts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "checks"
  ADD CONSTRAINT "checks_ledger_entry_id_fkey"
  FOREIGN KEY ("ledger_entry_id") REFERENCES "payment_ledger_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "checks"
  ADD CONSTRAINT "checks_installment_id_fkey"
  FOREIGN KEY ("installment_id") REFERENCES "installments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "checks"
  ADD CONSTRAINT "checks_sale_id_fkey"
  FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payment_ledger_entries"
  ADD CONSTRAINT "payment_ledger_entries_check_id_fkey"
  FOREIGN KEY ("check_id") REFERENCES "checks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
