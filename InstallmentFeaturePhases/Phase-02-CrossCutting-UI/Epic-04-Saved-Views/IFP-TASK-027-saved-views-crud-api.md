# IFP-TASK-027: Saved Views (StaffSavedView Schema + CRUD API)

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 02 — Cross-Cutting UI |
| Epic | Epic-04-Saved-Views |
| ID | IFP-TASK-027 |
| Priority | P0 |
| Depends on | IFP-TASK-019, IFP-TASK-021, IFP-TASK-022, IFP-TASK-024 |
| Blocks | IFP-TASK-028, IFP Phase 03+ view selector |
| Estimated | 12h |

---

## هدف

مدل **`StaffSavedView`** — ترکیب ستون‌ها (از IFP-TASK-021)، sort، و اختیاری `savedFilterId` — با CRUD API و UI **ViewSelector** در toolbar DataTable. نما جایگزین دستی تنظیم ستون/فیلتر برای کاربران حرفه‌ای است.

---

## معیار پذیرش

- [ ] Prisma `StaffSavedView` + migration
- [ ] Zod contracts + use cases (CRUD, soft delete, restore)
- [ ] API: `/api/v1/me/saved-views` mirror saved-filters pattern
- [ ] Permission: `core.saved_view.manage`
- [ ] View payload: `columnState`, `sortBy`, `sortDir`, `savedFilterId?`, `search?`
- [ ] `isDefault` — one per (staffId, resourceKey)
- [ ] UI: ViewSelector dropdown — switch view, save current, rename, delete
- [ ] Apply view → updates columns, filter, sort, search → refetch
- [ ] «ذخیره به‌عنوان نمای جدید» from current state
- [ ] Audit: `saved_view.create|update|delete|restore`
- [ ] Sync: applying view updates localStorage column state (IFP-TASK-021)

---

## مشخصات فنی

### Prisma Model

```prisma
model StaffSavedView {
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

  tenantId       String  @map("tenant_id") @db.Uuid
  staffId        String  @map("staff_id") @db.Uuid
  resourceKey    String  @map("resource_key")
  name           String  @db.VarChar(120)
  description    String? @db.VarChar(500)
  columnState    Json    @map("column_state") @db.JsonB  // ColumnPersonalization
  sortBy         String? @map("sort_by")
  sortDir        String? @map("sort_dir")
  search         String? @db.VarChar(200)
  savedFilterId  String? @map("saved_filter_id") @db.Uuid
  isDefault      Boolean @default(false) @map("is_default")
  visibility     String  @default("private") // private | shared

  tenant      Tenant            @relation(fields: [tenantId], references: [id], onDelete: Restrict)
  staff       Staff             @relation(fields: [staffId], references: [id], onDelete: Restrict)
  savedFilter StaffSavedFilter? @relation(fields: [savedFilterId], references: [id], onDelete: Restrict)

  @@unique([staffId, resourceKey, name])
  @@index([tenantId, staffId, resourceKey])
  @@map("staff_saved_views")
}
```

### View State Schema

```typescript
// packages/contracts/src/core/saved-view.schema.ts
export const SavedViewStateSchema = z.object({
  columnState: ColumnPersonalizationSchema,
  sortBy: z.string().optional(),
  sortDir: DataTableSortDirSchema.optional(),
  search: z.string().max(200).optional(),
  savedFilterId: z.string().uuid().optional(),
});
```

### API

```http
GET /api/v1/me/saved-views?resourceKey=customers
POST /api/v1/me/saved-views
PATCH /api/v1/me/saved-views/:id
DELETE /api/v1/me/saved-views/:id
POST /api/v1/me/saved-views/:id/restore
```

**Create example:**
```json
{
  "resourceKey": "customers",
  "name": "نمای مالی",
  "columnState": { "order": ["displayName", "balanceRial"], "visibility": { "phone": false } },
  "sortBy": "balanceRial",
  "sortDir": "desc",
  "savedFilterId": "uuid-optional",
  "isDefault": false
}
```

### ViewSelector UI

```
apps/web/src/components/data-table/view-selector.tsx
```

```
┌─ نماها ──────────────────┐
│ ● همه مشتریان (پیش‌فرض)  │
│ ○ نمای مالی              │
│ ○ معوقات                 │
├──────────────────────────┤
│ + ذخیره نمای فعلی        │
│ مدیریت نماها…            │
└──────────────────────────┘
```

### useSavedViews Hook

```typescript
export function useSavedViews(resourceKey: string) {
  // fetch views, applyView, saveCurrentView, setDefault
}
```

### Apply View Sequence

1. Set column state → localStorage + table
2. Load savedFilter by id if present → FilterBuilder
3. Set search input
4. Set sort → query
5. Reset cursor → refetch

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/infrastructure/persistence/prisma/schema/staff-saved-view.prisma` |
| Create | `packages/infrastructure/persistence/repositories/staff-saved-view.repository.ts` |
| Create | `packages/application/core/saved-views/*.use-case.ts` |
| Create | `packages/contracts/src/core/saved-view.schema.ts` |
| Create | `apps/api/src/modules/core/saved-views/saved-views.controller.ts` |
| Create | `apps/web/src/components/data-table/view-selector.tsx` |
| Create | `apps/web/src/hooks/use-saved-views.ts` |

---

## مراحل پیاده‌سازی

1. Prisma model + FK to StaffSavedFilter
2. Repository + use cases
3. API controller + permission seed
4. ViewSelector UI
5. useSavedViews + apply logic
6. Save current view modal
7. Default view on mount (priority: URL > default view > system default)
8. Audit
9. Integration + RBAC tests

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| savedFilterId deleted | — | Apply view without filter + warning toast |
| Invalid columnState | 400 | Validation error |
| Duplicate name | 409 `SAVED_VIEW_NAME_EXISTS` | |
| Column ids deprecated | — | Merge with defaults (same as 021) |
| Update while offline | — | Queue retry (optional) |

---

## تست

- [ ] Integration: CRUD + restore
- [ ] Integration: apply view changes list query
- [ ] Integration: default uniqueness
- [ ] RBAC: deny without permission
- [ ] Component: view switch refetches data

---

## UX

- [ ] Save modal: name, description, set as default checkbox
- [ ] Visual indicator for active view in toolbar
- [ ] Excellence §5 on save modal

---

## Flow

```
Page load → load default view OR system defaults
User switches view → apply state → refetch
User tweaks columns/filter → «ذخیره نما» → POST
Manage → rename/delete/default
```

---

## Policy Alignment

- [ ] SOFT-DELETE-POLICY
- [ ] EXCELLENCE §8 base fields
- [ ] ADR-004 — `core.saved_view.manage`
- [ ] onDelete: Restrict on FKs

---

## مراجع

- `IFP-TASK-021-column-personalization-drag-drop.md`
- `IFP-TASK-024-saved-filters-persistence.md`
- `docs/01-product/installment-module-features.md` — ذخیره نما

---

## Self-Review Score

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata | /10 | 10 | |
| Completeness | /25 | 25 | |
| Policy | /25 | 25 | |
| Executability | /25 | 25 | |
| Alignment | /15 | 15 | |
| **جمع** | **/100** | **100** | ≥95 ✅ |
