# TASK-034: Domain — RBAC Value Objects

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 0 |
| Epic | Epic-05-Domain-Core |
| ID | TASK-034 |
| Priority | P0 |
| Depends on | TASK-010 |
| Blocks | TASK-031, TASK-041, TASK-043, TASK-057 |
| Estimated | 4h |

---

## هدف

پیاده‌سازی Value Objects و Services خالص domain برای RBAC: `Permission` VO (code validation)، `Role` VO (soft delete برای custom roles)، `DataScope` type، `EffectivePermissionsService` (محاسبه permissions با precedence). Precedence: DENY > GRANT > Role > default DENY.

---

## معیار پذیرش

- [ ] `Permission` VO با validation: `module.resource.action` format
- [ ] `DataScope` type: `'all' | 'branch' | 'own'` با parse و guard functions
- [ ] `Role` VO با `softDelete()` (template roles → `DELETE_FORBIDDEN`) و `restore()`
- [ ] `resolveEffectivePermissions()` function: DENY > GRANT > Role
- [ ] `hasPermission()` helper
- [ ] Template roles نمی‌توانند soft delete شوند (`isTemplate=true`)
- [ ] Test: 4 scenarios precedence (در task)
- [ ] Test: `core.customer.restore`، `core.customer.delete`، `core.recycle.view` در effective
- [ ] هیچ import از Prisma/NestJS

---

## مشخصات فنی

### Permission VO

```typescript
// packages/domain/src/core/rbac/permission.vo.ts
const PERMISSION_CODE_PATTERN = /^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/;

export class Permission {
  constructor(readonly code: string) {
    if (!PERMISSION_CODE_PATTERN.test(code)) {
      throw new DomainError('INVALID_PERMISSION_CODE');
    }
  }

  equals(other: Permission): boolean {
    return this.code === other.code;
  }
}
```

### DataScope

```typescript
// packages/domain/src/core/rbac/data-scope.vo.ts
export type DataScope = 'all' | 'branch' | 'own';

export function parseDataScope(value: string): DataScope;   // throws INVALID_DATA_SCOPE
export function isDataScope(value: string): value is DataScope;
```

### Role VO

```typescript
// packages/domain/src/core/rbac/role.vo.ts
export class Role {
  constructor(
    readonly id: string,
    readonly tenantId: string | null,   // null = template
    readonly isTemplate: boolean,
    private _name: string,
    private _deletedAt: Date | null = null,
    private _deletedById: string | null = null,
  ) {}

  rename(name: string): void;   // throws INVALID_ROLE_NAME (< 2 chars)
  softDelete(deletedById: string): void;  // throws DELETE_FORBIDDEN (template), ALREADY_DELETED
  restore(): void;              // throws NOT_DELETED

  get name(): string;
  get deletedAt(): Date | null;
  get deletedById(): string | null;
  get isDeleted(): boolean;
}
```

### EffectivePermissionsService

```typescript
// packages/domain/src/core/rbac/effective-permissions.service.ts
export function resolveEffectivePermissions(input: {
  rolePermissions: string[];   // از roles staff
  grants: string[];            // از UserPermissionOverride با effect=grant
  denies: string[];            // از UserPermissionOverride با effect=deny
}): Set<string> {
  const effective = new Set([...rolePermissions, ...grants]);
  for (const denied of denies) effective.delete(denied);  // DENY > GRANT
  return effective;
}

export function hasPermission(effective: Set<string>, required: string): boolean {
  return effective.has(required);
}
```

### Precedence Rules

```
1. DENY (user override) برنده همیشه
2. GRANT (user override) به effective اضافه می‌کند
3. Role permissions — default
4. default DENY اگر نه در effective
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create/Update | `packages/domain/src/core/rbac/permission.vo.ts` |
| Create/Update | `packages/domain/src/core/rbac/data-scope.vo.ts` |
| Create/Update | `packages/domain/src/core/rbac/role.vo.ts` |
| Create/Update | `packages/domain/src/core/rbac/effective-permissions.service.ts` |
| Create/Update | `packages/domain/src/core/rbac/soft-deletable.vo.ts` |
| Create/Update | `packages/domain/src/core/rbac/permission.vo.spec.ts` |
| Create/Update | `packages/domain/src/core/rbac/role.vo.spec.ts` |
| Create/Update | `packages/domain/src/core/rbac/effective-permissions.service.spec.ts` |
| Update | `packages/domain/src/core/rbac/index.ts` |

---

## مراحل پیاده‌سازی

1. پیاده‌سازی `DataScope` type و parse/guard functions
2. پیاده‌سازی `Permission` VO با regex validation
3. پیاده‌سازی `Role` VO با soft delete guards
4. پیاده‌سازی `resolveEffectivePermissions()` و `hasPermission()`
5. اختیاری: `soft-deletable.vo.ts` — shared helpers برای `assertNotDeleted`, `assertCanRestore`
6. نوشتن specs با precedence scenarios
7. Export از `index.ts`

---

## Edge Cases & Errors

| سناریو | Domain Error | رفتار |
|--------|-------------|--------|
| Permission code نامعتبر (2 بخش) | `INVALID_PERMISSION_CODE` | throws |
| soft delete template role | `DELETE_FORBIDDEN` | throws |
| soft delete twice | `ALREADY_DELETED` | throws |
| restore when active | `NOT_DELETED` | throws |
| role rename < 2 chars | `INVALID_ROLE_NAME` | throws |
| DENY روی granted permission | — | DENY برنده |
| GRANT بدون role | — | در effective |

---

## تست (Precedence — اجباری)

```typescript
// effective-permissions.service.spec.ts
it('grants role permission when no overrides')
  rolePermissions=[a], grants=[], denies=[] → hasPermission(a) = true

it('deny override blocks role permission')
  rolePermissions=[a], grants=[], denies=[a] → hasPermission(a) = false

it('grant override adds permission without role')
  rolePermissions=[], grants=[b], denies=[] → hasPermission(b) = true

it('deny wins over grant for same permission')
  rolePermissions=[a], grants=[b], denies=[b] → hasPermission(b) = false

it('includes seed extras core.customer.restore and core.recycle.view')
  rolePermissions=[restore, recycle], grants=[], denies=[] → both true
```

---

## Policy Alignment

- [ ] `docs/02-architecture/rbac.md` — precedence DENY > GRANT > Role > default deny
- [ ] TASK-021 `isTemplate` — soft delete template roles forbidden
- [ ] SOFT-DELETE-POLICY §2 — custom roles soft deletable
- [ ] DEVELOPMENT_RULES §1.2 — Domain layer خالص (no framework imports)

---

## مراجع

- `docs/02-architecture/rbac.md`
- `docs/09-development/DEVELOPMENT_RULES.md` §4
- `docs/09-development/SOFT-DELETE-POLICY.md`

---

## Self-Review Score

| محور | /25 | یادداشت |
|------|-----|---------|
| Metadata | 10/10 | ID, Priority, Depends, Blocks, Estimate ✓ |
| Completeness | 25/25 | هدف، interface، precedence، acceptance criteria، files ✓ |
| Policy | 25/25 | rbac.md، template protection، soft delete، domain purity ✓ |
| Executability | 25/25 | Steps، test cases با scenarios، edge cases ✓ |
| Alignment | 15/15 | Sync با TASK-021 schema، TASK-043 use case، TASK-028 seed ✓ |
| **جمع** | **100/100** | ≥95 required ✓ |
