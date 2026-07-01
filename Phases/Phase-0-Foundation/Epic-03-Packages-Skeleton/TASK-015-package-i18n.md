# TASK-015: Package Skeleton — packages/i18n

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 0 |
| Epic | Epic-03-Packages-Skeleton |
| ID | TASK-015 |
| Priority | P1 |
| Depends on | TASK-003 |
| Blocks | TASK-007, TASK-054 |
| Estimated | 2h |
| Status | ✅ Done |

---

## هدف

Package `@hivork/i18n` با formatters فارسی: مبالغ تومان (از bigint ریال)، تاریخ جلالی (timezone Asia/Tehran)، نمایش شماره موبایل. تنها فایل Pure TypeScript — هیچ React dependency.

---

## معیار پذیرش

- [x] `formatToman(amountRial: bigint): string` — ریال ÷ 10 → تومان فارسی
- [x] `formatJalaliDate(date: Date): string` — Jalali calendar، timezone Asia/Tehran
- [x] `formatPhoneDisplay(phone: string): string` — `0912 345 6789`
- [x] `formatPersianDigits(value: string | number): string` — تبدیل اعداد به فارسی
- [x] Locale constants: `LOCALE_FA = 'fa-IR'`
- [x] Unit tests با edge cases: 0n، اعداد بزرگ، midnight Tehran

---

## مشخصات فنی

### ساختار پوشه

```
packages/i18n/
├── src/
│   ├── index.ts
│   ├── money.ts        # formatToman
│   ├── date.ts         # formatJalaliDate
│   ├── phone.ts        # formatPhoneDisplay
│   ├── digits.ts       # formatPersianDigits
│   ├── locale.ts       # LOCALE_FA constant
│   └── dayjs.ts        # dayjs setup با plugin jalali
├── package.json        # name: @hivork/i18n
├── tsconfig.json
└── vitest.config.ts
```

### `money.ts`

```typescript
const FA_NUMBER = new Intl.NumberFormat('fa-IR');

export function formatToman(amountRial: bigint): string {
  if (amountRial < 0n) throw new Error('amountRial نمی‌تواند منفی باشد');
  const toman = amountRial / 10n;
  return FA_NUMBER.format(toman) + ' تومان';
}

export function formatRial(amountRial: bigint): string {
  return FA_NUMBER.format(amountRial) + ' ریال';
}
```

### `date.ts` (dayjs + jalali plugin)

```typescript
import dayjs from 'dayjs';
import jalaliPlugin from 'dayjs-jalali';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(jalaliPlugin);

const TEHRAN_TZ = 'Asia/Tehran';

export function formatJalaliDate(date: Date): string {
  return dayjs(date).tz(TEHRAN_TZ).calendar('jalali').format('jYYYY/jMM/jDD');
}

export function formatJalaliDateTime(date: Date): string {
  return dayjs(date).tz(TEHRAN_TZ).calendar('jalali').format('jYYYY/jMM/jDD HH:mm');
}
```

### `phone.ts`

```typescript
export function formatPhoneDisplay(phone: string): string {
  // 09123456789 → 0912 345 6789
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('0')) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }
  return phone;
}
```

### Dependencies

```json
{
  "dayjs": "^1",
  "dayjs-jalali": "^1"
}
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/i18n/src/money.ts` |
| Create | `packages/i18n/src/date.ts` |
| Create | `packages/i18n/src/phone.ts` |
| Create | `packages/i18n/src/digits.ts` |
| Create | `packages/i18n/src/locale.ts` |
| Create | `packages/i18n/src/dayjs.ts` |
| Create | `packages/i18n/src/index.ts` |
| Create | `packages/i18n/package.json` |
| Create | `packages/i18n/tsconfig.json` |
| Create | `packages/i18n/vitest.config.ts` |

---

## مراحل پیاده‌سازی

1. `pnpm add dayjs dayjs-jalali` در `packages/i18n`
2. dayjs را با plugins setup کن
3. `formatToman(bigint): string` با edge case validation
4. `formatJalaliDate(Date): string` با Tehran timezone
5. `formatPhoneDisplay(string): string`
6. `formatPersianDigits` با regex
7. Unit tests برای همه edge cases

---

## Edge Cases & Errors

| سناریو | رفتار |
|--------|--------|
| `formatToman(0n)` | `"۰ تومان"` |
| `formatToman(9n)` | `"۰ تومان"` (۹ ریال = ۰ تومان) |
| `formatToman(10n)` | `"۱ تومان"` |
| `formatToman(-1n)` | Error: منفی ممنوع |
| `formatToman(1_000_000_000_000n)` | `"۱۰۰٬۰۰۰٬۰۰۰ تومان"` |
| `formatJalaliDate(new Date('2024-03-20'))` | فروردین ۱۴۰۳ |
| Tehran midnight date boundary | dayjs با timezone درست handle می‌کند |
| `formatPhoneDisplay("09999999999")` | `"0999 999 9999"` |
| Phone با اعداد فارسی | digits.replace(/\D/g,'') کار نمی‌کند — normalize اول |

---

## تست

```typescript
// money.spec.ts
expect(formatToman(0n)).toBe('۰ تومان');
expect(formatToman(10n)).toBe('۱ تومان');
expect(formatToman(1_000_000n)).toBe('۱۰۰٬۰۰۰ تومان');
expect(() => formatToman(-1n)).toThrow();

// date.spec.ts
const date = new Date('2024-03-20T00:30:00Z');
expect(formatJalaliDate(date)).toBe('۱۴۰۳/۰۱/۰۱');  // فروردین اول

// phone.spec.ts
expect(formatPhoneDisplay('09123456789')).toBe('0912 345 6789');
```

---

## ممنوعیت‌ها

- `number`/`float` برای formatToman input (باید `bigint`)
- `new Date().toLocaleDateString('fa-IR')` برای Jalali (timezone اشتباه)
- React import در این package (pure TypeScript)

---

## Policy Alignment

- [x] DEVELOPMENT_RULES.md — "فقط `bigint` ریال" — `formatToman(bigint)` enforce می‌کند
- [x] EXCELLENCE-STANDARDS — fa-IR formatting در UI
- [x] SOFT-DELETE-POLICY — N/A
- [x] `.cursor/rules/07-contracts-zod.mdc` — bigint as string documented

---

## مراجع

- `docs/04-technology/tech-stack.md` § Money & Date

---

## Self-Review Score

| محور | /امتیاز | یادداشت |
|------|---------|---------|
| Metadata (10) | 10/10 | همه فیلدها |
| Completeness (25) | 25/25 | AC، formatters، edge cases |
| Policy (25) | 25/25 | bigint enforce، Tehran timezone |
| Executability (25) | 25/25 | Edge cases جامع، unit tests |
| Alignment (15) | 15/15 | Sync با tech-stack money/date section |
| **جمع** | **100/100** | ✅ Ready |
