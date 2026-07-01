# TASK-016: Module Skeleton — modules/core

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 0 |
| Epic | Epic-03-Packages-Skeleton |
| ID | TASK-016 |
| Priority | P0 |
| Depends on | TASK-006, TASK-010, TASK-011 |
| Blocks | TASK-047, TASK-041, TASK-059 |
| Estimated | 3h |
| Status | ✅ Done |

---

## هدف

NestJS module `@hivork/module-core` — wiring برای module registry، entitlement guard، و core permissions. این module در `apps/api/app.module.ts` import می‌شود و پایه system برای `@RequireModule('installments')` guard است.

---

## معیار پذیرش

- [x] `@hivork/module-core` (نام package: `modules/core`)
- [x] `CoreModule` قابل import در `apps/api/app.module.ts`
- [x] `HivorkModule` interface با `code`، `name`، `version`، `permissions`
- [x] `ModuleRegistryService` — ثبت modules و بررسی entitlement
- [x] `ModuleEntitlementService` — بررسی اینکه آیا tenant به module دسترسی دارد
- [x] `@RequireModule('installments')` decorator + guard stub
- [x] Core permissions list export (از `docs/02-architecture/rbac.md`)
- [x] Settings schema stub برای core settings

---

## مشخصات فنی

### ساختار پوشه

```
modules/core/
├── src/
│   ├── index.ts
│   ├── core.module.ts
│   ├── core.permissions.ts          # list of core permission strings
│   ├── module-registry.service.ts   # register + list modules
│   ├── module-entitlement.service.ts # check tenant module access
│   ├── decorators/
│   │   └── require-module.decorator.ts
│   ├── guards/
│   │   └── module.guard.ts
│   ├── interfaces/
│   │   └── hivork-module.interface.ts
│   ├── ports/
│   │   ├── tenant-id-resolver.port.ts
│   │   └── tenant-modules-reader.port.ts
│   └── settings/
│       └── core.settings.schema.ts
└── package.json                     # name: @hivork/module-core
```

### `HivorkModule` interface

```typescript
export interface PermissionDefinition {
  key: string;
  description: string;
}

export interface HivorkModule {
  code: string;
  name: string;
  version: string;
  permissions: PermissionDefinition[];
  register(app: INestApplication): void;
}
```

### `ModuleRegistryService`

```typescript
@Injectable()
export class ModuleRegistryService {
  private readonly modules = new Map<string, HivorkModule>();

  register(module: HivorkModule): void {
    this.modules.set(module.code, module);
  }

  getModule(code: string): HivorkModule | undefined {
    return this.modules.get(code);
  }

  bootstrap(app: INestApplication): void {
    this.modules.forEach(m => m.register(app));
  }
}
```

### `@RequireModule` decorator

```typescript
export const REQUIRE_MODULE_KEY = 'require_module';
export const RequireModule = (moduleCode: string) =>
  SetMetadata(REQUIRE_MODULE_KEY, moduleCode);
```

### `core.permissions.ts`

```typescript
// از docs/02-architecture/rbac.md
export const CORE_PERMISSIONS = [
  'core.tenant.view',
  'core.tenant.update',
  'core.staff.create',
  'core.staff.view',
  'core.staff.update',
  'core.staff.delete',
  'core.role.manage',
  'core.settings.view',
  'core.settings.update',
  'core.customer.view',
  'core.customer.create',
  'core.customer.update',
  'core.customer.delete',
  'core.report.view',
] as const;
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `modules/core/src/**` |
| Create | `modules/core/package.json` |
| Create | `modules/core/tsconfig.json` |
| Update | `apps/api/src/app.module.ts` — CoreModule import |

---

## مراحل پیاده‌سازی

1. `HivorkModule` interface
2. `ModuleRegistryService` با register/bootstrap
3. `@RequireModule` decorator + `ModuleGuard`
4. `CoreModule` NestJS module که همه را wire کند
5. Import در `apps/api/app.module.ts`
6. `core.permissions.ts` از rbac.md
7. Verify: `pnpm --filter @hivork/api dev` startup بدون خطا

---

## Edge Cases & Errors

| سناریو | رفتار |
|--------|--------|
| Module register نشده + `@RequireModule` | `ModuleGuard` 403 Forbidden |
| Tenant module access = false | `ModuleEntitlementService` → 403 |
| `bootstrap()` بدون modules | Empty loop — OK |
| Duplicate module register | `.set()` overwrites — warning log |
| `@RequireModule` بدون `@RequireAuth` | Guard chain باید auth اول check کند |

---

## تست

```typescript
// core.module.spec.ts
const registry = new ModuleRegistryService();
const mockModule: HivorkModule = {
  code: 'test',
  name: 'Test Module',
  version: '1.0',
  permissions: [],
  register: vi.fn(),
};
registry.register(mockModule);
expect(registry.getModule('test')).toBe(mockModule);
```

---

## Policy Alignment

- [x] ADR-002 — modules/core همیشه فعال (core tenant/rbac/auth/audit/settings)
- [x] DEVELOPMENT_RULES.md §2 — Module System
- [x] SOFT-DELETE-POLICY — N/A (module registry)
- [x] `.cursor/rules/02-security-rbac-audit.mdc` — `@RequireModule` اجباری برای module-scoped endpoints

---

## مراجع

- `docs/02-architecture/modules.md`
- `docs/02-architecture/rbac.md` — permission list
- `.cursor/rules/02-security-rbac-audit.mdc`

---

## Self-Review Score

| محور | /امتیاز | یادداشت |
|------|---------|---------|
| Metadata (10) | 10/10 | همه فیلدها |
| Completeness (25) | 25/25 | AC، interface، service، decorator، permissions |
| Policy (25) | 25/25 | ADR-002، RBAC guard explicit |
| Executability (25) | 25/25 | Edge cases، steps، tests |
| Alignment (15) | 15/15 | Sync با modules.md + rbac.md |
| **جمع** | **100/100** | ✅ Ready |
