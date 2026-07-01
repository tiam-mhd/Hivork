'use client';

import type { MfaVerifySessionResponseDto } from '@hivork/contracts';
import { Button, Input, Label } from '@hivork/ui';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import { isMfaApiError, mapMfaError, requestMfaOtp, verifyMfa } from '@/lib/auth/mfa';
import {
  joinCodeDigits,
  nextCodeFocusIndex,
  OTP_LENGTH,
  splitCodeDigits,
  TOTP_LENGTH,
} from '@/lib/auth/otp-utils';
import { formatCountdown, useCountdown } from '@/lib/auth/use-countdown';

type MfaMethod = 'otp' | 'totp';

type MfaVerifyFormProps = {
  mfaToken: string;
  methods?: MfaMethod[];
  onSession: (session: MfaVerifySessionResponseDto) => Promise<void>;
};

export function MfaVerifyForm({
  mfaToken,
  methods = ['otp', 'totp'],
  onSession,
}: MfaVerifyFormProps) {
  const otpAvailable = methods.includes('otp');
  const totpAvailable = methods.includes('totp');
  const defaultMethod: MfaMethod = otpAvailable ? 'otp' : 'totp';

  const [activeMethod, setActiveMethod] = useState<MfaMethod>(defaultMethod);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [requestingOtp, setRequestingOtp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendUntil, setResendUntil] = useState<number | null>(null);
  const [otpRequested, setOtpRequested] = useState(false);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const autoSubmittedRef = useRef<string | null>(null);
  const resendSeconds = useCountdown(resendUntil);

  const codeLength = activeMethod === 'otp' ? OTP_LENGTH : TOTP_LENGTH;
  const digits = splitCodeDigits(code, codeLength);

  const sendOtp = useCallback(async () => {
    setRequestingOtp(true);
    setError(null);
    try {
      const result = await requestMfaOtp(mfaToken);
      setOtpRequested(true);
      setResendUntil(Date.now() + result.cooldownSeconds * 1000);
    } catch (err) {
      if (isMfaApiError(err) && (err.code === 'AUTH_MFA_TOKEN_EXPIRED' || err.code === 'AUTH_MFA_TOKEN_INVALID')) {
        setError(mapMfaError(err));
        return;
      }
      setError(mapMfaError(err));
    } finally {
      setRequestingOtp(false);
    }
  }, [mfaToken]);

  const submitVerify = useCallback(
    async (submittedCode: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await verifyMfa(mfaToken, {
          method: activeMethod,
          code: submittedCode,
        });
        await onSession(result);
      } catch (err) {
        setError(mapMfaError(err));
        if (activeMethod === 'otp') {
          setCode('');
          autoSubmittedRef.current = null;
          inputRefs.current[0]?.focus();
        }
      } finally {
        setLoading(false);
      }
    },
    [activeMethod, mfaToken, onSession],
  );

  useEffect(() => {
    if (activeMethod === 'otp' && otpAvailable && !otpRequested) {
      void sendOtp();
    }
  }, [activeMethod, otpAvailable, otpRequested, sendOtp]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, [activeMethod]);

  useEffect(() => {
    if (loading || code.length !== codeLength) {
      if (code.length < codeLength) {
        autoSubmittedRef.current = null;
      }
      return;
    }

    if (autoSubmittedRef.current === code) {
      return;
    }

    autoSubmittedRef.current = code;
    void submitVerify(code);
  }, [code, codeLength, loading, submitVerify]);

  function updateDigit(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = digit;
    const joined = joinCodeDigits(next, codeLength);
    setCode(joined);

    const nextIndex = nextCodeFocusIndex(index, digit, codeLength);
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
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, codeLength);
    setCode(pasted);
    const focusIndex = Math.min(pasted.length, codeLength - 1);
    inputRefs.current[focusIndex]?.focus();
  }

  function switchMethod(method: MfaMethod) {
    setActiveMethod(method);
    setCode('');
    setError(null);
    autoSubmittedRef.current = null;
  }

  return (
    <div className="flex flex-col gap-4">
      {otpAvailable && totpAvailable ? (
        <div
          role="tablist"
          aria-label="روش تأیید"
          className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-muted/40 p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeMethod === 'otp'}
            className={`min-h-10 rounded-md px-3 text-sm font-medium ${
              activeMethod === 'otp' ? 'bg-background shadow-sm' : 'text-muted-foreground'
            }`}
            onClick={() => switchMethod('otp')}
          >
            پیامک
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeMethod === 'totp'}
            className={`min-h-10 rounded-md px-3 text-sm font-medium ${
              activeMethod === 'totp' ? 'bg-background shadow-sm' : 'text-muted-foreground'
            }`}
            onClick={() => switchMethod('totp')}
          >
            Authenticator
          </button>
        </div>
      ) : null}

      <p className="text-sm text-muted-foreground">
        {activeMethod === 'otp'
          ? 'کد ۵ رقمی ارسال‌شده به موبایل خود را وارد کنید.'
          : 'کد ۶ رقمی اپ Authenticator را وارد کنید.'}
      </p>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <Label>کد تأیید</Label>
        <div className="flex justify-center gap-2" onPaste={handlePaste}>
          {digits.map((digit, index) => (
            <Input
              key={`${activeMethod}-${index}`}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              aria-label={`رقم ${index + 1} از ${codeLength}`}
              aria-invalid={Boolean(error)}
              value={digit}
              onChange={(event) => updateDigit(index, event.target.value)}
              onKeyDown={(event) => handleKeyDown(index, event.key)}
              className="h-12 w-11 text-center text-lg"
              dir="ltr"
              disabled={loading || requestingOtp}
            />
          ))}
        </div>
      </div>

      {activeMethod === 'otp' ? (
        <div className="text-center text-sm text-muted-foreground">
          {requestingOtp ? (
            <span>در حال ارسال کد…</span>
          ) : resendSeconds > 0 ? (
            <span>ارسال مجدد ({formatCountdown(resendSeconds)})</span>
          ) : (
            <button
              type="button"
              className="text-primary underline-offset-4 hover:underline"
              disabled={loading}
              onClick={() => void sendOtp()}
            >
              ارسال مجدد کد
            </button>
          )}
        </div>
      ) : null}

      <Button
        type="button"
        className="min-h-11 w-full"
        disabled={loading || code.length !== codeLength}
        onClick={() => void submitVerify(code)}
      >
        {loading ? 'در حال تأیید…' : 'تأیید و ورود'}
      </Button>

      <Link href="/login" className="text-center text-sm text-primary underline-offset-4 hover:underline">
        بازگشت به ورود
      </Link>
    </div>
  );
}
