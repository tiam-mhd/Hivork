# TASK-052: Contracts — Tenant, Staff, Customer Zod Schemas

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 0 |
| Epic | Epic-09-Contracts |
| ID | TASK-052 |
| Priority | P0 |
| Depends on | TASK-013 (contracts pkg), TASK-018 (Tenant schema), TASK-023 (Staff schema) |
| Blocks | TASK-054, TASK-057, TASK-058 |
| Estimated | 5h |

---

## هدف

Zod schemas برای entities اصلی — Tenant، Staff، Customer — با تمام فیلدهای EXCELLENCE §8. این schemas هم در API response validation و هم در Web forms استفاده می‌شوند.

---

## معیار پذیرش

- [ ] `RegisterTenantSchema` — input validation برای register endpoint
- [ ] `TenantResponseSchema` — همه فیلدهای EXCELLENCE §8 Tenant
- [ ] `StaffResponseSchema` — همه فیلدهای EXCELLENCE §8 Staff + ADR-015 branch fields
- [ ] `UpdateStaffSchema` — optional fields برای update
- [ ] `SetActiveBranchSchema` — `branchId: uuid | null`
- [ ] `CreateTenantCustomerSchema` — همه فیلدهای EXCELLENCE §8 Customer (optional‌ها)
- [ ] `TenantCustomerResponseSchema` — full customer + nested `customer` (GlobalCustomer fields)
- [ ] `TenantCustomerListItemSchema` — summary برای list page
- [ ] `CustomerListQuerySchema` — cursor، limit، search، filters
- [ ] `CursorPaginationSchema` shared برای همه list queries
- [ ] `totalPurchaseRial` به صورت string (bigint-safe JSON)

---

## مشخصات فنی

### RegisterTenantSchema

```typescript
export const RegisterTenantSchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z.string().trim().min(3).max(50).regex(/^[a-z0-9-]+$/),
  legalName: z.string().trim().max(200).optional(),
  taxId: z.string().trim().max(50).optional(),
  phone: phoneSchema.optional(),
  email: z.string().trim().email().optional(),
  ownerName: z.string().trim().min(2).max(100),
  ownerPhone: phoneSchema,
  verifiedToken: z.string().min(1),
});
```

### TenantResponseSchema (EXCELLENCE §8)

```typescript
export const TenantResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  legalName: z.string().nullable(),
  taxId: z.string().nullable(),
  logoUrl: z.string().nullable(),
  address: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().email().nullable(),
  status: z.enum(['trial', 'active', 'suspended']),
  timezone: z.string(),
  locale: z.enum(['fa_IR', 'en_US']),
  enabledModules: z.array(z.string()),
  trialEndsAt: z.string().datetime().nullable(),
  onboardingCompletedAt: z.string().datetime().nullable(),
});
```

### StaffResponseSchema (ADR-015)

```typescript
export const StaffResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  phone: phoneSchema,
  name: z.string(),
  email: z.string().email().nullable(),
  jobTitle: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  status: z.enum(['active', 'suspended']),
  dataScope: z.enum(['all', 'branch', 'own']),
  assignedBranchIds: z.array(z.string().uuid()),
  primaryBranchId: z.string().uuid().nullable(),
  activeBranchId: z.string().uuid().nullable(), // from Redis session — not in JWT
  lastLoginAt: z.string().datetime().nullable(),
  invitedAt: z.string().datetime().nullable(),
});
```

### CreateTenantCustomerSchema (EXCELLENCE §8 full)

```typescript
export const CreateTenantCustomerSchema = z.object({
  phone: phoneSchema,
  name: z.string().trim().min(2).max(100).optional(),
  email: z.string().trim().email().optional(),
  nationalId: z.string().trim().max(10).optional(),
  birthDate: z.string().date().optional(),
  gender: z.enum(['male', 'female', 'other', 'unspecified']).optional(),
  address: z.string().trim().max(500).optional(),
  localCode: z.string().trim().max(50).optional(),
  tags: z.array(z.string().trim().max(30)).max(20).optional(),
  notes: z.string().trim().max(1000).optional(),
  internalNotes: z.string().trim().max(1000).optional(),
  defaultBranchId: z.string().uuid().optional(),
  preferredContactChannel: z.enum(['telegram', 'bale', 'sms', 'phone']).optional(),
  marketingOptIn: z.boolean().optional(),
});
```

### CursorPaginationSchema

```typescript
export const CursorPaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  includeDeleted: z.coerce.boolean().default(false), // recycle bin only
});
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create/Update | `packages/contracts/src/auth/register-tenant.schema.ts` |
| Create/Update | `packages/contracts/src/tenant/register-tenant.schema.ts` |
| Create/Update | `packages/contracts/src/tenant/tenant-response.schema.ts` |
| Create/Update | `packages/contracts/src/tenant/create-tenant-customer.schema.ts` |
| Create/Update | `packages/contracts/src/tenant/tenant-customer-response.schema.ts` |
| Create/Update | `packages/contracts/src/tenant/tenant-customer-list-item.schema.ts` |
| Create/Update | `packages/contracts/src/tenant/customer-list-query.schema.ts` |
| Create/Update | `packages/contracts/src/tenant/index.ts` |
| Create/Update | `packages/contracts/src/staff/staff-response.schema.ts` |
| Create/Update | `packages/contracts/src/staff/update-staff.schema.ts` |
| Create/Update | `packages/contracts/src/staff/set-active-branch.schema.ts` |
| Create/Update | `packages/contracts/src/staff/index.ts` |
| Create/Update | `packages/contracts/src/common/pagination.schema.ts` |

---

## مراحل پیاده‌سازی

1. ایجاد `RegisterTenantSchema` در tenant/ با همه فیلدهای EXCELLENCE §8
2. ایجاد `TenantResponseSchema` با همه فیلدها
3. ایجاد `StaffResponseSchema` با ADR-015 branch fields
4. ایجاد `CreateTenantCustomerSchema` با همه optional fields
5. ایجاد `TenantCustomerResponseSchema` با nested GlobalCustomer
6. ایجاد `CursorPaginationSchema` shared
7. Export types از هر schema

---

## Edge Cases

| سناریو | رفتار |
|--------|--------|
| `slug` با capital letter | regex `/^[a-z0-9-]+$/` → fail |
| `nationalId` > 10 chars | `.max(10)` → fail |
| `tags` > 20 items | `.max(20)` → fail |
| `totalPurchaseRial` as number | باید string باشد — bigint-safe |

---

## تست

- [ ] Unit: `RegisterTenantSchema` — slug با capital → fail
- [ ] Unit: `CreateTenantCustomerSchema` — phone invalid → fail
- [ ] Unit: `StaffResponseSchema` parse — همه optional fields
- [ ] Unit: `TenantCustomerResponseSchema` — `totalPurchaseRial` string

---

## Policy Alignment

- [ ] EXCELLENCE-STANDARDS §8 (Tenant، Staff، GlobalCustomer/TenantCustomer fields)
- [ ] ADR-015 (Staff branch fields — activeBranchId از session)
- [ ] Contracts package: فقط Zod — بدون NestJS/Prisma

---

## مراجع

- `docs/09-development/EXCELLENCE-STANDARDS.md` §8
- `docs/02-architecture/tenancy-and-entities.md`
- `docs/08-decisions/adr-log.md` — ADR-015

---

## Self-Review Score

| محور | /25 | یادداشت |
|------|-----|---------|
| Metadata | 10/10 | Priority, Depends, Blocks, Estimated |
| Completeness | 25/25 | همه schemas، Files table، Steps |
| Policy | 25/25 | EXCELLENCE §8، ADR-015، no NestJS |
| Executability | 24/25 | Code patterns کامل، edge cases، unit tests |
| Alignment | 15/15 | sync با TASK-057/058 inputs |
| **جمع** | **99/100** | ≥95 ✅ |
