# TASK-070: Contracts — Installments Settings Zod Schemas

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 1 |
| Epic | Epic-04-Installments-Contracts |
| ID | TASK-070 |
| Priority | P0 |
| Depends on | TASK-060, TASK-048, TASK-013 |
| Blocks | TASK-078, TASK-079, TASK-082, TASK-114 |
| Estimated | 4h |

---

## هدف

Zod schemas برای تنظیمات ماژول اقساط — GET response و PATCH partial update — هم‌تراز `api-contracts.md` § settings، `docs/02-architecture/settings.md`، و `installmentsSettingsSchema` از TASK-048/TASK-082. Keys فقط از schema مجاز — free-form ممنوع.

---

## معیار پذیرش

- [ ] `InstallmentsSettingsSchema` — تمام ۹ key با defaults
- [ ] `UpdateInstallmentsSettingsSchema` — partial (`.partial()` روی همه keys)
- [ ] `GetInstallmentsSettingsResponseSchema` — wrapper `{ installments: {...} }`
- [ ] `reminder_days_before` — array of int 0–30، unique، sorted desc
- [ ] `overdue_escalation_days` — array of int 1–90، unique، sorted asc
- [ ] `reminder_time` — `HH:mm` format (24h)
- [ ] `default_installment_count` — int 1–120
- [ ] `default_reminder_channels` — enum array `telegram|bale|sms`
- [ ] Boolean flags با defaults documented
- [ ] Type exports + unit tests per key validation

---

## مشخصات فنی

### Settings Schema

```typescript
// packages/contracts/src/installments/settings.schema.ts
const timeHHmmSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'INVALID_TIME_FORMAT');

const reminderDaysSchema = z
  .array(z.number().int().min(0).max(30))
  .max(10)
  .refine((arr) => new Set(arr).size === arr.length, 'DUPLICATE_VALUES')
  .transform((arr) => [...arr].sort((a, b) => b - a));

const escalationDaysSchema = z
  .array(z.number().int().min(1).max(90))
  .max(10)
  .refine((arr) => new Set(arr).size === arr.length, 'DUPLICATE_VALUES')
  .transform((arr) => [...arr].sort((a, b) => a - b));

const reminderChannelSchema = z.enum(['telegram', 'bale', 'sms']);

export const InstallmentsSettingsSchema = z.object({
  reminder_days_before: reminderDaysSchema.default([3, 1]),
  reminder_on_due_date: z.boolean().default(true),
  reminder_time: timeHHmmSchema.default('09:00'),
  overdue_escalation_days: escalationDaysSchema.default([1, 3, 7]),
  default_installment_count: z.number().int().min(1).max(120).default(12),
  allow_customer_self_report_payment: z.boolean().default(true),
  require_seller_payment_confirmation: z.boolean().default(true),
  notify_seller_on_customer_payment_report: z.boolean().default(true),
  default_reminder_channels: z
    .array(reminderChannelSchema)
    .min(1)
    .default(['telegram']),
});

export const UpdateInstallmentsSettingsSchema = InstallmentsSettingsSchema.partial();

export const GetInstallmentsSettingsResponseSchema = z.object({
  installments: InstallmentsSettingsSchema,
});

export type InstallmentsSettingsDto = z.infer<typeof InstallmentsSettingsSchema>;
export type UpdateInstallmentsSettingsDto = z.infer<typeof UpdateInstallmentsSettingsSchema>;
```

### GET Response Example

```json
{
  "data": {
    "installments": {
      "reminder_days_before": [3, 1],
      "reminder_on_due_date": true,
      "reminder_time": "09:00",
      "overdue_escalation_days": [1, 3, 7],
      "default_installment_count": 12,
      "allow_customer_self_report_payment": true,
      "require_seller_payment_confirmation": true,
      "notify_seller_on_customer_payment_report": true,
      "default_reminder_channels": ["telegram"]
    }
  },
  "meta": { "requestId": "uuid" }
}
```

### PATCH Request Example

```json
{
  "reminder_days_before": [5, 2, 1],
  "default_installment_count": 6,
  "require_seller_payment_confirmation": false
}
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/contracts/src/installments/settings.schema.ts` |
| Create | `packages/contracts/src/installments/settings.schema.spec.ts` |
| Update | `packages/contracts/src/installments/index.ts` |
| Align | `packages/modules/installments/src/settings.schema.ts` — keys must match |

---

## مراحل پیاده‌سازی

1. Define time and array validators
2. Implement `InstallmentsSettingsSchema` with all 9 keys + defaults
3. Implement `UpdateInstallmentsSettingsSchema` as partial
4. Implement response wrapper schema
5. Unit tests: valid PATCH partial، invalid time، duplicate days، count bounds
6. Verify key names match `settings.schema.ts` in modules/installments
7. Export from contracts index

---

## Edge Cases & Errors

| سناریو | Code | رفتار |
|--------|------|--------|
| `reminder_time` = "25:00" | `INVALID_TIME_FORMAT` | regex fail |
| `reminder_days_before` = [3, 3] | `DUPLICATE_VALUES` | refine fail |
| `default_installment_count` = 0 | min(1) fail | validation |
| `default_installment_count` = 121 | max(120) fail | validation |
| `default_reminder_channels` = [] | min(1) fail | validation |
| Unknown key in PATCH | strip via `.strict()` on wrapper | 400 if strict |
| `overdue_escalation_days` = [0] | min(1) fail | validation |

---

## تست

- [ ] Unit: full settings parse with defaults
- [ ] Unit: partial update single key
- [ ] Unit: invalid reminder_time → fail
- [ ] Unit: duplicate reminder_days → fail
- [ ] Unit: default_installment_count bounds
- [ ] Unit: empty channels array → fail
- [ ] Unit: escalation days sorted asc after transform

---

## UX

N/A — consumed by TASK-114 (frontend settings page).

---

## Flow

N/A

---

## Policy Alignment

- [ ] Settings schema keys only — no free-form tenant rules (ADR invariant)
- [ ] EXCELLENCE-STANDARDS §3 — settings validation at boundary
- [ ] Sync with `docs/02-architecture/settings.md`

---

## مراجع

- `docs/02-architecture/api-contracts.md` § GET settings
- `docs/02-architecture/settings.md`
- `Phases/Phase-1-Seller-Panel/Epic-06-Installments-API/TASK-082-api-installments-settings.md`
- `docs/08-decisions/adr-log.md` — settings vs invariants

---

## Self-Review Score

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata | 10 | 10 | ✓ |
| Completeness | 25 | 25 | 9 keys، partial PATCH، examples |
| Policy | 25 | 25 | schema keys only |
| Executability | 25 | 25 | 7 tests، edge table |
| Alignment | 15 | 15 | api-contracts + TASK-082 sync |
| **جمع** | **100** | **100** | ≥95 ✅ |
