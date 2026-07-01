-- IFP-TASK-010: last login device snapshot on Staff + User IP

ALTER TABLE "staff"
  ADD COLUMN "last_login_ip" VARCHAR(45),
  ADD COLUMN "last_login_device_label" VARCHAR(120),
  ADD COLUMN "previous_login_at" TIMESTAMPTZ,
  ADD COLUMN "previous_login_ip" VARCHAR(45),
  ADD COLUMN "previous_login_device_label" VARCHAR(120);

ALTER TABLE "users"
  ADD COLUMN "last_login_ip" VARCHAR(45);
