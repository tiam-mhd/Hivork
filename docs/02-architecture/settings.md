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
  // §15 — calculation formula, penalty, interest (IFP-072; schema v1.1.0)
  calculation_formula: {
    type: 'enum',
    values: ['equal_installments', 'declining_balance', 'custom'],
    default: 'equal_installments',
    description: 'فرمول محاسبه اقساط — custom reserved for Phase 05',
  },
  penalty_type: {
    type: 'enum',
    values: ['none', 'fixed_daily', 'percent_daily', 'percent_monthly'],
    default: 'none',
  },
  penalty_rate_bps: {
    type: 'int',
    default: 0,
    min: 0,
    max: 10000,
    description: 'نرخ جریمه (basis points) — required when penalty_type is percent_*',
  },
  penalty_fixed_rial: {
    type: 'bigint',
    default: '0',
    description: 'مبلغ ثابت روزانه — required when penalty_type is fixed_daily',
  },
  penalty_grace_days: {
    type: 'int',
    default: 0,
    min: 0,
    max: 30,
  },
  interest_rate_bps_annual: {
    type: 'int',
    default: 0,
    min: 0,
    max: 10000,
    description: 'نرخ سود سالانه (basis points)',
  },
  interest_calculation_method: {
    type: 'enum',
    values: ['simple', 'none'],
    default: 'none',
  },
  // §15 — rounding + holidays (IFP-073; schema v1.2.0)
  rounding_mode: {
    type: 'enum',
    values: ['none', 'floor', 'ceil', 'nearest'],
    default: 'nearest',
    description: 'گرد کردن مبلغ اقساط — none: بدون گرد کردن',
  },
  rounding_unit_rial: {
    type: 'bigint',
    values: ['1', '10', '100', '1000', '10000'],
    default: '1000',
    description: 'واحد گرد کردن (ریال) — ignored when rounding_mode is none',
  },
  skip_holidays_in_schedule: {
    type: 'boolean',
    default: true,
    description: 'جابجایی سررسید از روز تعطیل',
  },
  holiday_calendar_source: {
    type: 'enum',
    values: ['jalali_official', 'custom_only', 'merge_official_and_custom'],
    default: 'merge_official_and_custom',
  },
  custom_holiday_dates: {
    type: 'date[]',
    format: 'YYYY-MM-DD',
    max: 100,
    default: [],
    description: 'تعطیلات سفارشی tenant — unique dates',
  },
  // §15 — calendar + contract numbering (IFP-074; schema v1.3.0)
  calendar_display_mode: {
    type: 'enum',
    values: ['jalali', 'gregorian', 'both'],
    default: 'jalali',
  },
  calendar_input_mode: {
    type: 'enum',
    values: ['jalali', 'gregorian'],
    default: 'jalali',
  },
  contract_numbering_enabled: {
    type: 'boolean',
    default: true,
  },
  contract_number_prefix: {
    type: 'string',
    default: 'CTR',
    minLength: 1,
    maxLength: 20,
  },
  contract_number_suffix: {
    type: 'string',
    optional: true,
    maxLength: 20,
  },
  contract_number_pad_length: {
    type: 'int',
    default: 6,
    min: 4,
    max: 10,
  },
  contract_number_include_year: {
    type: 'boolean',
    default: true,
    description: 'سال جلالی وقتی display = jalali/both؛ سال میلادی وقتی display = gregorian',
  },
}
```

Rounding behavior (Phase 05 schedule generator):

| Mode | Unit | Example |
|------|------|---------|
| `nearest` | 1000 Rial | 1_234_500 → 1_235_000 |
| `floor` | 1000 Rial | 1_234_500 → 1_234_000 |
| `ceil` | 1000 Rial | 1_234_500 → 1_235_000 |
| `none` | any | amount unchanged (unit ignored) |

Holiday merge (`merge_official_and_custom`): union of Iran official Jalali holidays (`OfficialHolidayCalendarProvider` in `@hivork/domain`) + `custom_holiday_dates`.

Contract number format examples:

| Settings | Output |
|----------|--------|
| prefix=CTR, year=1404, pad=6, seq=42 | `CTR-1404-000042` |
| prefix=SH, no year, pad=4, seq=7 | `SH-0007` |

`contract_number_next_sequence` is server-managed and read-only: returned in GET for admin display, excluded from PATCH body, and guarded in application code via `READONLY_INSTALLMENTS_SETTING_KEYS`.

Cross-field validation (Zod `superRefine` in `packages/contracts/src/installments/settings.schema.ts`):

| Condition | Error code |
|-----------|------------|
| `penalty_type = fixed_daily` and `penalty_fixed_rial = 0` | `PENALTY_FIXED_REQUIRED` |
| `penalty_type` starts with `percent` and `penalty_rate_bps = 0` | `PENALTY_RATE_REQUIRED` |
| `rounding_unit_rial` not in whitelist | `ROUNDING_UNIT_INVALID` |
| duplicate entry in `custom_holiday_dates` | `DUPLICATE_HOLIDAY_DATES` |

Algorithm consumption (overdue penalty accrual, interest on balance, rounding, holiday skip, contract number allocation) is implemented in later phases — settings only define typed keys and read models here.

Schema version: `1.3.0` (`INSTALLMENTS_SETTINGS_SCHEMA_VERSION` in `@hivork/contracts`).

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
