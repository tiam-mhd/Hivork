# TASK-055: Onboarding & Auth Flow (یکپارچه)

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 0 |
| Epic | Epic-06-Auth |
| ID | TASK-055 |
| Priority | P0 |
| Depends on | TASK-035, TASK-036, TASK-037, TASK-038 |
| Blocks | TASK-054, TASK-057 |
| Estimated | 4h |

---

## هدف

تعریف **یک flow واحد و بدون تناقض** برای احراز هویت و onboarding در Hivork. این سند مرجع اصلی برای TASK-036 (verify logic) و TASK-054 (tenant registration endpoint) است. سه مسیر اصلی تعریف می‌شود: ثبت‌نام Tenant جدید، لاگین Staff موجود، و لاگین Customer.

---

## معیار پذیرش

- [ ] سه مسیر A، B، C به طور کامل documented و implemented
- [ ] Flow A: OTP request → verify (verifiedToken) → register/tenant → session کامل
- [ ] Flow B: OTP request → verify (با tenantSlug) → session کامل
- [ ] Flow C: OTP request → verify → session customer (stub Phase 0)
- [ ] `verifiedToken` یک‌بار مصرف است (token blacklist)
- [ ] Contracts در TASK-051 هم‌تراز
- [ ] Integration test برای هر مسیر
- [ ] Audit: `tenant.create` و `auth.login_success` ثبت می‌شود

---

## مشخصات فنی

### Flow A — Tenant جدید (اولین بار)

```
1. POST /api/v1/auth/otp/request
   Body: { phone, actor: 'staff', intent: 'register' }
   Response: { success: true, expiresIn: 120 }

2. POST /api/v1/auth/otp/verify
   Body: { phone, code, actor: 'staff', intent: 'register' }
   Response: { verifiedToken: "eyJ...", expiresIn: 300 }
   (JWT کوتاه ۵ دقیقه — نه access token)

3. POST /api/v1/tenants/register   [TASK-054]
   Body: { verifiedToken, tenantName, ownerName, slug, planId? }
   → ValidateVerifiedRegisterToken (check + revoke)
   → Create Tenant + Staff(owner) + default Branch + seed roles + settings
   Response: { accessToken, staff, tenant } + hivork_staff_refresh cookie
```

**verifiedToken claims:**
```typescript
{ phone: string, actor: 'staff', purpose: 'register', type: 'verified' }
```

**verifiedToken یک‌بار مصرف:** در `ValidateVerifiedRegisterTokenUseCase` بعد از اعتبارسنجی موفق، در Redis blacklist می‌شود.

---

### Flow B — Staff موجود (seed / دعوت‌شده)

```
1. POST /api/v1/auth/otp/request
   Body: { phone, actor: 'staff', intent: 'login', tenantSlug?: 'demo-shop' }
   Response: { success: true, expiresIn: 120 }

2. POST /api/v1/auth/otp/verify
   Body: { phone, code, actor: 'staff', intent: 'login', tenantSlug: 'demo-shop' }
   → اگر یک tenant → tokens مستقیم
   → اگر چند tenant (بدون tenantSlug) → 409 NEED_TENANT_SLUG + لیست slugها
   Response: { accessToken, staff, tenant } + hivork_staff_refresh cookie

3. GET /api/v1/tenants/me
   Header: Authorization: Bearer {accessToken}
```

---

### Flow C — Customer (Phase 0 minimal — stub)

```
1. POST /api/v1/auth/otp/request
   Body: { phone, actor: 'customer', intent: 'login' }

2. POST /api/v1/auth/otp/verify
   Body: { phone, code, actor: 'customer', intent: 'login' }
   → find or create GlobalCustomer
   Response: { accessToken, customer } + hivork_customer_refresh cookie
```

---

### Token Summary

| Token | TTL | کوکی/Header | استفاده |
|-------|-----|-------------|---------|
| accessToken | 15m | Authorization: Bearer | هر request |
| refreshToken | 30d | hivork_staff_refresh (httpOnly) | `/auth/refresh` |
| verifiedToken | 5m | فقط در response body | `/tenants/register` |

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create/Update | `packages/application/src/auth/verify-otp.use-case.ts` |
| Create | `packages/application/src/auth/validate-verified-register-token.use-case.ts` |
| Create | `packages/contracts/src/auth/onboarding.schema.ts` |
| Update | `apps/api/src/auth/auth.controller.ts` |
| Ref | TASK-054: `apps/api/src/tenants/tenants.controller.ts` — register endpoint |

---

## مراحل پیاده‌سازی

1. تعریف schemas در `onboarding.schema.ts` (RegisterTenantDto, VerifiedTokenResponseDto)
2. پیاده‌سازی Flow A در `VerifyOtpUseCase.registerStaff()`
3. پیاده‌سازی Flow B در `VerifyOtpUseCase.loginStaff()`
4. پیاده‌سازی `ValidateVerifiedRegisterTokenUseCase` (verify + revoke)
5. پیاده‌سازی Flow C در `VerifyOtpUseCase.loginCustomer()`
6. Integration test برای هر flow

---

## Edge Cases & Errors

| سناریو | HTTP | Code | رفتار |
|--------|------|------|--------|
| register intent (User/Staff ممکن است از قبل وجود داشته باشد) | 200 | — | Flow A ادامه — `verifiedToken` (ADR-017) |
| register slug تکراری | 409 | `SLUG_TAKEN` | [در TASK-054] |
| verifiedToken منقضی | 401 | `VERIFIED_TOKEN_EXPIRED` | OTP مجدد |
| verifiedToken قبلاً استفاده شده | 401 | `VERIFIED_TOKEN_INVALID` | OTP مجدد |
| verifiedToken phone با ownerPhone مغایر | 401 | `VERIFIED_TOKEN_INVALID` | — |
| tenantSlug اشتباه | 404 | `TENANT_NOT_FOUND` | — |
| Tenant معلق | 403 | `TENANT_SUSPENDED` | — |
| Staff معلق | 403 | `STAFF_SUSPENDED` | — |
| چند tenant یک phone (بدون slug) | 409 | `NEED_TENANT_SLUG` | `details: { tenantSlugs }` |

---

## تست

- [ ] Integration (Flow A): OTP request → verify → register tenant → session کامل
- [ ] Integration (Flow B): seed staff → OTP request → verify → tokens
- [ ] Integration: duplicate slug → 409 `SLUG_TAKEN`
- [ ] Integration: multi-tenant phone → 409 `NEED_TENANT_SLUG` + slugs
- [ ] Integration: verifiedToken استفاده شده → 401 `VERIFIED_TOKEN_INVALID`
- [ ] Integration (Flow C): customer OTP → verify → GlobalCustomer created + tokens

---

## Flow Diagram

```
[User] → POST /auth/otp/request { phone, actor, intent }
                ↓
         [Redis OTP Store]
                ↓
[User] → POST /auth/otp/verify { phone, code, actor, intent }
         ├─ intent=register (staff)
         │       ↓
         │   { verifiedToken } (JWT 5m)
         │       ↓
         │  POST /tenants/register { verifiedToken, ... }
         │       ↓
         │  [ValidateVerifiedRegisterToken → revoke]
         │       ↓
         │  CreateTenant+Staff+Branch+Roles
         │       ↓
         │  { accessToken, staff, tenant } + refresh cookie
         │
         └─ intent=login (staff)
                 ↓
             find User by phone → Staff by (slug, userId)
                 ↓
             { accessToken, staff, tenant } + refresh cookie
```

---

## Policy Alignment

- [ ] EXCELLENCE-STANDARDS §6 — flow کامل با همه paths، error/recovery
- [ ] ADR-011 — staff/customer actor جداگانه
- [ ] ADR-013 — verifiedToken blacklist برای one-time use
- [ ] Audit اجباری: `tenant.create` + `auth.login_success`
- [ ] هیچ flow بدون OTP verify به register/login نمی‌رسد

---

## مراجع

- TASK-036, TASK-054, TASK-057
- ADR-011, ADR-013
- `docs/02-architecture/tenancy-and-entities.md`
- `docs/06-operations/security-and-audit.md`

---

## Self-Review Score

| محور | /25 | یادداشت |
|------|-----|---------|
| Metadata | 10/10 | همه فیلدها |
| Completeness | 25/25 | ۳ flow کامل، specs، edge cases، diagram |
| Policy | 25/25 | ADR-011، ADR-013، verifiedToken one-time |
| Executability | 25/25 | Edge cases کامل، integration tests |
| Alignment | 15/15 | Sync با TASK-036، TASK-054، contracts |
| **جمع** | **100/100** | ✅ Ready for implementation |
