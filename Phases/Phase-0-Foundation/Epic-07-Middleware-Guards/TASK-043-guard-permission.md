# TASK-043: Guard — Permission Guard

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 0 |
| Epic | Epic-07-Middleware-Guards |
| ID | TASK-043 |
| Priority | P0 |
| Depends on | TASK-034, TASK-042, TASK-021 |
| Blocks | TASK-054 |
| Estimated | 4h |

---

## هدف

پیاده‌سازی permission guard که بر اساس Role و User Override تعیین می‌کند آیا Staff می‌تواند عملیاتی را انجام دهد یا خیر. قانون اولویت: **DENY > GRANT > default DENY**. پیاده‌سازی permission resolution در domain layer، cache در Redis (TTL 5 دقیقه).

---

## معیار پذیرش

- [ ] `@RequirePermission('installments.sale.create')` decorator
- [ ] `PermissionGuard` در guard chain بعد از `AuthGuard` اجرا می‌شود
- [ ] StaffContext از request می‌خواند (`req[STAFF_CONTEXT_KEY]`)
- [ ] Permission resolution از DB (role permissions + user overrides)
- [ ] **DENY user override** همیشه بر **GRANT role** غلبه می‌کند
- [ ] Permission cache در Redis: `perms:{staffId}` TTL 5 دقیقه
- [ ] Permission مورد نیاز وجود ندارد → 403 `FORBIDDEN` (نه 401)
- [ ] اگر `@RequirePermission` روی route نباشد → guard skip می‌کند (pass-through)

---

## مشخصات فنی

### Decorator

```typescript
// apps/api/src/common/decorators/require-permission.decorator.ts
export const RequirePermission = (permission: string) =>
  SetMetadata(PERMISSION_METADATA_KEY, permission);
```

### Permission Resolution (Domain Logic)

```typescript
// packages/application/src/rbac/get-staff-permissions.use-case.ts

interface PermissionSources {
  rolePermissions: string[];   // از Role‌های Staff
  grants: string[];            // UserPermissionOverride effect='grant'
  denies: string[];            // UserPermissionOverride effect='deny'
}

// اولویت:
// effective = (rolePermissions ∪ grants) − denies
// اگر permission در denies → false (حتی اگر در role باشد)
function resolveEffectivePermissions(sources: PermissionSources): Set<string> {
  const effective = new Set([...sources.rolePermissions, ...sources.grants]);
  for (const denied of sources.denies) {
    effective.delete(denied);
  }
  return effective;
}

function hasPermission(effective: Set<string>, required: string): boolean {
  return effective.has(required);
}
```

### PermissionGuard Logic

```typescript
async canActivate(context): Promise<boolean> {
  const required = reflector.getAllAndOverride<string>(
    PERMISSION_METADATA_KEY, [handler, controller]
  );
  if (!required) return true; // no permission required

  const staff = request[STAFF_CONTEXT_KEY];
  if (!staff) throw UnauthorizedException { code: 'UNAUTHORIZED' };

  const effective = await getStaffPermissions.execute({ staffId: staff.id });
  if (!getStaffPermissions.hasPermission(effective, required)) {
    throw ForbiddenException { code: 'FORBIDDEN' };
  }
  return true;
}
```

### Redis Cache

```
Key: perms:{staffId}
Value: JSON serialized Set of effective permissions
TTL: 300s (5 min)
```

وقتی role/override تغییر می‌کند → cache invalidate (بعد از هر تغییر role/permission در use case)

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/api/src/common/guards/permission.guard.ts` |
| Create | `apps/api/src/common/decorators/require-permission.decorator.ts` |
| Create | `packages/application/src/rbac/get-staff-permissions.use-case.ts` |
| Create | `packages/application/src/ports/staff-permissions.repository.port.ts` |
| Create | `packages/application/src/ports/staff-permissions-cache.port.ts` |
| Create | `packages/infrastructure/src/persistence/staff-permissions.repository.ts` |
| Create | `packages/infrastructure/src/redis/redis-staff-permissions.cache.ts` |

---

## مراحل پیاده‌سازی

1. تعریف `IStaffPermissionsRepository` port (findPermissionSourcesByStaffId)
2. تعریف `IStaffPermissionsCachePort` port (get, set, invalidate)
3. پیاده‌سازی `GetStaffPermissionsUseCase` با `resolveEffectivePermissions`
4. پیاده‌سازی `PrismaStaffPermissionsRepository`
5. پیاده‌سازی `RedisStaffPermissionsCache`
6. پیاده‌سازی `RequirePermission` decorator
7. پیاده‌سازی `PermissionGuard`
8. Wire در `AuthCommonModule`
9. نوشتن تست

---

## Edge Cases & Errors

| سناریو | HTTP | Code | رفتار |
|--------|------|------|--------|
| Permission metadata نباشد | — | — | Guard pass-through |
| StaffContext نباشد | 401 | `UNAUTHORIZED` | Guard order incorrect |
| Permission وجود دارد در role | — | — | Allow |
| Permission در user DENY | 403 | `FORBIDDEN` | DENY > GRANT |
| Permission در user GRANT (بدون role) | — | — | Allow |
| permission در هر دو DENY و role GRANT | 403 | `FORBIDDEN` | DENY wins |
| Staff بدون هیچ role | 403 | `FORBIDDEN` | default deny |
| Cache hit | — | — | Skip DB query |
| Cache miss | — | — | Load from DB، write to cache |

---

## تست

- [ ] Unit: owner با permission → allow
- [ ] Unit: viewer بدون permission → 403 `FORBIDDEN`
- [ ] Unit: **user DENY override** بر role GRANT غلبه می‌کند → 403
- [ ] Unit: user GRANT override (بدون role) → allow
- [ ] Unit: metadata غایب → true (pass-through)
- [ ] Unit: StaffContext غایب → UnauthorizedException
- [ ] Unit: `resolveEffectivePermissions` — همه ترکیب‌های role/grant/deny
- [ ] Integration: permissions از DB load شود + cache hit در call دوم

---

## Policy Alignment

- [ ] `docs/02-architecture/rbac.md` — DENY > GRANT > default DENY
- [ ] EXCELLENCE-STANDARDS §6 — permission check backend-enforced
- [ ] هیچ permission check فقط در UI نباشد
- [ ] Cache invalidation وقتی role/override تغییر می‌کند

---

## مراجع

- `docs/02-architecture/rbac.md` § Permission Precedence
- TASK-038 (StaffContext), TASK-042 (AuthGuard)
- `.cursor/rules/02-security-rbac-audit.mdc`

---

## Self-Review Score

| محور | /25 | یادداشت |
|------|-----|---------|
| Metadata | 10/10 | همه فیلدها |
| Completeness | 25/25 | Resolution logic، cache، files کامل |
| Policy | 25/25 | DENY>GRANT enforced، backend-only check |
| Executability | 25/25 | Edge cases کامل، tests |
| Alignment | 15/15 | Sync با rbac.md، TASK-042 |
| **جمع** | **100/100** | ✅ Ready for implementation |
