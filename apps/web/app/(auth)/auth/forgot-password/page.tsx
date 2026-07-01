'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@hivork/ui';

import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';
import { FORGOT_PASSWORD_I18N } from '@/lib/auth/forgot-password-i18n';

export default function ForgotPasswordPage() {
  return (
    <Card className="app-card w-full">
      <CardHeader>
        <CardTitle>{FORGOT_PASSWORD_I18N.title}</CardTitle>
        <CardDescription>بازیابی رمز عبور با کد یکبارمصرف پیامکی</CardDescription>
      </CardHeader>
      <CardContent>
        <ForgotPasswordForm />
      </CardContent>
    </Card>
  );
}
