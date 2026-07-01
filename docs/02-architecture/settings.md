# سیستم تنظیمات (Settings)

## سه نوع Setting

| نوع | چه کسی | Scope |
|-----|--------|-------|
| **Platform Settings** | Platform Admin | کل platform |
| **Tenant Settings** | owner / manager | یک tenant |
| **Branch Settings** | manager (با permission) | override محدود |

---

## Branch Override Rule

Branch فقط **subset** از tenant settings را override می‌کند — نه settings جدید arbitrary.

```
Effective Setting = Branch override ?? Tenant value ?? Schema default
```

---

## Settings vs Invariant Rules

| | Settings | Invariant Rules |
|---|----------|-----------------|
| **قابل تغییر tenant** | ✅ | ❌ |
| **مثال** | روزهای یادآور | paid installment حذف نشود |
| **ذخیره** | settings table / JSON typed | کد domain |
| **تست** | per combination | unit test ثابت |

> **تأیید شده:** tenant نمی‌تواند rule مثل «معوق = paid» تعریف کند.

---

## Schema-Based Settings

هر setting: type، default، validation، description (fa).

### Core Tenant Settings

```typescript
{
  timezone: {
    type: 'enum',
    values: ['Asia/Tehran'],
    default: 'Asia/Tehran',
  },
  display_currency: {
    type: 'enum',
    values: ['toman', 'rial'],
    default: 'toman',
  },
  default_branch_required: {
    type: 'boolean',
    default: true,
  },
}
```

### Installments Module Settings

```typescript
{
  reminder_days_before: {
    type: 'int[]',
    default: [3, 1],
    min: 0,
    max: 30,
    description: 'چند روز قبل از سررسید یادآور بفرست',
  },
  reminder_on_due_date: {
    type: 'boolean',
    default: true,
  },
  reminder_time: {
    type: 'time',
    default: '09:00',
    timezone: 'Asia/Tehran',
  },
  overdue_escalation_days: {
    type: 'int[]',
    default: [1, 3, 7],
    description: 'روزهای بعد از سررسید برای یادآور معوق',
  },
  default_installment_count: {
    type: 'int',
    default: 12,
    min: 1,
    max: 120,
  },
  allow_customer_self_report_payment: {
    type: 'boolean',
    default: true,
  },
  require_seller_payment_confirmation: {
    type: 'boolean',
    default: true,
  },
  notify_seller_on_customer_payment_report: {
    type: 'boolean',
    default: true,
  },
  default_reminder_channels: {
    type: 'enum[]',
    values: ['telegram', 'bale', 'sms'],
    default: ['telegram'],
  },
}
```

---

## Settings Storage

```typescript
TenantSetting {
  tenant_id
  module: 'core' | 'installments'
  key: string
  value: JSON            // validated against schema
  updated_by: staff_id
  updated_at
}

BranchSetting {
  branch_id
  module
  key
  value: JSON            // only keys allowed for branch override
}
```

---

## Settings API

```
GET  /api/v1/tenants/me/settings?module=installments
PUT  /api/v1/tenants/me/settings/installments/reminder_days_before
GET  /api/v1/branches/:id/settings
```

Validation: Zod schema از `packages/modules/installments/settings.schema.ts`

---

## Feature Flags (جدا از Settings)

```
TenantFeatureFlag {
  tenant_id
  flag: 'installments.beta.export_pdf'
  enabled: boolean
}
```

برای rollout تدریجی — Unleash self-hosted (فاز ۲+).
