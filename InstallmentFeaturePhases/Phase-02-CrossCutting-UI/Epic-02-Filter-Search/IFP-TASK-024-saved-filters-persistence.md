# IFP-TASK-024: Saved Filters Persistence (StaffSavedFilter)

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 02 — Cross-Cutting UI |
| Epic | Epic-02-Filter-Search |
| ID | IFP-TASK-024 |
| Priority | P0 |
| Depends on | IFP-TASK-022 |
| Blocks | IFP-TASK-027 |
| Estimated | 10h |

---

## هدف

مدل **`StaffSavedFilter`** و CRUD API برای ذخیره فیلترهای دلخواه per staff — با soft delete، restore، و UI selector در FilterBuilder. هر فیلتر به یک `resourceKey` (مثلاً `customers`) محدود است.

---

## معیار پذیرش

- [ ] Prisma model `StaffSavedFilter` + migration
- [ ] Zod contracts: create, update, list response
- [ ] Use cases: create, update, list, soft delete, restore
- [ ] API: `GET/POST /api/v1/me/saved-filters`, `PATCH/DELETE /:id`, `POST /:id/restore`
- [ ] Permission: `core.saved_filter.manage` (own filters only)
- [ ] Unique: `(staffId, resourceKey, name)` where deletedAt null
- [ ] `isDefault` — max one default per (staffId, resourceKey)
- [ ] UI: dropdown «فیلترهای من» + save current + manage
- [ ] Load saved filter → apply AST to FilterBuilder
- [ ] Audit: `saved_filter.create|update|delete|restore`

---

## مشخصات فنی

### Prisma Model

```prisma
model StaffSavedFilter {
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

  tenantId     String    @map("tenant_id") @db.Uuid
  staffId      String    @map("staff_id") @db.Uuid
  resourceKey  String    @map("resource_key") // customers | sales | ...
  name         String    @db.VarChar(120)
  description  String?   @db.VarChar(500)
  filterAst    Json      @map("filter_ast") @db.JsonB
  isDefault    Boolean   @default(false) @map("is_default")
  visibility   String    @default("private") // private | shared (028 extends)

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Restrict)
  staff  Staff  @relation(fields: [staffId], references: [id], onDelete: Restrict)

  @@unique([staffId, resourceKey, name])
  @@index([tenantId, staffId, resourceKey])
  @@index([tenantId, resourceKey, visibility])
  @@map("staff_saved_filters")
}
```

### API Endpoints

**List:**
```http
GET /api/v1/me/saved-filters?resourceKey=customers
Authorization: Bearer ...
→ 200 { items: [{ id, name, resourceKey, filterAst, isDefault, createdAt }] }
```

**Create:**
```http
POST /api/v1/me/saved-filters
{
  "resourceKey": "customers",
  "name": "مشتریان معوق",
  "filterAst": { "root": { "type": "group", "logic": "and", "children": [...] } },
  "isDefault": false
}
→ 201 { id, ... }
```

**Update:**
```http
PATCH /api/v1/me/saved-filters/:id
{ "name": "...", "filterAst": {...}, "isDefault": true }
```

**Soft Delete:**
```http
DELETE /api/v1/me/saved-filters/:id
Body: { "deleteReason": "optional" }
→ 204
```

**Restore (owner / tenant owner):**
```http
POST /api/v1/me/saved-filters/:id/restore
→ 200 { ... }
```

### Guards

```typescript
@RequireAuth()
@RequirePermission('core.saved_filter.manage')
```

- `staffId` from JWT context — filter must belong to caller
- `tenantId` from JWT — cross-tenant 404

### Default Filter Logic

When `isDefault: true` on create/update:
- Transaction: unset other defaults for same `(staffId, resourceKey)`
- On page load: auto-apply default filter if no URL filter

### UI Component

```
apps/web/src/components/filter-builder/saved-filters-dropdown.tsx
```

- Save current: modal name + description
- List: click to apply
- Star icon for default
- Delete with confirm

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/infrastructure/persistence/prisma/schema/staff-saved-filter.prisma` |
| Create | `packages/infrastructure/persistence/repositories/staff-saved-filter.repository.ts` |
| Create | `packages/application/core/saved-filters/*.use-case.ts` |
| Create | `packages/contracts/src/core/saved-filter.schema.ts` |
| Create | `apps/api/src/modules/core/saved-filters/saved-filters.controller.ts` |
| Create | `apps/web/src/components/filter-builder/saved-filters-dropdown.tsx` |
| Update | `packages/infrastructure/persistence/prisma/schema.prisma` |

---

## مراحل پیاده‌سازی

1. Prisma model + migration
2. Repository (tenant-scoped, soft delete default)
3. Contracts Zod
4. Use cases + default unset transaction
5. Controller + permission seed
6. Audit log integration
7. Frontend dropdown + save modal
8. Auto-load default on list mount
9. Integration tests + RBAC

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Duplicate name | 409 `SAVED_FILTER_NAME_EXISTS` | Inline name error |
| Invalid filterAst | 400 `FILTER_INVALID` | Validation error |
| Update other's filter | 404 | Not found |
| Delete default | 204 | No auto-default until user sets new |
| Max saved filters per staff | 403 `PLAN_LIMIT_EXCEEDED` | Toast + upgrade hint |
| Restore name conflict | 409 | Prompt rename |

---

## تست

- [ ] Integration: CRUD happy path
- [ ] Integration: soft delete + restore
- [ ] Integration: only one isDefault
- [ ] Integration: cross-tenant access 404
- [ ] RBAC: deny without permission
- [ ] Unit: filterAst validation on create

---

## UX

- [ ] Save modal: name required, description optional
- [ ] Confirm delete: «فیلتر «{name}» حذف شود؟»
- [ ] Toast on apply saved filter
- [ ] Excellence §5 form on save modal

---

## Flow

```
User builds filter → «ذخیره فیلتر» → name → POST
  → appears in dropdown
Load page → GET defaults → apply if exists
Select from dropdown → apply AST → refetch
Delete → soft delete → removed from list
```

---

## Policy Alignment

- [ ] EXCELLENCE-STANDARDS §8 base fields
- [ ] SOFT-DELETE-POLICY — soft delete + restore
- [ ] ADR-013 — no hard delete
- [ ] ADR-004 — `core.saved_filter.manage`

---

## مراجع

- `IFP-TASK-022-advanced-filter-builder.md`
- `docs/09-development/SOFT-DELETE-POLICY.md`
- `Phases/Phase-0-Foundation/Epic-04-Database/README.md`

---

## Self-Review Score

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata | /10 | 10 | |
| Completeness | /25 | 25 | Full schema + API |
| Policy | /25 | 25 | Soft delete complete |
| Executability | /25 | 25 | |
| Alignment | /15 | 15 | |
| **جمع** | **/100** | **100** | ≥95 ✅ |
