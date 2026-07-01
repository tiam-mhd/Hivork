# IFP-162: Use Case — Staff Permission Overrides

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 09 |
| Epic | Epic-02-RBAC-UI |
| ID | IFP-162 |
| Priority | P0 |
| Depends on | IFP-161, Phase-0 TASK-047 |
| Blocks | IFP-163, IFP-165, IFP-171 |
| Estimated | 10h |

---

## هدف

مدیریت grant/deny override روی Staff — استثنا از نقش برای کاربر خاص؛ invalidate permission cache.

---

## معیار پذیرش

- [ ] ListStaffOverridesUseCase
- [ ] UpsertPermissionOverrideUseCase — effect: grant | deny
- [ ] DeletePermissionOverrideUseCase (soft or hard junction — UserPermissionOverride soft)
- [ ] Effective permissions preview endpoint
- [ ] Audit: `permission_override.upsert|delete`
- [ ] Permission: `core.permission_override.manage` — owner only
- [ ] Cache invalidation Redis staff permissions

---

## مشخصات فنی

### Upsert
```json
POST /api/v1/staff/:staffId/permission-overrides
{ "permission": "installments.payment.confirm", "effect": "deny", "reason": "موقت" }
```

### Effective preview
```http
GET /api/v1/staff/:staffId/effective-permissions
→ { permissions: [...], sources: [{ permission, source: "role"|"grant"|"deny" }] }
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/src/rbac/upsert-permission-override.use-case.ts` |
| Create | `packages/application/src/rbac/get-effective-permissions.use-case.ts` |

---

## مراحل پیاده‌سازی

1. Validate permission exists in registry
2. Upsert + audit
3. Cache bust
4. Tests deny > grant

---

## Edge Cases & Errors

| سناریو | HTTP / Code | رفتار |
|--------|-------------|--------|
| Unknown permission key | 400 | PERMISSION_UNKNOWN |
| Override on owner | 409 | CANNOT_OVERRIDE_OWNER |
| Cross-tenant staff | 404 | STAFF_NOT_FOUND |

---

## تست

- [ ] Unit: DENY > GRANT precedence
- [ ] Integration: upsert reflects in guard

---

## Policy Alignment

- [ ] ADR-004
- [ ] Audit mandatory

---

## مراجع

- `docs/02-architecture/rbac.md`

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
