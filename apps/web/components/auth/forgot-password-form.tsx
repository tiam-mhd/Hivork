'use client';

import { phoneSchema } from '@hivork/contracts';
import { Button, Input, Label } from '@hivork/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useId, useRef, useState } from 'react';

import { CaptchaWidget, type CaptchaWidgetHandle } from '@/components/auth/captcha-widget';
import { CAPTCHA_I18N, isCaptchaEnabledClient } from '@/lib/auth/captcha-config';
import {
  isForgotPasswordApiError,
  requestForgotPassword,
  resetPassword,
  verifyForgotPasswordOtp,
} from '@/lib/auth/forgot-password';
import {
  FORGOT_PASSWORD_I18N,
  mapForgotPasswordError,
  passwordStrengthLabel,
} from '@/lib/auth/forgot-password-i18n';
import {
  joinOtpDigits,
  nextOtpFocusIndex,
  OTP_LENGTH,
  splitOtpDigits,
} from '@/lib/auth/otp-utils';
import { useCountdown } from '@/lib/auth/use-countdown';

type Step = 'phone' | 'otp';

export function ForgotPasswordForm() {
  const router = useRouter();
  const phoneId = useId();
  const captchaRef = useRef<CaptchaWidgetHandle>(null);
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [resendUntil, setResendUntil] = useState<number | null>(null);
  const [otpExpiresIn, setOtpExpiresIn] = useState(120);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const resendSeconds = useCountdown(resendUntil);

  const digits = splitOtpDigits(code);

  const submitPhone = useCallback(async () => {
    setError(null);
    setNotice(null);
    const parsed = phoneSchema.safeParse(phone);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'شماره موبایل نامعتبر است');
      return;
    }

    if (isCaptchaEnabledClient() && !captchaToken) {
      setError(CAPTCHA_I18N.required);
      return;
    }

    setLoading(true);
    try {
      const result = await requestForgotPassword({
        phone: parsed.data,
        captchaToken: captchaToken ?? undefined,
      });
      setOtpExpiresIn(result.expiresIn);
      setNotice(result.message || FORGOT_PASSWORD_I18N.successNotice);
      setStep('otp');
      setCode('');
      setResendUntil(Date.now() + 60_000);
    } catch (err) {
      setError(mapForgotPasswordError(isForgotPasswordApiError(err) ? err : err));
      if (
        isForgotPasswordApiError(err) &&
        (err.code === 'AUTH_CAPTCHA_INVALID' || err.code === 'AUTH_CAPTCHA_REQUIRED')
      ) {
        captchaRef.current?.reset();
      }
    } finally {
      setLoading(false);
    }
  }, [phone, captchaToken]);

  const resendOtp = useCallback(async () => {
    if (resendSeconds > 0) {
      return;
    }
    await submitPhone();
  }, [resendSeconds, submitPhone]);

  const submitOtp = useCallback(async () => {
    setError(null);
    const normalizedPhone = phoneSchema.safeParse(phone);
    if (!normalizedPhone.success) {
      setError('شماره موبایل نامعتبر است');
      return;
    }
    if (!/^\d{5}$/.test(code)) {
      setError('کد باید ۵ رقم باشد');
      return;
    }

    setLoading(true);
    try {
      const result = await verifyForgotPasswordOtp({
        phone: normalizedPhone.data,
        code,
      });
      router.push(`/auth/reset-password?token=${encodeURIComponent(result.resetToken)}`);
    } catch (err) {
      setError(mapForgotPasswordError(isForgotPasswordApiError(err) ? err : err));
      setCode('');
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }, [code, phone, router]);

  useEffect(() => {
    if (step === 'otp' && code.length === OTP_LENGTH) {
      void submitOtp();
    }
  }, [code, step, submitOtp]);

  useEffect(() => {
    if (step === 'otp') {
      inputRefs.current[0]?.focus();
    }
  }, [step]);

  if (step === 'phone') {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">{FORGOT_PASSWORD_I18N.stepPhone}</p>

        <div className="flex flex-col gap-2">
          <Label htmlFor={phoneId}>{FORGOT_PASSWORD_I18N.phoneLabel}</Label>
          <Input
            id={phoneId}
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            placeholder={FORGOT_PASSWORD_I18N.phonePlaceholder}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            dir="ltr"
            className="min-h-11 text-lg"
            disabled={loading}
          />
          <p className="text-xs text-muted-foreground">{FORGOT_PASSWORD_I18N.phoneHelp}</p>
          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <CaptchaWidget ref={captchaRef} onTokenChange={setCaptchaToken} disabled={loading} />

        <Button
          type="button"
          className="min-h-11 w-full"
          disabled={loading || !phone.trim()}
          onClick={() => void submitPhone()}
        >
          {loading ? FORGOT_PASSWORD_I18N.sending : FORGOT_PASSWORD_I18N.sendCode}
        </Button>

        <Link
          href="/login"
          className="text-center text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          {FORGOT_PASSWORD_I18N.backToLogin}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">{FORGOT_PASSWORD_I18N.stepOtp}</p>

      {notice ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {notice}
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground">
        {FORGOT_PASSWORD_I18N.otpHelp} (اعتبار: {Math.ceil(otpExpiresIn / 60)} دقیقه)
      </p>

      <div className="flex justify-center gap-2" dir="ltr">
        {digits.map((digit, index) => (
          <Input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={1}
            className="h-12 w-10 text-center text-lg"
            value={digit}
            disabled={loading}
            aria-label={`رقم ${index + 1} کد تأیید`}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '').slice(-1);
              const next = [...digits];
              next[index] = value;
              setCode(joinOtpDigits(next));
              const nextIndex = nextOtpFocusIndex(index, value);
              if (nextIndex !== null) {
                inputRefs.current[nextIndex]?.focus();
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Backspace' && !digits[index] && index > 0) {
                inputRefs.current[index - 1]?.focus();
              }
            }}
          />
        ))}
      </div>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <Button
        type="button"
        className="min-h-11 w-full"
        disabled={loading || code.length !== OTP_LENGTH}
        onClick={() => void submitOtp()}
      >
        {loading ? FORGOT_PASSWORD_I18N.verifying : FORGOT_PASSWORD_I18N.verify}
      </Button>

      <div className="flex flex-col gap-2 text-center text-sm">
        <button
          type="button"
          className="font-medium text-primary disabled:opacity-50"
          disabled={loading || resendSeconds > 0}
          onClick={() => void resendOtp()}
        >
          {resendSeconds > 0
            ? FORGOT_PASSWORD_I18N.resendWait(resendSeconds)
            : FORGOT_PASSWORD_I18N.resend}
        </button>
        <button
          type="button"
          className="text-muted-foreground underline-offset-4 hover:underline"
          onClick={() => {
            setStep('phone');
            setCode('');
            setError(null);
          }}
        >
          {FORGOT_PASSWORD_I18N.changePhone}
        </button>
        <Link href="/login" className="text-primary underline-offset-4 hover:underline">
          {FORGOT_PASSWORD_I18N.backToLogin}
        </Link>
      </div>
    </div>
  );
}

type ResetPasswordFormProps = {
  resetToken: string;
};

export function ResetPasswordForm({ resetToken }: ResetPasswordFormProps) {
  const router = useRouter();
  const passwordId = useId();
  const confirmId = useId();
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const strength = passwordStrengthLabel(password);

  const submit = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      await resetPassword({ resetToken, password, passwordConfirm });
      setSuccess(true);
      setTimeout(() => {
        router.replace('/login?reset=1');
      }, 1500);
    } catch (err) {
      setError(mapForgotPasswordError(isForgotPasswordApiError(err) ? err : err));
    } finally {
      setLoading(false);
    }
  }, [password, passwordConfirm, resetToken, router]);

  if (success) {
    return (
      <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-4 text-sm text-emerald-800">
        {FORGOT_PASSWORD_I18N.resetSuccess}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">{FORGOT_PASSWORD_I18N.resetStep}</p>

      <div className="flex flex-col gap-2">
        <Label htmlFor={passwordId}>{FORGOT_PASSWORD_I18N.newPassword}</Label>
        <Input
          id={passwordId}
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="min-h-11"
          disabled={loading}
        />
        <p className="text-xs text-muted-foreground">{FORGOT_PASSWORD_I18N.passwordHelp}</p>
        {strength ? <p className="text-xs text-muted-foreground">قدرت رمز: {strength}</p> : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={confirmId}>{FORGOT_PASSWORD_I18N.confirmPassword}</Label>
        <Input
          id={confirmId}
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
          className="min-h-11"
          disabled={loading}
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={showPassword}
          onChange={(e) => setShowPassword(e.target.checked)}
        />
        نمایش رمز
      </label>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <Button
        type="button"
        className="min-h-11 w-full"
        disabled={loading || !password || !passwordConfirm}
        onClick={() => void submit()}
      >
        {loading ? FORGOT_PASSWORD_I18N.resetSaving : FORGOT_PASSWORD_I18N.resetSubmit}
      </Button>

      <Link
        href="/login"
        className="text-center text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        {FORGOT_PASSWORD_I18N.backToLogin}
      </Link>
    </div>
  );
}
