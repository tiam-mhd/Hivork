# IFP-TASK-014: IP Allowlist for Tenant (Optional Setting)

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 01 — Auth & Security |
| Epic | Epic-04-Login-Hardening |
| ID | IFP-014 |
| Priority | P1 |
| Depends on | IFP-002, core settings (TASK-047) |
| Blocks | — |
| Estimated | 6h |

---

## هدف

تنظیم اختیاری **IP allowlist** per tenant: فقط IPهای مجاز می‌توانند staff آن tenant را login کنند — ذخیره در settings schema + enforce در auth use cases.

---

## معیار پذیرش

- [ ] Settings key `security.ip_allowlist.enabled` (boolean, default false)
- [ ] Settings key `security.ip_allowlist.cidrs` (string[], CIDR or single IP)
- [ ] `GET/PATCH /api/v1/settings/security` — tenant owner / `core.settings.edit`
- [ ] Check در `PasswordLoginUseCase` + `VerifyOtpUseCase` (staff login) بعد از tenant resolve
- [ ] 403 `AUTH_IP_NOT_ALLOWED` با پیام فارسی
- [ ] Bypass for platform admin support (env `IP_ALLOWLIST_BYPASS_TOKEN` — internal only)
- [ ] Audit: `security.ip_allowlist.denied` / `settings.security.changed`

---

## مشخصات فنی

### Settings Schema

```typescript
// modules/core/src/settings.schema.ts
security: {
  ip_allowlist: {
    enabled: z.boolean().default(false),
    cidrs: z.array(z.string().regex(/^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/)).max(50).default([]),
  },
}
```

### CIDR Matcher

Use `ipaddr.js`:
```typescript
function isIpAllowed(clientIp: string, cidrs: string[]): boolean {
  if (cidrs.length === 0) return true;
  return cidrs.some(cidr => ipaddr.parse(clientIp).match(ipaddr.parseCIDR(cidr)));
}
```

### Client IP Extraction

Trust `X-Forwarded-For` only behind trusted proxy — `TRUSTED_PROXY_HOPS=1` env.

### API — Settings Security

```
GET  /api/v1/settings/security
PATCH /api/v1/settings/security
Permission: core.settings.edit
Module: @RequireModule('core')

Body (PATCH):
{
  "ipAllowlist": {
    "enabled": true,
    "cidrs": ["1.2.3.4", "10.0.0.0/8"]
  }
}
```

### Login Check Placement

```typescript
// After tenantId known:
const settings = await settingsRepo.getSecurity(tenantId);
if (settings.ipAllowlist.enabled && !isIpAllowed(ip, settings.ipAllowlist.cidrs)) {
  audit('security.ip_allowlist.denied', ...);
  throw AUTH_IP_NOT_ALLOWED;
}
```

### IPv6

Support IPv6 CIDR in v2 — v1 document IPv4 only; IPv6 passes if allowlist enabled and empty → block? **Rule:** empty cidrs + enabled → block all logins until configured (fail-safe).

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Update | `modules/core/src/settings.schema.ts` |
| Create | `packages/infrastructure/security/ip-allowlist.service.ts` |
| Update | `packages/application/src/auth/password-login.use-case.ts` |
| Update | `packages/application/src/auth/verify-otp.use-case.ts` |
| Create | `apps/api/src/settings/security-settings.controller.ts` |
| Create | `packages/contracts/src/settings/security-settings.schema.ts` |

---

## مراحل پیاده‌سازی

1. Settings schema + validation
2. IpAllowlistService
3. Security settings API
4. Hook login use cases
5. UI in IFP-015 section
6. Integration tests

---

## Edge Cases & Errors

| سناریو | Code | رفتار |
|--------|------|--------|
| enabled + empty cidrs | — | deny all — show setup warning in UI |
| Invalid CIDR in PATCH | 400 `VALIDATION_ERROR` | |
| IP changes (dynamic) | — | tenant owner responsibility |
| Customer login | — | not affected — staff only |
| Already logged in staff | — | allow refresh; block new login |

---

## تست

- [ ] Integration: allowlist blocks wrong IP
- [ ] Integration: disabled → any IP
- [ ] Integration: CIDR range match
- [ ] RBAC: only settings.edit can PATCH

---

## UX

- [ ] Settings → Security → IP allowlist toggle + textarea (one IP per line)
- [ ] Warning when enabling with empty list
- [ ] Display current client IP for admin reference
- [ ] Excellence §5

---

## Flow

```
Tenant owner enables allowlist → adds office IPs
Staff login from home → 403 AUTH_IP_NOT_ALLOWED
Staff from office → success
```

---

## Policy Alignment

- [ ] Settings schema only — no free-form rules
- [ ] Audit denied attempts
- [ ] ADR-016 `/api/v1/settings/security`

---

## مراجع

- [installment-module-features.md §20](../../../docs/01-product/installment-module-features.md)
- [IFP-TASK-002-password-login-api.md](../Epic-01-Password-Credentials/IFP-TASK-002-password-login-api.md)

---

## Self-Review Score

| محور | سقف | امتیاز |
|------|-----|--------|
| Metadata | /10 | 10 |
| Completeness | /25 | 24 |
| Policy | /25 | 24 |
| Executability | /25 | 24 |
| Alignment | /15 | 14 |
| **جمع** | **/100** | **96** |
