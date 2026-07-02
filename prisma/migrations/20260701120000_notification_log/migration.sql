-- TASK-130 / IFP-046 — NotificationLog append-only

CREATE TABLE "notification_logs" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,
    "tenant_id" UUID NOT NULL,
    "installment_id" UUID,
    "channel" TEXT NOT NULL,
    "reminder_type" TEXT,
    "status" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "recipient_ref" TEXT NOT NULL,
    "external_message_id" TEXT,
    "error_code" TEXT,
    "sent_at" TIMESTAMPTZ,

    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notification_logs_idempotency_key_key" ON "notification_logs"("idempotency_key");
CREATE INDEX "notification_logs_tenant_id_status_idx" ON "notification_logs"("tenant_id", "status");
CREATE INDEX "notification_logs_tenant_id_installment_id_idx" ON "notification_logs"("tenant_id", "installment_id");

ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_installment_id_fkey" FOREIGN KEY ("installment_id") REFERENCES "installments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
