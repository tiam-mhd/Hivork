-- IFP-TASK-035: CustomerContactPhone secondary numbers

CREATE TYPE "CustomerContactPhoneLabel" AS ENUM (
  'mobile',
  'home',
  'work',
  'other'
);

CREATE TABLE "customer_contact_phones" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "tenant_customer_id" UUID NOT NULL,
    "phone" VARCHAR(11) NOT NULL,
    "label" "CustomerContactPhoneLabel" NOT NULL DEFAULT 'mobile',
    "is_whatsapp" BOOLEAN NOT NULL DEFAULT false,
    "is_primary_secondary" BOOLEAN NOT NULL DEFAULT false,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by_id" UUID,
    "delete_reason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,

    CONSTRAINT "customer_contact_phones_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "customer_contact_phones_tenant_id_idx"
ON "customer_contact_phones"("tenant_id");

CREATE INDEX "customer_contact_phones_tenant_id_deleted_at_idx"
ON "customer_contact_phones"("tenant_id", "deleted_at");

CREATE INDEX "customer_contact_phones_tenant_customer_id_idx"
ON "customer_contact_phones"("tenant_customer_id");

CREATE INDEX "customer_contact_phones_tenant_id_phone_idx"
ON "customer_contact_phones"("tenant_id", "phone");

CREATE UNIQUE INDEX "customer_contact_phones_tenant_phone_active_key"
ON "customer_contact_phones"("tenant_id", "phone")
WHERE "deleted_at" IS NULL;

ALTER TABLE "customer_contact_phones"
ADD CONSTRAINT "customer_contact_phones_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "customer_contact_phones"
ADD CONSTRAINT "customer_contact_phones_tenant_customer_id_fkey"
FOREIGN KEY ("tenant_customer_id") REFERENCES "tenant_customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
