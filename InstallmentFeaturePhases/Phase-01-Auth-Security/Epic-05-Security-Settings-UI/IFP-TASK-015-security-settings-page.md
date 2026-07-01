# IFP-TASK-015: Security Settings Page

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 01 — Auth & Security |
| Epic | Epic-05-Security-Settings-UI |
| ID | IFP-015 |
| Priority | P0 |
| Depends on | IFP-005, IFP-009, IFP-002, IFP-014 |
| Blocks | IFP-017, IFP-018 |
| Estimated | 10h |

---

## هدف

صفحه مرکزی **تنظیمات امنیت** staff: تغییر رمز عبور، مدیریت 2FA (TOTP)، لینک به نشست‌ها و تغییر شماره — با APIهای self-service و Excellence کامل.

---

## معیار پذیرش

- [ ] Route `/settings/security` — dashboard layout
- [ ] Section Change Password → `POST /api/v1/staff/me/password/change`
- [ ] Section 2FA — enable/disable TOTP (IFP-005 APIs) + status badge
- [ ] Section Sessions — link to `/settings/security/sessions` (IFP-017)
- [ ] Section Change Phone — link IFP-007
- [ ] Section IP Allowlist — IFP-014 (if `core.settings.edit`)
- [ ] Breadcrumb، title، skeleton/error/empty states
- [ ] `mustChangePassword` redirect gate — force change before dashboard

---

## مشخصات فنی

### Routes

| Path | Page |
|------|------|
| `/settings/security` | `SecuritySettingsPage` |
| `/settings/security/change-password` | `ChangePasswordPage` |
| `/settings/security/mfa` | `MfaSettingsPage` |

### API — Change Password

```
POST /api/v1/staff/me/password/change
Auth: @RequireAuth staff
Body: {
  currentPassword: string;
  newPassword: string;
  newPasswordConfirm: string;
}
Response: { success: true }
```

Rules:
- Verify `currentPassword` against UserCredential
- Cannot reuse last 3 passwords
- On success: revoke other sessions (optional keep current — query `revokeOthers=true` default)
- Audit: `security.password.changed`

Errors:
| Code | HTTP |
|------|------|
| `AUTH_INVALID_CREDENTIALS` | 401 |
| `AUTH_PASSWORD_TOO_WEAK` | 400 |
| `AUTH_PASSWORD_REUSED` | 400 |

### API — MFA Status

```
GET /api/v1/staff/me/mfa/status
Response: {
  totpEnabled: boolean;
  otpStepUpEnabled: boolean;
  backupCodesRemaining: number;
}
```

### Forced Password Change Page

Route: `/auth/change-password`
Auth: `changePasswordToken` (from login) OR authenticated with `mustChangePassword`

```
POST /api/v1/auth/password/change-required
Body: { changePasswordToken?, currentPassword?, newPassword, newPasswordConfirm }
```

### Permissions

| Section | Permission |
|---------|------------|
| Change password | authenticated self |
| MFA | authenticated self |
| IP allowlist | `core.settings.edit` |

### Page Structure

```
SecuritySettingsPage
├── PasswordCard (change link / inline form)
├── MfaCard (status + setup link)
├── SessionsCard (summary count + link)
├── PhoneCard (change phone link)
└── IpAllowlistCard (conditional permission)
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/web/app/(dashboard)/settings/security/page.tsx` |
| Create | `apps/web/app/(dashboard)/settings/security/change-password/page.tsx` |
| Create | `apps/web/app/(dashboard)/settings/security/mfa/page.tsx` |
| Create | `apps/web/components/settings/security/*.tsx` |
| Create | `packages/application/src/auth/change-password.use-case.ts` |
| Create | `apps/api/src/staff/staff-password.controller.ts` |
| Create | `packages/contracts/src/auth/change-password.schema.ts` |
| Update | `apps/web/lib/navigation/settings-nav.ts` |

---

## مراحل پیاده‌سازی

1. Change password use case + API
2. Security settings page shell
3. MFA subpage with QR flow (IFP-005)
4. Change password form
5. IP allowlist card (IFP-014)
6. mustChangePassword middleware in web
7. Component + E2E tests

---

## Edge Cases & Errors

| سناریو | UI |
|--------|-----|
| Wrong current password | inline error |
| MFA enable mid-session | refresh status |
| No permission IP section | hide card |
| mustChangePassword | block nav — only change password |
| Session expired | redirect login |

---

## تست

- [ ] Integration: change password API
- [ ] Component: form validation
- [ ] E2E: change password flow (IFP-018)
- [ ] RBAC: IP section hidden without settings.edit

---

## UX

- [ ] Excellence §5: all password fields with show/hide
- [ ] Excellence §7: breadcrumb «تنظیمات / امنیت»
- [ ] Section cards with icons
- [ ] 2FA status: سبز «فعال» / خاکستری «غیرفعال»
- [ ] Confirm dialog on MFA disable
- [ ] RTL layout
- [ ] Mobile stacked cards

---

## Flow

```
Dashboard → Settings → Security
  → Change password → submit → toast success
  → Enable 2FA → QR → verify → backup codes
  → View sessions → IFP-017
```

---

## Policy Alignment

- [ ] EXCELLENCE §5–7
- [ ] Audit password change
- [ ] ADR-017 User credential
- [ ] SOFT-DELETE N/A

---

## مراجع

- [installment-module-features.md §20](../../../docs/01-product/installment-module-features.md)
- [IFP-TASK-005-totp-2fa-setup.md](../Epic-02-OTP-MFA/IFP-TASK-005-totp-2fa-setup.md)

---

## Self-Review Score

| محور | سقف | امتیاز |
|------|-----|--------|
| Metadata | /10 | 10 |
| Completeness | /25 | 25 |
| Policy | /25 | 24 |
| Executability | /25 | 24 |
| Alignment | /15 | 14 |
| **جمع** | **/100** | **97** |
