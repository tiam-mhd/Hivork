-- IFP-066 — ContractCollateral (pledged asset with release/forfeit lifecycle; soft delete)

CREATE TYPE "collateral_type" AS ENUM (
  'CHEQUE',
  'PROMISSORY_NOTE',
  'GOLD',
  'VEHICLE',
  'PROPERTY',
  'CASH_DEPOSIT',
  'OTHER'
);

CREATE TYPE "collateral_status" AS ENUM (
  'PLEDGED',
  'RELEASED',
  'FORFEITED'
);

CREATE TABLE "contract_collaterals" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "sale_id" UUID NOT NULL,
  "collateral_type" "collateral_type" NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "estimated_value_rial" BIGINT NOT NULL,
  "document_file_id" UUID,
  "registration_number" TEXT,
  "issued_at" DATE,
  "status" "collateral_status" NOT NULL DEFAULT 'PLEDGED',
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

  CONSTRAINT "contract_collaterals_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "contract_collaterals" ADD CONSTRAINT "contract_collaterals_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "contract_collaterals" ADD CONSTRAINT "contract_collaterals_sale_id_fkey"
  FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "contract_collaterals_tenant_id_sale_id_idx"
  ON "contract_collaterals"("tenant_id", "sale_id");

CREATE INDEX "contract_collaterals_tenant_id_status_idx"
  ON "contract_collaterals"("tenant_id", "status");

CREATE INDEX "contract_collaterals_tenant_id_deleted_at_idx"
  ON "contract_collaterals"("tenant_id", "deleted_at");
