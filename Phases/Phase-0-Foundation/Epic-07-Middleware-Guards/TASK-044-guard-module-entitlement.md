# TASK-044: Guard — Module Entitlement Guard

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 0 |
| Epic | Epic-07-Middleware-Guards |
| ID | TASK-044 |
| Priority | P0 |
| Depends on | TASK-029, TASK-047, TASK-059 |
| Blocks | — |
| Estimated | 3h |

---

## هدف

اطمینان از اینکه فقط Tenantهایی که ماژول مورد نظر را فعال دارند به endpoints آن ماژول دسترسی دارند. این guard بعد از `AuthGuard` اجرا می‌شود و `tenantId` را از `StaffContext` می‌خواند. وضعیت ماژول‌ها در Redis cache می‌شود.

---

## معیار پذیرش

- [ ] `@RequireModule('installments')` decorator
- [ ] `ModuleGuard` تعیین می‌کند آیا tenant ماژول را دارد
- [ ] ماژول فعال نیست → 403 `{ code: 'MODULE_NOT_ENABLED' }`
- [ ] Cache Redis برای `enabledModules` هر tenant (TTL 5 دقیقه)
- [ ] `core` ماژول همیشه active (نیاز به بررسی ندارد)
- [ ] اگر `@RequireModule` روی route نباشد → guard skip می‌کند

---

## مشخصات فنی

### Decorator

```typescript
// apps/api/src/common/decorators/require-module.decorator.ts
export const RequireModule = (moduleCode: string) =>
  SetMetadata(MODULE_METADATA_KEY, moduleCode);
```

### ModuleGuard Logic

```typescript
async canActivate(context): Promise<boolean> {
  const requiredModule = reflector.getAllAndOverride<string>(
    MODULE_METADATA_KEY, [handler, class]
  );
  if (!requiredModule || requiredModule === 'core') return true;

  const tenantId = tenantIdResolver.resolveTenantId(context);
  if (!tenantId) throw UnauthorizedException { code: 'UNAUTHORIZED' };

  const isEnabled = await moduleEntitlement.isEnabled(tenantId, requiredModule);
  if (!isEnabled) throw ForbiddenException { code: 'MODULE_NOT_ENABLED' };

  return true;
}
```

### Module Registry

ماژول‌ها از `ModuleRegistryService` (در `modules/core/`) register می‌شوند:
```typescript
moduleRegistry.register({ code: 'installments', ... });
```

### Cache

```
Redis Key: modules:{tenantId}
Value: JSON array of enabled module codes  e.g. ["core","installments"]
TTL: 300s
```

### TenantIdResolver Interface

```typescript
interface ITenantIdResolver {
  resolveTenantId(context: ExecutionContext): string | undefined;
}
// Implementation: reads from StaffContext (staff routes)
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/api/src/common/guards/module.guard.ts` — re-export از module-core |
| Create | `apps/api/src/common/resolvers/staff-tenant-id.resolver.ts` |
| Create | `modules/core/src/module-entitlement.service.ts` |
| Create | `modules/core/src/module-registry.service.ts` |
| Create | `packages/infrastructure/src/redis/redis-tenant-modules.cache.ts` |
| Create | `packages/infrastructure/src/persistence/tenant-modules.reader.ts` |

---

## مراحل پیاده‌سازی

1. تعریف `RequireModule` decorator و `MODULE_METADATA_KEY` constant
2. پیاده‌سازی `ModuleRegistryService` در `modules/core/`
3. پیاده‌سازی `ModuleEntitlementService` (DB + Redis cache)
4. پیاده‌سازی `StaffTenantIdResolver`
5. پیاده‌سازی `ModuleGuard` که از `ModuleEntitlementService` استفاده می‌کند
6. Export از `modules/core/` و import در `AuthCommonModule`
7. نوشتن تست

---

## Edge Cases & Errors

| سناریو | HTTP | Code | رفتار |
|--------|------|------|--------|
| Module metadata غایب | — | — | Guard pass-through |
| `core` required | — | — | همیشه allow |
| Tenant ماژول ندارد | 403 | `MODULE_NOT_ENABLED` | — |
| Tenant ماژول دارد | — | — | Allow |
| tenantId غایب (customer route) | 401 | `UNAUTHORIZED` | Misconfigured route |
| Cache hit | — | — | Skip DB |
| Cache miss | — | — | Load از DB، write cache |

---

## تست

- [ ] Unit: tenant بدون installments → 403 `MODULE_NOT_ENABLED`
- [ ] Unit: tenant با installments → allow
- [ ] Unit: module metadata غایب → true (pass-through)
- [ ] Unit: `core` module → always allow
- [ ] Unit: `StaffTenantIdResolver` از `StaffContext` `tenantId` می‌خواند
- [ ] Integration: module از DB load شود + cache hit

---

## Policy Alignment

- [ ] EXCELLENCE-STANDARDS §6 — ماژول entitlement backend-enforced
- [ ] `docs/02-architecture/modules.md` — ماژول registration
- [ ] Cache invalidation وقتی subscription/plan تغییر می‌کند

---

## مراجع

- `docs/02-architecture/modules.md`
- `docs/02-architecture/rbac.md`
- TASK-042 (AuthGuard), TASK-043 (PermissionGuard)

---

## Self-Review Score

| محور | /25 | یادداشت |
|------|-----|---------|
| Metadata | 10/10 | همه فیلدها |
| Completeness | 25/25 | Guard logic، cache، files، registry |
| Policy | 25/25 | Backend-enforced، cache + invalidation |
| Executability | 25/25 | Edge cases، tests کامل |
| Alignment | 15/15 | Sync با modules.md، TASK-043 |
| **جمع** | **100/100** | ✅ Ready for implementation |
