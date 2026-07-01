# TASK-041: Guard — Tenant Context Middleware

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 0 |
| Epic | Epic-07-Middleware-Guards |
| ID | TASK-041 |
| Priority | P0 |
| Depends on | TASK-038, TASK-020 |
| Blocks | TASK-042, TASK-046, TASK-054 |
| Estimated | 3h |

---

## هدف

بعد از `StaffAuthGuard`، اطلاعات tenant و branch را از `StaffContext` استخراج کرده و در `AsyncLocalStorage` ذخیره می‌کند تا Prisma extension (TASK-046) و DataScope interceptor (TASK-045) بدون dependency مستقیم به request به آنها دسترسی داشته باشند.

فقط برای Staff routes فعال است. Customer routes این interceptor را skip می‌کنند.

---

## معیار پذیرش

- [ ] `TenantContextInterceptor` پس از guard اجرا می‌شود
- [ ] `tenantId` و `staffId` از `StaffContext` در `prismaRequestStorage` ذخیره می‌شود
- [ ] `activeBranchId`، `primaryBranchId`، `effectiveBranchIds` نیز ذخیره می‌شود
- [ ] اگر `StaffContext` غایب باشد (customer request) → interceptor skip می‌کند، بدون error
- [ ] `getRequestContext()` helper برای خواندن از AsyncLocalStorage در هر جای codebase
- [ ] Prisma extension از `prismaRequestStorage` برای inject `tenantId` استفاده می‌کند

---

## مشخصات فنی

### TenantContext

```typescript
export interface TenantContext {
  tenantId: string;
  staffId: string;
}
```

### BranchContext

```typescript
export interface BranchContext {
  activeBranchId: string | null;
  primaryBranchId: string | null;
  effectiveBranchIds: string[]; // برای dataScope=branch
}
```

### AsyncLocalStorage

```typescript
// packages/infrastructure/src/context/request-context.ts
export const prismaRequestStorage = new AsyncLocalStorage<PrismaRequestContext>();

// apps/api/src/common/context/tenant.context.ts
export function runRequestContext<T>(store: PrismaRequestContext, fn: () => T): T {
  return prismaRequestStorage.run(store, fn);
}
```

### TenantContextInterceptor Logic

```typescript
intercept(context, next): Observable<unknown> {
  const staff = request[STAFF_CONTEXT_KEY] as StaffContext | undefined;
  if (!staff?.tenantId) return next.handle(); // skip for customers

  return defer(() =>
    runRequestContext(
      {
        tenantId: staff.tenantId,
        staffId: staff.id,
        ...buildBranchContext(staff),
      },
      () => next.handle(),
    ),
  );
}
```

### effectiveBranchIds Resolution

```typescript
// activeBranchId تنها branchId فعال → override assignedBranchIds
function resolveEffectiveBranchIds(staff: StaffContext): string[] {
  if (staff.activeBranchId) return [staff.activeBranchId];
  return staff.assignedBranchIds;
}
```

### ترتیب اجرا (NestJS pipeline)

```
1. Guards: StaffAuthGuard → sets request[STAFF_CONTEXT_KEY]
2. Interceptors: TenantContextInterceptor → wraps handler in AsyncLocalStorage.run()
3. Handler executes → Prisma extension reads tenantId from storage
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/api/src/common/context/tenant.context.ts` |
| Create | `apps/api/src/common/context/branch.context.ts` |
| Create | `apps/api/src/common/interceptors/tenant-context.interceptor.ts` |
| Create | `packages/infrastructure/src/context/request-context.ts` |
| Update | `apps/api/src/common/auth-common.module.ts` — provide interceptor |

---

## مراحل پیاده‌سازی

1. ایجاد `prismaRequestStorage` (AsyncLocalStorage) در infrastructure/context
2. ایجاد `TenantContext` و `BranchContext` interfaces
3. پیاده‌سازی `buildBranchContext(staff)` helper
4. پیاده‌سازی `TenantContextInterceptor` با `defer()` + `runRequestContext()`
5. Export `getRequestContext()` برای مصرف در repository layer
6. ثبت interceptor در `AuthCommonModule` (globally applied)
7. نوشتن تست

---

## Edge Cases & Errors

| سناریو | رفتار |
|--------|--------|
| Staff request با tenantId معتبر | Context ذخیره می‌شود |
| Customer request (بدون StaffContext) | Interceptor skip می‌کند، بدون error |
| Request بدون هیچ auth (public endpoint) | Interceptor skip می‌کند |
| Staff بدون assigned branches (owner) | `effectiveBranchIds = []` (all access) |
| Staff با activeBranch | `effectiveBranchIds = [activeBranchId]` |

---

## تست

- [ ] Unit: Staff request → context populated با tenantId و staffId
- [ ] Unit: Customer request → interceptor skip، context غایب
- [ ] Unit: Staff بدون activeBranch → `effectiveBranchIds = assignedBranchIds`
- [ ] Unit: Staff با activeBranch → `effectiveBranchIds = [activeBranchId]`
- [ ] Unit: Request بدون StaffContext → handle() بدون context call شود
- [ ] Integration: تست که Prisma queries به tenantId دسترسی دارند

---

## Policy Alignment

- [ ] ADR-015 — branch context در AsyncLocalStorage، نه JWT
- [ ] EXCELLENCE-STANDARDS §6 — context propagation بدون leakage
- [ ] هیچ PII در storage (فقط ID ها)
- [ ] Prisma extension layer 2 security — tenant isolation

---

## مراجع

- `docs/02-architecture/overview.md` § Request Flow
- ADR-015
- TASK-038 (StaffContext source), TASK-046 (consumer)

---

## Self-Review Score

| محور | /25 | یادداشت |
|------|-----|---------|
| Metadata | 10/10 | همه فیلدها |
| Completeness | 25/25 | Context types، interceptor logic، pipeline order |
| Policy | 25/25 | ADR-015، no PII، layer 2 security |
| Executability | 25/25 | Edge cases، tests، ترتیب اجرا |
| Alignment | 15/15 | Sync با TASK-046، TASK-038 |
| **جمع** | **100/100** | ✅ Ready for implementation |
