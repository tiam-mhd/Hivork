'use client';

import Link from 'next/link';

import { SecurityCard, SecurityCardLink } from '@/components/settings/security/security-card';
import { usePermission } from '@/hooks/use-permission';
import { API_KEY_VIEW_PERMISSION } from '@/lib/settings/api-keys';

export function ApiKeysCard() {
  const canView = usePermission(API_KEY_VIEW_PERMISSION);

  if (!canView) {
    return null;
  }

  return (
    <SecurityCard
      title="کلیدهای API"
      description="یکپارچه‌سازی خارجی با scope محدود برای سیستم‌های ERP و webhook."
      footer={<SecurityCardLink href="/admin/settings/security/api-keys" label="مدیریت کلیدها" />}
    >
      <p className="text-sm text-muted-foreground">
        Secret فقط یک‌بار پس از ایجاد نمایش داده می‌شود.{' '}
        <Link href="/admin/settings/security/api-keys" className="text-primary underline-offset-4 hover:underline">
          مشاهده لیست
        </Link>
      </p>
    </SecurityCard>
  );
}
