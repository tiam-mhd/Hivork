# IFP-158: Use Case + API — Staff Groups CRUD

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 09 |
| Epic | Epic-01-User-Management-Extended |
| ID | IFP-158 |
| Priority | P0 |
| Depends on | IFP-157 |
| Blocks | IFP-165, IFP-171 |
| Estimated | 10h |

---

## هدف

CRUD گروه کارمندان: ایجاد، ویرایش، لیست، افزودن/حذف عضو، soft delete/restore — با audit و RBAC.

---

## معیار پذیرش

- [ ] CreateStaffGroupUseCase, UpdateStaffGroupUseCase, ListStaffGroupsUseCase
- [ ] AddStaffToGroupUseCase, RemoveStaffFromGroupUseCase
- [ ] SoftDeleteStaffGroupUseCase + RestoreStaffGroupUseCase
- [ ] API: GET/POST/PATCH/DELETE `/api/v1/staff-groups`
- [ ] API: POST/DELETE `/api/v1/staff-groups/:id/members`
- [ ] Permissions: `core.staff_group.view|create|update|delete`
- [ ] Audit: `staff_group.create|update|delete|member.add|member.remove`
- [ ] Contracts Zod در packages/contracts

---

## مشخصات فنی

### Permissions
```
core.staff_group.view
core.staff_group.create
core.staff_group.update
core.staff_group.delete
```

### List
```http
GET /api/v1/staff-groups?search=&status=active&limit=20&cursor=
```

### Create
```json
POST /api/v1/staff-groups
{ "code": "sales", "name": "فروش", "description": "...", "staffIds": ["uuid"] }
```

### Member add
```http
POST /api/v1/staff-groups/:id/members { "staffId": "uuid" }
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/src/staff-groups/*.use-case.ts` |
| Create | `apps/api/src/modules/core/staff-groups.controller.ts` |
| Create | `packages/contracts/src/core/staff-group.schema.ts` |

---

## مراحل پیاده‌سازی

1. Domain validation (code slug)
2. Use cases + unit tests
3. Controller + guards
4. Integration test cross-tenant fail

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Staff other tenant | 404 | STAFF_NOT_FOUND |
| Duplicate member | 409 | STAFF_GROUP_MEMBER_EXISTS |
| Delete group with active refs | 409 | STAFF_GROUP_IN_USE |

---

## تست

- [ ] Unit: code normalize
- [ ] Integration: CRUD + restore
- [ ] RBAC: deny without permission

---

## Policy Alignment

- [ ] EXCELLENCE-STANDARDS §4 API
- [ ] SOFT-DELETE-POLICY restore
- [ ] ADR-004 RBAC

---

## مراجع

- `docs/02-architecture/rbac.md`
- `Phases/Phase-1/TASK-090-usecase-staff-crud.md`

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
