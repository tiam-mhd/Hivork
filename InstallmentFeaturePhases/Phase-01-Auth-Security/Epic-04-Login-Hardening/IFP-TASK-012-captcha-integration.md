# IFP-TASK-012: Captcha Integration (Login / Register / Forgot)

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 01 — Auth & Security |
| Epic | Epic-04-Login-Hardening |
| ID | IFP-012 |
| Priority | P0 |
| Depends on | Phase 0 TASK-035, TASK-055 |
| Blocks | IFP-002, IFP-003, IFP-006 |
| Estimated | 6h |

---

## هدف

یکپارچه‌سازی **Captcha** در endpointهای حساس pre-auth: OTP request، password login، forgot password، register — با provider قابل تنظیم و bypass در dev/test.

---

## معیار پذیرش

- [ ] `ICaptchaVerifier` port + Turnstile implementation (default)
- [ ] Env: `CAPTCHA_PROVIDER`, `CAPTCHA_SECRET_KEY`, `CAPTCHA_SITE_KEY`, `CAPTCHA_ENABLED`
- [ ] Verify captcha در: `POST /auth/otp/request`, `POST /auth/password/login`, `POST /auth/password/forgot/request`, register OTP
- [ ] `CAPTCHA_ENABLED=false` در dev — skip verify
- [ ] Test env: `CAPTCHA_BYPASS_TOKEN=test-bypass` header
- [ ] Frontend widget در login، register، forgot-password
- [ ] Error: 400 `AUTH_CAPTCHA_INVALID` / 400 `AUTH_CAPTCHA_REQUIRED`

---

## مشخصات فنی

### Port

```typescript
interface ICaptchaVerifier {
  verify(token: string, remoteIp?: string): Promise<CaptchaVerifyResult>;
}

type CaptchaVerifyResult = { success: true } | { success: false; errorCodes: string[] };
```

### Provider — Cloudflare Turnstile

```
POST https://challenges.cloudflare.com/turnstile/v0/siteverify
Body: secret, response (token), remoteip
```

### Request Extension

All protected endpoints accept:
```typescript
{ captchaToken?: string }  // required when CAPTCHA_ENABLED=true
```

### Feature Flag Logic

```typescript
if (!config.captchaEnabled) return ok;
if (isTestBypass(req)) return ok;
if (!captchaToken) throw AUTH_CAPTCHA_REQUIRED;
const result = await captchaVerifier.verify(captchaToken, ip);
if (!result.success) throw AUTH_CAPTCHA_INVALID;
```

### Frontend Component

```tsx
// apps/web/components/auth/captcha-widget.tsx
<Turnstile siteKey={process.env.NEXT_PUBLIC_CAPTCHA_SITE_KEY} onSuccess={setToken} />
```

Reset captcha on form error.

### Rate Limit Synergy

Captcha required after 2 failed password attempts per IP (even if global captcha off) — tenant setting `security.captcha_after_failures` default 2.

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/src/auth/ports/captcha.port.ts` |
| Create | `packages/infrastructure/auth/turnstile-captcha.verifier.ts` |
| Create | `packages/infrastructure/auth/noop-captcha.verifier.ts` |
| Update | auth use cases — inject verify |
| Create | `apps/web/components/auth/captcha-widget.tsx` |
| Update | `.env.example` |

---

## مراحل پیاده‌سازی

1. Port + Turnstile adapter
2. Config module
3. Middleware/helper `requireCaptcha()`
4. Wire endpoints
5. Frontend widget + env
6. Integration tests with bypass

---

## Edge Cases & Errors

| سناریو | Code | رفتار |
|--------|------|--------|
| Missing token when enabled | 400 `AUTH_CAPTCHA_REQUIRED` | |
| Invalid/expired captcha | 400 `AUTH_CAPTCHA_INVALID` | reset widget |
| Provider timeout | 503 `CAPTCHA_SERVICE_UNAVAILABLE` | retry |
| Dev disabled | — | skip |
| Bot score low | — | provider handles |

---

## تست

- [ ] Unit: noop verifier when disabled
- [ ] Integration: enabled + invalid token → 400
- [ ] Integration: bypass in test env
- [ ] E2E: widget renders on login (mock)

---

## UX

- [ ] Captcha above submit button
- [ ] Loading state while verifying
- [ ] fa error: «لطفاً تأیید کنید که ربات نیستید»
- [ ] Mobile-friendly Turnstile compact mode

---

## Flow

```
User fills form → completes captcha → token in state → submit with captchaToken
Fail captcha → reset widget → user retry
```

---

## Policy Alignment

- [ ] No captcha secrets in client — site key only
- [ ] PII: send IP to provider — document in privacy

---

## مراجع

- [installment-module-features.md §1](../../../docs/01-product/installment-module-features.md)
- Cloudflare Turnstile docs

---

## Self-Review Score

| محور | سقف | امتیاز |
|------|-----|--------|
| Metadata | /10 | 10 |
| Completeness | /25 | 24 |
| Policy | /25 | 23 |
| Executability | /25 | 24 |
| Alignment | /15 | 14 |
| **جمع** | **/100** | **95** |
