-- IFP-080 — append-only log for installment advanced operations

CREATE TABLE "installment_operation_logs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "sale_id" UUID NOT NULL,
    "operation_type" TEXT NOT NULL,
    "installment_ids" UUID[] NOT NULL,
    "previous_snapshot" JSONB NOT NULL,
    "new_snapshot" JSONB NOT NULL,
    "reason" TEXT,
    "performed_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,

    CONSTRAINT "installment_operation_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "installment_operation_logs_tenant_id_sale_id_idx" ON "installment_operation_logs"("tenant_id", "sale_id");
CREATE INDEX "installment_operation_logs_tenant_id_created_at_idx" ON "installment_operation_logs"("tenant_id", "created_at");

ALTER TABLE "installment_operation_logs" ADD CONSTRAINT "installment_operation_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "installment_operation_logs" ADD CONSTRAINT "installment_operation_logs_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "installment_operation_logs" ADD CONSTRAINT "installment_operation_logs_performed_by_id_fkey" FOREIGN KEY ("performed_by_id") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
