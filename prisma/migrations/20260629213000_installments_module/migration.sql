-- TASK-064 — Installments module (Sale + Installment + PaymentAttempt)
-- Consolidates TASK-061, TASK-062, TASK-063 into a single migration.
-- All FKs: ON DELETE RESTRICT (ADR-013)

-- CreateEnum
CREATE TYPE "sale_status" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');
CREATE TYPE "installment_status" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'WAIVED');
CREATE TYPE "reported_by_type" AS ENUM ('CUSTOMER', 'STAFF');
CREATE TYPE "payment_attempt_status" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED');

-- CreateTable: sales (TASK-061)
CREATE TABLE "sales" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "tenant_customer_id" UUID NOT NULL,
    "created_by_staff_id" UUID NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "invoice_number" TEXT,
    "total_amount_rial" BIGINT NOT NULL,
    "down_payment_rial" BIGINT NOT NULL DEFAULT 0,
    "discount_rial" BIGINT,
    "tax_rial" BIGINT,
    "installment_count" INTEGER NOT NULL,
    "first_due_date" TIMESTAMPTZ NOT NULL,
    "interval_days" INTEGER NOT NULL DEFAULT 30,
    "contract_date" DATE NOT NULL,
    "status" "sale_status" NOT NULL DEFAULT 'ACTIVE',
    "cancelled_at" TIMESTAMPTZ,
    "cancelled_by_id" UUID,
    "cancel_reason" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by_id" UUID,
    "delete_reason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable: installments (TASK-062)
CREATE TABLE "installments" (
    "id" UUID NOT NULL,
    "sale_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "sequence_number" INTEGER NOT NULL,
    "due_date" TIMESTAMPTZ NOT NULL,
    "amount_rial" BIGINT NOT NULL,
    "status" "installment_status" NOT NULL DEFAULT 'PENDING',
    "paid_at" TIMESTAMPTZ,
    "confirmed_by_staff_id" UUID,
    "waived_by_staff_id" UUID,
    "waive_reason" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by_id" UUID,
    "delete_reason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,

    CONSTRAINT "installments_pkey" PRIMARY KEY ("id")
);

-- CreateTable: payment_attempts (TASK-063)
CREATE TABLE "payment_attempts" (
    "id" UUID NOT NULL,
    "installment_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "reported_by_type" "reported_by_type" NOT NULL,
    "reported_by_id" UUID NOT NULL,
    "amount_rial" BIGINT NOT NULL,
    "status" "payment_attempt_status" NOT NULL DEFAULT 'PENDING',
    "evidence_file_id" UUID,
    "note" TEXT,
    "confirmed_by_staff_id" UUID,
    "rejected_reason" TEXT,
    "idempotency_key" UUID,
    "confirmed_at" TIMESTAMPTZ,
    "rejected_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by_id" UUID,
    "delete_reason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,

    CONSTRAINT "payment_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: sales
CREATE INDEX "sales_tenant_id_status_idx" ON "sales"("tenant_id", "status");
CREATE INDEX "sales_tenant_id_branch_id_idx" ON "sales"("tenant_id", "branch_id");
CREATE INDEX "sales_tenant_id_tenant_customer_id_idx" ON "sales"("tenant_id", "tenant_customer_id");
CREATE INDEX "sales_tenant_id_created_at_idx" ON "sales"("tenant_id", "created_at");
CREATE INDEX "sales_tenant_id_deleted_at_idx" ON "sales"("tenant_id", "deleted_at");

-- CreateIndex: installments
CREATE UNIQUE INDEX "installments_sale_id_sequence_number_key" ON "installments"("sale_id", "sequence_number");
CREATE INDEX "installments_tenant_id_status_due_date_idx" ON "installments"("tenant_id", "status", "due_date");
CREATE INDEX "installments_tenant_id_sale_id_idx" ON "installments"("tenant_id", "sale_id");
CREATE INDEX "installments_tenant_id_deleted_at_idx" ON "installments"("tenant_id", "deleted_at");

-- CreateIndex: payment_attempts
CREATE UNIQUE INDEX "payment_attempts_tenant_id_idempotency_key_key" ON "payment_attempts"("tenant_id", "idempotency_key");
CREATE INDEX "payment_attempts_tenant_id_installment_id_status_idx" ON "payment_attempts"("tenant_id", "installment_id", "status");
CREATE INDEX "payment_attempts_tenant_id_status_created_at_idx" ON "payment_attempts"("tenant_id", "status", "created_at");
CREATE INDEX "payment_attempts_tenant_id_deleted_at_idx" ON "payment_attempts"("tenant_id", "deleted_at");

-- AddForeignKey: sales
ALTER TABLE "sales" ADD CONSTRAINT "sales_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sales" ADD CONSTRAINT "sales_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sales" ADD CONSTRAINT "sales_tenant_customer_id_fkey" FOREIGN KEY ("tenant_customer_id") REFERENCES "tenant_customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sales" ADD CONSTRAINT "sales_created_by_staff_id_fkey" FOREIGN KEY ("created_by_staff_id") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sales" ADD CONSTRAINT "sales_cancelled_by_id_fkey" FOREIGN KEY ("cancelled_by_id") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: installments
ALTER TABLE "installments" ADD CONSTRAINT "installments_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "installments" ADD CONSTRAINT "installments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "installments" ADD CONSTRAINT "installments_confirmed_by_staff_id_fkey" FOREIGN KEY ("confirmed_by_staff_id") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "installments" ADD CONSTRAINT "installments_waived_by_staff_id_fkey" FOREIGN KEY ("waived_by_staff_id") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: payment_attempts
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_installment_id_fkey" FOREIGN KEY ("installment_id") REFERENCES "installments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_confirmed_by_staff_id_fkey" FOREIGN KEY ("confirmed_by_staff_id") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
