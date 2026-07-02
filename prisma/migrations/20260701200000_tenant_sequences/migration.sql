-- IFP-074 — atomic tenant-scoped sequences (contract numbering)

CREATE TABLE "tenant_sequences" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "sequence_key" TEXT NOT NULL,
    "next_value" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "tenant_sequences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tenant_sequences_tenant_id_sequence_key_key"
  ON "tenant_sequences" ("tenant_id", "sequence_key");

CREATE INDEX "tenant_sequences_tenant_id_idx" ON "tenant_sequences" ("tenant_id");

ALTER TABLE "tenant_sequences"
  ADD CONSTRAINT "tenant_sequences_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
