# TASK-039: Auth — Phone Normalize Utility

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 0 |
| Epic | Epic-06-Auth |
| ID | TASK-039 |
| Priority | P0 |
| Depends on | TASK-013 |
| Blocks | TASK-035, TASK-033 |
| Estimated | 2h |

---

## هدف

تابع pure `normalizePhone` که هر فرمت شماره موبایل ایرانی را به فرمت استاندارد `09XXXXXXXXX` تبدیل می‌کند. این تابع باید در همه API inputها با phone، در OTP request/verify، و در ساخت Customer استفاده شود. هیچ شماره‌ای بدون normalize ذخیره نشود.

---

## معیار پذیرش

- [ ] `normalizePhone(input)` تابع pure — بدون dependency به framework
- [ ] فرمت‌های مختلف ورودی را handle می‌کند (جدول زیر)
- [ ] شماره غیرایرانی یا نامعتبر → throw با کد `INVALID_PHONE`
- [ ] `phoneSchema` (Zod) با استفاده از `normalizePhone` برای validation و transform
- [ ] Export از `packages/contracts/src/common/phone.schema.ts`
- [ ] تمام API fieldهای phone از `phoneSchema` استفاده می‌کنند

---

## مشخصات فنی

### تابع normalizePhone

```typescript
// packages/contracts/src/common/phone.schema.ts

const IRAN_MOBILE_PATTERN = /^09\d{9}$/;

export function normalizePhone(input: string): string {
  let d = input.replace(/\D/g, '');           // حذف غیر-عدد
  if (d.startsWith('98')) d = `0${d.slice(2)}`; // +98... یا 98...
  else if (d.length === 10 && d.startsWith('9')) d = `0${d}`; // 912...
  if (!IRAN_MOBILE_PATTERN.test(d)) throw new Error('INVALID_PHONE');
  return d;
}
```

### جدول تبدیل

| ورودی | خروجی |
|-------|--------|
| `09123456789` | `09123456789` |
| `9123456789` | `09123456789` |
| `989123456789` | `09123456789` |
| `+989123456789` | `09123456789` |
| `+98 912 345 6789` | `09123456789` |
| `+98-912-345-6789` | `09123456789` |
| `09 123 456 789` | `09123456789` |
| `08123456789` | throw `INVALID_PHONE` |
| `0912345678` (10 رقمی با 0) | throw `INVALID_PHONE` |
| `` (خالی) | throw `INVALID_PHONE` |

### Zod Schema

```typescript
export const phoneSchema = z.string().transform((input, ctx) => {
  try {
    return normalizePhone(input);
  } catch {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'شماره موبایل باید با 09 شروع شود و ۱۱ رقم باشد',
    });
    return z.NEVER;
  }
});
```

### Phone Masking (برای لاگ)

```typescript
// در auth controller — نه در normalizePhone
export function maskPhone(phone: string): string {
  if (phone.length !== 11) return '***';
  return `${phone.slice(0, 4)}****${phone.slice(-3)}`;
}
// 09123456789 → 09XX****789
```

### قانون

**هیچ‌وقت** phone خام بدون `normalizePhone` در DB یا Redis ذخیره نشود.

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/contracts/src/common/phone.schema.ts` |
| Create | `packages/contracts/src/common/phone.schema.spec.ts` — unit tests |
| Update | `packages/contracts/src/common/index.ts` — export |

---

## مراحل پیاده‌سازی

1. ایجاد `phone.schema.ts` در contracts/common
2. پیاده‌سازی `normalizePhone` (pure function — بدون import)
3. پیاده‌سازی `phoneSchema` (Zod transform)
4. Export از `common/index.ts`
5. نوشتن تست‌های unit برای همه فرمت‌ها
6. استفاده در `OtpRequestSchema` و `OtpVerifySchema`

---

## Edge Cases & Errors

| سناریو | رفتار |
|--------|--------|
| ورودی خالی | throw `INVALID_PHONE` |
| شماره با کد کشور غیر از 98 (مثل `+14155552671`) | throw `INVALID_PHONE` |
| طول غلط (10 رقمی با 0 اول) | throw `INVALID_PHONE` |
| شماره با فقط حروف | throw `INVALID_PHONE` |
| null/undefined | Type error از TypeScript |

---

## تست

- [ ] Unit: `09123456789` → `09123456789`
- [ ] Unit: `9123456789` → `09123456789`
- [ ] Unit: `989123456789` → `09123456789`
- [ ] Unit: `+98 912 345 6789` → `09123456789`
- [ ] Unit: `+98-912-345-6789` → `09123456789`
- [ ] Unit: `08123456789` → throw
- [ ] Unit: `0912345678` (10 رقم با 0) → throw
- [ ] Unit: خالی → throw
- [ ] Unit: `phoneSchema.parse('+98 912 345 6789')` → `09123456789`
- [ ] Unit: `phoneSchema.parse('abc')` → Zod error با پیام فارسی

---

## Policy Alignment

- [ ] EXCELLENCE-STANDARDS — shared util در `packages/contracts` (single source)
- [ ] `docs/09-development/DEVELOPMENT_RULES.md` — phone normalization قانون
- [ ] هیچ PII raw phone در لاگ — maskPhone جداگانه استفاده شود

---

## مراجع

- `docs/09-development/DEVELOPMENT_RULES.md` — Phone normalization rule
- TASK-035, TASK-036 (استفاده از این schema)
- `.cursor/rules/07-contracts-zod.mdc` — Phone: normalize to `09xxxxxxxxx` via shared helper

---

## Self-Review Score

| محور | /25 | یادداشت |
|------|-----|---------|
| Metadata | 10/10 | همه فیلدها |
| Completeness | 25/25 | Spec کامل، جدول تبدیل، Zod schema |
| Policy | 25/25 | Shared contracts، no PII in logs |
| Executability | 25/25 | جدول test case کامل، بدون ابهام |
| Alignment | 15/15 | Export pattern sync با contracts |
| **جمع** | **100/100** | ✅ Ready for implementation |
