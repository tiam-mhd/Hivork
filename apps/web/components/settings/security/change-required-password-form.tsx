'use client';

import { ChangeRequiredPasswordSchema } from '@hivork/contracts';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState } from 'react';

import {
  PasswordFieldGroup,
  SecurityFormActions,
  ShowPasswordToggle,
} from '@/components/settings/security/password-field-group';
import { changeRequiredPassword, isChangePasswordApiError } from '@/lib/auth/change-password';
import { useStaffAuth } from '@/lib/auth/use-staff-auth';
import { getErrorMessageFa } from '@/lib/i18n/error-messages.fa';

export function ChangeRequiredPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useStaffAuth();
  const tokenFromQuery = searchParams.get('token')?.trim() ?? searchParams.get('changePasswordToken')?.trim() ?? '';

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const hasToken = tokenFromQuery.length > 0;
  const canSubmit = hasToken || isAuthenticated;

  const submit = useCallback(async () => {
    if (!canSubmit) {
      setError('لینک تغییر رمز نامعتبر یا منقضی شده است.');
      return;
    }

    setError(null);
    const parsed = ChangeRequiredPasswordSchema.safeParse({
      changePasswordToken: hasToken ? tokenFromQuery : undefined,
      currentPassword: currentPassword || undefined,
      newPassword,
      newPasswordConfirm,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'اطلاعات وارد شده نامعتبر است.');
      return;
    }

    setLoading(true);
    try {
      await changeRequiredPassword(parsed.data);
      setSuccess(true);
      setTimeout(() => {
        router.replace(isAuthenticated ? '/admin/dashboard' : '/login');
      }, 1200);
    } catch (err) {
      if (isChangePasswordApiError(err)) {
        setError(getErrorMessageFa(err.code, err.message));
      } else {
        setError('تغییر رمز عبور ناموفق بود.');
      }
    } finally {
      setLoading(false);
    }
  }, [
    canSubmit,
    currentPassword,
    hasToken,
    isAuthenticated,
    newPassword,
    newPasswordConfirm,
    router,
    tokenFromQuery,
  ]);

  if (!canSubmit) {
    return (
      <div className="flex flex-col gap-4 text-sm text-muted-foreground">
        <p>لینک تغییر رمز عبور نامعتبر یا منقضی شده است.</p>
        <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
          بازگشت به ورود
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        رمز عبور با موفقیت تغییر کرد. در حال انتقال…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {hasToken
          ? 'رمز عبور جدید خود را تنظیم کنید.'
          : 'قبل از ادامه، رمز عبور جدید خود را تنظیم کنید.'}
      </p>

      {!hasToken && isAuthenticated ? (
        <PasswordFieldGroup
          label="رمز عبور فعلی (در صورت نیاز)"
          value={currentPassword}
          onChange={setCurrentPassword}
          showPassword={showPassword}
          autoComplete="current-password"
          disabled={loading}
          help="اگر سیستم از شما رمز فعلی نخواسته، این فیلد را خالی بگذارید."
        />
      ) : null}

      <PasswordFieldGroup
        label="رمز عبور جدید"
        value={newPassword}
        onChange={setNewPassword}
        showPassword={showPassword}
        autoComplete="new-password"
        help="حداقل ۸ کاراکتر، شامل حرف و عدد."
        disabled={loading}
      />
      <PasswordFieldGroup
        label="تکرار رمز عبور جدید"
        value={newPasswordConfirm}
        onChange={setNewPasswordConfirm}
        showPassword={showPassword}
        autoComplete="new-password"
        disabled={loading}
      />
      <ShowPasswordToggle checked={showPassword} onChange={setShowPassword} disabled={loading} />

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <SecurityFormActions
        submitLabel="ذخیره رمز جدید"
        loading={loading}
        disabled={!newPassword || !newPasswordConfirm}
        onSubmit={() => void submit()}
        secondary={
          !isAuthenticated ? (
            <Link href="/login" className="text-sm text-primary underline-offset-4 hover:underline">
              بازگشت به ورود
            </Link>
          ) : null
        }
      />
    </div>
  );
}
