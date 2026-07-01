'use client';

import Link from 'next/link';

import { SecurityCard, SecurityCardLink } from '@/components/settings/security/security-card';

export function PasswordCard() {
  return (
    <SecurityCard
      title="رمز عبور"
      description="رمز ورود حساب کاربری خود را به‌روزرسانی کنید."
      footer={
        <SecurityCardLink
          href="/admin/settings/security/change-password"
          label="تغییر رمز عبور"
        />
      }
    >
      <p className="text-sm text-muted-foreground">
        پس از تغییر رمز می‌توانید سایر نشست‌ها را نیز ببندید.
      </p>
    </SecurityCard>
  );
}

export function PhoneCard() {
  return (
    <SecurityCard
      title="شماره موبایل"
      description="شماره ورود حساب در تمام tenantها به‌روزرسانی می‌شود."
      footer={
        <Link
          href="/admin/settings/security/change-phone"
          className="inline-flex min-h-10 items-center text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          تغییر شماره موبایل
        </Link>
      }
    >
      <p className="text-sm text-muted-foreground">
        تغییر شماره با تأیید OTP روی شماره فعلی و جدید انجام می‌شود.
      </p>
    </SecurityCard>
  );
}
