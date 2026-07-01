# TASK-116: Frontend — Staff Management

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 1 |
| Epic | Epic-13-Frontend-Admin-Settings |
| ID | TASK-116 |
| Priority | P0 |
| Depends on | TASK-106, TASK-107, TASK-108, TASK-109, TASK-096, TASK-094, TASK-115 |
| Blocks | TASK-123 |
| Estimated | 12h |

---

## هدف

صفحه مدیریت کارمندان tenant — لیست با role badges و branch assignments، ایجاد کارمند (phone, name, role, branches)، soft delete با محافظت owner — مطابق SF-008. کارمند باید از قبل در سیستم وجود داشته باشد؛ ورود via OTP (passwordless).

---

## معیار پذیرش

- [ ] Route `/admin/staff`
- [ ] List: name, phone (masked partial), role badges, branch names, status, lastLoginAt
- [ ] Create form/modal: phone*, name*, role select, branch multi-select
- [ ] Edit: name, role, branches, status (active/inactive)
- [ ] Delete: soft delete — **owner row delete disabled** with tooltip
- [ ] Permissions: `core.staff.view`, `core.staff.create`, `core.staff.update`, `core.staff.delete`
- [ ] Invite flow documented: staff record created → SMS welcome → staff logs in via OTP (no password)
- [ ] Excellence §5 form + §7 page states
- [ ] Filter: status, branchId, search by name/phone

---

## مشخصات فنی

### Route

```
apps/web/src/app/(admin)/admin/staff/page.tsx
```

### Permissions

| Action | Permission | Default Roles |
|--------|------------|---------------|
| View | `core.staff.view` | owner, manager (view only) |
| Create | `core.staff.create` | owner |
| Update | `core.staff.update` | owner |
| Delete | `core.staff.delete` | owner |

### API Endpoints

**List:**
```http
GET /api/v1/staff?status=active&branchId={uuid}&search=رضا&limit=20&cursor=
```

**Create:**
```http
POST /api/v1/staff
{
  "phone": "09121234567",
  "name": "رضا کریمی",
  "roleId": "uuid",
  "assignedBranchIds": ["uuid1", "uuid2"],
  "primaryBranchId": "uuid1"
}
→ 201 { id, phone, name, roles: [...], ... }
```

Side effect: welcome SMS queued (outbox) — staff uses OTP login next time.

**Update:**
```http
PATCH /api/v1/staff/:id
{ "name": "...", "roleId": "...", "assignedBranchIds": [...], "status": "active" }
```

**Soft Delete:**
```http
DELETE /api/v1/staff/:id
→ 204
```

### Invite / Login Flow (Phase 1)

```
Owner creates staff (POST /staff)
  → Staff record active in DB
  → SMS: «به {tenantName} اضافه شدید — با شماره خود وارد شوید»
  → Staff opens /login → OTP → JWT
  → No separate invite token in Phase 1
```

**Precondition:** Phone must be valid Iranian mobile. Staff entity جدا از GlobalCustomer است؛ هر دو می‌توانند همان `User` را share کنند (ADR-002, ADR-017).

### UI Components

```
StaffPage
├── PageHeader (+ «کارمند جدید»)
├── StaffFilters (search, status, branch)
├── StaffTable
│   └── Row: avatar placeholder, name, phone, RoleBadges[], BranchChips[], status, actions
├── StaffFormModal (create | edit)
│   ├── phone (create only, tel, normalize 09...)
│   ├── name
│   ├── roleId (Select from GET /roles?scope=tenant)
│   └── assignedBranchIds (MultiSelect from branches)
│       └── primaryBranchId auto = first selected or explicit
└── DeleteConfirmDialog (disabled for owner)
```

### Owner Protection

Staff with role `owner` (system role code):
- Delete button **disabled** + tooltip: «مالک tenant قابل حذف نیست»
- Role change **disabled** in edit (owner always owner)
- Backend: `409 STAFF_IS_OWNER` if bypassed

### Role Badges

```tsx
{staff.roles.map(r => (
  <Badge key={r.code} variant={r.code === 'owner' ? 'default' : 'outline'}>
    {r.name}
  </Badge>
))}
```

### Branch Assignments Display

- Empty `assignedBranchIds` → chip «همه شعب» (data scope all)
- Else → chip per branch name from cache

### Form Fields

| Field | Label (fa) | Create | Edit | Validation |
|-------|------------|--------|------|------------|
| phone | شماره موبایل | ✅ | readonly | `phoneSchema`, normalize 09xxxxxxxxx |
| name | نام | ✅ | ✅ | min 2 chars |
| roleId | نقش | ✅ | ✅* | UUID, not owner change |
| assignedBranchIds | شعب | ✅ | ✅ | min 1 if role data_scope=branch |
| status | وضعیت | — | ✅ | active \| inactive |

*Owner role locked on edit.

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/web/src/app/(admin)/admin/staff/page.tsx` |
| Create | `apps/web/src/features/staff/staff-table.tsx` |
| Create | `apps/web/src/features/staff/staff-form-modal.tsx` |
| Create | `apps/web/src/features/staff/use-staff.ts` |
| Create | `apps/web/src/features/staff/role-badges.tsx` |
| Update | `apps/web/src/components/layout/admin-sidebar.tsx` |

---

## مراحل پیاده‌سازی

1. Page + GET staff with filters
2. StaffTable with role badges + branch chips
3. Load roles + branches for form selects
4. Create modal — POST + success toast «کارمند می‌تواند با OTP وارد شود»
5. Edit modal — PATCH, lock phone + owner role
6. Delete — disabled for owner + confirm dialog
7. Permission gates
8. All page states
9. Phone normalize on blur

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار UI |
|--------|-------------|----------|
| Delete owner | 409 `STAFF_IS_OWNER` | Delete disabled + tooltip |
| Self-delete | 409 `STAFF_SELF_DELETE` | Hide delete on current user row |
| Duplicate phone in tenant | 409 `STAFF_PHONE_EXISTS` | Inline phone error |
| Last owner demote | 409 `STAFF_LAST_OWNER` | Role select disabled for owner |
| Invalid phone | 400 `PHONE_INVALID` | Inline validation |
| Inactive staff login | 403 `STAFF_INACTIVE` | Info in edit: «غیرفعال — ورود مسدود» |
| Branch not in tenant | 400 | Inline branch error |

---

## تست

- [ ] Component: owner row — delete disabled
- [ ] Component: phone normalize 912... → 0912...
- [ ] Component: create submits correct payload
- [ ] Integration: create staff → appears in list with role badge

---

## UX

### Form — Excellence §5

- [ ] All field labels, placeholders, help
- [ ] Help: «کارمند با همین شماره از طریق OTP وارد می‌شود»
- [ ] Help: «خالی = دسترسی به همه شعب»
- [ ] phone: `type="tel"`, LTR input in RTL page
- [ ] Validation fa, submit loading, unsaved warning
- [ ] Server errors per field
- [ ] Accessibility complete

### Page — Excellence §7

- [ ] Breadcrumb, title, primary action
- [ ] Filters bar
- [ ] Loading skeleton, empty, error, no-permission
- [ ] Responsive card view mobile

---

## Flow

```
Entry: Sidebar → کارمندان
  ↓ GET /staff
  ↓ Table
  ├─ Create → phone+name+role+branches → POST → SMS queued → toast
  ├─ Edit → PATCH (owner protected)
  └─ Delete → confirm → DELETE (not owner)
Exit: refreshed list

Staff login (separate SF-001):
  POST /auth/otp/request { phone, actor: staff, intent: login }
  → verify → JWT → dashboard
```

---

## Policy Alignment

- [ ] EXCELLENCE-STANDARDS §5–§7, §8 Staff fields
- [ ] SOFT-DELETE-POLICY — staff soft delete
- [ ] ADR-002 — Staff separate from Customer
- [ ] ADR-015 — assignedBranchIds, primaryBranchId
- [ ] ADR-004 — RBAC permissions

---

## مراجع

- `docs/03-modules/installments/STAFF-FLOWS.md` — SF-001, SF-008
- `docs/02-architecture/rbac.md` — `core.staff.*`
- `docs/02-architecture/tenancy-and-entities.md` — Staff entity
- `docs/09-development/EXCELLENCE-STANDARDS.md` §8 Staff

---

## Self-Review Score

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata | /10 | 10 | |
| Completeness | /25 | 25 | Invite flow, owner rule, form fields |
| Policy | /25 | 25 | ADR-002, ADR-015, soft delete |
| Executability | /25 | 25 | Edge cases, OTP invite path |
| Alignment | /15 | 15 | SF-008 sync |
| **جمع** | **/100** | **100** | ≥95 ✅ |
