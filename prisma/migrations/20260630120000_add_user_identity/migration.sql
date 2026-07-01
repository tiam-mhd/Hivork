-- ADR-017: Central User identity — backfill from Staff.phone and GlobalCustomer.phone

CREATE TYPE "UserStatus" AS ENUM ('active', 'suspended');

CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "phone" VARCHAR(11) NOT NULL,
    "name" TEXT,
    "avatar_url" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'active',
    "last_login_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by_id" UUID,
    "delete_reason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");
CREATE INDEX "users_status_idx" ON "users"("status");

-- Seed users from staff phones (one user per distinct phone)
INSERT INTO "users" ("id", "phone", "name", "status", "created_at", "updated_at", "version")
SELECT
    gen_random_uuid(),
    s."phone",
    (
        SELECT s2."name"
        FROM "staff" s2
        WHERE s2."phone" = s."phone" AND s2."deleted_at" IS NULL
        ORDER BY s2."created_at" ASC
        LIMIT 1
    ),
    'active'::"UserStatus",
    MIN(s."created_at"),
    CURRENT_TIMESTAMP,
    1
FROM "staff" s
WHERE s."deleted_at" IS NULL
GROUP BY s."phone";

-- Seed users from global customer phones not yet present
INSERT INTO "users" ("id", "phone", "name", "status", "created_at", "updated_at", "version")
SELECT
    gen_random_uuid(),
    gc."phone",
    gc."name",
    CASE
        WHEN gc."status" = 'suspended' THEN 'suspended'::"UserStatus"
        ELSE 'active'::"UserStatus"
    END,
    gc."created_at",
    CURRENT_TIMESTAMP,
    1
FROM "global_customers" gc
WHERE NOT EXISTS (
    SELECT 1 FROM "users" u WHERE u."phone" = gc."phone"
);

-- Add user_id columns (nullable during backfill)
ALTER TABLE "staff" ADD COLUMN "user_id" UUID;
ALTER TABLE "global_customers" ADD COLUMN "user_id" UUID;

UPDATE "staff" s
SET "user_id" = u."id"
FROM "users" u
WHERE u."phone" = s."phone";

UPDATE "global_customers" gc
SET "user_id" = u."id"
FROM "users" u
WHERE u."phone" = gc."phone";

-- Any orphaned rows (should not happen) get a dedicated user
INSERT INTO "users" ("id", "phone", "name", "status", "created_at", "updated_at", "version")
SELECT
    gen_random_uuid(),
    s."phone",
    s."name",
    'active'::"UserStatus",
    s."created_at",
    CURRENT_TIMESTAMP,
    1
FROM "staff" s
WHERE s."user_id" IS NULL
ON CONFLICT ("phone") DO NOTHING;

UPDATE "staff" s
SET "user_id" = u."id"
FROM "users" u
WHERE s."user_id" IS NULL AND u."phone" = s."phone";

INSERT INTO "users" ("id", "phone", "name", "status", "created_at", "updated_at", "version")
SELECT
    gen_random_uuid(),
    gc."phone",
    gc."name",
    'active'::"UserStatus",
    gc."created_at",
    CURRENT_TIMESTAMP,
    1
FROM "global_customers" gc
WHERE gc."user_id" IS NULL
ON CONFLICT ("phone") DO NOTHING;

UPDATE "global_customers" gc
SET "user_id" = u."id"
FROM "users" u
WHERE gc."user_id" IS NULL AND u."phone" = gc."phone";

ALTER TABLE "staff" ALTER COLUMN "user_id" SET NOT NULL;
ALTER TABLE "global_customers" ALTER COLUMN "user_id" SET NOT NULL;

-- Drop old phone-based constraints and columns
DROP INDEX IF EXISTS "staff_tenant_id_phone_key";
ALTER TABLE "staff" DROP COLUMN "phone";

DROP INDEX IF EXISTS "global_customers_phone_key";
ALTER TABLE "global_customers" DROP COLUMN "phone";

-- New constraints and indexes
CREATE UNIQUE INDEX "staff_tenant_id_user_id_key" ON "staff"("tenant_id", "user_id");
CREATE INDEX "staff_user_id_idx" ON "staff"("user_id");
CREATE UNIQUE INDEX "global_customers_user_id_key" ON "global_customers"("user_id");

ALTER TABLE "staff" ADD CONSTRAINT "staff_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "global_customers" ADD CONSTRAINT "global_customers_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
