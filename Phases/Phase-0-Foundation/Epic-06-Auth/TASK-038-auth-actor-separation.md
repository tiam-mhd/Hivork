# TASK-038: Auth — Staff vs Customer Actor Separation

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 0 |
| Epic | Epic-06-Auth |
| ID | TASK-038 |
| Priority | P0 |
| Depends on | TASK-037 |
| Blocks | TASK-041, TASK-054 |
| Estimated | 4h |

---

## هدف

جداسازی کامل Actor در لایه Guard برای جلوگیری از IDOR (Insecure Direct Object Reference). Staff JWT نباید به Customer endpoints برسد و برعکس. هر actor ساختار request مخصوص خود را دارد و Guard آن را enforce می‌کند.

---

## معیار پذیرش

- [ ] `StaffAuthGuard` فقط JWT با `actor: 'staff'` قبول می‌کند
- [ ] `CustomerAuthGuard` فقط JWT با `actor: 'customer'` قبول می‌کند
- [ ] Staff token به `/my/*` endpoints → 403 `WRONG_ACTOR`
- [ ] Customer token به `/tenants/*` endpoints → 403 `WRONG_ACTOR`
- [ ] `StaffContext` شامل: `id, tenantId, dataScope, assignedBranchIds, primaryBranchId, activeBranchId`
- [ ] `activeBranchId` از `X-Branch-Id` header یا Redis session (ADR-015) resolve می‌شود
- [ ] Active branch خارج از assignedBranchIds → 403 `BRANCH_NOT_ALLOWED`
- [ ] tenant mismatch بین token.tenantId و DB → 401 `TOKEN_INVALID`
- [ ] Staff status != 'active' → 401 `UNAUTHORIZED`

---

## مشخصات فنی

### StaffContext

```typescript
export interface StaffContext {
  id: string;
  tenantId: string;
  dataScope: 'all' | 'branch' | 'own';
  assignedBranchIds: string[];
  primaryBranchId: string | null;
  activeBranchId: string | null;  // از X-Branch-Id header یا Redis
}
```

### CustomerContext

```typescript
export interface CustomerContext {
  id: string;   // globalCustomerId
}
```

### StaffAuthGuard Logic

```typescript
1. extractBearerToken(request)       // Bearer {token}
2. tokens.verifyAccessToken(token)    // null → 401 TOKEN_EXPIRED
3. payload.actor !== 'staff' → 403 WRONG_ACTOR
4. staffRepository.findContextById(payload.sub)
5. record.status !== 'active' → 401 UNAUTHORIZED
6. record.tenantId !== payload.tenantId → 401 TOKEN_INVALID
7. activeBranchId = X-Branch-Id header || Redis staff:{id}:active_branch
8. activeBranchId && !staff.canAccessBranch(activeBranchId) → 403 BRANCH_NOT_ALLOWED
9. request[STAFF_CONTEXT_KEY] = staffContext
```

### Active Branch Resolution (ADR-015)

```typescript
// Priority: X-Branch-Id header > Redis session
const branchFromHeader = request.headers['x-branch-id'];
const branchFromRedis = await activeBranchStore.get(staffId);
const activeBranchId = branchFromHeader ?? branchFromRedis ?? null;
```

### Route Assignment

| Prefix | Guard |
|--------|-------|
| `/api/v1/tenants/*` | StaffAuthGuard |
| `/api/v1/staff/*` | StaffAuthGuard |
| `/api/v1/my/*` | CustomerAuthGuard |

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/api/src/common/guards/staff-auth.guard.ts` |
| Create | `apps/api/src/common/guards/customer-auth.guard.ts` |
| Create | `apps/api/src/common/guards/auth.guard.ts` — composite (delegates to above) |
| Create | `apps/api/src/common/decorators/current-staff.decorator.ts` |
| Create | `apps/api/src/common/decorators/current-customer.decorator.ts` |
| Create | `apps/api/src/common/decorators/require-auth.decorator.ts` |
| Create | `apps/api/src/common/types/auth-context.ts` — StaffContext, CustomerContext |
| Create | `apps/api/src/common/constants/auth.constants.ts` — STAFF_CONTEXT_KEY, etc. |
| Create | `apps/api/src/common/utils/auth-request.util.ts` — extractBearerToken, readBranchHeader |
| Create | `apps/api/src/common/auth-common.module.ts` |
| Create | `packages/infrastructure/src/redis/redis-staff-active-branch.store.ts` |

---

## مراحل پیاده‌سازی

1. تعریف `StaffContext` و `CustomerContext` در `types/auth-context.ts`
2. تعریف ثابت‌های metadata key در `auth.constants.ts`
3. پیاده‌سازی `StaffAuthGuard` — JWT verify + actor check + active branch
4. پیاده‌سازی `CustomerAuthGuard` — JWT verify + actor check
5. پیاده‌سازی `AuthGuard` composite (از Reflector metadata برای delegate)
6. پیاده‌سازی `RequireAuth(actor)` decorator
7. پیاده‌سازی `@CurrentStaff()` و `@CurrentCustomer()` decorators
8. پیاده‌سازی `RedisStaffActiveBranchStore`
9. ثبت همه در `AuthCommonModule`
10. نوشتن تست

---

## Edge Cases & Errors

| سناریو | HTTP | Code | رفتار |
|--------|------|------|--------|
| Authorization header غایب | 401 | `UNAUTHORIZED` | — |
| Token نامعتبر/منقضی | 401 | `TOKEN_EXPIRED` | — |
| actor اشتباه (customer on staff route) | 403 | `WRONG_ACTOR` | — |
| Staff in DB not found | 401 | `UNAUTHORIZED` | Account removed |
| Staff status=suspended | 401 | `UNAUTHORIZED` | — |
| tenantId token/DB mismatch | 401 | `TOKEN_INVALID` | Security check |
| activeBranch خارج از assign | 403 | `BRANCH_NOT_ALLOWED` | ADR-015 |
| Actor metadata missing on route | 401 | `UNAUTHORIZED` | Dev error — guard misconfigured |

---

## تست

- [ ] Unit: Staff token → staff route ✅ context populated
- [ ] Unit: Customer token → staff route → 403 `WRONG_ACTOR`
- [ ] Unit: Staff token → customer route → 403 `WRONG_ACTOR`
- [ ] Unit: Active branch outside assignment → 403 `BRANCH_NOT_ALLOWED`
- [ ] Unit: `X-Branch-Id` header → `activeBranchId` تنظیم می‌شود
- [ ] Unit: Redis session → `activeBranchId` تنظیم می‌شود
- [ ] Unit: Staff suspended → 401
- [ ] Unit: tenantId mismatch → 401
- [ ] Unit: Token منقضی → 401

---

## Policy Alignment

- [ ] ADR-011 — staff/customer جداسازی کامل
- [ ] ADR-015 — activeBranch از header/Redis، نه JWT
- [ ] `.cursor/rules/02-security-rbac-audit.mdc` — actor claims enforced at guard
- [ ] EXCELLENCE-STANDARDS §6 — همه error paths کامل

---

## مراجع

- `docs/02-architecture/rbac.md`
- `docs/06-operations/security-and-audit.md` § IDOR Prevention
- ADR-011, ADR-015

---

## Self-Review Score

| محور | /25 | یادداشت |
|------|-----|---------|
| Metadata | 10/10 | همه فیلدها |
| Completeness | 25/25 | Context types، guard logic، files کامل |
| Policy | 25/25 | ADR-011، ADR-015، IDOR prevention |
| Executability | 25/25 | Edge cases کامل، tests، لیست فایل‌ها |
| Alignment | 15/15 | Sync با TASK-041، TASK-042، Epic README |
| **جمع** | **100/100** | ✅ Ready for implementation |
