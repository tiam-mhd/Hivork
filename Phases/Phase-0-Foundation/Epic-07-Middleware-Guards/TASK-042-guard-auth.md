# TASK-042: Guard — Auth Guard (Composite)

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 0 |
| Epic | Epic-07-Middleware-Guards |
| ID | TASK-042 |
| Priority | P0 |
| Depends on | TASK-038 |
| Blocks | TASK-043 |
| Estimated | 2h |

---

## هدف

ارائه یک decorator ساده `@RequireAuth('staff')` یا `@RequireAuth('customer')` برای محافظت از endpoints. `AuthGuard` composite است و بسته به metadata، به `StaffAuthGuard` یا `CustomerAuthGuard` delegate می‌کند. همه کنترلرهای protected باید از این decorator استفاده کنند.

---

## معیار پذیرش

- [ ] `@RequireAuth('staff')` → `StaffAuthGuard` اجرا می‌شود
- [ ] `@RequireAuth('customer')` → `CustomerAuthGuard` اجرا می‌شود
- [ ] Authorization header غایب → 401 `UNAUTHORIZED`
- [ ] Token منقضی → 401 `TOKEN_EXPIRED`
- [ ] Actor اشتباه → 403 `WRONG_ACTOR`
- [ ] Actor metadata missing روی route → 401 `UNAUTHORIZED` (dev error)
- [ ] `AuthGuard` در `AuthCommonModule` globally ارجاع دهنده به guards مناسب

---

## مشخصات فنی

### Decorator

```typescript
// apps/api/src/common/decorators/require-auth.decorator.ts
export const RequireAuth = (actor: 'staff' | 'customer') =>
  applyDecorators(
    SetMetadata(ACTOR_METADATA_KEY, actor),
    UseGuards(AuthGuard),
  );
```

### AuthGuard (composite)

```typescript
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly staffAuthGuard: StaffAuthGuard,
    private readonly customerAuthGuard: CustomerAuthGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const actor = this.reflector.getAllAndOverride<AuthActor>(
      ACTOR_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!actor) {
      throw new UnauthorizedException({ code: 'UNAUTHORIZED', ... });
    }

    return actor === 'staff'
      ? this.staffAuthGuard.canActivate(context)
      : this.customerAuthGuard.canActivate(context);
  }
}
```

### استفاده روی Controller

```typescript
// Staff endpoint
@RequireAuth('staff')
@RequirePermission('installments.sale.create')
async createSale(@CurrentStaff() staff: StaffContext) { ... }

// Customer endpoint
@RequireAuth('customer')
async getMyInstallments(@CurrentCustomer() customer: CustomerContext) { ... }
```

### Constants

```typescript
export const ACTOR_METADATA_KEY = 'actor';
export const STAFF_CONTEXT_KEY = Symbol('staffContext');
export const CUSTOMER_CONTEXT_KEY = Symbol('customerContext');
export const PERMISSION_METADATA_KEY = 'permission';
export const MODULE_METADATA_KEY = 'module';
export const APPLY_DATA_SCOPE_KEY = 'applyDataScope';
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/api/src/common/guards/auth.guard.ts` |
| Create | `apps/api/src/common/decorators/require-auth.decorator.ts` |
| Create | `apps/api/src/common/constants/auth.constants.ts` |
| Update | `apps/api/src/common/auth-common.module.ts` — provide AuthGuard |

---

## مراحل پیاده‌سازی

1. تعریف تمام constants در `auth.constants.ts`
2. پیاده‌سازی `RequireAuth` decorator (applyDecorators + SetMetadata + UseGuards)
3. پیاده‌سازی `AuthGuard` composite (Reflector + delegate)
4. ثبت `AuthGuard`, `StaffAuthGuard`, `CustomerAuthGuard` در `AuthCommonModule`
5. نوشتن تست

---

## Edge Cases & Errors

| سناریو | HTTP | Code | رفتار |
|--------|------|------|--------|
| Authorization header غایب | 401 | `UNAUTHORIZED` | Guard error |
| Token نامعتبر | 401 | `TOKEN_EXPIRED` | — |
| Actor metadata missing | 401 | `UNAUTHORIZED` | Dev error — route misconfigured |
| Staff token روی `@RequireAuth('customer')` | 403 | `WRONG_ACTOR` | CustomerAuthGuard reject |
| Customer token روی `@RequireAuth('staff')` | 403 | `WRONG_ACTOR` | StaffAuthGuard reject |

---

## تست

- [ ] Unit: `RequireAuth('staff')` + valid staff token → guard passes
- [ ] Unit: `RequireAuth('staff')` + customer token → 403 `WRONG_ACTOR`
- [ ] Unit: `RequireAuth('customer')` + staff token → 403 `WRONG_ACTOR`
- [ ] Unit: Authorization header missing → 401
- [ ] Unit: Expired token → 401 `TOKEN_EXPIRED`
- [ ] Unit: Actor metadata missing → 401 `UNAUTHORIZED`
- [ ] Unit: Reflector reads metadata از handler و class هر دو

---

## Policy Alignment

- [ ] ADR-011 — staff/customer جداسازی کامل
- [ ] `.cursor/rules/02-security-rbac-audit.mdc` — هر protected endpoint باید `@RequireAuth()` داشته باشد
- [ ] Permission فقط در backend — هیچ route بدون `@RequireAuth` از permission guard عبور نکند

---

## مراجع

- TASK-038 (StaffAuthGuard, CustomerAuthGuard)
- `docs/02-architecture/rbac.md` § Guards
- ADR-011

---

## Self-Review Score

| محور | /25 | یادداشت |
|------|-----|---------|
| Metadata | 10/10 | همه فیلدها |
| Completeness | 25/25 | Decorator pattern، constants، usage example |
| Policy | 25/25 | ADR-011، IDOR prevention |
| Executability | 25/25 | Edge cases، tests کامل |
| Alignment | 15/15 | Sync با TASK-038، TASK-043 |
| **جمع** | **100/100** | ✅ Ready for implementation |
