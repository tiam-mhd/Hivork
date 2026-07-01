# IFP-TASK-028: View Sharing Within Tenant (Optional)

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 02 — Cross-Cutting UI |
| Epic | Epic-04-Saved-Views |
| ID | IFP-TASK-028 |
| Priority | P1 |
| Depends on | IFP-TASK-027 |
| Blocks | — |
| Estimated | 8h |

---

## هدف

**اشتراک‌گذاری نما (View)** و فیلتر ذخیره‌شده within tenant — staff دیگر می‌تواند نماهای `visibility: shared` را ببیند و اعمال کند، بدون امکان ویرایش مگر مالک یا tenant owner. اختیاری (P1) برای همکاری تیمی.

---

## معیار پذیرش

- [ ] `visibility` enum: `private` | `shared` on `StaffSavedView` و `StaffSavedFilter`
- [ ] API: `PATCH` set visibility — only owner or `core.saved_view.share`
- [ ] List endpoint returns: `mine` + `shared` sections
- [ ] Shared views read-only for non-owners — «استفاده» only
- [ ] Fork shared view → create copy as private (`POST .../fork`)
- [ ] UI: share toggle in view manage dialog
- [ ] UI: «نماهای مشترک تیم» section in ViewSelector
- [ ] Owner delete shared view → disappears for all — soft delete
- [ ] Audit: `saved_view.share|unshare|fork`
- [ ] Plan gate: sharing may require Pro plan — `403 PLAN_FEATURE_LOCKED`

---

## مشخصات فنی

### Permission

| Permission | Who |
|------------|-----|
| `core.saved_view.manage` | Own views CRUD |
| `core.saved_view.share` | Set visibility shared (owner, manager) |
| `core.saved_view.use_shared` | Apply team shared views (all staff) |

### List Response Shape

```json
{
  "mine": [{ "id", "name", "isDefault", "visibility": "private" }],
  "shared": [{ "id", "name", "ownerName": "علی", "visibility": "shared" }]
}
```

```http
GET /api/v1/me/saved-views?resourceKey=customers&includeShared=true
```

### Fork Endpoint

```http
POST /api/v1/me/saved-views/:id/fork
{ "name": "کپی نمای مالی" }
→ 201 { id, ... private copy }
```

- Copies `columnState`, `sort`, `savedFilterId` (or embeds filter copy if filter private)

### Share Filter Dependency

If view references private filter owned by another staff:
- Fork copies filter AST into new `StaffSavedFilter` for forker
- Or block share until filter also shared — **chosen: auto-copy filter on share view**

### Update Visibility

```http
PATCH /api/v1/me/saved-views/:id
{ "visibility": "shared" }
```

Validation:
- Owner only (or tenant owner override)
- Name unique among shared views per resourceKey recommended not required

### UI Share Dialog

```
┌─ اشتراک نما ─────────────────┐
│ ○ خصوصی (فقط من)             │
│ ● مشترک در تیم               │
│   کارمندان می‌توانند استفاده │
│   کنند اما ویرایش نمی‌کنند.  │
│ [ذخیره]                      │
└──────────────────────────────┘
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Update | `packages/application/core/saved-views/*.use-case.ts` — share, fork, list shared |
| Update | `packages/contracts/src/core/saved-view.schema.ts` — visibility enum |
| Update | `apps/api/src/modules/core/saved-views/saved-views.controller.ts` |
| Create | `apps/web/src/components/data-table/view-share-dialog.tsx` |
| Update | `apps/web/src/components/data-table/view-selector.tsx` — shared section |
| Update | seed permissions |

---

## مراحل پیاده‌سازی

1. Visibility enum + migration if needed (default private)
2. List query includes shared from same tenant
3. Share/unshare use case + permission
4. Fork use case + filter copy logic
5. UI share dialog + shared section
6. Plan entitlement check (optional)
7. Audit events
8. Integration tests

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Non-owner PATCH shared view | 403 | Read-only badge |
| Share without permission | 403 | Hide share toggle |
| Fork duplicate name | 409 | Suggest «کپی {name}» |
| Owner staff deleted | — | Shared views remain; ownerName «کاربر حذف‌شده» |
| Filter AST invalid on shared | — | Block apply + admin alert |

---

## تست

- [ ] Integration: share → visible to other staff same tenant
- [ ] Integration: not visible cross-tenant
- [ ] Integration: fork creates private copy
- [ ] RBAC: share permission deny
- [ ] Integration: non-owner cannot delete shared view

---

## UX

- [ ] Badge «مشترک» on shared views
- [ ] Tooltip owner name
- [ ] Fork action «ذخیره نسخه شخصی»
- [ ] P1 — can ship after 027 without blocking Phase 03

---

## Flow

```
Owner: Manage view → Share → visibility shared
Other staff: ViewSelector → Team views → Apply (read-only)
Fork → editable private copy
Unshare → private → hidden from team list
```

---

## Policy Alignment

- [ ] ADR-004 — share permissions
- [ ] SOFT-DELETE-POLICY — shared view soft delete
- [ ] Tenant isolation — shared within tenantId only

---

## مراجع

- `IFP-TASK-027-saved-views-crud-api.md`
- `docs/02-architecture/rbac.md`

---

## Self-Review Score

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata | /10 | 10 | P1 explicit |
| Completeness | /25 | 24 | |
| Policy | /25 | 24 | |
| Executability | /25 | 24 | |
| Alignment | /15 | 15 | |
| **جمع** | **/100** | **97** | ≥95 ✅ |
