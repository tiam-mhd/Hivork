# IFP-TASK-030: i18n fa-IR/en Scaffold + Jalali/Gregorian Date Picker

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 02 — Cross-Cutting UI |
| Epic | Epic-05-Theme-i18n-a11y |
| ID | IFP-TASK-030 |
| Priority | P0 |
| Depends on | IFP-TASK-029 |
| Blocks | IFP-TASK-022 date filters, IFP-TASK-026 print dates, all forms |
| Estimated | 14h |

---

## هدف

Scaffold **i18n** دو زبانه fa-IR (پیش‌فرض) و en — با `next-intl` یا معادل — و کامپوننت **DatePicker** با سوئیچ تقویم **شمسی (جلالی)** / **میلادی**. پایه برای فیلترهای تاریخ، فرم‌ها، و header چاپ.

---

## معیار پذیرش

- [ ] Locale setup: `fa-IR` default, `en` secondary
- [ ] Message files: `apps/web/messages/fa.json`, `en.json`
- [ ] Shared keys package: `packages/i18n` — common labels (save, cancel, errors)
- [ ] `LocaleSwitcher` in header (optional for staff — persists preference)
- [ ] `useLocale()` + `useTranslations()` in components — no hardcoded fa in shared UI
- [ ] `DatePicker` component — single date + range mode
- [ ] Calendar mode: `jalali` | `gregorian` — user preference `localStorage` + staff metadata optional
- [ ] Display: fa locale → digits Persian optional setting
- [ ] Value contract: ISO `YYYY-MM-DD` UTC date-only in API — conversion at boundary
- [ ] Integration: FilterBuilder date fields use DatePicker
- [ ] Timezone: tenant `timezone` (default `Asia/Tehran`) for display
- [ ] Dependencies: `date-fns` + `date-fns-jalali` or `@internationalized/date` — document choice

---

## مشخصات فنی

### i18n Structure

```
packages/i18n/
├── src/
│   ├── locales.ts          # ['fa-IR', 'en']
│   ├── config.ts
│   └── messages/
│       ├── fa.json
│       └── en.json
apps/web/
├── messages/               # page-specific overrides
│   ├── fa.json
│   └── en.json
└── src/i18n/request.ts     # next-intl server config
```

### Next.js Integration

```typescript
// apps/web/src/middleware.ts
export default createMiddleware({
  locales: ['fa', 'en'],
  defaultLocale: 'fa',
  localePrefix: 'as-needed', // fa has no prefix
});
```

Routes:
- `/admin/...` — fa default
- `/en/admin/...` — English

### LocaleSwitcher

```
apps/web/src/components/layout/locale-switcher.tsx
```

Persists `hivork-locale` in localStorage; syncs with URL prefix.

### DatePicker API

```typescript
// apps/web/src/components/date-picker/date-picker.tsx
interface DatePickerProps {
  value?: string; // ISO date-only YYYY-MM-DD
  onChange: (value: string | undefined) => void;
  mode?: 'single' | 'range';
  rangeValue?: { from?: string; to?: string };
  onRangeChange?: (range: { from?: string; to?: string }) => void;
  calendar?: 'jalali' | 'gregorian'; // override user pref
  minDate?: string;
  maxDate?: string;
  disabled?: boolean;
  placeholder?: string;
}
```

### Calendar Preference

```typescript
// hooks/use-calendar-preference.ts
type CalendarPreference = 'jalali' | 'gregorian';
// default jalali for fa-IR, gregorian for en — user can override
```

### Conversion Utilities

```typescript
// packages/i18n/src/dates.ts
export function isoToJalaliDisplay(iso: string, locale: string): string;
export function jalaliInputToIso(jy: number, jm: number, jd: number): string;
export function parseIsoDateOnly(iso: string): Date; // UTC midnight
```

**Rule:** API always ISO date-only; UI displays per calendar.

### FilterBuilder Integration

```tsx
// filter-value-input.tsx for type date
<DatePicker value={value} onChange={setValue} />
// between → two DatePickers
```

### Tenant Timezone

```typescript
const tz = tenant.settings.timezone ?? 'Asia/Tehran';
// display timestamps with formatInTimeZone from date-fns-tz
```

### Message Key Examples

```json
{
  "common.save": "ذخیره",
  "common.cancel": "انصراف",
  "dataTable.empty": "موردی یافت نشد",
  "datePicker.placeholder": "انتخاب تاریخ",
  "calendar.jalali": "شمسی",
  "calendar.gregorian": "میلادی"
}
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/i18n/package.json` + src structure |
| Create | `packages/i18n/src/messages/fa.json`, `en.json` |
| Create | `packages/i18n/src/dates.ts` |
| Create | `apps/web/src/components/date-picker/date-picker.tsx` |
| Create | `apps/web/src/components/date-picker/calendar-panel.tsx` |
| Create | `apps/web/src/hooks/use-calendar-preference.ts` |
| Create | `apps/web/src/components/layout/locale-switcher.tsx` |
| Update | `apps/web/src/middleware.ts` |
| Update | `apps/web/src/components/filter-builder/filter-value-input.tsx` |
| Update | `apps/web/next.config.ts` — next-intl plugin |

---

## مراحل پیاده‌سازی

1. packages/i18n scaffold + common messages
2. next-intl middleware + provider
3. Date conversion utilities + tests
4. DatePicker single mode (jalali)
5. Gregorian toggle + range mode
6. LocaleSwitcher
7. Wire FilterBuilder date fields
8. Migrate DataTable empty/error strings to t()
9. Document date contract in LIST-API-PATTERN.md

---

## Edge Cases & Errors

| سناریو | رفتار |
|--------|--------|
| Invalid jalali date 1405/13/40 | Inline validation |
| Leap year Esfand 30 | Correct jalali lib handling |
| Range from > to | Block apply |
| DST edge (Tehran) | date-only avoids DST issues |
| en locale + jalali calendar | Allowed — user preference |

---

## تست

- [ ] Unit: jalali ↔ iso roundtrip sample dates
- [ ] Unit: isoToJalaliDisplay known dates
- [ ] Component: DatePicker emits ISO on select
- [ ] Component: range validation
- [ ] Integration: filter with date between queries correct UTC bounds

---

## UX

### Form — Excellence §5

- [ ] Label «از تاریخ» / «تا تاریخ»
- [ ] Calendar popover RTL
- [ ] Keyboard navigation in calendar
- [ ] Mobile native fallback optional `type="date"` for en only

---

## Flow

```
User opens date filter → DatePicker (jalali default)
  → select day → ISO stored in AST
  → API receives ISO → backend startOfDay/endOfDay in tenant TZ
Switch calendar → UI redraw → same ISO semantics
Switch locale → messages change → URL prefix /en
```

---

## Policy Alignment

- [ ] EXCELLENCE §5 — labels, validation fa/en
- [ ] ADR-007 — dates separate from money
- [ ] Tenant timezone from settings schema

---

## مراجع

- `IFP-TASK-029-dark-light-theme-rtl.md`
- `IFP-TASK-022-advanced-filter-builder.md`
- `docs/01-product/installment-module-features.md` — چندزبانه، تاریخ شمسی/میلادی

---

## Self-Review Score

| محور | سقف | امتیاز | یادداشت |
|------|-----|--------|---------|
| Metadata | /10 | 10 | |
| Completeness | /25 | 25 | |
| Policy | /25 | 23 | |
| Executability | /25 | 25 | |
| Alignment | /15 | 15 | |
| **جمع** | **/100** | **98** | ≥95 ✅ |
