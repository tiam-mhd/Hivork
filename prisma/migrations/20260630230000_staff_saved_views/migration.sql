-- IFP-TASK-027: StaffSavedView — per-staff saved list views

CREATE TABLE "staff_saved_views" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by_id" UUID,
    "delete_reason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,
    "tenant_id" UUID NOT NULL,
    "staff_id" UUID NOT NULL,
    "resource_key" VARCHAR(64) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(500),
    "column_state" JSONB NOT NULL,
    "sort_by" VARCHAR(64),
    "sort_dir" VARCHAR(8),
    "search" VARCHAR(200),
    "saved_filter_id" UUID,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "visibility" VARCHAR(32) NOT NULL DEFAULT 'private',

    CONSTRAINT "staff_saved_views_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "staff_saved_views_tenant_id_staff_id_resource_key_idx"
ON "staff_saved_views"("tenant_id", "staff_id", "resource_key");

CREATE UNIQUE INDEX "staff_saved_views_staff_resource_name_active_key"
ON "staff_saved_views"("staff_id", "resource_key", "name")
WHERE "deleted_at" IS NULL;

ALTER TABLE "staff_saved_views"
ADD CONSTRAINT "staff_saved_views_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "staff_saved_views"
ADD CONSTRAINT "staff_saved_views_staff_id_fkey"
FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "staff_saved_views"
ADD CONSTRAINT "staff_saved_views_saved_filter_id_fkey"
FOREIGN KEY ("saved_filter_id") REFERENCES "staff_saved_filters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
