-- IFP-068 — SaleLineItem (contract line items with per-line discount/tax; soft delete)

CREATE TABLE "sale_line_items" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "sale_id" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "sku" TEXT,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "unit_price_rial" BIGINT NOT NULL,
  "discount_rial" BIGINT NOT NULL DEFAULT 0,
  "tax_rial" BIGINT NOT NULL DEFAULT 0,
  "line_total_rial" BIGINT NOT NULL,
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

  CONSTRAINT "sale_line_items_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "sale_line_items" ADD CONSTRAINT "sale_line_items_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "sale_line_items" ADD CONSTRAINT "sale_line_items_sale_id_fkey"
  FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "sale_line_items_tenant_id_sale_id_idx"
  ON "sale_line_items"("tenant_id", "sale_id");

CREATE INDEX "sale_line_items_tenant_id_deleted_at_idx"
  ON "sale_line_items"("tenant_id", "deleted_at");
