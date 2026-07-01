# Epic-05 — Security Settings UI

> **Phase:** 01 — Auth & Security  
> **منبع محصول:** §۲۰ امنیت — تغییر رمز، 2FA، نشست‌ها، API key، دستگاه‌ها، توکن‌ها

---

## هدف Epic

صفحه **تنظیمات امنیت** و زیرصفحات: change password، MFA management، sessions، API keys، active devices + token audit UI.

---

## Tasks

| ID | فایل | عنوان | Depends | Priority |
|----|------|--------|---------|----------|
| IFP-015 | [IFP-TASK-015-security-settings-page.md](./IFP-TASK-015-security-settings-page.md) | Security settings page | IFP-005, IFP-009, IFP-002 | P0 |
| IFP-016 | [IFP-TASK-016-api-keys-management.md](./IFP-TASK-016-api-keys-management.md) | API keys (tenant integration) | IFP-001 | P1 |
| IFP-017 | [IFP-TASK-017-active-devices-audit-ui.md](./IFP-TASK-017-active-devices-audit-ui.md) | Active devices + token audit UI | IFP-009, IFP-010 | P0 |

---

## Dependency داخلی Epic

```
IFP-005 + IFP-009 → IFP-015
IFP-001 → IFP-016
IFP-009 + IFP-010 → IFP-017
```

---

## Policy notes

- Route under `/settings/security`
- Breadcrumb: تنظیمات → امنیت
- Permission-based sections — hide if no access
- API keys: show secret **once** on create

---

## مراجع

- [EXCELLENCE-STANDARDS.md](../../../docs/09-development/EXCELLENCE-STANDARDS.md) §5–7
- [installment-module-features.md §20](../../../docs/01-product/installment-module-features.md)
