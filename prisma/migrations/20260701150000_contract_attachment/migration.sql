-- IFP-057 — ContractAttachment (contract file attachments with soft delete)

CREATE TYPE "contract_attachment_type" AS ENUM (
  'CONTRACT_SCAN',
  'SIGNED_CONTRACT',
  'IDENTITY_DOC',
  'COLLATERAL_DOC',
  'OTHER'
);

CREATE TABLE "contract_attachments" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "sale_id" UUID NOT NULL,
  "file_id" UUID NOT NULL,
  "attachment_type" "contract_attachment_type" NOT NULL,
  "label" TEXT,
  "description" TEXT,
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

  CONSTRAINT "contract_attachments_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "contract_attachments" ADD CONSTRAINT "contract_attachments_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "contract_attachments" ADD CONSTRAINT "contract_attachments_sale_id_fkey"
  FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "contract_attachments_tenant_id_sale_id_idx"
  ON "contract_attachments"("tenant_id", "sale_id");

CREATE INDEX "contract_attachments_tenant_id_deleted_at_idx"
  ON "contract_attachments"("tenant_id", "deleted_at");
