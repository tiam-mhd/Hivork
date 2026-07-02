# قوانین کسب‌وکار — ماژول اقساط
# Business Rules — Installments Module

> **وضعیت / Status:** Approved — v1.0  
> **نسخه / Version:** 1.0 — 1405/04/08  
> **ADR مرتبط / Related ADRs:** ADR-001, ADR-007, ADR-008, ADR-013, ADR-015  
> **مراجع / References:**
> - [Domain Model](./domain.md)
> - [State Machines](./state-machines.md)
> - [Error Codes](../../09-development/ERROR-CODES.md)
> - [RBAC](../../02-architecture/rbac.md)

---

## اصول پایه / Foundational Principles

1. **هیچ داده مالی حذف نمی‌شود** — Soft delete فقط. (ADR-013)  
   _No financial data is ever deleted — soft delete only._

2. **قسط paid یا waived برگشت‌ناپذیر است** — Terminal status.  
   _A paid or waived installment cannot revert to any previous state._

3. **گزارش پرداخت ≠ پرداخت واقعی** — تأیید فروشنده الزامی است (پیش‌فرض). (ADR-008)  
   _Reporting a payment ≠ actual payment — seller confirmation required by default._

4. **تمام پول به صورت BigInt ریال ذخیره می‌شود** — هرگز float. (ADR-007)  
   _All money stored as BigInt Rial — never float/decimal._

5. **هر تراکنش باید به یک شعبه تعلق داشته باشد.** (ADR-015)  
   _Every sale/transaction must belong to exactly one branch._

---

## بخش اول: قوانین ایجاد فروش / Section 1: Sale Creation Rules

### BR-001
**فارسی:** مبلغ کل فروش باید BigInt ریال و بزرگ‌تر از صفر باشد.  
**English:** `totalAmountRial` must be a positive BigInt (Rial). Must be > 0.  
**خطا / Error:** `AMOUNT_INVALID`

---

### BR-002
**فارسی:** پیش‌پرداخت (`downPaymentRial`) باید صفر یا مثبت باشد و از مبلغ کل تجاوز نکند.  
**English:** `downPaymentRial` must be ≥ 0 and ≤ `totalAmountRial`.  
**خطا / Error:** `AMOUNT_EXCEEDS_TOTAL`

```
مثال صحیح: total=10,000,000 ریال, down=2,000,000 ریال ✅
مثال نادرست: total=5,000,000 ریال, down=6,000,000 ریال ❌ → AMOUNT_EXCEEDS_TOTAL
```

---

### BR-003
**فارسی:** تعداد اقساط باید بین ۱ تا ۱۲۰ (۱۰ سال) باشد.  
**English:** `installmentCount` must be an integer between 1 and 120 inclusive.  
**خطا / Error:** `INSTALLMENT_COUNT_INVALID`

---

### BR-004
**فارسی:** مبلغ باقی‌مانده = `totalAmountRial − downPaymentRial`. اگر این مقدار صفر باشد، فقط یک قسط با مبلغ صفر ایجاد می‌شود (کاملاً پیش‌پرداخت).  
**English:** Remaining amount = `totalAmountRial − downPaymentRial`. If zero, a single zero-amount installment is created.

---

### BR-005 — محاسبه مبلغ اقساط
**فارسی:** توزیع مبلغ باقی‌مانده میان اقساط به صورت زیر:  
**English:** Distribution of remaining amount across installments:

```typescript
// الگوریتم — Algorithm
const remaining: bigint = totalAmountRial - downPaymentRial;
const base: bigint = remaining / BigInt(count);           // تقسیم صحیح / integer division
const remainder: bigint = remaining % BigInt(count);       // باقی‌مانده

// قسط‌های اول `remainder` عدد → base + 1 دریافت می‌کنند
// First `remainder` installments receive base + 1
// بقیه → base
// Rest receive base

// مثال / Example:
// total=10,000,000, down=0, count=3
// base = 3,333,333, remainder = 1
// installment[0] = 3,333,334 ریال
// installment[1] = 3,333,333 ریال
// installment[2] = 3,333,333 ریال
// sum = 10,000,000 ✅

// مثال دیگر / Another example:
// total=12,000,000, down=2,000,000, count=4
// remaining = 10,000,000
// base = 2,500,000, remainder = 0
// installment[0] = 2,500,000 ریال
// installment[1] = 2,500,000 ریال
// installment[2] = 2,500,000 ریال
// installment[3] = 2,500,000 ریال
// sum = 10,000,000 ✅
```

**ضمانت / Guarantee:** `sum(installments) + downPaymentRial === totalAmountRial` همیشه صحیح.

---

### BR-006
**فارسی:** تاریخ سررسید اولین قسط باید در آینده باشد.  
**English:** The due date of the first installment must be in the future at time of creation.  
**خطا / Error:** `DUE_DATE_IN_PAST`

---

### BR-007
**فارسی:** فاصله بین اقساط (intervalDays) باید بین ۱ تا ۳۶۵ روز باشد.  
**English:** Interval between installments must be 1–365 days.  
**خطا / Error:** `INTERVAL_INVALID`

---

### BR-008
**فارسی:** هر فروش باید دقیقاً به یک شعبه (`branchId`) تعلق داشته باشد.  
**English:** Every sale must belong to exactly one branch (`branchId NOT NULL`).  
کارمند ایجادکننده باید به آن شعبه دسترسی داشته باشد.  
Staff must have access to the specified branch.  
**خطا / Error:** `BRANCH_ACCESS_DENIED`

---

### BR-009
**فارسی:** مشتری (`tenantCustomerId`) باید در همین tenant وجود داشته باشد و حذف نشده باشد.  
**English:** `tenantCustomerId` must exist within the same tenant and not be soft-deleted.  
**خطا / Error:** `CUSTOMER_NOT_FOUND`

---

### BR-010
**فارسی:** فروش ایجادشده → وضعیت اولیه `active`.  
**English:** Newly created sale starts with status `active`.

---

## بخش دوم: قوانین لغو فروش / Section 2: Sale Cancellation Rules

### BR-011
**فارسی:** فروش `cancelled` یا `completed` را نمی‌توان لغو کرد.  
**English:** A sale with status `cancelled` or `completed` cannot be cancelled again.  
**خطا / Error:** `SALE_ALREADY_CANCELLED` یا `SALE_CANNOT_CANCEL_COMPLETED`

---

### BR-012
**فارسی:** فروش با حداقل یک قسط `paid` را نمی‌توان لغو کرد.  
**English:** A sale cannot be cancelled if any installment has status `paid`.  
**خطا / Error:** `SALE_HAS_PAID_INSTALLMENT`

```
مثال: فروش با ۴ قسط:
  قسط ۱: paid   → لغو ممنوع ❌
  قسط ۲: pending
  قسط ۳: pending
  قسط ۴: pending
```

---

### BR-013
**فارسی:** لغو فروش با اقساط `overdue` یا `waived` مجاز است.  
**English:** Cancellation is allowed if installments are only in `pending`, `overdue`, or `waived` states.

---

### BR-014
**فارسی:** لغو فروش باید در AuditLog ثبت شود با دلیل و شناسه کارمند.  
**English:** Sale cancellation must be recorded in AuditLog with reason and staff ID.

---

## بخش سوم: قوانین وضعیت قسط / Section 3: Installment Status Rules

### BR-015 — Overdue Transition
**فارسی:** سیستم روزانه (cron job — ۰۰:۳۰ به وقت تهران) همه اقساط `pending` با `due_date < today (Tehran)` را به `overdue` تغییر می‌دهد.  
**English:** The daily job at 00:30 Tehran time marks all `pending` installments with `due_date < today` as `overdue`.

```typescript
// Pseudo-code
const today = toTehranDate(new Date());
const overdueInstallments = await prisma.installment.findMany({
  where: {
    status: InstallmentStatus.PENDING,
    dueDate: { lt: startOfTehranDay(today) },
    deletedAt: null,
  },
});
// Batch update + raise InstallmentOverdue domain events
```

---

### BR-016
**فارسی:** قسط `paid` هیچ transition دیگری ندارد — وضعیت نهایی.  
**English:** `paid` is a terminal status — no further transitions allowed.  
**خطا / Error:** `INSTALLMENT_ALREADY_PAID` یا `INSTALLMENT_STATUS_INVALID`

---

### BR-017
**فارسی:** قسط `waived` هیچ transition دیگری ندارد — وضعیت نهایی.  
**English:** `waived` is a terminal status — no further transitions allowed.  
**خطا / Error:** `INSTALLMENT_ALREADY_WAIVED` یا `INSTALLMENT_STATUS_INVALID`

---

### BR-018 — Auto-Complete Sale
**فارسی:** وقتی آخرین قسط فروش به `paid` یا `waived` تغییر می‌کند، فروش خودکار `completed` می‌شود.  
**English:** When the last installment of a sale reaches `paid` or `waived`, the sale automatically transitions to `completed`.

```typescript
// در use case بعد از تغییر وضعیت قسط:
const allSettled = installments.every(
  i => i.status === 'paid' || i.status === 'waived'
);
if (allSettled) {
  sale.markCompleted();
  // audit + domain event SaleCompleted
}
```

---

### BR-019
**فارسی:** Waive (بخشودگی) قسط فقط توسط staff با permission `installments.installment.waive` انجام می‌شود.  
**English:** Waiving an installment requires `installments.installment.waive` permission.  
یادداشت audit اجباری است.  
Audit note is mandatory.  
**خطا / Error:** `PERMISSION_DENIED`

---

## بخش چهارم: قوانین گزارش پرداخت / Section 4: Payment Reporting Rules

### BR-020
**فارسی:** مشتری یا کارمند می‌تواند پرداخت گزارش دهد — `PaymentAttempt` با وضعیت `pending` ایجاد می‌شود.  
**English:** Customer or staff can report a payment — creates `PaymentAttempt` with `pending` status.

---

### BR-021
**فارسی:** اگر قسط قبلاً یک `PaymentAttempt` با وضعیت `pending` داشته باشد، گزارش جدید رد می‌شود.  
**English:** If an installment already has a `pending` PaymentAttempt, a new report is rejected.  
**خطا / Error:** `PAYMENT_PENDING_EXISTS`

```
منطق: از duplicate confirmation جلوگیری می‌شود
  installment_id → max one pending attempt at a time
```

---

### BR-022
**فارسی:** قسط `paid` یا `waived` → گزارش پرداخت جدید ممنوع.  
**English:** Cannot report payment for a `paid` or `waived` installment.  
**خطا / Error:** `INSTALLMENT_ALREADY_PAID` یا `INSTALLMENT_STATUS_INVALID`

---

### BR-023
**فارسی:** مبلغ گزارش پرداخت (`amountRial`) باید > 0 باشد.  
**English:** Reported payment amount must be > 0 Rial.  
**خطا / Error:** `AMOUNT_INVALID`

> **توجه:** مبلغ گزارش‌شده برای مستندات است — مبلغ واقعی قسط بدون تغییر می‌ماند. پرداخت جزئی در این نسخه منجر به تأیید کامل قسط می‌شود (فاز ۱).

---

## بخش پنجم: قوانین تأیید پرداخت / Section 5: Payment Confirmation Rules

### BR-024
**فارسی:** تأیید پرداخت (`PaymentAttempt.confirmed`) فقط توسط staff با permission `installments.payment.confirm` انجام می‌شود.  
**English:** Payment confirmation requires `installments.payment.confirm` permission.

---

### BR-025
**فارسی:** تأیید `PaymentAttempt` که قبلاً `confirmed` یا `rejected` است ممنوع.  
**English:** Cannot confirm an already `confirmed` or `rejected` PaymentAttempt.  
**خطا / Error:** `PAYMENT_ALREADY_CONFIRMED` یا `PAYMENT_ALREADY_REJECTED`

---

### BR-026
**فارسی:** تأیید `PaymentAttempt.confirmed` → قسط مربوطه به `paid` تغییر می‌کند (atomic transaction).  
**English:** Confirming a PaymentAttempt atomically marks the linked installment as `paid`.

```typescript
// Atomic transaction:
// 1. paymentAttempt.status = 'confirmed'
// 2. installment.status = 'paid', paidAt = now, confirmedById = staffId
// 3. AuditLog (payment.confirm)
// 4. OutboxEvent: PaymentConfirmed
// 5. Check sale completion (BR-018)
// All in one DB transaction
```

---

### BR-027 — Auto-Confirm (Setting)
**فارسی:** اگر تنظیم `require_seller_payment_confirmation == false` باشد و گزارش توسط کارمند باشد (نه مشتری)، پرداخت خودکار تأیید می‌شود.  
**English:** If `require_seller_payment_confirmation == false` and the reporter is staff (not customer), auto-confirm applies.

```
Customer report: همیشه pending → تأیید فروشنده لازم است (صرف‌نظر از setting)
Staff report با auto-confirm = false: pending → تأیید دستی
Staff report با auto-confirm = true: خودکار تأیید → paid
```

---

### BR-028
**فارسی:** رد پرداخت (`PaymentAttempt.rejected`) → قسط در وضعیت قبلی باقی می‌ماند و مشتری می‌تواند دوباره گزارش دهد.  
**English:** Rejecting a payment attempt leaves the installment in its previous status — customer can submit a new attempt.

---

## بخش ششم: قوانین یادآور / Section 6: Reminder Rules

### BR-029
**فارسی:** یادآورها idempotent هستند — برای هر ترکیب `(installment_id, reminder_type, channel)` حداکثر یک یادآور ارسال می‌شود.  
**English:** Reminders are idempotent — at most one per `(installment_id, reminder_type, channel)` combination.

```
reminder_type: 'before_3d' | 'before_1d' | 'due_date' | 'overdue_1d' | 'overdue_3d' | 'overdue_7d'
channel: 'telegram' | 'bale' | 'sms'
```

---

### BR-030
**فارسی:** یادآور فقط برای مشتریانی که ربات را link کرده‌اند ارسال می‌شود. SMS fallback در صورت فعال بودن.  
**English:** Reminders via bot are sent only to customers who linked their bot account. SMS fallback if enabled.

---

### BR-031 — زمان ارسال
**فارسی:** ارسال یادآور در ساعت تعریف‌شده در `ReminderPolicy.sendTime` (پیش‌فرض ۰۹:۰۰ تهران).  
**English:** Reminders are sent at the time defined in `ReminderPolicy.sendTime` (default 09:00 Tehran time).

---

## بخش هفتم: قوانین مشتری / Section 7: Customer Rules

### BR-032
**فارسی:** شماره تلفن مشتری باید به فرمت `09xxxxxxxxx` (۱۱ رقم) normalize شود.  
**English:** Customer phone must be normalized to `09xxxxxxxxx` format (11 digits).

```typescript
// normalize examples:
'+989121234567' → '09121234567'
'989121234567'  → '09121234567'
'9121234567'    → '09121234567'
'09121234567'   → '09121234567' (no change)
```

---

### BR-033
**فارسی:** یک `User` یک `phone` در platform دارد. `GlobalCustomer` پروفایل B2C همان User است (1:1) و می‌تواند در چند tenant از طریق `TenantCustomer` باشد.  
**English:** One User has a single platform-wide phone. GlobalCustomer is the optional B2C profile (1:1 with User) and can link to multiple tenants via TenantCustomer. (ADR-017)

---

### BR-034
**فارسی:** staff و customer می‌توانند همان User/phone داشته باشند — actor، session و token جداست.  
**English:** Staff and customer can share the same User/phone — separate actors, sessions, and tokens. (ADR-011, ADR-017)

---

### BR-035 — Import مشتریان
**فارسی:** در import Excel، شماره تکراری در همان فایل = خطای row (skip + گزارش).  
**English:** Duplicate phone within the same import file = row error (skip + report).  
شماره تکراری در tenant = upsert (نه duplicate).  
Duplicate phone in tenant = upsert (not error).

```
Result: { totalRows, successCount, failedCount, errors: [{ row, phone, reason }] }
```

---

## بخش هشتم: قوانین Bot Link / Section 8: Bot Link Rules

### BR-036
**فارسی:** Bot link token یک‌بار مصرف است — پس از استفاده، `consumed` می‌شود.  
**English:** Bot link token is single-use — after use, it becomes `consumed`.

---

### BR-037
**فارسی:** Bot link token بعد از ۲۴ ساعت منقضی می‌شود.  
**English:** Bot link token expires after 24 hours.  
**خطا / Error:** `BOT_LINK_TOKEN_EXPIRED`

---

### BR-038
**فارسی:** یک مشتری می‌تواند چندین BotIdentity داشته باشد (Telegram و Bale).  
**English:** One customer can have multiple BotIdentities (Telegram + Bale).

---

## بخش نهم: قوانین اقساط شخصی / Section 9: Personal Installment Rules

### BR-039
**فارسی:** `PersonalInstallment` متعلق به `GlobalCustomer` است — نه tenant.  
**English:** PersonalInstallment belongs to GlobalCustomer, not to any tenant.

---

### BR-040
**فارسی:** مشتری می‌تواند اقساط شخصی خود را اضافه، ویرایش، و حذف (soft) کند.  
**English:** Customer can create, edit, and soft-delete their own personal installments.

---

### BR-041
**فارسی:** اقساط شخصی فقط دو وضعیت دارند: `pending` و `paid`. بدون overdue در فاز ۱.  
**English:** Personal installments have only `pending` and `paid` states — no overdue escalation in Phase 1.

---

## بخش دهم: قوانین امنیتی و دسترسی / Section 10: Security & Access Rules

### BR-042
**فارسی:** همه query‌های tenant-scoped باید `tenantId` از JWT داشته باشند — نه از client body.  
**English:** All tenant-scoped queries must use `tenantId` from JWT — never from client-supplied body.

---

### BR-043
**فارسی:** cross-tenant — دسترسی به منابع tenant دیگر باید با 404 رد شود (نه 403) تا information leakage جلوگیری شود.  
**English:** Cross-tenant access must return 404 (not 403) to prevent information leakage.

---

### BR-044
**فارسی:** branch scope — staff با `data_scope: branch` فقط به شعبه‌های خود دسترسی دارد.  
**English:** Staff with `data_scope: branch` can only access data from their assigned branches.

---

### BR-045
**فارسی:** Customer endpoint‌ها از actor `customer` جدا از staff هستند — customer نمی‌تواند به endpoint‌های staff دسترسی داشته باشد.  
**English:** Customer and staff actors are completely separate — customer tokens cannot access staff endpoints.

---

## بخش یازدهم: قوانین Audit / Section 11: Audit Rules

### BR-046
**فارسی:** موارد زیر **اجباراً** در AuditLog ثبت می‌شوند:  
**English:** The following events **must** be recorded in AuditLog:

| عملیات | رویداد |
|---------|--------|
| ایجاد فروش | `sale.create` |
| لغو فروش | `sale.cancel` |
| بخشودگی قسط | `installment.waive` |
| تأیید پرداخت | `payment.confirm` |
| رد پرداخت | `payment.reject` |
| ایجاد/ویرایش کارمند | `staff.create` / `staff.update` |
| تغییر نقش | `role.assign` |
| تغییر تنظیمات | `settings.change` |
| Import مشتری | `customer.import` |

---

### BR-047
**فارسی:** AuditLog هرگز حذف یا ویرایش نمی‌شود — append-only forever.  
**English:** AuditLog is append-only — never deleted or updated.

---

## بخش دوازدهم: مالیات و بیمه قرارداد / Section 12: Contract Tax & Insurance (IFP-069)

### BR-048 — تجمیع مالیات header + line
**فارسی:** `subtotal = Σ lineTotal` (شامل مالیات سطر). مالیات header فقط وقتی `taxInclusive = false`: یا `taxRial` ثابت (اولویت) یا `applyRate(subtotal, taxRateBps)`.  
**English:** Line totals include per-line tax. Header tax applies only when not tax-inclusive: fixed `taxRial` wins over `taxRateBps`.  
**خطا / Error:** `TAX_RATE_INVALID` when `taxRateBps` ∉ [0, 10000]

```
totalAmountRial = subtotal + headerTax + insurance (when included in total)
taxRial (stored) = Σ lineTax + headerTax
```

---

### BR-049 — بیمه اختیاری در جمع
**فارسی:** `insuranceRial` می‌تواند به `totalAmountRial` اضافه شود (پیش‌فرض: بله). تنظیم tenant `insurance_included_in_total = false` → بیمه ثبت می‌شود ولی در جمع کل نیست.  
**English:** Insurance is an optional add-on to total (default included). Expired insurance sets `insuranceExpiredWarning` on DTO — does not block edits.

---

## بخش سیزدهم: محاسبات مالی — مثال‌های کامل / Section 13: Financial Calculation Examples

### مثال ۱: فروش ساده
```
محصول: گوشی موبایل
مبلغ کل: 30,000,000 ریال (۳ میلیون تومان)
پیش‌پرداخت: 6,000,000 ریال (۶۰۰ هزار تومان)
تعداد اقساط: 4
تاریخ اولین قسط: 1405/05/01
فاصله: ۳۰ روز

باقی‌مانده: 24,000,000 ریال
هر قسط: 6,000,000 ریال (بدون باقی‌مانده)

قسط ۱: 6,000,000 ریال — ۱۴۰۵/۰۵/۰۱
قسط ۲: 6,000,000 ریال — ۱۴۰۵/۰۶/۰۱
قسط ۳: 6,000,000 ریال — ۱۴۰۵/۰۷/۰۱
قسط ۴: 6,000,000 ریال — ۱۴۰۵/۰۸/۰۱

جمع اقساط + پیش‌پرداخت = 30,000,000 ✅
```

### مثال ۲: باقی‌مانده ناهموار
```
مبلغ کل: 10,000,000 ریال
پیش‌پرداخت: 0
تعداد: 3

باقی‌مانده: 10,000,000
base = 10,000,000 ÷ 3 = 3,333,333 (integer)
remainder = 10,000,000 mod 3 = 1

قسط ۱: 3,333,334 ریال ← باقی‌مانده (1) به این اضافه شد
قسط ۲: 3,333,333 ریال
قسط ۳: 3,333,333 ریال
جمع: 10,000,000 ✅
```

### مثال ۳: پرداخت کامل با پیش‌پرداخت
```
مبلغ کل: 5,000,000 ریال
پیش‌پرداخت: 5,000,000 ریال (کل مبلغ)
تعداد: 1

باقی‌مانده: 0
قسط ۱: 0 ریال — (فوری paid)

توجه: چنین فروشی معمولاً ایجاد نمی‌شود — 
از فروش نقدی استفاده کنید
```

### مثال ۴: محاسبه TypeScript (BigInt)
```typescript
const totalAmountRial: bigint = 15_000_000n;  // ۱۵ میلیون ریال
const downPaymentRial: bigint = 3_000_000n;   // ۳ میلیون ریال
const count = 4;

const remaining: bigint = totalAmountRial - downPaymentRial; // 12,000,000n
const base: bigint = remaining / BigInt(count);               // 3,000,000n
const remainder: bigint = remaining % BigInt(count);          // 0n

const installments = Array.from({ length: count }, (_, i) => ({
  sequenceNumber: i + 1,
  amountRial: i < Number(remainder) ? base + 1n : base,
}));

// Check: جمع باید با remaining برابر باشد
const sum = installments.reduce((acc, i) => acc + i.amountRial, 0n);
console.assert(sum === remaining, 'Sum invariant violated!');
```

---

## خلاصه قوانین / Rules Summary

| شماره | دسته | قانون | خطا |
|-------|------|-------|-----|
| BR-001 | Sale Create | totalAmountRial > 0 | `AMOUNT_INVALID` |
| BR-002 | Sale Create | downPayment ≤ total | `AMOUNT_EXCEEDS_TOTAL` |
| BR-003 | Sale Create | 1 ≤ count ≤ 120 | `INSTALLMENT_COUNT_INVALID` |
| BR-004 | Sale Create | remaining = total − down | — |
| BR-005 | Calculation | توزیم با باقی‌مانده به قسط اول | — |
| BR-006 | Sale Create | firstDueDate در آینده | `DUE_DATE_IN_PAST` |
| BR-007 | Sale Create | 1 ≤ intervalDays ≤ 365 | `INTERVAL_INVALID` |
| BR-008 | Sale Create | branchId معتبر + دسترسی | `BRANCH_ACCESS_DENIED` |
| BR-009 | Sale Create | customer در tenant وجود دارد | `CUSTOMER_NOT_FOUND` |
| BR-010 | Sale Create | وضعیت اولیه = active | — |
| BR-011 | Cancel | فقط فروش active قابل لغو | `SALE_ALREADY_CANCELLED` |
| BR-012 | Cancel | بدون قسط paid | `SALE_HAS_PAID_INSTALLMENT` |
| BR-013 | Cancel | overdue/waived مانع نیست | — |
| BR-014 | Cancel | audit اجباری | — |
| BR-015 | Overdue | daily job تهران | — |
| BR-016 | Status | paid terminal | `INSTALLMENT_ALREADY_PAID` |
| BR-017 | Status | waived terminal | `INSTALLMENT_ALREADY_WAIVED` |
| BR-018 | Auto-Complete | آخرین قسط → sale completed | — |
| BR-019 | Waive | permission اجباری | `PERMISSION_DENIED` |
| BR-020 | Payment Report | pending ایجاد می‌شود | — |
| BR-021 | Payment Report | یک pending در زمان | `PAYMENT_PENDING_EXISTS` |
| BR-022 | Payment Report | paid/waived → ممنوع | `INSTALLMENT_ALREADY_PAID` |
| BR-023 | Payment Report | amount > 0 | `AMOUNT_INVALID` |
| BR-024 | Confirm | permission اجباری | `PERMISSION_DENIED` |
| BR-025 | Confirm | فقط pending | `PAYMENT_ALREADY_CONFIRMED` |
| BR-026 | Confirm | installment → paid (atomic) | — |
| BR-027 | Auto-Confirm | setting + staff reporter | — |
| BR-028 | Reject | installment در وضعیت قبلی | — |
| BR-029 | Reminder | idempotent per type+channel | — |
| BR-030 | Reminder | فقط linked customers | — |
| BR-031 | Reminder | ساعت تهران | — |
| BR-032 | Customer | phone normalize | — |
| BR-033 | Customer | User unique phone + GlobalCustomer 1:1 | ADR-017 |
| BR-034 | Customer | staff+customer same User/phone مجاز | ADR-011, ADR-017 |
| BR-035 | Import | duplicate در فایل = skip | — |
| BR-036 | Bot Link | یک‌بار مصرف | `BOT_LINK_TOKEN_USED` |
| BR-037 | Bot Link | ۲۴h expire | `BOT_LINK_TOKEN_EXPIRED` |
| BR-038 | Bot Link | چند BotIdentity مجاز | — |
| BR-039 | Personal | متعلق به GlobalCustomer | — |
| BR-040 | Personal | CRUD توسط مشتری | — |
| BR-041 | Personal | pending/paid فقط | — |
| BR-042 | Security | tenantId از JWT | — |
| BR-043 | Security | cross-tenant = 404 | — |
| BR-044 | Security | branch scope | — |
| BR-045 | Security | customer ≠ staff actor | — |
| BR-046 | Audit | موارد حساس اجباری | — |
| BR-047 | Audit | append-only forever | — |
| BR-048 | Financials | header + line tax aggregation | `TAX_RATE_INVALID` |
| BR-049 | Financials | insurance add-on in total (setting) | — |

---

*نسخه 1.0 — 1405/04/08*
