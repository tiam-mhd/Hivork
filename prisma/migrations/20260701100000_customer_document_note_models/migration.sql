-- IFP-TASK-034: CustomerDocument + CustomerNote models

CREATE TYPE "CustomerDocumentType" AS ENUM (
  'national_id',
  'birth_certificate',
  'contract',
  'photo',
  'other'
);

CREATE TABLE "customer_documents" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "tenant_customer_id" UUID NOT NULL,
    "document_type" "CustomerDocumentType" NOT NULL,
    "file_storage_key" VARCHAR(512) NOT NULL,
    "original_file_name" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(120) NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "uploaded_by_id" UUID NOT NULL,
    "description" TEXT,
    "expires_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by_id" UUID,
    "delete_reason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,

    CONSTRAINT "customer_documents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "customer_documents_tenant_id_idx"
ON "customer_documents"("tenant_id");

CREATE INDEX "customer_documents_tenant_id_deleted_at_idx"
ON "customer_documents"("tenant_id", "deleted_at");

CREATE INDEX "customer_documents_tenant_id_tenant_customer_id_idx"
ON "customer_documents"("tenant_id", "tenant_customer_id");

CREATE INDEX "customer_documents_tenant_id_document_type_idx"
ON "customer_documents"("tenant_id", "document_type");

ALTER TABLE "customer_documents"
ADD CONSTRAINT "customer_documents_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "customer_documents"
ADD CONSTRAINT "customer_documents_tenant_customer_id_fkey"
FOREIGN KEY ("tenant_customer_id") REFERENCES "tenant_customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "customer_documents"
ADD CONSTRAINT "customer_documents_uploaded_by_id_fkey"
FOREIGN KEY ("uploaded_by_id") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "customer_notes" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "tenant_customer_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
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

    CONSTRAINT "customer_notes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "customer_notes_tenant_id_idx"
ON "customer_notes"("tenant_id");

CREATE INDEX "customer_notes_tenant_id_deleted_at_idx"
ON "customer_notes"("tenant_id", "deleted_at");

CREATE INDEX "customer_notes_tenant_id_tenant_customer_id_idx"
ON "customer_notes"("tenant_id", "tenant_customer_id");

ALTER TABLE "customer_notes"
ADD CONSTRAINT "customer_notes_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "customer_notes"
ADD CONSTRAINT "customer_notes_tenant_customer_id_fkey"
FOREIGN KEY ("tenant_customer_id") REFERENCES "tenant_customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "customer_notes"
ADD CONSTRAINT "customer_notes_author_staff_id_fkey"
FOREIGN KEY ("author_staff_id") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
