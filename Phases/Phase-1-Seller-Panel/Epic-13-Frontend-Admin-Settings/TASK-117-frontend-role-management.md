# TASK-117: Frontend — Role Management

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 1 |
| Epic | Epic-13-Frontend-Admin-Settings |
| ID | TASK-117 |
| Priority | P0 |
| Depends on | TASK-106, TASK-107, TASK-108, TASK-109, TASK-097, TASK-094 |
| Blocks | TASK-116, TASK-123 |
| Estimated | 14h |

---

## هدف

صفحه مدیریت نقش‌های tenant — **owner only** — نمایش roleهای سیستمی read-only، ایجاد/ویرایش role سفارشی با permission matrix checkbox grid و data scope selector — با هشدار تأثیر بر همه staff دارای آن role.

---

## معیار پذیرش

- [ ] Route `/admin/roles`
- [ ] Access: **owner only** — `core.role.view` minimum; create/update/delete require respective permissions
- [ ] System roles (`isSystem=true`): read-only view — no edit/delete
- [ ] Custom roles: create with name + permission matrix + data scope
- [ ] Permission matrix: grouped by module (core, installments) — checkbox grid
- [ ] Data scope selector: `all` | `branch` | `own` per role
- [ ] Warning dialog on save: «تغییرات روی همه کارمندان با این نقش اعمال می‌شود»
- [ ] Delete custom role — blocked if staff assigned (`ROLE_HAS_STAFF`)
- [ ] Excellence §5–§7 complete

---

## مشخصات فنی

### Route

```
apps/web/src/app/(admin)/admin/roles/page.tsx
```

### Permissions (Owner Only)

| Action | Permission |
|--------|------------|
| View page | `core.role.view` |
| Create | `core.role.create` |
| Update | `core.role.update` |
| Delete | `core.role.delete` |

Non-owner roles (manager, cashier, viewer): **NoPermission page** — menu item hidden.

> Note: rbac.md lists `core.role.manage` in matrix shorthand; implementation uses granular `core.role.*` per action.

### API Endpoints

**List roles + permissions catalog:**
```http
GET /api/v1/roles
GET /api/v1/permissions?groupBy=module
```

**Create custom role:**
```http
POST /api/v1/roles
{
  "name": "حسابدار",
  "code": "accountant",
  "dataScope": "all",
  "permissionIds": ["uuid1", "uuid2", ...]
}
→ 201
```

**Update:**
```http
PATCH /api/v1/roles/:id
{ "name": "...", "dataScope": "branch", "permissionIds": [...] }
```

**Delete (soft):**
```http
DELETE /api/v1/roles/:id
→ 204
```

### System vs Custom Roles

| Type | isSystem | UI |
|------|----------|-----|
| owner, manager, cashier, viewer | `true` | View details — badges «سیستمی» — Edit/Delete hidden |
| Custom (accountant, ...) | `false` | Full CRUD |

System role detail view: show permission list read-only + data scope (immutable).

### Permission Matrix UI

```
┌─────────────────────────────────────────────────────────┐
│ ماژول Core                                              │
├─────────────────────────────────────────────────────────┤
│ ☐ core.branch.view    ☐ core.branch.create    ...       │
│ ☐ core.staff.view     ☐ core.staff.create     ...       │
├─────────────────────────────────────────────────────────┤
│ ماژول اقساط (installments)                              │
├─────────────────────────────────────────────────────────┤
│ ☐ installments.sale.view    ☐ installments.sale.create│
│ ☐ installments.report.overdue  ...                      │
└─────────────────────────────────────────────────────────┘
```

- Group headers collapsible
- «Select all in module» optional shortcut
- Indeterminate state for partial module selection
- Disabled permissions if module not enabled for tenant

### Data Scope Selector

```tsx
<RadioGroup value={dataScope} onValueChange={setDataScope}>
  <RadioItem value="all">همه داده‌های tenant</RadioItem>
  <RadioItem value="branch">فقط شعب تخصیص‌یافته</RadioItem>
  <RadioItem value="own">فقط رکوردهای خود</RadioItem>
</RadioGroup>
```

Help text per scope (ADR-015).

### Impact Warning Dialog

On create/update submit — before API call:

```
⚠️ تأثیر تغییرات
این تغییرات بلافاصله روی {staffCount} کارمند با نقش «{roleName}» اعمال می‌شود.
[انصراف] [تأیید و ذخیره]
```

`staffCount` from API: `GET /api/v1/roles/:id` includes `assignedStaffCount`.

### UI Structure

```
RolesPage
├── PageHeader (+ «نقش جدید» owner only)
├── RolesList (cards or table)
│   ├── SystemRoleCard (read-only, badge «سیستمی»)
│   └── CustomRoleCard (edit, delete)
├── RoleFormPage | RoleFormDrawer (create/edit custom)
│   ├── name, code (slug auto from name on create)
│   ├── DataScopeSelector
│   ├── PermissionMatrix
│   └── Save → ImpactWarningDialog → API
└── SystemRoleDetailModal (view only)
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/web/src/app/(admin)/admin/roles/page.tsx` |
| Create | `apps/web/src/app/(admin)/admin/roles/[id]/page.tsx` |
| Create | `apps/web/src/app/(admin)/admin/roles/new/page.tsx` |
| Create | `apps/web/src/features/roles/roles-list.tsx` |
| Create | `apps/web/src/features/roles/permission-matrix.tsx` |
| Create | `apps/web/src/features/roles/data-scope-selector.tsx` |
| Create | `apps/web/src/features/roles/impact-warning-dialog.tsx` |
| Create | `apps/web/src/features/roles/use-roles.ts` |
| Update | `apps/web/src/components/layout/admin-sidebar.tsx` — owner only menu |

---

## مراحل پیاده‌سازی

1. Roles list — GET /roles — split system vs custom
2. System role detail modal — read-only permissions
3. Permission matrix component — GET /permissions grouped
4. Create role page — form + matrix + data scope
5. Impact warning dialog with staff count
6. Edit custom role — PATCH
7. Delete custom — confirm + check assigned staff
8. Owner-only route guard (layout level)
9. Page states complete

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار UI |
|--------|-------------|----------|
| Non-owner access | 403 `PERMISSION_DENIED` | NoPermission — «فقط مالک» |
| Edit system role | 409 `ROLE_IS_SYSTEM` | UI prevents — view only |
| Delete role with staff | 409 `ROLE_HAS_STAFF` | Toast — reassign staff first |
| Duplicate code | 409 `ROLE_CODE_EXISTS` | Inline code error |
| Empty permissions | 400 | «حداقل یک مجوز انتخاب کنید» |
| Module not enabled | — | Gray out installments permissions |
| Delete owner role | — | N/A — system role not deletable |

---

## تست

- [ ] Component: system role — no edit button
- [ ] Component: permission matrix toggles
- [ ] Component: warning dialog shows staff count
- [ ] Route guard: manager → redirect/no permission
- [ ] Integration: create custom role → appears in list

---

## UX

### Form — Excellence §5

- [ ] name label, placeholder «مثلاً: حسابدار»
- [ ] code auto-slug preview
- [ ] data scope help texts
- [ ] matrix: search filter permissions optional
- [ ] submit loading, validation, unsaved warning
- [ ] RTL checkbox alignment

### Page — Excellence §7

- [ ] Breadcrumb: مدیریت → نقش‌ها
- [ ] Loading, empty (no custom roles), error, no-permission
- [ ] System roles section + custom roles section

---

## Flow

```
Entry: Sidebar → نقش‌ها (owner only)
  ↓ GET /roles + /permissions
  ├─ View system role → read-only modal
  ├─ Create custom → matrix + scope → warning → POST
  ├─ Edit custom → warning → PATCH
  └─ Delete custom → confirm → DELETE
Exit: updated roles list
  ↘ non-owner → NoPermission
```

---

## Policy Alignment

- [ ] EXCELLENCE-STANDARDS §5–§7
- [ ] ADR-004 — RBAC, DENY override separate (TASK-093)
- [ ] SOFT-DELETE-POLICY — role soft delete
- [ ] rbac.md — system roles immutable, custom owner-only

---

## مراجع

- `docs/02-architecture/rbac.md` — roles, permission matrix, precedence
- `docs/02-architecture/tenancy-and-entities.md` — Role entity
- `Phases/Phase-1-Installments/Epic-08-Core-Admin/README.md` — TASK-091, TASK-097
- `docs/09-development/EXCELLENCE-STANDARDS.md` §5–§7

---

## Self-Review Score

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata | /10 | 10 | |
| Completeness | /25 | 25 | Matrix, scope, warning, system read-only |
| Policy | /25 | 25 | Owner only, system immutable |
| Executability | /25 | 25 | Full component tree, edge cases |
| Alignment | /15 | 14 | rbac.md granular permissions |
| **جمع** | **/100** | **99** | ≥95 ✅ |
