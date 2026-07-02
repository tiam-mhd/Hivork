-- IFP-069 — Sale header tax rate/inclusive + insurance expiry (additive)

ALTER TABLE "sales" ADD COLUMN "insurance_expires_at" DATE;
ALTER TABLE "sales" ADD COLUMN "tax_rate_bps" INTEGER;
ALTER TABLE "sales" ADD COLUMN "tax_inclusive" BOOLEAN NOT NULL DEFAULT false;
