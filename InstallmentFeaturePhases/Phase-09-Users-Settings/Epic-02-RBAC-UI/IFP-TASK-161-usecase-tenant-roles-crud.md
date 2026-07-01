# IFP-161: Use Case — Tenant Roles CRUD

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 09 |
| Epic | Epic-02-RBAC-UI |
| ID | IFP-161 |
| Priority | P0 |
| Depends on | Phase-0 TASK-021, Phase-1 TASK-092 |
| Blocks | IFP-163, IFP-164, IFP-171 |
| Estimated | 12h |

---

## هدف

تکمیل use case نقش‌های سفارشی tenant — assign permissions، clone از نقش سیستمی، soft delete با guard نقش سیستمی.

---

## معیار پذیرش

- [ ] CreateTenantRoleUseCase — tenant_custom only
- [ ] UpdateTenantRoleUseCase — name, description, permissionIds
- [ ] CloneRoleUseCase — from system template
- [ ] SoftDeleteTenantRoleUseCase — block if staff assigned
- [ ] RestoreTenantRoleUseCase
- [ ] ListRolesUseCase / GetRoleUseCase with permission matrix
- [ ] Audit: `role.create|update|delete|restore`
- [ ] Permissions: `core.role.*` — create/delete owner only

---

## مشخصات فنی

### Precedence (ADR-004)
DENY (user) > GRANT (user) > Role > default DENY

### Clone input
```json
{ "sourceRoleId": "uuid", "code": "branch_supervisor", "name": "سرپرست شعبه" }
```

### Guards
- tenant_system roles: cannot delete, limited permission edit
- tenant_custom: full CRUD by owner

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/src/rbac/create-tenant-role.use-case.ts` |
| Create | `packages/application/src/rbac/clone-role.use-case.ts` |
| Create | `packages/application/src/rbac/soft-delete-role.use-case.ts` |

---

## مراحل پیاده‌سازی

1. Extend RoleRepository
2. Permission matrix validation
3. Guards for system roles
4. Unit + integration tests

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Delete system role | 409 | ROLE_SYSTEM_IMMUTABLE |
| Role has staff | 409 | ROLE_IN_USE |
| Non-owner create | 403 | FORBIDDEN |

---

## تست

- [ ] Unit: precedence unchanged
- [ ] Integration: clone + assign
- [ ] RBAC owner-only create

---

## Policy Alignment

- [ ] ADR-004
- [ ] EXCELLENCE §4
- [ ] SOFT-DELETE-POLICY

---

## مراجع

- `docs/02-architecture/rbac.md`
- `Phases/Phase-1/Epic-08-Core-Admin/`

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
