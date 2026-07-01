# TASK-054: Vertical Slice — E2E Test

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 0 |
| Epic | Epic-10-Vertical-Slice |
| ID | TASK-054 |
| Priority | P0 |
| Depends on | TASK-001–053, TASK-055–059 |
| Blocks | Phase 1 |
| Estimated | 12h |

---

## هدف

تأیید end-to-end که تمام قطعات Phase 0 با هم کار می‌کنند: OTP → register → customer → dashboard → soft delete → restore. دو سطح: Integration (use-case مستقیم با PG واقعی) و HTTP E2E (full NestJS app با HTTP requests).

---

## معیار پذیرش

- [ ] **Integration spec** در `packages/infrastructure/src/vertical-slice/` با واقعی PostgreSQL + Redis
- [ ] **HTTP E2E spec** در `apps/api/src/vertical-slice/` با کامل NestJS app
- [ ] Flow A (New Tenant): OTP → verify → register → me → customer create → list → dashboard → soft-delete → restore
- [ ] Flow B (Demo Seed): login demo-shop → customer → dashboard count
- [ ] Cross-tenant isolation: customer از tenant A در list tenant B دیده نمی‌شود
- [ ] Soft delete: customer پس از delete در list نیست (count=0)، پس از restore برمی‌گردد (count=1)
- [ ] Tests با `describe.runIf(hasDatabase)` — skip if no DB available
- [ ] بدون mock برای DB یا Redis (real connections)
- [ ] `pnpm turbo build && pnpm turbo test` pass

---

## مشخصات فنی

### Integration Test Path

```
packages/infrastructure/src/vertical-slice/vertical-slice.integration.spec.ts
```

Use cases مستقیماً وصل می‌شوند (بدون HTTP):
```typescript
// Setup: PrismaService + RedisService + JwtTokenService
// Use cases: RequestOtpUseCase, VerifyOtpUseCase, RegisterTenantUseCase,
//            CreateTenantCustomerUseCase, ListTenantCustomersUseCase,
//            GetDashboardReportUseCase, SoftDeleteEntityUseCase, RestoreEntityUseCase
```

### HTTP E2E Test Path

```
apps/api/src/vertical-slice/vertical-slice.http.e2e.spec.ts
```

کامل NestJS app با `Test.createTestingModule([AppModule])`:
```typescript
// App setup: cookie-parser, cors, global prefix, ValidationPipe, HttpExceptionFilter
// HTTP requests با native fetch
// Redis برای خواندن OTP code در test
```

### Flow A — Full Happy Path

```
1. POST /api/v1/auth/otp/request  { phone, actor: staff, intent: register }
2. Redis: otp:staff:{phone} → code
3. POST /api/v1/auth/otp/verify   { phone, code, actor: staff, intent: register }
   → 200 { verifiedToken }
4. POST /api/v1/tenants/register  { name, slug, ownerName, ownerPhone, verifiedToken }
   → 201 { accessToken, refreshToken, staff, tenant }
5. GET  /api/v1/tenants/me
   → 200 { tenant: { slug: flowASlug } }
6. POST /api/v1/customers         { phone, name }
   → 201 { id, ... }
7. GET  /api/v1/customers
   → 200 { items: [{ id }] }  (length=1)
8. GET  /api/v1/reports/dashboard
   → 200 { customerCount: 1 }
9. DELETE /api/v1/customers/:id
   → 204
10. GET /api/v1/customers         → items length=0
11. GET /api/v1/reports/dashboard → { customerCount: 0 }
12. POST /api/v1/customers/:id/restore → 200
13. GET /api/v1/customers         → items length=1
```

### Flow B — Demo Seed Login

```
1. POST /auth/otp/request  { phone: '09120000000', actor: staff, intent: login, tenantSlug: 'demo-shop' }
2. POST /auth/otp/verify   → accessToken
3. POST /customers         → customer ایجاد
4. GET  /reports/dashboard → customerCount >= before + 1
```

### Cross-Tenant Isolation

```
1. Tenant A: create customer phoneA
2. Tenant B: create customer phoneB
3. List for tenant A: شامل phoneA باشد، phoneB نباشد
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create/Update | `packages/infrastructure/src/vertical-slice/vertical-slice.integration.spec.ts` |
| Create/Update | `apps/api/src/vertical-slice/vertical-slice.http.e2e.spec.ts` |

---

## مراحل پیاده‌سازی

1. پیاده‌سازی `runOtpRegisterFlow()` helper برای integration spec
2. Integration spec: Flow A → Flow B → cross-tenant isolation
3. HTTP E2E spec: `createApp()` helper با کامل NestJS setup
4. HTTP E2E spec: Flow A full (شامل soft delete + restore)
5. HTTP E2E spec: installments module guard test
6. Confirm هر دو spec با `DATABASE_URL` + `REDIS_URL` env vars می‌دوند

---

## Edge Cases Tested

| سناریو | تست |
|--------|------|
| Verify دوباره همان verifiedToken | ❌ باید 401 برگردد (blacklisted) |
| Register با slug تکراری | ❌ باید 409 برگردد |
| Soft delete customer از tenant دیگر | ❌ باید 404 برگردد |
| Restore customer که delete نشده | ❌ باید 409 برگردد |
| Module guard: installments endpoint | ✅ demo-shop (enabled) passes |

---

## تست

- [ ] Integration: Flow A کامل (OTP → register → customer → dashboard → soft delete → restore)
- [ ] Integration: Flow B (demo-shop login → customer → dashboard)
- [ ] Integration: Cross-tenant isolation (customer A invisible to tenant B)
- [ ] HTTP E2E: Flow A با HTTP requests (status codes بررسی می‌شوند)
- [ ] HTTP E2E: Installments stub route — entitled tenant → 200
- [ ] Unit: `runOtpRegisterFlow()` helper در isolation

---

## Flow

```
Entry: POST /auth/otp/request
  ↓ OTP verified → verifiedToken (5min)
  ↓ POST /tenants/register → JWT
  ↓ POST /customers → customer
  ↓ DELETE /customers/:id → 204 (soft delete)
  ↓ GET /customers → [] (empty)
  ↓ POST /customers/:id/restore → 200
  ↓ GET /customers → [customer] (back)
Exit: Phase 0 complete — Phase 1 ready
```

---

## Policy Alignment

- [ ] EXCELLENCE-STANDARDS §9 (testing completeness)
- [ ] SOFT-DELETE-POLICY §9 (delete → invisible → restore)
- [ ] testing-observability.md (real DB, no mocks for infra)

---

## مراجع

- `docs/06-operations/testing-observability.md`
- `docs/09-development/EXCELLENCE-STANDARDS.md` §9
- `docs/09-development/SOFT-DELETE-POLICY.md` §9

---

## Self-Review Score

| محور | /25 | یادداشت |
|------|-----|---------|
| Metadata | 10/10 | Priority, Depends, Blocks, Estimated |
| Completeness | 25/25 | هر دو spec، Flow A/B/isolation، Files، Steps |
| Policy | 25/25 | Soft delete §9، real DB، no mocks |
| Executability | 24/25 | HTTP requests کامل، edge cases، Flow diagram |
| Alignment | 14/15 | sync با vertical-slice.http.e2e.spec.ts |
| **جمع** | **98/100** | ≥95 ✅ |
