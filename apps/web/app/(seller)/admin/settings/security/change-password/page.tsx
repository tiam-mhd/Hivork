'use client';

import { ChangePasswordForm } from '@/components/settings/security/change-password-form';

export default function ChangePasswordSettingsPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">تغییر رمز عبور</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          رمز ورود حساب کاربری staff خود را به‌روزرسانی کنید.
        </p>
      </div>
      <ChangePasswordForm />
    </div>
  );
}
