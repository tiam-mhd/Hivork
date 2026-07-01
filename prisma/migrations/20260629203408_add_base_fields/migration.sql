-- Migration: add_base_fields
-- Adds missing audit fields (createdById, updatedById, deletedById, deleteReason, metadata)
-- to Plan, Subscription, Permission, Role, GlobalCustomer.
-- Adds updatedAt + updatedById to UserPermissionOverride.
-- All base fields required by EXCELLENCE-STANDARDS §2.1 + SOFT-DELETE-POLICY.

-- Plan: add createdById, updatedById, deletedById, deleteReason
ALTER TABLE "plans" ADD COLUMN "created_by_id" UUID;
ALTER TABLE "plans" ADD COLUMN "updated_by_id" UUID;
ALTER TABLE "plans" ADD COLUMN "deleted_by_id" UUID;
ALTER TABLE "plans" ADD COLUMN "delete_reason" TEXT;

-- Subscription: add createdById, updatedById, deletedById, deleteReason
ALTER TABLE "subscriptions" ADD COLUMN "created_by_id" UUID;
ALTER TABLE "subscriptions" ADD COLUMN "updated_by_id" UUID;
ALTER TABLE "subscriptions" ADD COLUMN "deleted_by_id" UUID;
ALTER TABLE "subscriptions" ADD COLUMN "delete_reason" TEXT;

-- Permission: add createdById, updatedById, deletedById, metadata
ALTER TABLE "permissions" ADD COLUMN "created_by_id" UUID;
ALTER TABLE "permissions" ADD COLUMN "updated_by_id" UUID;
ALTER TABLE "permissions" ADD COLUMN "deleted_by_id" UUID;
ALTER TABLE "permissions" ADD COLUMN "metadata" JSONB;

-- Role: add createdById, updatedById
ALTER TABLE "roles" ADD COLUMN "created_by_id" UUID;
ALTER TABLE "roles" ADD COLUMN "updated_by_id" UUID;

-- GlobalCustomer: add createdById, updatedById
ALTER TABLE "global_customers" ADD COLUMN "created_by_id" UUID;
ALTER TABLE "global_customers" ADD COLUMN "updated_by_id" UUID;

-- UserPermissionOverride: add updatedAt, updatedById
ALTER TABLE "user_permission_overrides" ADD COLUMN "updated_by_id" UUID;
ALTER TABLE "user_permission_overrides" ADD COLUMN "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
