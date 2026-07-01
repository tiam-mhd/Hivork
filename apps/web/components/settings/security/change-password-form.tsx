'use client';

import { ChangeStaffPasswordSchema } from '@hivork/contracts';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

import {
  PasswordFieldGroup,
  SecurityFormActions,
  ShowPasswordToggle,
} from '@/components/settings/security/password-field-group';
import { changeStaffPassword, isChangePasswordApiError } from '@/lib/auth/change-password';
import { getErrorMessageFa } from '@/lib/i18n/error-messages.fa';

export function ChangePasswordForm() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [revokeOthers, setRevokeOthers] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const submit = useCallback(async () => {
    setError(null);
    const parsed = ChangeStaffPasswordSchema.safeParse({
      currentPassword,
      newPassword,
      newPasswordConfirm,
      revokeOthers,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'اطلاعات وارد شده نامعتبر است.');
      return;
    }

    setLoading(true);
    try {
      await changeStaffPassword(parsed.data);
      setSuccess(true);
      setTimeout(() => router.push('/admin/settings/security'), 1200);
    } catch (err) {
      if (isChangePasswordApiError(err)) {
        setError(getErrorMessageFa(err.code, err.message));
      } else {
        setError('تغییر رمز عبور ناموفق بود.');
      }
    } finally {
      setLoading(false);
    }
  }, [currentPassword, newPassword, newPasswordConfirm, revokeOthers, router]);

  if (success) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        رمز عبور با موفقیت تغییر کرد.
      </div>
    );
  }

  return (
    <div className="flex max-w-lg flex-col gap-4">
      <PasswordFieldGroup
        label="رمز عبور فعلی"
        value={currentPassword}
        onChange={setCurrentPassword}
        showPassword={showPassword}
        autoComplete="current-password"
        disabled={loading}
      />
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
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={revokeOthers}
          onChange={(event) => setRevokeOthers(event.target.checked)}
          disabled={loading}
        />
        خروج از سایر نشست‌ها (به جز این دستگاه)
      </label>
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      <SecurityFormActions
        submitLabel="ذخیره رمز جدید"
        loading={loading}
        disabled={!currentPassword || !newPassword || !newPasswordConfirm}
        onSubmit={() => void submit()}
        secondary={
          <Link href="/admin/settings/security" className="text-sm text-primary underline-offset-4 hover:underline">
            بازگشت
          </Link>
        }
      />
    </div>
  );
}
