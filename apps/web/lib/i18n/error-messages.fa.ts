import { ErrorCodes } from '@hivork/contracts';

/**
 * Persian error messages for API codes — sync with docs/09-development/ERROR-CODES.md
 * Server `message` is preferred when present; these are client fallbacks.
 */
export const ERROR_MESSAGES_FA: Record<string, string> = {
  // Auth (contracts + ERROR-CODES)
  [ErrorCodes.UNAUTHORIZED]: 'لطفاً دوباره وارد شوید.',
  [ErrorCodes.FORBIDDEN]: 'دسترسی به این عملیات مجاز نیست.',
  [ErrorCodes.OTP_INVALID]: 'کد تأیید نامعتبر است.',
  [ErrorCodes.OTP_EXPIRED]: 'کد تأیید منقضی شده است. دوباره درخواست دهید.',
  [ErrorCodes.OTP_RATE_LIMITED]: 'تعداد درخواست بیش از حد مجاز است. لطفاً کمی صبر کنید.',
  [ErrorCodes.VERIFIED_TOKEN_EXPIRED]: 'زمان ثبت‌نام به پایان رسیده. دوباره کد تأیید بگیرید.',
  [ErrorCodes.VERIFIED_TOKEN_INVALID]: 'توکن تأیید نامعتبر است.',
  [ErrorCodes.AUTH_PASSWORD_TOO_WEAK]: 'رمز عبور شرایط امنیتی را رد کرد.',
  [ErrorCodes.AUTH_CREDENTIAL_ALREADY_EXISTS]: 'رمز عبور از قبل تنظیم شده است.',
  [ErrorCodes.AUTH_TOKEN_INVALID]: 'نشست نامعتبر است. دوباره وارد شوید.',
  [ErrorCodes.AUTH_INVALID_CREDENTIALS]: 'شماره یا رمز اشتباه است.',
  [ErrorCodes.AUTH_ACCOUNT_LOCKED]: 'حساب به دلیل تلاش‌های ناموفق موقتاً قفل شده است.',
  [ErrorCodes.AUTH_MUST_CHANGE_PASSWORD]: 'باید رمز عبور خود را تغییر دهید.',
  [ErrorCodes.AUTH_CAPTCHA_INVALID]: 'لطفاً تأیید کنید که ربات نیستید',
  [ErrorCodes.AUTH_CAPTCHA_REQUIRED]: 'لطفاً تأیید کنید که ربات نیستید',
  CAPTCHA_SERVICE_UNAVAILABLE: 'سرویس تأیید امنیتی موقتاً در دسترس نیست. دوباره تلاش کنید.',
  [ErrorCodes.AUTH_IP_NOT_ALLOWED]: 'ورود از این IP مجاز نیست.',
  [ErrorCodes.AUTH_LOGIN_RATE_LIMITED]: 'تعداد تلاش‌های ورود بیش از حد مجاز است.',
  [ErrorCodes.AUTH_MFA_TOKEN_INVALID]: 'نشست تأیید دو مرحله‌ای نامعتبر است.',
  [ErrorCodes.AUTH_MFA_TOKEN_EXPIRED]: 'نشست تأیید دو مرحله‌ای منقضی شده است.',
  [ErrorCodes.AUTH_MFA_NOT_ENABLED]: 'تأیید دو مرحله‌ای برای این حساب فعال نیست.',
  [ErrorCodes.AUTH_OTP_INVALID]: 'کد تأیید اشتباه است.',
  [ErrorCodes.AUTH_OTP_EXPIRED]: 'کد تأیید منقضی شده است.',
  [ErrorCodes.AUTH_OTP_TOO_MANY_ATTEMPTS]: 'تعداد تلاش‌های کد تأیید بیش از حد مجاز است.',
  [ErrorCodes.AUTH_OTP_RATE_LIMITED]: 'تعداد درخواست کد بیش از حد مجاز است.',
  [ErrorCodes.AUTH_TOTP_INVALID]: 'کد Authenticator اشتباه است.',
  [ErrorCodes.AUTH_API_KEY_INVALID]: 'کلید API نامعتبر است.',
  [ErrorCodes.AUTH_API_KEY_REVOKED]: 'کلید API لغو شده است.',
  [ErrorCodes.AUTH_API_KEY_EXPIRED]: 'کلید API منقضی شده است.',
  [ErrorCodes.AUTH_API_KEY_RATE_LIMITED]: 'محدودیت تعداد درخواست کلید API.',
  [ErrorCodes.API_KEY_NAME_EXISTS]: 'کلید API با این نام قبلاً ثبت شده است.',
  [ErrorCodes.API_KEY_NOT_FOUND]: 'کلید API یافت نشد.',
  [ErrorCodes.STAFF_SUSPENDED]: 'حساب کاربری غیرفعال است. با پشتیبانی تماس بگیرید.',
  [ErrorCodes.TENANT_SUSPENDED]: 'حساب فروشگاه معلق است.',

  // Resource
  [ErrorCodes.NOT_FOUND]: 'مورد درخواستی یافت نشد.',
  [ErrorCodes.VALIDATION_ERROR]: 'اطلاعات وارد‌شده معتبر نیست.',
  [ErrorCodes.CONFLICT]: 'این عملیات با وضعیت فعلی سازگار نیست.',
  [ErrorCodes.ALREADY_EXISTS]: 'این مورد قبلاً ثبت شده است.',

  // Soft delete
  [ErrorCodes.HARD_DELETE_FORBIDDEN]: 'حذف دائمی مجاز نیست.',
  [ErrorCodes.ALREADY_DELETED]: 'این مورد قبلاً حذف شده است.',
  [ErrorCodes.NOT_DELETED]: 'این مورد حذف نشده است.',
  [ErrorCodes.DELETE_FORBIDDEN]: 'حذف این مورد مجاز نیست.',
  [ErrorCodes.RESTORE_FORBIDDEN]: 'بازیابی این مورد مجاز نیست.',

  // Domain / plan
  [ErrorCodes.DOMAIN_ERROR]: 'خطای منطق کسب‌وکار.',
  [ErrorCodes.MODULE_NOT_ENABLED]: 'این ماژول برای فروشگاه شما فعال نیست.',
  [ErrorCodes.PLAN_LIMIT_EXCEEDED]: 'به سقف مجاز پلن رسیده‌اید.',
  [ErrorCodes.CANNOT_DEACTIVATE_DEFAULT_BRANCH]: 'شعبه پیش‌فرض را نمی‌توان غیرفعال کرد.',
  [ErrorCodes.INTERNAL_ERROR]: 'خطای داخلی سرور. لطفاً دوباره تلاش کنید.',

  // ERROR-CODES.md aliases used by API
  INVALID_PHONE: 'شماره موبایل معتبر نیست.',
  PHONE_NOT_FOUND: 'این شماره در سیستم ثبت نشده است.',
  AUTH_TOKEN_EXPIRED: 'نشست شما منقضی شده. دوباره وارد شوید.',
  AUTH_TOKEN_MISSING: 'لطفاً وارد شوید.',
  NEED_TENANT_SLUG: 'چند فروشگاه با این شماره مرتبط است. یکی را انتخاب کنید.',

  TENANT_NOT_FOUND: 'فروشگاه یافت نشد.',
  TENANT_PLAN_LIMIT_EXCEEDED: 'به سقف مجاز پلن رسیده‌اید. برای ارتقا با پشتیبانی تماس بگیرید.',
  TENANT_TRIAL_EXPIRED: 'دوره آزمایشی تمام شده است.',
  PERMISSION_DENIED: 'مجوز انجام این عملیات را ندارید.',
  BRANCH_NOT_FOUND: 'شعبه یافت نشد.',
  BRANCH_NOT_ALLOWED: 'شما به این شعبه دسترسی ندارید.',
  BRANCH_IS_DEFAULT: 'شعبه پیش‌فرض قابل حذف نیست.',

  FIELD_REQUIRED: 'این فیلد الزامی است.',
  FIELD_INVALID_FORMAT: 'فرمت فیلد نامعتبر است.',
  AMOUNT_MUST_BE_POSITIVE: 'مبلغ باید بزرگ‌تر از صفر باشد.',
  AMOUNT_EXCEEDS_TOTAL: 'مبلغ از کل فروش بیشتر است.',

  CUSTOMER_NOT_FOUND: 'مشتری یافت نشد.',
  CUSTOMER_ALREADY_EXISTS: 'مشتری با این شماره قبلاً ثبت شده است.',
  CUSTOMER_IMPORT_FAILED: 'خطا در پردازش فایل اکسل.',
  CUSTOMER_PHONE_DUPLICATE_IN_FILE: 'شماره تکراری در فایل اکسل وجود دارد.',
  IDEMPOTENCY_CONFLICT: 'این درخواست قبلاً با فایل دیگری ثبت شده است.',

  SALE_NOT_FOUND: 'فروش یافت نشد.',
  SALE_ALREADY_CANCELLED: 'فروش قبلاً لغو شده است.',
  SALE_HAS_PAID_INSTALLMENT: 'فروش دارای قسط پرداخت‌شده است و قابل لغو نیست.',

  INSTALLMENT_NOT_FOUND: 'قسط یافت نشد.',
  INSTALLMENT_ALREADY_PAID: 'قسط قبلاً پرداخت شده است.',
  INSTALLMENT_STATUS_INVALID: 'تغییر وضعیت قسط در این مرحله مجاز نیست.',

  PAYMENT_NOT_FOUND: 'پرداخت یافت نشد.',
  PAYMENT_ALREADY_CONFIRMED: 'پرداخت قبلاً تأیید شده است.',
  PAYMENT_ALREADY_REJECTED: 'پرداخت قبلاً رد شده است.',
  PAYMENT_PENDING_EXISTS: 'پرداخت در انتظار تأیید وجود دارد.',

  STAFF_NOT_FOUND: 'عضو تیم یافت نشد.',
  STAFF_PHONE_DUPLICATE: 'این شماره قبلاً در تیم ثبت شده است.',
  RECORD_DELETED: 'این مورد حذف شده است.',

  RATE_LIMITED: 'درخواست‌های زیاد. لطفاً کمی صبر کنید.',
  OPTIMISTIC_LOCK_CONFLICT: 'اطلاعات توسط شخص دیگری به‌روزرسانی شده. صفحه را بازخوانی کنید.',
  SERVICE_UNAVAILABLE: 'سرویس موقتاً در دسترس نیست.',
};

export function getErrorMessageFa(code: string, fallback?: string): string {
  return ERROR_MESSAGES_FA[code] ?? fallback ?? ERROR_MESSAGES_FA[ErrorCodes.INTERNAL_ERROR]!;
}
