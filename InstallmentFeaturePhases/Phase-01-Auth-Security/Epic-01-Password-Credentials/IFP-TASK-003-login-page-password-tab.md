# IFP-TASK-003: Frontend Login Page — Password Tab

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 01 — Auth & Security |
| Epic | Epic-01-Password-Credentials |
| ID | IFP-003 |
| Priority | P0 |
| Depends on | IFP-002, Phase 0 login OTP tab |
| Blocks | IFP-012 (captcha UI), IFP-018 |
| Estimated | 6h |

---

## هدف

تکمیل **صفحه ورود staff** با تب «رمز عبور» در کنار تب OTP موجود (Phase 0). فرم شامل phone، password، tenant picker (conditional)، Remember Me، لینک فراموشی رمز، و همه stateهای Excellence §7.

---

## معیار پذیرش

- [ ] Route `/login` — تب‌ها: «کد یکبارمصرف» | «رمز عبور»
- [ ] فرم password: phone، password، tenantSlug (اگر 409 قبلی)، rememberMe
- [ ] Submit → `POST /api/v1/auth/password/login`
- [ ] `kind: session` → set access token + redirect `/dashboard`
- [ ] `kind: mfa_required` → navigate `/login/mfa` با mfaToken
- [ ] `kind: must_change_password` → `/auth/change-password?token=...`
- [ ] `NEED_TENANT_SLUG` → inline tenant selector + retry
- [ ] لینک «فراموشی رمز؟» → `/auth/forgot-password`
- [ ] Excellence §5 form + §7 page states
- [ ] RTL + mobile `inputMode="tel"` برای phone
- [ ] a11y: labels، aria-invalid، focus management

---

## مشخصات فنی

### Route

| Path | Component |
|------|-----------|
| `/login` | `LoginPage` — tabs OTP / Password |
| `/login/mfa` | `LoginMfaPage` (IFP-004) — placeholder OK |

### Form Fields (`PasswordLoginForm`)

| Field | Type | Validation |
|-------|------|------------|
| `phone` | tel | `phoneSchema` — fa error |
| `password` | password | required — show/hide toggle |
| `tenantSlug` | select | shown after NEED_TENANT_SLUG or multi-tenant hint |
| `rememberMe` | checkbox | default false |

### API Client

```typescript
// apps/web/lib/auth/password-login.ts
export async function passwordLogin(input: PasswordLoginInput): Promise<PasswordLoginResult>
```

### State Machine (client)

```
idle → submitting → success | error | tenant_required | mfa_required | must_change_password
```

### Tenant Picker UX

پس از 409:
- نمایش Select با `{ slug, name }` از response
- auto-retry submit با tenantSlug انتخاب‌شده

### Last Login Banner (IFP-010)

اگر `lastLogin` در response:
- Alert info: «آخرین ورود: {jalali date} از {deviceLabel}»

### Permissions

Public page — no RBAC.

### i18n Keys (fa)

- `login.password.title` — «ورود با رمز عبور»
- `login.password.forgot` — «رمز عبور را فراموش کرده‌اید؟»
- `login.errors.invalid_credentials` — «شماره یا رمز اشتباه است»

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Update | `apps/web/app/(auth)/login/page.tsx` |
| Create | `apps/web/components/auth/password-login-form.tsx` |
| Create | `apps/web/lib/auth/password-login.ts` |
| Update | `packages/contracts/src/auth/password-login.schema.ts` — shared types |
| Create | `apps/web/components/auth/login-tabs.tsx` |

---

## مراحل پیاده‌سازی

1. `LoginTabs` — preserve OTP tab از Phase 0
2. `PasswordLoginForm` با react-hook-form + zodResolver
3. API client + error mapping به فارسی
4. Tenant picker state
5. Redirect handlers برای mfa / change-password
6. Loading skeleton + error alert
7. Component tests + a11y audit

---

## Edge Cases & Errors

| سناریو | UI رفتار |
|--------|----------|
| 401 invalid credentials | inline error — clear password field |
| 423 locked | Alert + countdown از `lockedUntil` |
| 429 rate limit | Alert + retry after N seconds |
| 409 NEED_TENANT_SLUG | show tenant select |
| Network error | retry button |
| Already logged in | redirect dashboard |
| Captcha required (IFP-012) | render captcha widget before submit |

---

## تست

- [ ] Component: form validation — invalid phone
- [ ] Component: tenant picker appears on 409 mock
- [ ] E2E (IFP-018): password login happy path
- [ ] Visual: RTL layout

---

## UX

- [ ] Form Excellence §5: label، placeholder، help، fa validation، loading، server errors، unsaved N/A، a11y، RTL، mobile types
- [ ] Page Excellence §7: breadcrumb N/A، title، skeleton، empty N/A، error، no-permission N/A
- [ ] Password visibility toggle
- [ ] Submit disabled while loading
- [ ] `autocomplete="username tel"` + `autocomplete="current-password"`

---

## Flow

```
Entry: /login → tab «رمز عبور»
  → fill phone + password → Submit
  → success → /dashboard
  → mfa → /login/mfa
  → forgot link → /auth/forgot-password
  → register link → /register (existing)
```

---

## Policy Alignment

- [ ] EXCELLENCE-STANDARDS §5–7
- [ ] ADR-017 — tenant slug for multi-staff
- [ ] No permission check in UI only — API enforces

---

## مراجع

- [installment-module-features.md §1](../../../docs/01-product/installment-module-features.md)
- [IFP-TASK-002-password-login-api.md](./IFP-TASK-002-password-login-api.md)

---

## Self-Review Score

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata | /10 | 10 | |
| Completeness | /25 | 24 | full UX spec |
| Policy | /25 | 23 | Excellence |
| Executability | /25 | 24 | states covered |
| Alignment | /15 | 14 | OTP tab coexist |
| **جمع** | **/100** | **95** | Ready |
