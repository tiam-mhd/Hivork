export const CAPTCHA_I18N = {
  required: 'لطفاً تأیید کنید که ربات نیستید',
  invalid: 'لطفاً تأیید کنید که ربات نیستید',
  loading: 'در حال بارگذاری تأیید امنیتی…',
} as const;

export function isCaptchaEnabledClient(): boolean {
  return process.env.NEXT_PUBLIC_CAPTCHA_ENABLED === 'true';
}

export function getCaptchaSiteKey(): string {
  return process.env.NEXT_PUBLIC_CAPTCHA_SITE_KEY ?? '';
}
