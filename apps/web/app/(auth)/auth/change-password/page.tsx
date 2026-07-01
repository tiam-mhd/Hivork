import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@hivork/ui';
import { Suspense } from 'react';

import { ChangeRequiredPasswordForm } from '@/components/settings/security/change-required-password-form';

export default function ChangePasswordPage() {
  return (
    <Card className="app-card w-full">
      <CardHeader>
        <CardTitle>تغییر رمز عبور</CardTitle>
        <CardDescription>رمز عبور جدید خود را تنظیم کنید.</CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<ChangeRequiredPasswordFormSkeleton />}>
          <ChangeRequiredPasswordForm />
        </Suspense>
      </CardContent>
    </Card>
  );
}

function ChangeRequiredPasswordFormSkeleton() {
  return <div className="h-40 animate-pulse rounded bg-neutral-100" />;
}
