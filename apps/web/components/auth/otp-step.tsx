'use client';

import { Button, Input, Label } from '@hivork/ui';
import { useEffect, useRef } from 'react';

import { OTP_LENGTH, joinOtpDigits, nextOtpFocusIndex, splitOtpDigits } from '@/lib/auth/otp-utils';
import { maskPhone } from '@/lib/auth/phone-utils';
import { formatCountdown } from '@/lib/auth/use-countdown';

type OtpStepProps = {
  phone: string;
  code: string;
  loading: boolean;
  error: string | null;
  shake: boolean;
  resendSeconds: number;
  onCodeChange: (code: string) => void;
  onSubmit: (code: string) => void;
  onResend: () => void;
  onBack: () => void;
};

export function OtpStep({
  phone,
  code,
  loading,
  error,
  shake,
  resendSeconds,
  onCodeChange,
  onSubmit,
  onResend,
  onBack,
}: OtpStepProps) {
  const digits = splitOtpDigits(code);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const autoSubmittedCodeRef = useRef<string | null>(null);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (loading || code.length !== OTP_LENGTH) {
      if (code.length < OTP_LENGTH) {
        autoSubmittedCodeRef.current = null;
      }
      return;
    }

    if (autoSubmittedCodeRef.current === code) {
      return;
    }

    autoSubmittedCodeRef.current = code;
    onSubmit(code);
  }, [code, loading, onSubmit]);

  function updateDigit(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = digit;
    const joined = joinOtpDigits(next);
    onCodeChange(joined);

    const nextIndex = nextOtpFocusIndex(index, digit);
    if (nextIndex !== null) {
      inputRefs.current[nextIndex]?.focus();
    }
  }

  function handleKeyDown(index: number, key: string) {
    if (key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(event: React.ClipboardEvent) {
    event.preventDefault();
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    onCodeChange(pasted);
    const focusIndex = Math.min(pasted.length, OTP_LENGTH - 1);
    inputRefs.current[focusIndex]?.focus();
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-neutral-600">مرحله ۲ از ۴: کد تأیید</p>

      <div className="flex flex-col gap-2">
        <Label>کد تأیید</Label>
        <p className="text-xs text-neutral-500">
          کد {OTP_LENGTH} رقمی ارسال‌شده به {maskPhone(phone)} را وارد کنید.
        </p>

        <div
          className={`flex justify-center gap-2 ${shake ? 'animate-[shake_0.4s_ease-in-out]' : ''}`}
          onPaste={handlePaste}
        >
          {digits.map((digit, index) => (
            <Input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              aria-label={`رقم ${index + 1} از ${OTP_LENGTH} کد تأیید`}
              value={digit}
              onChange={(e) => updateDigit(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e.key)}
              className="h-12 w-11 text-center text-lg"
              dir="ltr"
              disabled={loading}
            />
          ))}
        </div>

        {error ? <p className="text-center text-sm text-red-600">{error}</p> : null}
      </div>

      <div className="text-center text-sm text-neutral-600">
        {resendSeconds > 0 ? (
          <span>ارسال مجدد ({formatCountdown(resendSeconds)})</span>
        ) : (
          <button
            type="button"
            className="text-blue-600 underline"
            disabled={loading}
            onClick={onResend}
          >
            ارسال مجدد کد
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Button
          type="button"
          className="min-h-11 w-full"
          disabled={loading || code.length !== OTP_LENGTH}
          onClick={() => onSubmit(code)}
        >
          {loading ? 'در حال تأیید…' : 'تأیید و ادامه →'}
        </Button>
        <Button type="button" variant="outline" className="min-h-11 w-full" onClick={onBack}>
          بازگشت
        </Button>
      </div>
    </div>
  );
}
