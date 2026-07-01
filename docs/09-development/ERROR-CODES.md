# کاتالوگ کدهای خطا — Hivork

> **وضعیت:** Approved — v1.0  
> **نسخه:** 1.0 — 1405/04/08  
> **ADR مرتبط:** ADR-010  
> **فرمت پاسخ خطا:**
> ```json
> { "code": "ERROR_CODE", "message": "توضیح به فارسی", "details": {} }
> ```

---

## ۱. ساختار کدهای خطا

```
{DOMAIN}_{RESOURCE}_{ISSUE}

مثال:
  AUTH_OTP_EXPIRED
  INSTALLMENT_STATUS_INVALID
  TENANT_PLAN_LIMIT_EXCEEDED
```

---

## ۲. خطاهای احراز هویت (AUTH_*)

| کد | HTTP | توضیح |
|----|------|--------|
| `AUTH_TOKEN_INVALID` | 401 | JWT نامعتبر یا منقضی |
| `AUTH_TOKEN_MISSING` | 401 | Authorization header یا cookie وجود ندارد |
| `AUTH_TOKEN_EXPIRED` | 401 | access token منقضی — باید refresh شود |
| `AUTH_REFRESH_EXPIRED` | 401 | refresh token منقضی — re-login لازم |
| `AUTH_ACTOR_MISMATCH` | 403 | توکن staff با endpoint customer استفاده شده یا برعکس |
| `AUTH_OTP_INVALID` | 400 | کد OTP اشتباه |
| `AUTH_OTP_EXPIRED` | 400 | کد OTP منقضی شده (بیش از ۲ دقیقه) |
| `AUTH_OTP_TOO_MANY_ATTEMPTS` | 429 | بیش از ۵ بار اشتباه — منتظر کولداون |
| `AUTH_OTP_RATE_LIMITED` | 429 | درخواست OTP جدید قبل از انقضای کولداون |
| `INVALID_PHONE` | 400 | شماره موبایل معتبر نیست (باید `09xxxxxxxxx`) |
| `PHONE_NOT_FOUND` | 404 | شماره در سیستم ثبت نشده (برای intent=login) |
| `NEED_TENANT_SLUG` | 409 | یک User چند Staff membership دارد — `tenantSlug` لازم (ADR-017) |
| `AUTH_PASSWORD_TOO_WEAK` | 400 | رمز عبور policy را رد کرد — جزئیات در `details` |
| `AUTH_CREDENTIAL_ALREADY_EXISTS` | 409 | credential از قبل برای User ثبت شده |
| `AUTH_INVALID_CREDENTIALS` | 401 | شماره یا رمز اشتباه — پیام یکسان (بدون enumeration) |
| `AUTH_ACCOUNT_LOCKED` | 423 | حساب به دلیل تلاش‌های ناموفق موقتاً قفل — `details.lockedUntil` + `details.retryAfterSeconds` (IFP-013) |
| `AUTH_MUST_CHANGE_PASSWORD` | 403 | ورود با رمز موقت — باید رمز عوض شود — `changePasswordToken` در body |
| `AUTH_CAPTCHA_INVALID` | 400 | captcha نامعتبر (IFP-012) |
| `AUTH_CAPTCHA_REQUIRED` | 400 | captcha ارسال نشده وقتی فعال است (IFP-012) |
| `CAPTCHA_SERVICE_UNAVAILABLE` | 503 | سرویس Turnstile در دسترس نیست (IFP-012) |
| `AUTH_IP_NOT_ALLOWED` | 403 | IP در allowlist tenant نیست (IFP-014) |
| `AUTH_LOGIN_RATE_LIMITED` | 429 | rate limit ورود با رمز — `details.retryAfterSeconds` (IFP-013) |
| `AUTH_MFA_TOKEN_INVALID` | 401 | mfaToken نامعتبر یا مصرف‌شده |
| `AUTH_MFA_TOKEN_EXPIRED` | 401 | mfaToken منقضی — ورود مجدد |
| `AUTH_MFA_NOT_ENABLED` | 403 | MFA برای این حساب غیرفعال شده |
| `AUTH_OTP_INVALID` | 400 | کد OTP MFA اشتباه |
| `AUTH_OTP_EXPIRED` | 400 | کد OTP MFA منقضی |
| `AUTH_OTP_TOO_MANY_ATTEMPTS` | 429 | بیش از ۵ تلاش OTP MFA |
| `AUTH_OTP_RATE_LIMITED` | 429 | rate limit درخواست OTP MFA |
| `AUTH_TOTP_INVALID` | 400 | کد Authenticator اشتباه (IFP-005) |
| `AUTH_RESET_TOKEN_EXPIRED` | 401 | لینک/توکن بازیابی رمز منقضی — از اول شروع کنید |
| `AUTH_RESET_TOKEN_INVALID` | 401 | توکن بازیابی نامعتبر یا مصرف‌شده |
| `AUTH_PASSWORD_REUSED` | 400 | رمز جدید نباید یکی از ۳ رمز اخیر باشد |
| `AUTH_TOTP_SETUP_EXPIRED` | 400 | راه‌اندازی TOTP منقضی — setup مجدد |
| `AUTH_MFA_ALREADY_ENABLED` | 409 | TOTP از قبل فعال است |
| `AUTH_BACKUP_CODE_USED` | 400 | کد پشتیبان قبلاً مصرف شده |
| `AUTH_CREDENTIAL_LOCKED` | 403 | حساب به دلیل تلاش‌های ناموفق قفل است (IFP-013) — legacy alias |

---

## ۳. خطاهای Tenant و مجوز (TENANT_*)

| کد | HTTP | توضیح |
|----|------|--------|
| `TENANT_NOT_FOUND` | 404 | tenant با slug/id مشخص‌شده وجود ندارد |
| `TENANT_SUSPENDED` | 403 | حساب فروشگاه تعلیق شده — عملیات نوشتن ممنوع |
| `TENANT_TRIAL_EXPIRED` | 403 | دوره آزمایشی تمام شده — ارتقا به پلن پولی لازم |
| `TENANT_PLAN_LIMIT_EXCEEDED` | 403 | به سقف پلن رسیده (مشتری، staff، یا branch) |
| `MODULE_NOT_ENABLED` | 403 | ماژول درخواست‌شده برای این tenant فعال نیست |
| `PERMISSION_DENIED` | 403 | کاربر مجوز این عملیات را ندارد |
| `BRANCH_NOT_FOUND` | 404 | شعبه یافت نشد یا به این tenant تعلق ندارد |
| `BRANCH_NOT_ALLOWED` | 403 | staff به شعبه فعال دسترسی ندارد (ADR-015) |
| `BRANCH_IS_DEFAULT` | 409 | نمی‌توان شعبه پیش‌فرض را حذف کرد (ADR-009) |

---

## ۴. خطاهای اعتبارسنجی (VALIDATION_*)

| کد | HTTP | توضیح |
|----|------|--------|
| `VALIDATION_ERROR` | 400 | خطای کلی اعتبارسنجی — جزئیات در `details` |
| `FIELD_REQUIRED` | 400 | فیلد اجباری خالی است |
| `FIELD_INVALID_FORMAT` | 400 | فرمت فیلد اشتباه است |
| `FIELD_TOO_LONG` | 400 | طول فیلد از حد مجاز تجاوز کرده |
| `AMOUNT_MUST_BE_POSITIVE` | 400 | مبلغ باید مثبت باشد |
| `AMOUNT_EXCEEDS_TOTAL` | 400 | پیش‌پرداخت بیشتر از مبلغ کل |
| `INSTALLMENT_COUNT_INVALID` | 400 | تعداد اقساط باید بین ۱ تا ۱۲۰ باشد |

---

## ۵. خطاهای ماژول اقساط (INSTALLMENTS_*)

### فروش (Sale)

| کد | HTTP | توضیح |
|----|------|--------|
| `SALE_NOT_FOUND` | 404 | فروش یافت نشد |
| `SALE_ALREADY_CANCELLED` | 409 | فروش قبلاً لغو شده |
| `SALE_ALREADY_COMPLETED` | 409 | فروش تکمیل شده — تغییر ممکن نیست |
| `SALE_HAS_PAID_INSTALLMENT` | 409 | نمی‌توان فروش با قسط پرداخت‌شده را لغو کرد |
| `SALE_BRANCH_MISMATCH` | 403 | فروش متعلق به شعبه دیگری است |

### قسط (Installment)

| کد | HTTP | توضیح |
|----|------|--------|
| `INSTALLMENT_NOT_FOUND` | 404 | قسط یافت نشد |
| `INSTALLMENT_ALREADY_PAID` | 409 | قسط قبلاً پرداخت شده |
| `INSTALLMENT_ALREADY_WAIVED` | 409 | قسط قبلاً بخشیده شده |
| `INSTALLMENT_STATUS_INVALID` | 409 | تغییر وضعیت در این مرحله مجاز نیست |
| `INSTALLMENT_CANNOT_DELETE` | 409 | قسط هرگز حذف نمی‌شود (soft یا hard) — فقط status تغییر می‌کند |

### پرداخت (Payment)

| کد | HTTP | توضیح |
|----|------|--------|
| `PAYMENT_NOT_FOUND` | 404 | گزارش پرداخت یافت نشد |
| `PAYMENT_ALREADY_CONFIRMED` | 409 | پرداخت قبلاً تأیید شده |
| `PAYMENT_ALREADY_REJECTED` | 409 | پرداخت قبلاً رد شده |
| `PAYMENT_PENDING_EXISTS` | 409 | پرداخت در انتظار تأیید وجود دارد — قبل از ثبت جدید تأیید یا رد کنید |
| `PAYMENT_AMOUNT_MISMATCH` | 400 | مبلغ پرداخت با مبلغ قسط تطابق ندارد |

### مشتری (Customer)

| کد | HTTP | توضیح |
|----|------|--------|
| `CUSTOMER_NOT_FOUND` | 404 | مشتری یافت نشد |
| `CUSTOMER_ALREADY_EXISTS` | 409 | مشتری با این شماره قبلاً در این فروشگاه ثبت شده |
| `CUSTOMER_IMPORT_FAILED` | 422 | خطا در Import Excel — جزئیات per-row در `details.errors` |
| `CUSTOMER_PHONE_DUPLICATE_IN_FILE` | 422 | شماره تکراری در فایل Excel |

---

## ۶. خطاهای Core (CORE_*)

### Staff

| کد | HTTP | توضیح |
|----|------|--------|
| `STAFF_NOT_FOUND` | 404 | عضو تیم یافت نشد |
| `STAFF_PHONE_DUPLICATE` | 409 | این شماره قبلاً در تیم این فروشگاه ثبت شده |
| `STAFF_CANNOT_DELETE_SELF` | 409 | نمی‌توانید حساب خودتان را حذف کنید |
| `STAFF_LAST_OWNER` | 409 | نمی‌توان آخرین owner فروشگاه را حذف یا تغییر نقش داد |
| `STAFF_SUSPENDED` | 403 | حساب عضو تیم تعلیق شده |

### نقش و مجوز (Role/Permission)

| کد | HTTP | توضیح |
|----|------|--------|
| `ROLE_NOT_FOUND` | 404 | نقش یافت نشد |
| `ROLE_IS_SYSTEM` | 409 | نقش‌های سیستمی قابل ویرایش یا حذف نیستند |
| `ROLE_CODE_DUPLICATE` | 409 | نقش با این کد قبلاً وجود دارد |
| `PERMISSION_NOT_FOUND` | 404 | کد مجوز نامعتبر است |
| `OVERRIDE_ALREADY_EXISTS` | 409 | override مجوز برای این کاربر قبلاً ثبت شده |

### تنظیمات (Settings)

| کد | HTTP | توضیح |
|----|------|--------|
| `SETTING_KEY_UNKNOWN` | 400 | کلید تنظیم در schema تعریف نشده |
| `SETTING_VALUE_INVALID` | 400 | مقدار تنظیم معتبر نیست — جزئیات در `details` |
| `SETTING_READONLY` | 403 | این تنظیم توسط Platform تعریف شده و قابل تغییر نیست |

---

## ۷. خطاهای Soft Delete و Restore (DATA_*)

| کد | HTTP | توضیح |
|----|------|--------|
| `RECORD_DELETED` | 404 | رکورد حذف (soft delete) شده — برای کاربر عادی مانند 404 |
| `RESTORE_NOT_FOUND` | 404 | رکورد برای بازیابی وجود ندارد |
| `RESTORE_PERMISSION_DENIED` | 403 | فقط owner یا platform admin می‌تواند بازیابی کند |
| `DELETE_FORBIDDEN` | 409 | حذف این رکورد ممنوع (مثل شعبه پیش‌فرض) |

---

## ۸. خطاهای Concurrency و سیستمی

| کد | HTTP | توضیح |
|----|------|--------|
| `OPTIMISTIC_LOCK_CONFLICT` | 409 | نسخه رکورد تغییر کرده — مجدداً تلاش کن |
| `IDEMPOTENCY_CONFLICT` | 409 | درخواست با همین Idempotency-Key قبلاً پردازش شده |
| `RATE_LIMITED` | 429 | درخواست‌های زیاد — بعد از مدتی دوباره امتحان کنید |
| `SERVICE_UNAVAILABLE` | 503 | سرویس موقتاً در دسترس نیست |
| `INTERNAL_ERROR` | 500 | خطای داخلی — گزارش به Sentry ارسال شده |

---

## ۹. پیاده‌سازی در کد

### Domain Error

```typescript
// packages/domain/shared/domain-error.ts
export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly httpStatus: number = 400,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

// مثال استفاده:
throw new DomainError(
  'INSTALLMENT_ALREADY_PAID',
  'قسط قبلاً پرداخت شده است.',
  409,
);
```

### NestJS Exception Filter (mapping)

```typescript
// apps/api/src/common/filters/http-exception.filter.ts
@Catch(DomainError)
export class DomainErrorFilter implements ExceptionFilter {
  catch(exception: DomainError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    response.status(exception.httpStatus).json({
      code: exception.code,
      message: exception.message,
      details: exception.details,
    });
  }
}
```

### پیام‌های فارسی (i18n)

```typescript
// packages/i18n/fa/error-messages.ts
export const errorMessages: Record<string, string> = {
  INSTALLMENT_ALREADY_PAID: 'این قسط قبلاً پرداخت شده و قابل تغییر نیست.',
  SALE_HAS_PAID_INSTALLMENT: 'امکان لغو فروش با قسط پرداخت‌شده وجود ندارد.',
  TENANT_PLAN_LIMIT_EXCEEDED: 'به سقف مجاز پلن شما رسیده‌اید. برای ارتقا با پشتیبانی تماس بگیرید.',
  BRANCH_NOT_ALLOWED: 'دسترسی به این شعبه برای شما تعریف نشده است.',
  // ...
};
```

---

## ۱۰. فرمت پاسخ خطا برای client

```typescript
// packages/contracts/shared/error.schema.ts
export const ErrorResponseSchema = z.object({
  code: z.string(),           // کد ماشین‌خوان
  message: z.string(),        // پیام انسان‌خوان (فارسی در production)
  details: z.record(z.unknown()).optional(),  // اطلاعات اضافه
});

// مثال Import Excel:
{
  "code": "CUSTOMER_IMPORT_FAILED",
  "message": "خطا در پردازش فایل اکسل",
  "details": {
    "totalRows": 50,
    "successCount": 47,
    "errors": [
      { "row": 12, "phone": "0912xxx", "error": "INVALID_PHONE" },
      { "row": 23, "phone": "09300000001", "error": "CUSTOMER_ALREADY_EXISTS" },
      { "row": 45, "phone": null, "error": "FIELD_REQUIRED" }
    ]
  }
}
```

---

## ۱۱. خطاهای Bot (BOT_*)

| کد | توضیح |
|----|--------|
| `BOT_LINK_TOKEN_INVALID` | توکن link نامعتبر یا وجود ندارد |
| `BOT_LINK_TOKEN_EXPIRED` | توکن link منقضی شده (بیش از ۲۴ ساعت) |
| `BOT_LINK_TOKEN_USED` | توکن قبلاً استفاده شده (one-time use) |
| `BOT_CUSTOMER_NOT_LINKED` | مشتری هنوز ربات را فعال نکرده |
| `BOT_CHANNEL_UNAVAILABLE` | ارسال به این channel ممکن نیست (block، chat not started) |

---

*نسخه 1.0 — 1405/04/08*
