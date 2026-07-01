# TASK-045: Guard — Data Scope Filter

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 0 |
| Epic | Epic-07-Middleware-Guards |
| ID | TASK-045 |
| Priority | P0 |
| Depends on | TASK-031, TASK-043, TASK-038 |
| Blocks | TASK-046 |
| Estimated | 4h |

---

## هدف

اعمال محدودیت دسترسی به داده بر اساس `dataScope` در `StaffContext`. Staff با scope `branch` فقط داده‌های شعبه‌های assigned خود را می‌بیند؛ scope `own` فقط رکوردهای خودش؛ scope `all` همه (مثل owner). فیلتر از `AsyncLocalStorage` به لایه Prisma منتقل می‌شود.

---

## معیار پذیرش

- [ ] `@ApplyDataScope()` decorator
- [ ] `DataScopeInterceptor` فیلتر را بر اساس `StaffContext.dataScope` می‌سازد
- [ ] فیلتر در `prismaRequestStorage.dataScopeFilter` ذخیره می‌شود
- [ ] `dataScope=all` → فیلتر خالی `{}`
- [ ] `dataScope=branch` → `{ branchId: { in: effectiveBranchIds } }`
- [ ] `dataScope=own` → `{ createdById: staffId }`
- [ ] `activeBranchId` خارج از `assignedBranchIds` → 403 `BRANCH_NOT_ALLOWED`
- [ ] Prisma extension از `dataScopeFilter` در WHERE استفاده می‌کند

---

## مشخصات فنی

### Decorator

```typescript
export const ApplyDataScope = () =>
  SetMetadata(APPLY_DATA_SCOPE_KEY, true);
```

### DataScopeInterceptor Logic

```typescript
intercept(context, next) {
  const applyDataScope = reflector.getAllAndOverride<boolean>(
    APPLY_DATA_SCOPE_KEY, [handler, class]
  );
  if (!applyDataScope) return next.handle();

  const staff = request[STAFF_CONTEXT_KEY];
  if (!staff) return throwError(() => UnauthorizedException);

  const parent = prismaRequestStorage.getStore();
  if (!parent) return throwError(() => UnauthorizedException);

  const filter = buildDataScopeFilter(staff);  // may throw BRANCH_NOT_ALLOWED
  return defer(() =>
    prismaRequestStorage.run({ ...parent, dataScopeFilter: filter }, () => next.handle())
  );
}
```

### buildDataScopeFilter Function

```typescript
// packages/application/src/rbac/build-data-scope-filter.ts
export function buildDataScopeFilter(ctx: {
  staffId: string;
  dataScope: 'all' | 'branch' | 'own';
  assignedBranchIds: string[];
  activeBranchId: string | null;
}): Record<string, unknown> {
  switch (ctx.dataScope) {
    case 'all':
      return {};
    case 'branch': {
      const effective = resolveEffectiveBranchIds(ctx);
      return effective.length ? { branchId: { in: effective } } : {};
    }
    case 'own':
      return { createdById: ctx.staffId };
  }
}

function resolveEffectiveBranchIds(ctx): string[] {
  const allowed = ctx.assignedBranchIds;
  if (ctx.activeBranchId) {
    if (allowed.length && !allowed.includes(ctx.activeBranchId)) {
      throw new ApplicationError('BRANCH_NOT_ALLOWED', '...', 403);
    }
    return [ctx.activeBranchId];
  }
  return allowed;
}
```

### DataScope در Repository

Repository باید `dataScopeFilter` را به WHERE اضافه کند:

```typescript
// بدون @ApplyDataScope (لایه امنیتی Prisma extension handle می‌کند)
// با @ApplyDataScope → فیلتر خودکار اعمال می‌شود
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/api/src/common/interceptors/data-scope.interceptor.ts` |
| Create | `apps/api/src/common/decorators/apply-data-scope.decorator.ts` |
| Create | `apps/api/src/common/context/data-scope.context.ts` |
| Create | `packages/application/src/rbac/build-data-scope-filter.ts` |
| Update | `packages/infrastructure/src/context/request-context.ts` — `dataScopeFilter` field |

---

## مراحل پیاده‌سازی

1. اضافه کردن `dataScopeFilter` به `PrismaRequestContext`
2. پیاده‌سازی `buildDataScopeFilter` در application layer
3. پیاده‌سازی `ApplyDataScope` decorator
4. پیاده‌سازی `DataScopeInterceptor` که فیلتر را در storage ذخیره می‌کند
5. اضافه کردن `getDataScopeFilter()` helper برای repository access
6. Wire interceptor در `AuthCommonModule`
7. نوشتن تست

---

## Edge Cases & Errors

| سناریو | HTTP | Code | رفتار |
|--------|------|------|--------|
| `dataScope=all` | — | — | فیلتر خالی — همه رکوردها |
| `dataScope=branch` بدون active | — | — | `branchId in assignedBranchIds` |
| `dataScope=branch` با activeBranch | — | — | `branchId = [activeBranchId]` |
| activeBranch خارج از assign | 403 | `BRANCH_NOT_ALLOWED` | — |
| `dataScope=own` | — | — | `createdById = staffId` |
| `@ApplyDataScope` نباشد | — | — | Interceptor pass-through |
| StaffContext غایب با `@ApplyDataScope` | 401 | `UNAUTHORIZED` | Guard order incorrect |
| Prisma storage غایب | 401 | `UNAUTHORIZED` | TenantContextInterceptor نرسیده |

---

## تست

- [ ] Unit: `dataScope=all` → فیلتر `{}`
- [ ] Unit: `dataScope=branch` → `{ branchId: { in: [...] } }`
- [ ] Unit: `dataScope=branch` با activeBranch → `{ branchId: { in: [activeBranchId] } }`
- [ ] Unit: activeBranch خارج از assign → ApplicationError `BRANCH_NOT_ALLOWED`
- [ ] Unit: `dataScope=own` → `{ createdById: staffId }`
- [ ] Unit: metadata غایب → pass-through
- [ ] Unit: StaffContext غایب → UnauthorizedException
- [ ] Unit: فیلتر در prismaRequestStorage ذخیره می‌شود

---

## Branch-Scoped Models (Phase 1 الزام)

| مدل | `branchId` | فاز |
|-----|-----------|-----|
| `Sale` | NOT NULL | 1 (installments) |
| `TenantCustomer` | optional `defaultBranchId` | 0 |

**Index:** `@@index([tenantId, branchId])` روی همه branch-scoped operational models.

---

## Policy Alignment

- [ ] ADR-015 — activeBranch از request header/Redis، نه JWT
- [ ] EXCELLENCE-STANDARDS §6 — data scope backend-enforced
- [ ] هیچ repository نباید بدون scope filter به داده tenant-scoped دسترسی داشته باشد
- [ ] `Sale.branchId NOT NULL` در Phase 1 — no deferral

---

## مراجع

- `docs/02-architecture/rbac.md` § Data Scope
- ADR-015
- TASK-038 (StaffContext), TASK-041 (TenantContext), TASK-046 (Prisma extension)

---

## Self-Review Score

| محور | /25 | یادداشت |
|------|-----|---------|
| Metadata | 10/10 | همه فیلدها |
| Completeness | 25/25 | Filter builder، interceptor، edge cases |
| Policy | 25/25 | ADR-015، backend-enforced، branch rules |
| Executability | 25/25 | Edge cases کامل، tests |
| Alignment | 15/15 | Sync با TASK-041، TASK-046 |
| **جمع** | **100/100** | ✅ Ready for implementation |
