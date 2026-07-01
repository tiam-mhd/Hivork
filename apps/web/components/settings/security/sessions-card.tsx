'use client';

import { ListStaffSessionsResponseSchema } from '@hivork/contracts';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { SecurityCard, SecurityCardLink } from '@/components/settings/security/security-card';
import { usePermission } from '@/hooks/use-permission';
import { apiFetch } from '@/lib/api/client';

export const STAFF_SESSION_VIEW_PERMISSION = 'core.security.session.view';

export function SessionsCard() {
  const canViewSessions = usePermission(STAFF_SESSION_VIEW_PERMISSION);
  const [activeCount, setActiveCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(canViewSessions);

  useEffect(() => {
    if (!canViewSessions) {
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const result = await apiFetch<unknown>('/staff/me/sessions?status=active&limit=100');
        const parsed = ListStaffSessionsResponseSchema.parse(result);
        if (!cancelled) {
          setActiveCount(parsed.items.length);
        }
      } catch {
        if (!cancelled) {
          setActiveCount(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [canViewSessions]);

  return (
    <SecurityCard
      title="نشست‌های فعال"
      description="دستگاه‌ها و مرورگرهایی که با حساب شما وارد شده‌اند."
      footer={
        <SecurityCardLink href="/admin/settings/security/sessions" label="مدیریت نشست‌ها" />
      }
    >
      {canViewSessions ? (
        <p className="text-sm text-muted-foreground">
          {loading ? (
            'در حال بارگذاری…'
          ) : activeCount === null ? (
            'امکان نمایش تعداد نشست‌ها وجود ندارد.'
          ) : (
            <>
              <span className="font-semibold text-foreground">{activeCount}</span>
              {' '}
              نشست فعال
            </>
          )}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          برای مشاهده جزئیات نشست‌ها به{' '}
          <Link href="/admin/settings/security/sessions" className="text-primary underline-offset-4 hover:underline">
            صفحه نشست‌ها
          </Link>
          {' '}بروید.
        </p>
      )}
    </SecurityCard>
  );
}
