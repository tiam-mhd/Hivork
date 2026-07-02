-- IFP-065 — ContractGuarantor (linked tenant customer or external person; soft delete)

CREATE TYPE "guarantor_relationship" AS ENUM (
  'PARENT',
  'SPOUSE',
  'SIBLING',
  'EMPLOYER',
  'OTHER'
);

CREATE TABLE "contract_guarantors" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "sale_id" UUID NOT NULL,
  "tenant_customer_id" UUID,
  "full_name" TEXT,
  "national_id" TEXT,
  "phone" TEXT,
  "relationship" "guarantor_relationship" NOT NULL,
  "note" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL,
  "created_by_id" UUID,
  "updated_by_id" UUID,
  "deleted_at" TIMESTAMPTZ,
  "deleted_by_id" UUID,
  "delete_reason" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "metadata" JSONB,

  CONSTRAINT "contract_guarantors_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "contract_guarantors" ADD CONSTRAINT "contract_guarantors_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "contract_guarantors" ADD CONSTRAINT "contract_guarantors_sale_id_fkey"
  FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "contract_guarantors" ADD CONSTRAINT "contract_guarantors_tenant_customer_id_fkey"
  FOREIGN KEY ("tenant_customer_id") REFERENCES "tenant_customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "contract_guarantors_tenant_id_sale_id_idx"
  ON "contract_guarantors"("tenant_id", "sale_id");

CREATE INDEX "contract_guarantors_tenant_id_deleted_at_idx"
  ON "contract_guarantors"("tenant_id", "deleted_at");
