# IFP-163: API Controller + Contracts — RBAC

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 09 |
| Epic | Epic-02-RBAC-UI |
| ID | IFP-163 |
| Priority | P0 |
| Depends on | IFP-161, IFP-162 |
| Blocks | IFP-164, IFP-165 |
| Estimated | 8h |

---

## هدف

REST API یکپارچه نقش‌ها و override + Zod contracts هم‌تراز با use caseها.

---

## معیار پذیرش

- [ ] RolesController: CRUD + clone + restore
- [ ] PermissionOverridesController nested under staff
- [ ] GET `/api/v1/permissions` — registry list grouped by module
- [ ] All endpoints @RequireAuth + permission guards
- [ ] packages/contracts Zod for all DTOs
- [ ] OpenAPI tags: core-rbac

---

## مشخصات فنی

### Endpoints
```
GET    /api/v1/roles
POST   /api/v1/roles
GET    /api/v1/roles/:id
PATCH  /api/v1/roles/:id
DELETE /api/v1/roles/:id
POST   /api/v1/roles/:id/restore
POST   /api/v1/roles/clone
GET    /api/v1/permissions
GET    /api/v1/staff/:id/permission-overrides
POST   /api/v1/staff/:id/permission-overrides
DELETE /api/v1/staff/:id/permission-overrides/:overrideId
GET    /api/v1/staff/:id/effective-permissions
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/api/src/modules/core/roles.controller.ts` |
| Create | `packages/contracts/src/core/rbac.schema.ts` |

---

## مراحل پیاده‌سازی

1. Controllers thin
2. Zod pipes
3. RBAC integration tests allow/deny

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Version conflict | 409 | VERSION_CONFLICT |
| Missing module entitlement | 403 | MODULE_NOT_ENABLED |

---

## تست

- [ ] Integration: full role lifecycle
- [ ] Contract parse roundtrip

---

## Policy Alignment

- [ ] ADR-016 API versioning
- [ ] ADR-004

---

## مراجع

- `packages/contracts/`
- `docs/09-development/ERROR-CODES.md`

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
