# TASK-103: Frontend — RTL + fa-IR + Formatters

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 1 |
| Epic | Epic-10-Frontend-Layout-Auth |
| ID | TASK-103 |
| Priority | P0 |
| Depends on | TASK-007, TASK-015, TASK-014 |
| Blocks | TASK-104, TASK-105–TASK-113 |
| Estimated | 6h |

---

## هدف

بومی‌سازی کامل پنل فروشنده: فونت فارسی، تقویم جلالی، فرمت تومان/تلفن، اعداد فارسی، Tailwind logical properties، و پیام‌های validation فارسی — پایه UX برای تمام فرم‌ها و صفحات Phase 1.

---

## معیار پذیرش

- [ ] Root `lang="fa" dir="rtl"` تأیید شده (از TASK-007)
- [ ] فونت Vazirmatn از CDN/local در `layout.tsx`
- [ ] `@hivork/i18n` در تمام نمایش مبلغ و تاریخ
- [ ] Tailwind config: `ms-`/`me-`/`ps-`/`pe-`/`start`/`end` — grep CI برای `ml-`/`mr-` در `apps/web`
- [ ] Jalali DatePicker component (wrapper dayjs-jalali)
- [ ] `TomanInput` component: نمایش تومان، ارسال ریال bigint string
- [ ] Error messages map از `@hivork/contracts` error codes → fa
- [ ] `next-intl` یا lightweight fa strings در `packages/i18n` — بدون hardcode پراکنده

---

## مشخصات فنی

### Money Display Pattern

```typescript
// UI input: user types تومان (e.g. 1,500,000)
// On blur: formatPersianDigits + thousands separator
// On submit: toRialString(tomanBigInt) → API "15000000" (ریال)

import { formatToman, parseTomanInput } from '@hivork/i18n';

// Display read-only amounts
formatToman(BigInt(amountRial)); // "۱,۵۰۰,۰۰۰ تومان"
```

### TomanInput Component

| Prop | نوع | توضیح |
|------|-----|--------|
| value | `string` | ریال bigint as string |
| onChange | `(rial: string) => void` | |
| label | `string` | fa |
| helpText | `string` | fa |
| disabled | `boolean` | |
| error | `string` | fa validation |
| inputMode | `"numeric"` | mobile |
| aria-label | from label | |

### JalaliDatePicker

| Element | fa |
|---------|-----|
| Label | تاریخ |
| Placeholder | انتخاب تاریخ |
| Help | تاریخ به تقویم شمسی |
| Format display | `۱۴۰۵/۰۵/۰۱` via `formatJalaliDate` |
| API value | ISO date string `YYYY-MM-DD` (Gregorian for API) |

### RTL Tailwind Rules

```css
/* ✅ */
className="ms-4 pe-2 text-start border-e"

/* ❌ ممنوع در apps/web */
className="ml-4 pr-2 text-left border-r"
```

### Error Message Map (`lib/i18n/error-messages.fa.ts`)

```typescript
export const ERROR_MESSAGES_FA: Record<string, string> = {
  INVALID_PHONE: 'شماره موبایل معتبر نیست.',
  AUTH_OTP_RATE_LIMITED: 'تعداد درخواست بیش از حد مجاز است. لطفاً کمی صبر کنید.',
  CUSTOMER_ALREADY_EXISTS: 'مشتری با این شماره قبلاً ثبت شده است.',
  // ... sync با ERROR-CODES.md
};
```

### Wireframe — TomanInput

```
مبلغ کل *
┌─────────────────────────────┐
│ ۶,۰۰۰,۰۰۰              تومان │
└─────────────────────────────┘
مبلغ را به تومان وارد کنید. در سیستم به ریال ذخیره می‌شود.
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `apps/web/lib/i18n/error-messages.fa.ts` |
| Create | `apps/web/components/form/toman-input.tsx` |
| Create | `apps/web/components/form/jalali-date-picker.tsx` |
| Create | `apps/web/components/form/phone-input.tsx` |
| Update | `apps/web/app/layout.tsx` — Vazirmatn font |
| Update | `apps/web/tailwind.config.ts` — logical plugin notes |
| Update | `apps/web/app/globals.css` — RTL typography |
| Create | `scripts/check-rtl-classes.sh` — CI grep ml-/mr- |

---

## مراحل پیاده‌سازی

1. Font Vazirmatn + `font-feature-settings`
2. Export wrappers re-exporting `@hivork/i18n`
3. Build TomanInput با RHF Controller
4. JalaliDatePicker با popover calendar
5. PhoneInput با normalize on blur
6. Central error mapper hook `useApiError()`
7. CI script reject `ml-`/`mr-` in apps/web

---

## Edge Cases & Errors

| سناریو | رفتار |
|--------|--------|
| Toman input empty on required | «این فیلد الزامی است.» |
| Toman > max safe | validation قبل از BigInt |
| Invalid date in picker | «تاریخ نامعتبر است.» |
| LTR inside RTL (OTP digits) | `dir="ltr"` on OTP group only |

---

## تست

- [ ] Unit: TomanInput 1,500,000 تومان → `"15000000"` ریال
- [ ] Unit: formatToman edge 0n
- [ ] Unit: error message map covers all Phase 1 codes
- [ ] CI: rtl-class check passes

---

## UX

- [x] Form §5: format hints, mobile input types
- [x] RTL: labels aligned start
- [x] a11y: aria-describedby for help text

---

## Policy Alignment

- [x] EXCELLENCE-STANDARDS §5.3 فرم‌های مالی
- [x] Money: bigint ریال in API — تومان UI only
- [x] `@hivork/i18n` from TASK-015

---

## مراجع

- `Phases/Phase-0-Foundation/Epic-03-Packages-Skeleton/TASK-015-package-i18n.md`
- `docs/09-development/ERROR-CODES.md`
- `.cursor/rules/05-frontend-nextjs.mdc`

---

## Self-Review Score

| محور | سقف | امتیاز |
|------|-----|--------|
| Metadata | /10 | 10 |
| Completeness | /25 | 25 |
| Policy | /25 | 25 |
| Executability | /25 | 24 |
| Alignment | /15 | 15 |
| **جمع** | **/100** | **99** |
