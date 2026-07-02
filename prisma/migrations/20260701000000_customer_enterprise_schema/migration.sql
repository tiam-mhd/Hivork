-- IFP-TASK-033: Customer enterprise schema — categories, extended TenantCustomer, addresses, emergency contacts

CREATE TYPE "TenantCustomerStatus" AS ENUM ('active', 'archived', 'blacklisted');
CREATE TYPE "CustomerAddressLabel" AS ENUM ('home', 'work', 'billing', 'other');
CREATE TYPE "EmergencyContactRelation" AS ENUM ('parent', 'spouse', 'sibling', 'other');

CREATE TABLE "customer_categories" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "color" VARCHAR(7),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by_id" UUID,
    "delete_reason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,

    CONSTRAINT "customer_categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "customer_categories_tenant_id_slug_key"
ON "customer_categories"("tenant_id", "slug");

CREATE INDEX "customer_categories_tenant_id_idx"
ON "customer_categories"("tenant_id");

CREATE INDEX "customer_categories_tenant_id_deleted_at_idx"
ON "customer_categories"("tenant_id", "deleted_at");

ALTER TABLE "customer_categories"
ADD CONSTRAINT "customer_categories_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "tenant_customers"
ADD COLUMN "category_id" UUID,
ADD COLUMN "status" "TenantCustomerStatus" NOT NULL DEFAULT 'active',
ADD COLUMN "is_blacklisted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "blacklist_reason" TEXT,
ADD COLUMN "blacklisted_at" TIMESTAMPTZ,
ADD COLUMN "blacklisted_by_id" UUID,
ADD COLUMN "archived_at" TIMESTAMPTZ,
ADD COLUMN "archived_by_id" UUID,
ADD COLUMN "assigned_staff_id" UUID;

CREATE INDEX "tenant_customers_tenant_id_status_idx"
ON "tenant_customers"("tenant_id", "status");

CREATE INDEX "tenant_customers_tenant_id_category_id_idx"
ON "tenant_customers"("tenant_id", "category_id");

CREATE INDEX "tenant_customers_tenant_id_is_blacklisted_idx"
ON "tenant_customers"("tenant_id", "is_blacklisted");

ALTER TABLE "tenant_customers"
ADD CONSTRAINT "tenant_customers_category_id_fkey"
FOREIGN KEY ("category_id") REFERENCES "customer_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "tenant_customers"
ADD CONSTRAINT "tenant_customers_assigned_staff_id_fkey"
FOREIGN KEY ("assigned_staff_id") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "tenant_customers"
ADD CONSTRAINT "tenant_customers_blacklisted_by_id_fkey"
FOREIGN KEY ("blacklisted_by_id") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "tenant_customers"
ADD CONSTRAINT "tenant_customers_archived_by_id_fkey"
FOREIGN KEY ("archived_by_id") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "customer_addresses" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "tenant_customer_id" UUID NOT NULL,
    "label" "CustomerAddressLabel" NOT NULL DEFAULT 'home',
    "line1" TEXT NOT NULL,
    "line2" TEXT,
    "city" TEXT,
    "province" TEXT,
    "postal_code" VARCHAR(10),
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by_id" UUID,
    "delete_reason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,

    CONSTRAINT "customer_addresses_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "customer_addresses_tenant_id_idx"
ON "customer_addresses"("tenant_id");

CREATE INDEX "customer_addresses_tenant_id_deleted_at_idx"
ON "customer_addresses"("tenant_id", "deleted_at");

CREATE INDEX "customer_addresses_tenant_customer_id_idx"
ON "customer_addresses"("tenant_customer_id");

CREATE INDEX "customer_addresses_tenant_customer_id_is_primary_idx"
ON "customer_addresses"("tenant_customer_id", "is_primary");

ALTER TABLE "customer_addresses"
ADD CONSTRAINT "customer_addresses_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "customer_addresses"
ADD CONSTRAINT "customer_addresses_tenant_customer_id_fkey"
FOREIGN KEY ("tenant_customer_id") REFERENCES "tenant_customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "customer_emergency_contacts" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "tenant_customer_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "phone" VARCHAR(11) NOT NULL,
    "relation" "EmergencyContactRelation" NOT NULL DEFAULT 'other',
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by_id" UUID,
    "delete_reason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,

    CONSTRAINT "customer_emergency_contacts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "customer_emergency_contacts_tenant_id_idx"
ON "customer_emergency_contacts"("tenant_id");

CREATE INDEX "customer_emergency_contacts_tenant_id_deleted_at_idx"
ON "customer_emergency_contacts"("tenant_id", "deleted_at");

CREATE INDEX "customer_emergency_contacts_tenant_customer_id_idx"
ON "customer_emergency_contacts"("tenant_customer_id");

CREATE INDEX "customer_emergency_contacts_tenant_customer_id_is_primary_idx"
ON "customer_emergency_contacts"("tenant_customer_id", "is_primary");

ALTER TABLE "customer_emergency_contacts"
ADD CONSTRAINT "customer_emergency_contacts_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "customer_emergency_contacts"
ADD CONSTRAINT "customer_emergency_contacts_tenant_customer_id_fkey"
FOREIGN KEY ("tenant_customer_id") REFERENCES "tenant_customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
