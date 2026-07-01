'use client';

import { phoneSchema } from '@hivork/contracts';
import { Button, Checkbox, Input, Label } from '@hivork/ui';
import { useId, useRef, useState } from 'react';

import { CaptchaWidget, type CaptchaWidgetHandle } from '@/components/auth/captcha-widget';
import { CAPTCHA_I18N, isCaptchaEnabledClient } from '@/lib/auth/captcha-config';
import { LOGIN_PASSWORD_I18N } from '@/lib/auth/login-password-i18n';

type PhoneStepProps = {
  defaultPhone?: string;
  rememberMe?: boolean;
  loading: boolean;
  rateLimitSeconds: number;
  error: string | null;
  onSubmit: (phone: string, captchaToken?: string) => void;
  onRememberMeChange?: (rememberMe: boolean) => void;
};

export function PhoneStep({
  defaultPhone = '',
  rememberMe = false,
  loading,
  rateLimitSeconds,
  error,
  onSubmit,
  onRememberMeChange,
}: PhoneStepProps) {
  const [phone, setPhone] = useState(defaultPhone);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<CaptchaWidgetHandle>(null);
  const rememberId = useId();

  const rateLimited = rateLimitSeconds > 0;

  function handleSubmit() {
    setFieldError(null);
    const parsed = phoneSchema.safeParse(phone);
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? 'شماره موبایل نامعتبر است');
      return;
    }

    if (isCaptchaEnabledClient() && !captchaToken) {
      setFieldError(CAPTCHA_I18N.required);
      return;
    }

    onSubmit(parsed.data, captchaToken ?? undefined);
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">مرحله ۱ از ۴: شماره موبایل</p>

      {rateLimited ? (
        <div
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          role="alert"
        >
          تعداد درخواست‌های کد بیش از حد مجاز است. لطفاً {rateLimitSeconds} ثانیه صبر کنید.
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor="login-phone">شماره موبایل</Label>
        <Input
          id="login-phone"
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          aria-label="شماره موبایل برای ورود"
          placeholder="مثال: ۰۹۱۲۱۲۳۴۵۶۷"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          dir="ltr"
          className="min-h-11 text-lg"
          disabled={loading || rateLimited}
        />
        <p className="text-xs text-muted-foreground">
          شماره‌ای که با آن در سیستم ثبت شده‌اید را وارد کنید.
        </p>
        {fieldError ? <p className="text-sm text-red-600">{fieldError}</p> : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Checkbox
            id={rememberId}
            checked={rememberMe}
            onCheckedChange={(checked) => onRememberMeChange?.(checked === true)}
            disabled={loading || rateLimited}
            aria-describedby={`${rememberId}-help`}
          />
          <Label htmlFor={rememberId} className="cursor-pointer font-normal">
            {LOGIN_PASSWORD_I18N.rememberMe}
          </Label>
        </div>
        <p id={`${rememberId}-help`} className="text-xs text-muted-foreground ps-6">
          {LOGIN_PASSWORD_I18N.rememberMeHelp}
        </p>
      </div>

      <p className="text-xs text-muted-foreground">کد تأیید به این شماره پیامک می‌شود.</p>

      <CaptchaWidget ref={captchaRef} onTokenChange={setCaptchaToken} disabled={loading || rateLimited} />

      <Button
        type="button"
        className="min-h-11 w-full"
        disabled={loading || rateLimited || !phone.trim()}
        onClick={handleSubmit}
      >
        {loading ? 'در حال ارسال…' : 'ارسال کد تأیید →'}
      </Button>
    </div>
  );
}
