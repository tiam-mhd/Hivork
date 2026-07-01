# Epic-04 — Database

> **قبل از TASK-017:** [`EXCELLENCE-STANDARDS.md`](../../../docs/09-development/EXCELLENCE-STANDARDS.md) §2

## Prisma Base Fields (همه جداول business)

```prisma
// الگوی اجباری — در هر model تکرار یا @@map mixin comment
id           String    @id @default(uuid()) @db.Uuid
createdAt    DateTime  @default(now()) @map("created_at") @db.Timestamptz
updatedAt    DateTime  @updatedAt @map("updated_at") @db.Timestamptz
createdById  String?   @map("created_by_id") @db.Uuid
updatedById  String?   @map("updated_by_id") @db.Uuid
deletedAt    DateTime? @map("deleted_at") @db.Timestamptz
deletedById  String?   @map("deleted_by_id") @db.Uuid
deleteReason String?   @map("delete_reason")
version      Int       @default(1)
metadata     Json?     @db.JsonB
```

TASK-017 تا TASK-026: base fields + **soft delete fields** — [`SOFT-DELETE-POLICY.md`](../../../docs/09-development/SOFT-DELETE-POLICY.md)

**استثناها (append-only بدون soft delete):**
- `AuditLog` (TASK-024) — فقط `createdAt`
- `OutboxEvent` (TASK-026) — فقط `createdAt`

## Branch model (ADR-015 — اجباری قبل از Epic-04)

| Rule | TASK‌ها |
|------|---------|
| `Staff.assignedBranchIds` + `primaryBranchId` | 020, 031, 052 |
| `assignedBranchIds` validate same tenant | 020, 031, 057 |
| `TenantCustomer.defaultBranchId` FK | 023 |
| Exactly one default branch / tenant | 019, 030, 057 |
| Active branch session (not JWT) | 038, 041, contracts در 052 |
| `buildDataScopeFilter` + `effectiveBranchIds` | 045 |
| `Sale.branchId NOT NULL` + index | installments domain · migration فاز 1 |

مرجع کامل: [`tenancy-and-entities.md`](../../../docs/02-architecture/tenancy-and-entities.md) § Branch

## Prisma Soft Delete Extension (TASK-046)

- `prisma-soft-delete.extension.ts` — filter reads, block `delete()`
- CI: no `.delete(` on business models

## Tasks

| ID | فایل | عنوان | Priority | Depends | Blocks |
|----|------|--------|----------|---------|--------|
| 017 | TASK-017-prisma-platform-user.md | PlatformUser | P0 | 002, 012 | 027, 028 |
| 018 | TASK-018-prisma-tenant-plan.md | Tenant, Plan, Subscription | P0 | 017 | 019, 027, 028, 057 |
| 019 | TASK-019-prisma-branch.md | Branch | P0 | 018 | 027, 030, 057 |
| 019a | TASK-019a-prisma-user.md | User (platform identity) | P0 | 017 | 020, 022, 027, 035 |
| 020 | TASK-020-prisma-staff.md | Staff | P0 | 018, 019a, 021 | 027, 031, 035, 041 |
| 021 | TASK-021-prisma-rbac.md | Role, Permission, RBAC | P0 | 018 | 027, 028, 034, 041, 057 |
| 022 | TASK-022-prisma-global-customer.md | GlobalCustomer, BotIdentity | P0 | 017, 019a | 023, 027, 032, 035 |
| 023 | TASK-023-prisma-tenant-customer.md | TenantCustomer | P0 | 018, 022 | 027, 033, 054, 058 |
| 024 | TASK-024-prisma-audit-log.md | AuditLog | P0 | 018 | 027, 047 |
| 025 | TASK-025-prisma-settings.md | TenantSetting, BranchSetting | P0 | 018, 019 | 027, 048 |
| 026 | TASK-026-prisma-outbox.md | OutboxEvent | P0 | 018 | 027, 050 |
| 027 | TASK-027-prisma-migration.md | Initial Migration | P0 | 017-026 | 028, 029+ |
| 028 | TASK-028-prisma-seed.md | Database Seed | P0 | 027, 059 | 054, 057 |

## Dependency (داخل Epic)

```
017 → 019a → 020
017 → 018 → 019 → 027
             ↓         ↓
            020        028
             ↓
            021 → 034
             ↓
        022 → 023 → 024 → 025 → 026
```

## Policy

- همه task‌ها: [`EXCELLENCE-STANDARDS.md`](../../../docs/09-development/EXCELLENCE-STANDARDS.md) §2
- Soft delete: [`SOFT-DELETE-POLICY.md`](../../../docs/09-development/SOFT-DELETE-POLICY.md)
- AuditLog + OutboxEvent: append-only — بدون soft delete fields
- هیچ `onDelete: Cascade` روی business FK
