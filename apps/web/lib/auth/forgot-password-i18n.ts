export const FORGOT_PASSWORD_I18N = {
  title: 'فراموشی رمز عبور',
  stepPhone: 'مرحله ۱ از ۲: شماره موبایل',
  stepOtp: 'مرحله ۲ از ۲: کد تأیید',
  phoneLabel: 'شماره موبایل',
  phoneHelp: 'کد بازیابی به شماره ثبت‌شده در حساب ارسال می‌شود.',
  phonePlaceholder: 'مثال: ۰۹۱۲۱۲۳۴۵۶۷',
  sendCode: 'ارسال کد بازیابی',
  sending: 'در حال ارسال…',
  otpHelp: 'کد ۵ رقمی پیامک‌شده را وارد کنید.',
  verify: 'تأیید و ادامه',
  verifying: 'در حال تأیید…',
  resend: 'ارسال مجدد کد',
  resendWait: (seconds: number) => `ارسال مجدد تا ${seconds} ثانیه`,
  backToLogin: 'بازگشت به ورود',
  changePhone: 'تغییر شماره',
  successNotice: 'در صورت وجود حساب، کد ارسال شد.',
  resetTitle: 'رمز عبور جدید',
  resetStep: 'تنظیم رمز جدید',
  newPassword: 'رمز عبور جدید',
  confirmPassword: 'تکرار رمز عبور',
  resetSubmit: 'ذخیره رمز جدید',
  resetSaving: 'در حال ذخیره…',
  resetSuccess: 'رمز عبور با موفقیت تغییر کرد. اکنون می‌توانید وارد شوید.',
  passwordHelp: 'حداقل ۸ کاراکتر، شامل حرف و عدد.',
  strengthWeak: 'ضعیف',
  strengthFair: 'متوسط',
  strengthStrong: 'قوی',
} as const;

export function mapForgotPasswordError(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = String((error as { code: unknown }).code);
    switch (code) {
      case 'AUTH_OTP_INVALID':
        return 'کد وارد شده اشتباه است.';
      case 'AUTH_OTP_EXPIRED':
        return 'کد منقضی شده. لطفاً کد جدید درخواست کنید.';
      case 'AUTH_OTP_TOO_MANY_ATTEMPTS':
        return 'تلاش‌های ناموفق زیاد بود. لطفاً کد جدید درخواست کنید.';
      case 'AUTH_LOGIN_RATE_LIMITED':
        return 'درخواست‌های زیاد. لطفاً بعداً دوباره تلاش کنید.';
      case 'AUTH_RESET_TOKEN_EXPIRED':
      case 'AUTH_RESET_TOKEN_INVALID':
        return 'لینک بازیابی منقضی یا نامعتبر است. از اول شروع کنید.';
      case 'AUTH_PASSWORD_TOO_WEAK':
        return 'رمز عبور شرایط لازم را ندارد.';
      case 'AUTH_PASSWORD_REUSED':
        return 'این رمز قبلاً استفاده شده. رمز دیگری انتخاب کنید.';
      case 'INVALID_PHONE':
        return 'شماره موبایل نامعتبر است.';
      default:
        break;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'خطایی رخ داد. دوباره تلاش کنید.';
}

export function passwordStrengthLabel(password: string): string | null {
  if (!password) {
    return null;
  }
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Za-z]/.test(password) && /\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 1) return FORGOT_PASSWORD_I18N.strengthWeak;
  if (score === 2) return FORGOT_PASSWORD_I18N.strengthFair;
  return FORGOT_PASSWORD_I18N.strengthStrong;
}
