'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useBreadcrumbOverrideLabel } from '@/components/layout/breadcrumb-override';

const SEGMENT_LABELS: Record<string, string> = {
  admin: 'خانه',
  dashboard: 'داشبورد',
  customers: 'مشتریان',
  import: 'ورود از Excel',
  new: 'جدید',
  edit: 'ویرایش',
  recycle: 'سطل بازیافت',
  sales: 'فروش‌ها',
  reports: 'گزارش‌ها',
  overdue: 'معوقات',
  'today-due': 'سررسید امروز',
  reminders: 'یادآورها',
  branches: 'شعب',
  staff: 'کارمندان',
  roles: 'نقش‌ها',
  settings: 'تنظیمات',
  appearance: 'ظاهر و تم',
  security: 'امنیت',
  'change-password': 'تغییر رمز عبور',
  mfa: 'احراز هویت دو مرحله‌ای',
  'change-phone': 'تغییر شماره موبایل',
  'api-keys': 'کلیدهای API',
  sessions: 'نشست‌ها',
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function resolveSegmentLabel(segment: string, previousSegment: string | undefined): string {
  if (SEGMENT_LABELS[segment]) {
    return SEGMENT_LABELS[segment];
  }

  if (UUID_PATTERN.test(segment)) {
    if (previousSegment === 'sales') {
      return 'جزئیات فروش';
    }
    if (previousSegment === 'customers') {
      return 'جزئیات مشتری';
    }
    return 'جزئیات';
  }

  return segment;
}

export function PageBreadcrumb() {
  const pathname = usePathname();
  const overrideLabel = useBreadcrumbOverrideLabel();
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length <= 1) {
    return null;
  }

  const crumbs = segments.map((segment, index) => {
    const href = `/${segments.slice(0, index + 1).join('/')}`;
    const isLast = index === segments.length - 1;
    const label =
      isLast && overrideLabel
        ? overrideLabel
        : resolveSegmentLabel(segment, segments[index - 1]);

    return { href, label, isLast };
  });

  return (
    <nav aria-label="مسیر صفحه" className="mb-4 text-sm text-breadcrumb">
      <ol className="flex flex-wrap items-center gap-1">
        {crumbs.map((crumb, index) => (
          <li key={crumb.href} className="flex items-center gap-1">
            {index > 0 ? <span aria-hidden className="text-breadcrumb-separator">/</span> : null}
            {crumb.isLast ? (
              <span aria-current="page" className="font-medium text-breadcrumb-active">
                {crumb.label}
              </span>
            ) : (
              <Link href={crumb.href} className="hover:text-breadcrumb-link-hover hover:underline">
                {crumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
