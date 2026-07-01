-- IFP-TASK-005: UserMfaTotp for platform TOTP MFA

CREATE TABLE "user_mfa_totp" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "secret_encrypted" TEXT NOT NULL,
    "enabled_at" TIMESTAMPTZ,
    "last_used_at" TIMESTAMPTZ,
    "backup_codes_hash" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "deleted_at" TIMESTAMPTZ,
    "deleted_by_id" UUID,
    "delete_reason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,

    CONSTRAINT "user_mfa_totp_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_mfa_totp_user_id_key" ON "user_mfa_totp"("user_id");

CREATE INDEX "user_mfa_totp_enabled_at_idx" ON "user_mfa_totp"("enabled_at");

ALTER TABLE "user_mfa_totp" ADD CONSTRAINT "user_mfa_totp_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
