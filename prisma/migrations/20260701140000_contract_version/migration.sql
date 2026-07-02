-- IFP-056 — ContractVersion (append-only contract snapshot history)

CREATE TYPE "contract_version_change_type" AS ENUM (
  'CREATE',
  'UPDATE',
  'EXTEND',
  'COPY_SOURCE',
  'TERMINATE',
  'CLOSE',
  'FINANCIAL_RECALC'
);

CREATE TABLE "contract_versions" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "sale_id" UUID NOT NULL,
  "version_number" INTEGER NOT NULL,
  "change_type" "contract_version_change_type" NOT NULL,
  "change_reason" TEXT NOT NULL,
  "snapshot" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_id" UUID,

  CONSTRAINT "contract_versions_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "contract_versions" ADD CONSTRAINT "contract_versions_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "contract_versions" ADD CONSTRAINT "contract_versions_sale_id_fkey"
  FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "contract_versions_sale_id_version_number_key"
  ON "contract_versions"("sale_id", "version_number");

CREATE INDEX "contract_versions_tenant_id_sale_id_idx"
  ON "contract_versions"("tenant_id", "sale_id");

CREATE INDEX "contract_versions_tenant_id_created_at_idx"
  ON "contract_versions"("tenant_id", "created_at");
