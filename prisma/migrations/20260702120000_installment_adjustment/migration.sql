-- IFP-097: InstallmentAdjustment (penalty / discount append-only)

CREATE TYPE "installment_adjustment_type" AS ENUM ('PENALTY', 'DISCOUNT');

CREATE TABLE "installment_adjustments" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "installment_id" UUID NOT NULL,
    "adjustment_type" "installment_adjustment_type" NOT NULL,
    "amount_rial" BIGINT NOT NULL,
    "reason" TEXT NOT NULL,
    "applied_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "applied_by_id" UUID NOT NULL,
    "reversed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by_id" UUID,
    "delete_reason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,

    CONSTRAINT "installment_adjustments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "installment_adjustments_tenant_id_installment_id_idx"
  ON "installment_adjustments"("tenant_id", "installment_id");

CREATE INDEX "installment_adjustments_tenant_id_applied_at_idx"
  ON "installment_adjustments"("tenant_id", "applied_at");

CREATE INDEX "installment_adjustments_tenant_id_deleted_at_idx"
  ON "installment_adjustments"("tenant_id", "deleted_at");

ALTER TABLE "installment_adjustments"
  ADD CONSTRAINT "installment_adjustments_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "installment_adjustments"
  ADD CONSTRAINT "installment_adjustments_installment_id_fkey"
  FOREIGN KEY ("installment_id") REFERENCES "installments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "installment_adjustments"
  ADD CONSTRAINT "installment_adjustments_applied_by_id_fkey"
  FOREIGN KEY ("applied_by_id") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
