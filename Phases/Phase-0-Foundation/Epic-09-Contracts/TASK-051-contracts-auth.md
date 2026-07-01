# TASK-051: Contracts — Auth Zod Schemas

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 0 |
| Epic | Epic-09-Contracts |
| ID | TASK-051 |
| Priority | P0 |
| Depends on | TASK-013 (contracts pkg setup), TASK-039 (phone schema), TASK-055 (OTP/auth flow) |
| Blocks | TASK-035, TASK-036, TASK-007, TASK-057 |
| Estimated | 4h |

---

## هدف

Zod schemas برای تمام flow‌های احراز هویت (OTP request، OTP verify، register tenant، auth response). این schemas هم در `apps/api` (validation) و هم در `apps/web` (form validation) استفاده می‌شوند — single source of truth.

---

## معیار پذیرش

- [ ] `OtpRequestSchema` — phone، actor، intent، tenantSlug optional
- [ ] `OtpVerifySchema` — phone، code (5 digits)، actor، intent، tenantSlug + `.superRefine` validation
- [ ] `VerifiedTokenResponseSchema` — برای intent=register
- [ ] `AuthResponseSchema` — برای login response (staff یا customer)
- [ ] `RegisterTenantSchema` (re-export یا import از tenant/)
- [ ] `LogoutSchema` (optional — refresh token body)
- [ ] همه schemas از `phoneSchema` shared استفاده می‌کنند
- [ ] Type exports: `type Dto = z.infer<typeof Schema>` برای هر schema
- [ ] هیچ NestJS یا Prisma import در contracts package

---

## مشخصات فنی

### Schemas

```typescript
// packages/contracts/src/auth/otp-request.schema.ts
export const OtpRequestSchema = z.object({
  phone: phoneSchema,
  actor: z.enum(['staff', 'customer']),
  intent: z.enum(['login', 'register']).default('login'),
  tenantSlug: z.string().min(3).max(50).optional(), // required when actor=staff & intent=login
});

// packages/contracts/src/auth/otp-verify.schema.ts
export const OtpVerifySchema = z.object({
  phone: phoneSchema,
  code: z.string().length(5).regex(/^\d+$/),
  actor: z.enum(['staff', 'customer']),
  intent: z.enum(['login', 'register']).default('login'),
  tenantSlug: z.string().min(3).max(50).optional(),
}).superRefine((val, ctx) => {
  if (val.actor === 'staff' && val.intent === 'login' && !val.tenantSlug) {
    ctx.addIssue({ code: 'custom', message: 'tenantSlug required for staff login' });
  }
});

// packages/contracts/src/auth/verified-token-response.schema.ts
export const VerifiedTokenResponseSchema = z.object({
  verifiedToken: z.string(),
  expiresIn: z.number().int().positive(), // seconds (default 300)
});

// packages/contracts/src/auth/auth-response.schema.ts
export const AuthResponseSchema = z.object({
  accessToken: z.string(),
  expiresIn: z.number().int().positive(),
  refreshToken: z.string().optional(),   // httpOnly cookie preferred
  staff: z.object({
    id: z.string().uuid(),
    tenantId: z.string().uuid(),
    name: z.string(),
  }).optional(),
  customer: z.object({
    id: z.string().uuid(),
    phone: phoneSchema,
    name: z.string().nullable(),
  }).optional(),
  tenant: z.object({
    id: z.string().uuid(),
    slug: z.string(),
    name: z.string(),
  }).optional(),
});
```

### Flow Alignment

| Flow | OTP request | OTP verify response |
|------|-------------|---------------------|
| A — register tenant | intent=register, actor=staff | `VerifiedTokenResponse` |
| B — staff login | intent=login, tenantSlug | `AuthResponse` |
| C — customer login | actor=customer | `AuthResponse` |

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create/Update | `packages/contracts/src/auth/otp-request.schema.ts` |
| Create/Update | `packages/contracts/src/auth/otp-verify.schema.ts` |
| Create/Update | `packages/contracts/src/auth/verified-token-response.schema.ts` |
| Create/Update | `packages/contracts/src/auth/auth-response.schema.ts` |
| Create/Update | `packages/contracts/src/auth/index.ts` |
| Update | `packages/contracts/src/index.ts` |

---

## مراحل پیاده‌سازی

1. ایجاد `otp-request.schema.ts` و `otp-verify.schema.ts` با `superRefine`
2. ایجاد `verified-token-response.schema.ts` برای register flow
3. ایجاد `auth-response.schema.ts` با staff/customer/tenant optional fields
4. Export types از هر schema
5. Update `index.ts` exports
6. Unit tests: valid، invalid، superRefine cases

---

## Edge Cases & Validation

| سناریو | رفتار |
|--------|--------|
| `code` غیر numeric | `z.string().regex(/^\d+$/)` → fail |
| `code` طول ≠ 5 | `.length(5)` → fail |
| actor=staff + intent=login + بدون tenantSlug | `superRefine` → fail |
| `actor=customer` + tenantSlug داده شده | مجاز (ignored) |

---

## تست

- [ ] Unit: `OtpRequestSchema` valid — phone correct format
- [ ] Unit: `OtpVerifySchema` staff login بدون tenantSlug → fail
- [ ] Unit: `OtpVerifySchema` staff register بدون tenantSlug → pass (ok)
- [ ] Unit: code با حروف → fail
- [ ] Unit: `AuthResponseSchema` parse با هر دو staff و customer optional

---

## Policy Alignment

- [ ] TASK-055 flow parity — همه paths از OTP flow پوشش داده شده
- [ ] ADR-011 actor separation (staff/customer tokens جدا)
- [ ] Contracts package: فقط Zod — بدون NestJS/Prisma

---

## مراجع

- `docs/02-architecture/api-contracts.md`
- `docs/06-operations/security-and-audit.md`
- `docs/08-decisions/adr-log.md` — ADR-011

---

## Self-Review Score

| محور | /25 | یادداشت |
|------|-----|---------|
| Metadata | 10/10 | Priority, Depends, Blocks, Estimated |
| Completeness | 25/25 | هر schema کامل، Flow table، Files، Steps |
| Policy | 25/25 | ADR-011، no NestJS در contracts، phoneSchema shared |
| Executability | 24/25 | superRefine documented، edge cases، unit tests |
| Alignment | 15/15 | sync با TASK-055 flow و auth.controller.ts |
| **جمع** | **99/100** | ≥95 ✅ |
