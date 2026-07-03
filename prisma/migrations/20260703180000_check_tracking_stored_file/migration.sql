-- IFP-TASK-116: StoredFile stub + CheckTrackingNote

CREATE TABLE "stored_files" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "storage_key" VARCHAR(512) NOT NULL,
    "original_name" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(120) NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "category" VARCHAR(64),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by_id" UUID,
    "delete_reason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,

    CONSTRAINT "stored_files_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "stored_files_storage_key_key" ON "stored_files"("storage_key");
CREATE INDEX "stored_files_tenant_id_deleted_at_idx" ON "stored_files"("tenant_id", "deleted_at");

ALTER TABLE "stored_files" ADD CONSTRAINT "stored_files_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "check_tracking_notes" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "check_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "author_staff_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by_id" UUID,
    "delete_reason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,

    CONSTRAINT "check_tracking_notes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "check_tracking_notes_tenant_id_check_id_idx" ON "check_tracking_notes"("tenant_id", "check_id");
CREATE INDEX "check_tracking_notes_tenant_id_deleted_at_idx" ON "check_tracking_notes"("tenant_id", "deleted_at");

ALTER TABLE "check_tracking_notes" ADD CONSTRAINT "check_tracking_notes_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "check_tracking_notes" ADD CONSTRAINT "check_tracking_notes_check_id_fkey"
    FOREIGN KEY ("check_id") REFERENCES "checks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "check_tracking_notes" ADD CONSTRAINT "check_tracking_notes_author_staff_id_fkey"
    FOREIGN KEY ("author_staff_id") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "checks" ADD CONSTRAINT "checks_image_file_id_fkey"
    FOREIGN KEY ("image_file_id") REFERENCES "stored_files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
