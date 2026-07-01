# TASK-115: Frontend — Branch Management

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 1 |
| Epic | Epic-13-Frontend-Admin-Settings |
| ID | TASK-115 |
| Priority | P0 |
| Depends on | TASK-106, TASK-107, TASK-108, TASK-109, TASK-095, TASK-094 |
| Blocks | TASK-116, TASK-123 |
| Estimated | 10h |

---

## هدف

صفحه CRUD شعب tenant — لیست با badge پیش‌فرض، ایجاد/ویرایش در modal، soft delete با محدودیت شعبه پیش‌فرض — برای owner/manager با permissionهای `core.branch.*`.

---

## معیار پذیرش

- [ ] Route `/admin/branches`
- [ ] List: name, address, phone, `isDefault` badge, `isActive` status, actions
- [ ] Create modal: name (required), address, phone
- [ ] Edit modal: same fields — default branch name editable
- [ ] Delete: soft delete — **disabled for `isDefault=true`** with tooltip
- [ ] Permissions: `core.branch.view` (page), `create`/`update`/`delete` per action button
- [ ] Excellence §7 page states complete
- [ ] Cursor pagination or load-all (≤ plan limit branches)
- [ ] RTL table + responsive card view on mobile

---

## مشخصات فنی

### Route

```
apps/web/src/app/(admin)/admin/branches/page.tsx
```

### Permissions

| Action | Permission | Roles (default) |
|--------|------------|-----------------|
| View page | `core.branch.view` | owner, manager |
| Create button | `core.branch.create` | owner |
| Edit row | `core.branch.update` | owner, manager |
| Delete row | `core.branch.delete` | owner |

UI hides action when permission missing — backend enforces regardless.

### API Endpoints

**List:**
```http
GET /api/v1/branches?limit=50
Authorization: Bearer {token}
```

**Create:**
```http
POST /api/v1/branches
{ "name": "شعبه شمال", "address": "...", "phone": "021..." }
→ 201 { id, name, isDefault: false, ... }
```

**Update:**
```http
PATCH /api/v1/branches/:id
{ "name": "...", "address": "...", "phone": "..." }
→ 200
```

**Soft Delete:**
```http
DELETE /api/v1/branches/:id
→ 204
```

### UI Components

```
BranchesPage
├── PageHeader (+ دکمه «شعبه جدید» if create permission)
├── BranchesTable | BranchesCardList (mobile)
│   └── Row: name, isDefault Badge, address, phone, status, actions menu
├── BranchFormModal (create | edit mode)
│   └── fields: name*, address, phone (tel input)
└── DeleteConfirmDialog
    └── disabled state + Tooltip for isDefault
```

### isDefault Badge

```tsx
{branch.isDefault && (
  <Badge variant="secondary">شعبه پیش‌فرض</Badge>
)}
```

### Delete — Default Branch Rule

```tsx
<Tooltip content="شعبه پیش‌فرض قابل حذف نیست">
  <span>
    <Button disabled={branch.isDefault} variant="destructive">
      حذف
    </Button>
  </span>
</Tooltip>
```

Backend error if bypassed: `409 BRANCH_IS_DEFAULT`.

### Form Fields (Modal)

| Field | Label (fa) | Required | Validation |
|-------|------------|----------|------------|
| name | نام شعبه | ✅ | min 2 chars |
| address | آدرس | ❌ | max 500 |
| phone | تلفن | ❌ | Iranian phone format |

Zod: `@hivork/contracts/core/branch.schema.ts` (TASK-094).

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/web/src/app/(admin)/admin/branches/page.tsx` |
| Create | `apps/web/src/features/branches/branches-table.tsx` |
| Create | `apps/web/src/features/branches/branch-form-modal.tsx` |
| Create | `apps/web/src/features/branches/use-branches.ts` |
| Update | `apps/web/src/components/layout/admin-sidebar.tsx` |

---

## مراحل پیاده‌سازی

1. Page shell + GET branches query
2. DataTable with columns + isDefault badge
3. BranchFormModal — create flow POST
4. Edit flow — PATCH pre-filled
5. Delete confirm dialog — DELETE soft delete
6. Disable delete + tooltip for isDefault
7. Permission gates on buttons
8. Empty state: «هنوز شعبه‌ای ثبت نشده» + CTA
9. Error/loading/no-permission states

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار UI |
|--------|-------------|----------|
| Delete default branch | 409 `BRANCH_IS_DEFAULT` | Button disabled; if API called → toast |
| Delete last branch | 409 `DELETE_FORBIDDEN` | Toast: «حداقل یک شعبه باید باقی بماند» |
| Duplicate name | 409 `BRANCH_NAME_EXISTS` | Inline name error |
| Branch has active sales | 409 `BRANCH_HAS_DEPENDENCIES` | Toast with explanation |
| No view permission | 403 | NoPermission page |
| Empty list | 200 `[]` | Empty state + create CTA |

---

## تست

- [ ] Component: isDefault row — delete button disabled
- [ ] Component: create modal submits POST
- [ ] Component: permission hides create button for cashier
- [ ] Integration: list → create → edit → delete non-default

---

## UX

### Form — Excellence §5 (Modal)

- [ ] Labels, placeholders, help text
- [ ] Validation fa messages
- [ ] Submit loading, server errors per field
- [ ] Esc close modal, focus trap
- [ ] RTL layout

### Page — Excellence §7

- [ ] Breadcrumb: مدیریت → شعب
- [ ] Title + «شعبه جدید» action
- [ ] Loading skeleton table
- [ ] Empty + CTA
- [ ] Error retry
- [ ] No permission state
- [ ] Table: sort by name, search filter optional

---

## Flow

```
Entry: Sidebar → شعب
  ↓ GET /branches
  ↓ Table render
  ├─ Create → Modal → POST → refresh list
  ├─ Edit → Modal → PATCH → refresh
  └─ Delete (non-default) → Confirm → DELETE → refresh
Exit: updated list
  ↘ isDefault → delete disabled + tooltip
```

---

## Policy Alignment

- [ ] EXCELLENCE-STANDARDS §5–§7
- [ ] SOFT-DELETE-POLICY — DELETE = soft delete only
- [ ] ADR-015 — branch scope context for staff assignment (TASK-116)
- [ ] ADR-013 — no hard delete

---

## مراجع

- `docs/02-architecture/rbac.md` — `core.branch.*`
- `docs/02-architecture/api-contracts.md` §4 branches
- `Phases/Phase-1-Installments/Epic-08-Core-Admin/README.md` — TASK-089, TASK-095
- `docs/09-development/SOFT-DELETE-POLICY.md`

---

## Self-Review Score

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata | /10 | 10 | |
| Completeness | /25 | 25 | Modal CRUD, badge, tooltip, API |
| Policy | /25 | 25 | Soft delete, default branch rule |
| Executability | /25 | 24 | Edge cases, permissions matrix |
| Alignment | /15 | 15 | Epic-08 policy notes |
| **جمع** | **/100** | **99** | ≥95 ✅ |

