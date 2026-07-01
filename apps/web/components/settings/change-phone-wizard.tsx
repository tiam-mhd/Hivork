'use client';

import { phoneSchema } from '@hivork/contracts';
import { Button, Input, Label } from '@hivork/ui';
import Link from 'next/link';
import { useCallback, useEffect, useId, useRef, useState, type MutableRefObject } from 'react';

import {
  confirmChangePhone,
  initChangePhone,
  isChangePhoneApiError,
  mapChangePhoneError,
  requestCurrentPhoneOtp,
  requestNewPhoneOtp,
  verifyCurrentPhoneOtp,
} from '@/lib/auth/change-phone';
import {
  joinOtpDigits,
  nextOtpFocusIndex,
  OTP_LENGTH,
  splitOtpDigits,
} from '@/lib/auth/otp-utils';
import { useCountdown } from '@/lib/auth/use-countdown';

type WizardStep = 'password' | 'current-otp' | 'new-phone' | 'new-otp' | 'success';

const STEPS: { id: WizardStep; label: string }[] = [
  { id: 'password', label: 'رمز عبور' },
  { id: 'current-otp', label: 'تأیید شماره فعلی' },
  { id: 'new-phone', label: 'شماره جدید' },
  { id: 'new-otp', label: 'تأیید شماره جدید' },
];

function stepIndex(step: WizardStep): number {
  if (step === 'success') {
    return STEPS.length;
  }
  return STEPS.findIndex((item) => item.id === step);
}

export function ChangePhoneWizard() {
  const passwordId = useId();
  const newPhoneId = useId();
  const [step, setStep] = useState<WizardStep>('password');
  const [password, setPassword] = useState('');
  const [changeSessionId, setChangeSessionId] = useState<string | null>(null);
  const [currentOtp, setCurrentOtp] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newOtp, setNewOtp] = useState('');
  const [confirmedPhone, setConfirmedPhone] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [resendUntil, setResendUntil] = useState<number | null>(null);
  const currentOtpRefs = useRef<Array<HTMLInputElement | null>>([]);
  const newOtpRefs = useRef<Array<HTMLInputElement | null>>([]);
  const resendSeconds = useCountdown(resendUntil);

  const currentDigits = splitOtpDigits(currentOtp);
  const newDigits = splitOtpDigits(newOtp);

  const handleError = useCallback((err: unknown) => {
    setError(mapChangePhoneError(isChangePhoneApiError(err) ? err : err));
  }, []);

  const submitPassword = useCallback(async () => {
    setError(null);
    setNotice(null);
    if (!password) {
      setError('رمز عبور را وارد کنید');
      return;
    }

    setLoading(true);
    try {
      const initResult = await initChangePhone({ password });
      setChangeSessionId(initResult.changeSessionId);
      const otpResult = await requestCurrentPhoneOtp({
        changeSessionId: initResult.changeSessionId,
      });
      setNotice(otpResult.message);
      setStep('current-otp');
      setCurrentOtp('');
      setResendUntil(Date.now() + 60_000);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, [handleError, password]);

  const resendCurrentOtp = useCallback(async () => {
    if (!changeSessionId || resendSeconds > 0) {
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const result = await requestCurrentPhoneOtp({ changeSessionId });
      setNotice(result.message);
      setResendUntil(Date.now() + 60_000);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, [changeSessionId, handleError, resendSeconds]);

  const submitCurrentOtp = useCallback(async () => {
    if (!changeSessionId || !/^\d{5}$/.test(currentOtp)) {
      setError('کد باید ۵ رقم باشد');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await verifyCurrentPhoneOtp({ changeSessionId, code: currentOtp });
      setStep('new-phone');
      setNotice(null);
    } catch (err) {
      handleError(err);
      setCurrentOtp('');
      currentOtpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }, [changeSessionId, currentOtp, handleError]);

  const submitNewPhone = useCallback(async () => {
    if (!changeSessionId) {
      return;
    }
    setError(null);
    setNotice(null);
    const parsed = phoneSchema.safeParse(newPhone);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'شماره موبایل نامعتبر است');
      return;
    }

    setLoading(true);
    try {
      const result = await requestNewPhoneOtp({
        changeSessionId,
        newPhone: parsed.data,
      });
      setNotice(result.message);
      setStep('new-otp');
      setNewOtp('');
      setResendUntil(Date.now() + 60_000);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, [changeSessionId, handleError, newPhone]);

  const resendNewOtp = useCallback(async () => {
    if (!changeSessionId || resendSeconds > 0) {
      return;
    }
    const parsed = phoneSchema.safeParse(newPhone);
    if (!parsed.success) {
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const result = await requestNewPhoneOtp({
        changeSessionId,
        newPhone: parsed.data,
      });
      setNotice(result.message);
      setResendUntil(Date.now() + 60_000);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, [changeSessionId, handleError, newPhone, resendSeconds]);

  const submitNewOtp = useCallback(async () => {
    if (!changeSessionId || !/^\d{5}$/.test(newOtp)) {
      setError('کد باید ۵ رقم باشد');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const result = await confirmChangePhone({ changeSessionId, code: newOtp });
      setConfirmedPhone(result.newPhone);
      setStep('success');
      setNotice(null);
    } catch (err) {
      handleError(err);
      setNewOtp('');
      newOtpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }, [changeSessionId, handleError, newOtp]);

  useEffect(() => {
    if (step === 'current-otp' && currentOtp.length === OTP_LENGTH) {
      void submitCurrentOtp();
    }
  }, [currentOtp, step, submitCurrentOtp]);

  useEffect(() => {
    if (step === 'new-otp' && newOtp.length === OTP_LENGTH) {
      void submitNewOtp();
    }
  }, [newOtp, step, submitNewOtp]);

  useEffect(() => {
    if (step === 'current-otp') {
      currentOtpRefs.current[0]?.focus();
    }
    if (step === 'new-otp') {
      newOtpRefs.current[0]?.focus();
    }
  }, [step]);

  const activeStep = stepIndex(step);

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="پیشرفت تغییر شماره" className="flex flex-wrap gap-2">
        {STEPS.map((item, index) => {
          const isComplete = index < activeStep;
          const isCurrent = item.id === step;
          return (
            <div
              key={item.id}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                isComplete
                  ? 'bg-emerald-100 text-emerald-800'
                  : isCurrent
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              {index + 1}. {item.label}
            </div>
          );
        })}
      </nav>

      {step !== 'success' ? (
        <div
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          role="status"
        >
          پس از تغییر شماره، از همه دستگاه‌ها به جز این دستگاه خارج می‌شوید.
        </div>
      ) : null}

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {notice ? (
        <p className="text-sm text-muted-foreground" role="status">
          {notice}
        </p>
      ) : null}

      {step === 'password' ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            برای شروع تغییر شماره موبایل، رمز عبور فعلی خود را وارد کنید.
          </p>
          <div className="flex flex-col gap-2">
            <Label htmlFor={passwordId}>رمز عبور</Label>
            <Input
              id={passwordId}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={loading}
            />
          </div>
          <Button type="button" onClick={() => void submitPassword()} disabled={loading}>
            {loading ? 'در حال بررسی…' : 'ادامه'}
          </Button>
        </div>
      ) : null}

      {step === 'current-otp' ? (
        <OtpStep
          title="کد ارسال‌شده به شماره فعلی را وارد کنید"
          digits={currentDigits}
          inputRefs={currentOtpRefs}
          onChange={setCurrentOtp}
          loading={loading}
          resendSeconds={resendSeconds}
          onResend={() => void resendCurrentOtp()}
          onSubmit={() => void submitCurrentOtp()}
        />
      ) : null}

      {step === 'new-phone' ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">شماره موبایل جدید خود را وارد کنید.</p>
          <div className="flex flex-col gap-2">
            <Label htmlFor={newPhoneId}>شماره موبایل جدید</Label>
            <Input
              id={newPhoneId}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              dir="ltr"
              placeholder="09123456789"
              value={newPhone}
              onChange={(event) => setNewPhone(event.target.value)}
              disabled={loading}
            />
          </div>
          <Button type="button" onClick={() => void submitNewPhone()} disabled={loading}>
            {loading ? 'در حال ارسال کد…' : 'ارسال کد تأیید'}
          </Button>
        </div>
      ) : null}

      {step === 'new-otp' ? (
        <OtpStep
          title="کد ارسال‌شده به شماره جدید را وارد کنید"
          digits={newDigits}
          inputRefs={newOtpRefs}
          onChange={setNewOtp}
          loading={loading}
          resendSeconds={resendSeconds}
          onResend={() => void resendNewOtp()}
          onSubmit={() => void submitNewOtp()}
        />
      ) : null}

      {step === 'success' ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-emerald-700" role="status">
            شماره موبایل با موفقیت به {confirmedPhone} تغییر کرد.
          </p>
          <p className="text-sm text-muted-foreground">
            برای ورود با شماره جدید، از این دستگاه خارج نشده‌اید؛ در دستگاه‌های دیگر باید دوباره
            وارد شوید.
          </p>
          <Button asChild variant="outline">
            <Link href="/admin/settings/appearance">بازگشت به تنظیمات</Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}

type OtpStepProps = {
  title: string;
  digits: string[];
  inputRefs: MutableRefObject<Array<HTMLInputElement | null>>;
  onChange: (code: string) => void;
  loading: boolean;
  resendSeconds: number;
  onResend: () => void;
  onSubmit: () => void;
};

function OtpStep({
  title,
  digits,
  inputRefs,
  onChange,
  loading,
  resendSeconds,
  onResend,
  onSubmit,
}: OtpStepProps) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">{title}</p>
      <div className="flex justify-center gap-2" dir="ltr">
        {digits.map((digit, index) => (
          <Input
            key={index}
            ref={(element) => {
              inputRefs.current[index] = element;
            }}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={1}
            className="h-12 w-10 text-center text-lg"
            value={digit}
            disabled={loading}
            aria-label={`رقم ${index + 1}`}
            onChange={(event) => {
              const nextDigits = [...digits];
              nextDigits[index] = event.target.value.replace(/\D/g, '').slice(-1);
              onChange(joinOtpDigits(nextDigits));
              const nextIndex = nextOtpFocusIndex(index, event.target.value);
              if (nextIndex !== null) {
                inputRefs.current[nextIndex]?.focus();
              }
            }}
            onKeyDown={(event) => {
              if (event.key === 'Backspace' && !digits[index] && index > 0) {
                inputRefs.current[index - 1]?.focus();
              }
            }}
          />
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <Button type="button" onClick={onSubmit} disabled={loading}>
          {loading ? 'در حال تأیید…' : 'تأیید کد'}
        </Button>
        <Button type="button" variant="ghost" disabled={loading || resendSeconds > 0} onClick={onResend}>
          {resendSeconds > 0 ? `ارسال مجدد (${resendSeconds})` : 'ارسال مجدد کد'}
        </Button>
      </div>
    </div>
  );
}
