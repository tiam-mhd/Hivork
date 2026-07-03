-- IFP-095: Payment receipt records for confirmed payment attempts

CREATE TABLE "payment_receipts" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "payment_attempt_id" UUID NOT NULL,
    "receipt_number" TEXT NOT NULL,
    "pdf_file_id" UUID,
    "sent_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by_id" UUID,
    "delete_reason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,

    CONSTRAINT "payment_receipts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payment_receipts_payment_attempt_id_key"
  ON "payment_receipts"("payment_attempt_id");

CREATE UNIQUE INDEX "payment_receipts_tenant_id_receipt_number_key"
  ON "payment_receipts"("tenant_id", "receipt_number");

CREATE INDEX "payment_receipts_tenant_id_deleted_at_idx"
  ON "payment_receipts"("tenant_id", "deleted_at");

ALTER TABLE "payment_receipts"
  ADD CONSTRAINT "payment_receipts_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payment_receipts"
  ADD CONSTRAINT "payment_receipts_payment_attempt_id_fkey"
  FOREIGN KEY ("payment_attempt_id") REFERENCES "payment_attempts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
