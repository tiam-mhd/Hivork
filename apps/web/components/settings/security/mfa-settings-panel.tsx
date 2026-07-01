'use client';

import { TotpVerifySetupSchema, TotpDisableSchema, TotpRegenerateBackupCodesSchema } from '@hivork/contracts';
import type { StaffMfaStatusResponseDto } from '@hivork/contracts';
import { Button, Input, Label } from '@hivork/ui';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  PasswordFieldGroup,
  ShowPasswordToggle,
} from '@/components/settings/security/password-field-group';
import { SecurityStatusBadge } from '@/components/settings/security/security-card';
import {
  disableTotp,
  fetchMfaStatus,
  isMfaSettingsApiError,
  regenerateTotpBackupCodes,
  setupTotp,
  verifyTotpSetup,
} from '@/lib/auth/mfa-settings';
import {
  joinCodeDigits,
  nextCodeFocusIndex,
  splitCodeDigits,
  TOTP_LENGTH,
} from '@/lib/auth/otp-utils';
import { getErrorMessageFa } from '@/lib/i18n/error-messages.fa';

type Step = 'overview' | 'setup' | 'verify' | 'backup';

export function MfaSettingsPanel() {
  const [status, setStatus] = useState<StaffMfaStatusResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('overview');
  const [setupSecret, setSetupSecret] = useState<string | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const [regeneratePassword, setRegeneratePassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await fetchMfaStatus();
      setStatus(next);
      if (next.totpEnabled) {
        setStep('overview');
      }
    } catch (err) {
      if (isMfaSettingsApiError(err)) {
        setError(getErrorMessageFa(err.code, err.message));
      } else {
        setError('بارگذاری وضعیت 2FA ناموفق بود.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const startSetup = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const result = await setupTotp();
      setSetupSecret(result.secret);
      setQrCodeDataUrl(result.qrCodeDataUrl);
      setVerifyCode('');
      setBackupCodes(null);
      setStep('setup');
    } catch (err) {
      if (isMfaSettingsApiError(err)) {
        setError(getErrorMessageFa(err.code, err.message));
      } else {
        setError('شروع راه‌اندازی TOTP ناموفق بود.');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const submitVerify = async () => {
    setError(null);
    const parsed = TotpVerifySetupSchema.safeParse({ code: verifyCode });
    if (!parsed.success) {
      setError('کد ۶ رقمی Authenticator را وارد کنید.');
      return;
    }

    setActionLoading(true);
    try {
      const result = await verifyTotpSetup(parsed.data);
      setBackupCodes(result.backupCodes);
      setStep('backup');
      await loadStatus();
    } catch (err) {
      if (isMfaSettingsApiError(err)) {
        setError(getErrorMessageFa(err.code, err.message));
      } else {
        setError('تأیید TOTP ناموفق بود.');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const submitDisable = async () => {
    setError(null);
    const parsed = TotpDisableSchema.safeParse({ password: disablePassword });
    if (!parsed.success) {
      setError('رمز عبور فعلی را وارد کنید.');
      return;
    }

    setActionLoading(true);
    try {
      await disableTotp(parsed.data);
      setShowDisableDialog(false);
      setDisablePassword('');
      setStep('overview');
      await loadStatus();
    } catch (err) {
      if (isMfaSettingsApiError(err)) {
        setError(getErrorMessageFa(err.code, err.message));
      } else {
        setError('غیرفعال‌سازی TOTP ناموفق بود.');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const submitRegenerate = async () => {
    setError(null);
    const parsed = TotpRegenerateBackupCodesSchema.safeParse({ password: regeneratePassword });
    if (!parsed.success) {
      setError('رمز عبور فعلی را وارد کنید.');
      return;
    }

    setActionLoading(true);
    try {
      const result = await regenerateTotpBackupCodes(parsed.data);
      setBackupCodes(result.backupCodes);
      setShowRegenerateDialog(false);
      setRegeneratePassword('');
      setStep('backup');
      await loadStatus();
    } catch (err) {
      if (isMfaSettingsApiError(err)) {
        setError(getErrorMessageFa(err.code, err.message));
      } else {
        setError('تولید مجدد کدهای پشتیبان ناموفق بود.');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const digits = splitCodeDigits(verifyCode, TOTP_LENGTH);

  if (loading) {
    return <MfaSettingsSkeleton />;
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">احراز هویت دو مرحله‌ای</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          TOTP با اپلیکیشن‌هایی مثل Google Authenticator.
        </p>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {step === 'overview' && status ? (
        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">وضعیت TOTP</h2>
            <SecurityStatusBadge active={status.totpEnabled} />
          </div>

          {status.totpEnabled ? (
            <div className="mt-4 flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                کدهای پشتیبان باقی‌مانده:{' '}
                <span className="font-medium text-foreground">{status.backupCodesRemaining}</span>
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="outline"
                  disabled={actionLoading}
                  onClick={() => setShowRegenerateDialog(true)}
                >
                  تولید مجدد کدهای پشتیبان
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={actionLoading}
                  onClick={() => setShowDisableDialog(true)}
                >
                  غیرفعال‌سازی TOTP
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                با فعال‌سازی TOTP، علاوه بر رمز عبور به کد اپلیکیشن هم نیاز دارید.
              </p>
              <Button type="button" disabled={actionLoading} onClick={() => void startSetup()}>
                {actionLoading ? 'در حال آماده‌سازی…' : 'فعال‌سازی TOTP'}
              </Button>
            </div>
          )}
        </section>
      ) : null}

      {step === 'setup' && qrCodeDataUrl ? (
        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-lg font-semibold">اسکن QR Code</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            QR را در اپ Authenticator اسکن کنید یا secret را دستی وارد کنید.
          </p>
          <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <Image
              src={qrCodeDataUrl}
              alt="QR code for TOTP setup"
              width={180}
              height={180}
              unoptimized
              className="rounded-lg border border-border"
            />
            {setupSecret ? (
              <div className="text-sm">
                <p className="text-muted-foreground">Secret (دستی):</p>
                <code className="mt-1 block break-all rounded bg-muted px-2 py-1 font-mono text-xs" dir="ltr">
                  {setupSecret}
                </code>
              </div>
            ) : null}
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <Label>کد ۶ رقمی از اپ</Label>
            <div className="flex justify-center gap-2" dir="ltr">
              {digits.map((digit, index) => (
                <Input
                  key={index}
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={1}
                  className="h-12 w-10 text-center text-lg"
                  value={digit}
                  disabled={actionLoading}
                  onChange={(event) => {
                    const nextDigit = event.target.value.replace(/\D/g, '').slice(-1);
                    const nextDigits = [...digits];
                    nextDigits[index] = nextDigit;
                    setVerifyCode(joinCodeDigits(nextDigits, TOTP_LENGTH));
                    const nextFocus = nextCodeFocusIndex(index, nextDigit, TOTP_LENGTH);
                    if (nextFocus !== null) {
                      inputRefs.current[nextFocus]?.focus();
                    }
                  }}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <Button type="button" disabled={actionLoading || verifyCode.length !== TOTP_LENGTH} onClick={() => void submitVerify()}>
                {actionLoading ? 'در حال تأیید…' : 'تأیید و فعال‌سازی'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setStep('overview')}>
                انصراف
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      {step === 'backup' && backupCodes ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="text-lg font-semibold text-amber-950">کدهای پشتیبان</h2>
          <p className="mt-1 text-sm text-amber-900">
            این کدها را در جای امن ذخیره کنید. هر کد فقط یک‌بار قابل استفاده است.
          </p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2" dir="ltr">
            {backupCodes.map((code) => (
              <li key={code} className="rounded bg-white px-3 py-2 font-mono text-sm">
                {code}
              </li>
            ))}
          </ul>
          <Button type="button" className="mt-4" onClick={() => { setStep('overview'); setBackupCodes(null); }}>
            متوجه شدم
          </Button>
        </section>
      ) : null}

      {showDisableDialog ? (
        <dialog open className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-card p-5 shadow-lg">
            <h3 className="text-lg font-semibold">غیرفعال‌سازی TOTP</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              برای تأیید، رمز عبور فعلی خود را وارد کنید.
            </p>
            <div className="mt-4">
              <PasswordFieldGroup
                label="رمز عبور فعلی"
                value={disablePassword}
                onChange={setDisablePassword}
                showPassword={showPassword}
                autoComplete="current-password"
                disabled={actionLoading}
              />
              <ShowPasswordToggle checked={showPassword} onChange={setShowPassword} disabled={actionLoading} />
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button type="button" variant="destructive" disabled={actionLoading} onClick={() => void submitDisable()}>
                غیرفعال کردن
              </Button>
              <Button type="button" variant="outline" onClick={() => { setShowDisableDialog(false); setDisablePassword(''); }}>
                انصراف
              </Button>
            </div>
          </div>
        </dialog>
      ) : null}

      {showRegenerateDialog ? (
        <dialog open className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-card p-5 shadow-lg">
            <h3 className="text-lg font-semibold">تولید مجدد کدهای پشتیبان</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              کدهای قبلی باطل می‌شوند. رمز عبور فعلی را وارد کنید.
            </p>
            <div className="mt-4">
              <PasswordFieldGroup
                label="رمز عبور فعلی"
                value={regeneratePassword}
                onChange={setRegeneratePassword}
                showPassword={showPassword}
                autoComplete="current-password"
                disabled={actionLoading}
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button type="button" disabled={actionLoading} onClick={() => void submitRegenerate()}>
                تولید کدهای جدید
              </Button>
              <Button type="button" variant="outline" onClick={() => { setShowRegenerateDialog(false); setRegeneratePassword(''); }}>
                انصراف
              </Button>
            </div>
          </div>
        </dialog>
      ) : null}

      <Link href="/admin/settings/security" className="text-sm text-primary underline-offset-4 hover:underline">
        بازگشت به تنظیمات امنیت
      </Link>
    </div>
  );
}

function MfaSettingsSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div className="h-8 w-56 animate-pulse rounded bg-neutral-200" />
      <div className="h-48 animate-pulse rounded-xl bg-neutral-100" />
    </div>
  );
}
