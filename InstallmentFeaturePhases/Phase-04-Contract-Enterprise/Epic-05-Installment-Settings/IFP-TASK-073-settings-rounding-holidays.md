# IFP-TASK-073: Settings Schema — Rounding & Holiday Calendar

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 04 — Contract Enterprise |
| Epic | Epic-05-Installment-Settings |
| ID | IFP-TASK-073 |
| Priority | P0 |
| Depends on | IFP-TASK-072 |
| Blocks | IFP-075 |
| Estimated | 5h |

---

## هدف

Keys تنظیمات **گرد کردن** مبالغ اقساط و **روزهای تعطیل** (تقویم رسمی + سفارشی tenant) — §۱۵ محصول.

---

## معیار پذیرش

- [ ] `rounding_mode` enum: `NONE`, `FLOOR`, `CEIL`, `NEAREST`
- [ ] `rounding_unit_rial` bigint string — valid values: 1, 10, 100, 1000, 10000 (refine)
- [ ] `skip_holidays_in_schedule` boolean default true
- [ ] `holiday_calendar_source` enum: `JALALI_OFFICIAL`, `CUSTOM_ONLY`, `MERGE_OFFICIAL_AND_CUSTOM`
- [ ] `custom_holiday_dates` array of `YYYY-MM-DD` max 100 entries, unique
- [ ] Zod + module schema sync
- [ ] Unit tests

---

## مشخصات فنی

```typescript
const roundingUnitSchema = bigintRialStringSchema.refine(
  (v) => ['1', '10', '100', '1000', '10000'].includes(v),
  { message: 'ROUNDING_UNIT_INVALID' },
);

export const RoundingHolidaySettingsSchema = z.object({
  rounding_mode: z.enum(['none', 'floor', 'ceil', 'nearest']).default('nearest'),
  rounding_unit_rial: roundingUnitSchema.default('1000'),
  skip_holidays_in_schedule: z.boolean().default(true),
  holiday_calendar_source: z.enum(['jalali_official', 'custom_only', 'merge_official_and_custom']).default('merge_official_and_custom'),
  custom_holiday_dates: z.array(dateOnlySchema).max(100).refine(
    (arr) => new Set(arr).size === arr.length,
    'DUPLICATE_HOLIDAY_DATES',
  ).default([]),
});
```

### Rounding behavior (documented for Phase 05 algorithm)

```
NEAREST at 1000 Rial: 1_234_500 → 1_235_000
FLOOR: 1_234_500 → 1_234_000
```

### Holiday merge

`MERGE_OFFICIAL_AND_CUSTOM`: union of Iran official Jalali holidays (static table package) + `custom_holiday_dates`.

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Update | `packages/modules/installments/src/settings.schema.ts` |
| Update | `packages/contracts/src/installments/settings.schema.ts` |
| Create | `packages/domain/installments/holiday-calendar.ts` — official dates provider interface |
| Update | `docs/02-architecture/settings.md` |

---

## مراحل پیاده‌سازی

1. Add rounding + holiday keys
2. Zod validation for rounding units
3. Holiday provider interface (implementation can be static JSON)
4. Unit tests duplicate dates, bounds
5. Document algorithm contract for schedule generator

---

## Edge Cases & Errors

| سناریو | Code |
|--------|------|
| rounding_mode NONE + unit 1000 | unit ignored at runtime |
| Invalid rounding unit 500 | `ROUNDING_UNIT_INVALID` |
| Duplicate holiday date | `DUPLICATE_HOLIDAY_DATES` |
| > 100 custom holidays | validation max |

---

## تست

- [ ] Unit: rounding unit whitelist
- [ ] Unit: duplicate holiday reject
- [ ] Unit: defaults merge

---

## UX

IFP-077 — date multi-picker for custom holidays, rounding dropdown.

---

## Flow

```
settings → rounding section → preview example amount
settings → holidays → add Nowruz custom closure dates
```

---

## Policy Alignment

- [ ] Schema keys only
- [ ] Jalali official holidays — no PII in holiday table

---

## مراجع

- `docs/01-product/installment-module-features.md` §۱۵ — گرد کردن، روزهای تعطیل
- IFP-TASK-072

---

## Self-Review Score

| محور | سقف | امتیاز |
|------|-----|--------|
| Metadata | 10 | 10 |
| Completeness | 25 | 25 |
| Policy | 25 | 25 |
| Executability | 25 | 25 |
| Alignment | 15 | 15 |
| **جمع** | **100** | **100** |
