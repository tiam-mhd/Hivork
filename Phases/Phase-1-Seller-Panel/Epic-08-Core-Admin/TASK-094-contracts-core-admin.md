# TASK-094: Contracts — Core Admin Zod

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 1 |
| Epic | Epic-08-Core-Admin |
| ID | TASK-094 |
| Priority | P0 |
| Depends on | TASK-052 |
| Blocks | TASK-095, TASK-096, TASK-097 |
| Estimated | 6h |

---

## هدف

Zod schemas برای Branch، Staff، Role، Permission Override — 100% هم‌تراز با API tasks 095–097 و EXCELLENCE §8. `phoneSchema` از shared. bigint as string documented.

---

## معیار پذیرش

- [ ] `CreateBranchSchema`, `UpdateBranchSchema`, `BranchResponseSchema`, `BranchListQuerySchema`
- [ ] `CreateStaffSchema`, `UpdateStaffSchema`, `StaffResponseSchema`, `StaffListQuerySchema`
- [ ] `CreateRoleSchema`, `UpdateRoleSchema`, `RoleResponseSchema`
- [ ] `AssignRoleSchema`, `PermissionOverrideSchema`
- [ ] All list queries use `CursorPaginationSchema`
- [ ] Permission strings validated against known set (optional refine)
- [ ] Export from `packages/contracts/src/core/index.ts`

---

## Schemas

### Branch

```typescript
export const CreateBranchSchema = z.object({
  name: z.string().trim().min(2).max(100),
  address: z.string().trim().max(500).optional(),
  phone: phoneSchema.optional(),
  isActive: z.boolean().optional(),
});

export const BranchResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  address: z.string().nullable(),
  phone: z.string().nullable(),
  isDefault: z.boolean(),
  isActive: z.boolean(),
  version: z.number().int(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
```

### Staff

```typescript
export const CreateStaffSchema = z.object({
  phone: phoneSchema,
  name: z.string().trim().min(2).max(100),
  email: z.string().email().optional(),
  jobTitle: z.string().trim().max(100).optional(),
  dataScope: z.enum(['all', 'branch', 'own']),
  assignedBranchIds: z.array(z.string().uuid()).optional(),
  primaryBranchId: z.string().uuid().optional(),
  roleIds: z.array(z.string().uuid()).optional(),
});

export const StaffResponseSchema = z.object({
  id: z.string().uuid(),
  phone: phoneSchema,
  name: z.string(),
  email: z.string().nullable(),
  jobTitle: z.string().nullable(),
  status: z.enum(['active', 'suspended']),
  dataScope: z.enum(['all', 'branch', 'own']),
  assignedBranchIds: z.array(z.string().uuid()),
  primaryBranchId: z.string().uuid().nullable(),
  roles: z.array(z.object({ code: z.string(), name: z.string() })),
  lastLoginAt: z.string().datetime().nullable(),
  version: z.number().int(),
  createdAt: z.string().datetime(),
});
```

### Role

```typescript
export const CreateRoleSchema = z.object({
  code: z.string().trim().min(2).max(50).regex(/^[a-z0-9_]+$/),
  name: z.string().trim().min(2).max(100),
  permissions: z.array(z.string()).min(1),
  dataScope: z.enum(['all', 'branch', 'own']),
});

export const RoleResponseSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  isSystem: z.boolean(),
  permissions: z.array(z.string()),
  dataScope: z.enum(['all', 'branch', 'own']),
  createdAt: z.string().datetime(),
});
```

### Permission Override

```typescript
export const CreatePermissionOverrideSchema = z.object({
  permission: z.string().min(1),
  effect: z.enum(['grant', 'deny']),
  reason: z.string().trim().min(5).max(500),
  expiresAt: z.string().datetime().optional(),
});
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/contracts/src/core/branch.schema.ts` |
| Create | `packages/contracts/src/core/staff-admin.schema.ts` |
| Create | `packages/contracts/src/core/role.schema.ts` |
| Create | `packages/contracts/src/core/permission-override.schema.ts` |
| Update | `packages/contracts/src/core/index.ts` |

---

## مراحل پیاده‌سازی

1. Extend TASK-052 patterns
2. Reuse `phoneSchema`, `CursorPaginationSchema`
3. Add version field where optimistic lock needed
4. Unit tests: valid/invalid payloads
5. OpenAPI generation compatibility

---

## Edge Cases & Validation

| Field | Rule |
|-------|------|
| role code | no reserved: owner, manager, cashier, viewer |
| assignedBranchIds | max 50 branches |
| permissions array | dedupe on parse |

---

## تست

- [ ] Unit: each schema valid sample passes
- [ ] Unit: invalid phone fails
- [ ] Unit: override reason < 5 chars fails

---

## Policy Alignment

- [ ] EXCELLENCE-STANDARDS §8
- [ ] 100% sync with API tasks 095–097

---

## مراجع

- `Phases/Phase-0-Foundation/Epic-09-Contracts/TASK-052-contracts-tenant-staff.md`
- `docs/02-architecture/api-contracts.md` §4

---

## Self-Review Score

| محور | سقف | امتیاز |
|------|-----|--------|
| Metadata | 10 | 10 |
| Completeness | 25 | 25 |
| Policy | 25 | 25 |
| Executability | 25 | 25 |
| Alignment | 15 | 15 |
| **جمع** | **100** | **100** |
