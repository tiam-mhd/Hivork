-- IFP-016: Tenant API keys for external integration

CREATE TYPE "ApiKeyStatus" AS ENUM ('active', 'revoked', 'expired');

CREATE TABLE "tenant_api_keys" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "key_prefix" VARCHAR(16) NOT NULL,
    "key_hash" VARCHAR(64) NOT NULL,
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "ApiKeyStatus" NOT NULL DEFAULT 'active',
    "expires_at" TIMESTAMPTZ,
    "last_used_at" TIMESTAMPTZ,
    "last_used_ip" VARCHAR(45),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by_id" UUID NOT NULL,
    "updated_by_id" UUID,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by_id" UUID,
    "delete_reason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,

    CONSTRAINT "tenant_api_keys_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tenant_api_keys_key_hash_key" ON "tenant_api_keys"("key_hash");
CREATE INDEX "tenant_api_keys_tenant_id_status_idx" ON "tenant_api_keys"("tenant_id", "status");
CREATE INDEX "tenant_api_keys_tenant_id_name_idx" ON "tenant_api_keys"("tenant_id", "name");
CREATE INDEX "tenant_api_keys_key_prefix_idx" ON "tenant_api_keys"("key_prefix");

ALTER TABLE "tenant_api_keys" ADD CONSTRAINT "tenant_api_keys_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
