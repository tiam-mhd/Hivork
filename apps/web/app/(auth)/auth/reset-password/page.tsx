'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@hivork/ui';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { ResetPasswordForm } from '@/components/auth/forgot-password-form';
import { FORGOT_PASSWORD_I18N } from '@/lib/auth/forgot-password-i18n';

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token')?.trim() ?? '';

  return (
    <Card className="app-card w-full">
      <CardHeader>
        <CardTitle>{FORGOT_PASSWORD_I18N.resetTitle}</CardTitle>
        <CardDescription>رمز عبور جدید خود را وارد کنید</CardDescription>
      </CardHeader>
      <CardContent>
        {token ? (
          <ResetPasswordForm resetToken={token} />
        ) : (
          <div className="flex flex-col gap-4 text-sm text-muted-foreground">
            <p>لینک بازیابی نامعتبر است. لطفاً فرآیند را از اول شروع کنید.</p>
            <Link href="/auth/forgot-password" className="font-medium text-primary underline-offset-4 hover:underline">
              شروع مجدد بازیابی رمز
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
