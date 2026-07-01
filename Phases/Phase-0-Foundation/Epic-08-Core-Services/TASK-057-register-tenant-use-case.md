# TASK-057: Use Case — Register Tenant

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 0 |
| Epic | Epic-08-Core-Services |
| ID | TASK-057 |
| Priority | P0 |
| Depends on | TASK-029 (TenantRepo), TASK-030 (StaffRepo), TASK-031 (BranchRepo), TASK-028 (RoleRepo), TASK-055 (OTP+verifiedToken) |
| Blocks | TASK-054 |
| Estimated | 8h |

---

## هدف

`RegisterTenantUseCase` — ثبت‌نام tenant جدید در یک transaction atomic. ورودی: verifiedToken (از OTP flow) + اطلاعات tenant و owner. خروجی: JWT access + refresh token (auto-login).

---

## معیار پذیرش

- [ ] `POST /api/v1/tenants/register` wired و کار می‌کند
- [ ] `verifiedToken` validate می‌شود (signature + expiry + not blacklisted)
- [ ] Rate limit: 3 register/hour/IP (Redis)
- [ ] `slug` uniqueness check (شامل soft-deleted slugها — unique index)
- [ ] Transaction atomic شامل: Tenant، Branch default، Staff owner، Role clone، Settings defaults، Subscription
- [ ] Default plan: `starter`، modules: `['installments']`
- [ ] Role template clone: سیستم roles از seed (`isTemplate: true`) کپی به tenant جدید
- [ ] Branch «شعبه اصلی»: `isDefault: true`، `name`: همان tenant name
- [ ] Owner staff: `dataScope: 'all'`، `primaryBranchId`: default branch، `assignedBranchIds: []`
- [ ] TenantSetting defaults درج می‌شوند
- [ ] Audit log: `tenant.create`
- [ ] Return: `{ accessToken, expiresIn, refreshToken, staff, tenant }`

---

## Input

```typescript
export type RegisterTenantInput = {
  name: string;         // 2–100 chars
  slug: string;         // 3–50 chars, lowercase a-z 0-9 -
  legalName?: string;
  taxId?: string;
  phone?: string;
  email?: string;
  ownerName: string;    // 2–100 chars
  ownerPhone: string;   // 09xxxxxxxxx
  verifiedToken: string;
  clientIp?: string;
  userAgent?: string;
};
```

## Transaction Steps

```
1. Rate limit check (IP) → 429 if exceeded
2. Validate verifiedToken (not expired, not blacklisted, ownerPhone matches)
3. Slug uniqueness check → 409 SLUG_TAKEN
4. Create Tenant (status: trial, trialEndsAt: +14d)
5. Create Branch (isDefault: true, name: tenant.name + ' - شعبه اصلی')
6. Clone template roles (isTemplate: true from seed) to new tenantId
7. Create Staff owner (User findOrCreate by ownerPhone, isOwner: true, primaryBranchId: default branch, dataScope: all)
8. Assign owner role to Staff
9. Insert TenantSetting core defaults (timezone, display_currency)
10. Create Subscription (plan: starter, status: active, trialEndsAt: +14d)
11. Audit: tenant.create
12. Blacklist verifiedToken (one-time use)
13. Sign JWT access + refresh tokens → return
```

> **Note (ADR-017):** `ownerPhone` → findOrCreate `User`. همان User می‌تواند Staff در چند tenant باشد. اگر User قبلاً GlobalCustomer هم باشد، مجاز (ADR-011). Unique فقط `(tenantId, userId)` روی Staff.

---

## مشخصات فنی

### Role Clone از Seed

```
Template roles in seed: tenant_id = null, is_template = true
→ On register: COPY to new tenantId (owner, manager, cashier, viewer)
→ Owner staff receives 'owner' role
```

### Output

```typescript
export type RegisterTenantOutput = {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  staff: { id: string; tenantId: string; name: string; };
  tenant: { id: string; slug: string; name: string; };
};
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Update | `packages/application/src/tenant/register-tenant.use-case.ts` |
| Update | `packages/application/src/tenant/register-tenant.use-case.spec.ts` |
| Update | `packages/infrastructure/src/tenant/prisma-tenant-registration.repository.ts` |
| Update | `apps/api/src/tenants/tenants.controller.ts` |
| Update | `apps/api/src/tenants/tenants.module.ts` |

---

## مراحل پیاده‌سازی

1. پیاده‌سازی rate limit check در use case (اختیاری IP)
2. ValidateVerifiedRegisterTokenUseCase — verify signature، expiry، blacklist
3. Slug check از repository
4. `registrationRepository.register()` — همه steps ۴–۱۰ در یک `$transaction`
5. Audit log نوشتن
6. Blacklist verifiedToken (يک بار مصرف)
7. Sign و return tokens
8. Integration test با واقعی PG

---

## Edge Cases & Errors

| سناریو | HTTP | Code |
|--------|------|------|
| Slug taken | 409 | `SLUG_TAKEN` |
| verifiedToken expired | 401 | `VERIFIED_TOKEN_EXPIRED` |
| verifiedToken already used | 401 | `VERIFIED_TOKEN_INVALID` |
| Rate limit exceeded | 429 | `REGISTER_RATE_LIMITED` |
| ownerPhone mismatch با token | 401 | `VERIFIED_TOKEN_INVALID` |
| Plan limit (future) | 403 | `PLAN_LIMIT_EXCEEDED` |

---

## تست

- [ ] Unit: valid input → `registrationRepository.register()` صدا زده می‌شود + audit + tokens
- [ ] Unit: rate limit exceeded → 429
- [ ] Unit: invalid token → 401
- [ ] Unit: slug taken → 409 `SLUG_TAKEN`
- [ ] Integration: tenant + branch + staff + roles + settings همه در DB ایجاد می‌شوند
- [ ] Integration: verifiedToken بعد از register blacklisted است
- [ ] Integration: دوباره همان verifiedToken → 401

---

## Flow

```
POST /auth/otp/request { phone, actor: staff, intent: register }
POST /auth/otp/verify  { phone, code, intent: register }  → verifiedToken
POST /tenants/register { name, slug, ownerName, ownerPhone, verifiedToken }
      ↓ validate token
      ↓ check slug unique
      ↓ $transaction: Tenant + Branch + Roles + Staff + Settings + Subscription
      ↓ audit tenant.create
      ↓ blacklist verifiedToken
      → { accessToken, refreshToken, staff, tenant }
```

---

## Policy Alignment

- [ ] EXCELLENCE-STANDARDS §8 Tenant fields (name, slug, legalName, taxId, status, timezone, locale, enabledModules, trialEndsAt)
- [ ] SOFT-DELETE-POLICY: همه entities ایجاد شده با soft delete fields
- [ ] ADR-009 (default branch isDefault: true)
- [ ] ADR-011 (phone multi-tenant — staff per-tenant، not global unique)
- [ ] ADR-015 (owner `primaryBranchId` + `dataScope: all`)

---

## مراجع

- `docs/02-architecture/tenancy-and-entities.md`
- `docs/02-architecture/rbac.md`
- `docs/09-development/EXCELLENCE-STANDARDS.md` §8 (Tenant)
- `docs/08-decisions/adr-log.md` — ADR-009, ADR-011, ADR-015

---

## Self-Review Score

| محور | /25 | یادداشت |
|------|-----|---------|
| Metadata | 10/10 | Priority, Depends, Blocks, Estimated |
| Completeness | 24/25 | Transaction steps، Input، Output، Files، Flow |
| Policy | 25/25 | ADR-009/011/015، EXCELLENCE §8، audit، blacklist |
| Executability | 24/25 | Code patterns، edge cases، integration tests |
| Alignment | 15/15 | sync با register-tenant.use-case.ts و prisma-tenant-registration |
| **جمع** | **98/100** | ≥95 ✅ |
