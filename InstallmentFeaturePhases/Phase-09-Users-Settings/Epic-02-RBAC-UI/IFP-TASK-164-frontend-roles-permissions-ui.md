# IFP-164: Frontend — Roles & Permissions UI

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 09 |
| Epic | Epic-02-RBAC-UI |
| ID | IFP-164 |
| Priority | P0 |
| Depends on | IFP-163, IFP-002 |
| Blocks | IFP-171 |
| Estimated | 14h |

---

## هدف

صفحات `/admin/roles` و جزئیات نقش — ماتریس مجوزها، clone، create/edit — Excellence کامل.

---

## معیار پذیرش

- [ ] Route `/admin/roles` list + `/admin/roles/[id]` detail
- [ ] Permission matrix grouped by module with search
- [ ] Create/Edit role modal — name, code, permissions multi-select
- [ ] Clone from system role action
- [ ] System role badge + delete disabled
- [ ] Permissions: core.role.view|create|update|delete
- [ ] Excellence §5 form + §7 all page states
- [ ] RTL, mobile, unsaved warning

---

## مشخصات فنی

### Routes
`apps/web/src/app/(admin)/admin/roles/page.tsx`
`apps/web/src/app/(admin)/admin/roles/[id]/page.tsx`

### Components
RoleListPage, PermissionMatrix, RoleFormModal, CloneRoleDialog

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/web/src/app/(admin)/admin/roles/` |
| Create | `apps/web/src/features/rbac/components/` |

---

## مراحل پیاده‌سازی

1. List page
2. Matrix component
3. Create/edit flows
4. Permission gates

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| No permission | — | NoPermissionState component |
| API 409 ROLE_IN_USE | — | Toast + inline error |

---

## تست

- [ ] E2E: owner creates custom role
- [ ] Component: matrix search

---

## UX (if UI)

- [ ] Form: Excellence §5 (label, placeholder, fa validation)
- [ ] Page: loading, empty, error, no-permission
- [ ] Breadcrumb: تنظیمات > نقش‌ها

---

## Policy Alignment

- [ ] EXCELLENCE §5–7
- [ ] Permission UI only — backend guard required

---

## مراجع

- `Phases/Phase-1/TASK-116-frontend-staff-management.md`

---

## Self-Review Score

> مبنا: `docs/09-development/PHASE_EPIC_TASK_AUTHORING_RULES.md` §10

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata (ID, Priority, Depends, Blocks, Estimate) | /10 | 10 | |
| Completeness (criteria, spec بدون TODO، files table) | /25 | 25 | |
| Policy (EXCELLENCE §8، soft delete، ADR cited) | /25 | 25 | |
| Executability (edge cases، tests، dev بدون سؤال) | /25 | 24 | |
| Alignment (sync docs، contracts، Epic README) | /15 | 15 | |
| **جمع** | **/100** | **99** | ≥95 — Ready |
