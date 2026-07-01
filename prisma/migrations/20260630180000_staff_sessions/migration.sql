-- IFP-TASK-008: StaffSession for active staff login tracking

CREATE TYPE "session_status" AS ENUM ('active', 'revoked', 'expired');

CREATE TABLE "staff_sessions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "staff_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "refresh_token_hash" VARCHAR(64) NOT NULL,
    "device_id" VARCHAR(36),
    "device_fingerprint" VARCHAR(128),
    "device_label" VARCHAR(120),
    "user_agent" TEXT,
    "ip_address" VARCHAR(45),
    "remember_me" BOOLEAN NOT NULL DEFAULT false,
    "status" "session_status" NOT NULL DEFAULT 'active',
    "last_active_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "revoked_at" TIMESTAMPTZ,
    "revoked_by_id" UUID,
    "revoke_reason" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by_id" UUID,
    "delete_reason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,

    CONSTRAINT "staff_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "staff_sessions_refresh_token_hash_key" ON "staff_sessions"("refresh_token_hash");

CREATE INDEX "staff_sessions_tenant_id_staff_id_status_idx" ON "staff_sessions"("tenant_id", "staff_id", "status");

CREATE INDEX "staff_sessions_tenant_id_staff_id_revoked_at_idx" ON "staff_sessions"("tenant_id", "staff_id", "revoked_at");

CREATE INDEX "staff_sessions_expires_at_idx" ON "staff_sessions"("expires_at");

CREATE INDEX "staff_sessions_user_id_idx" ON "staff_sessions"("user_id");

ALTER TABLE "staff_sessions" ADD CONSTRAINT "staff_sessions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "staff_sessions" ADD CONSTRAINT "staff_sessions_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "staff_sessions" ADD CONSTRAINT "staff_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
