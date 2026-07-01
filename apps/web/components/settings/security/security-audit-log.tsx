'use client';

import type { StaffSecurityAuditItemDto } from '@hivork/contracts';
import { Button } from '@hivork/ui';
import { useCallback, useEffect, useState } from 'react';

import { maskIpForDisplay } from '@/lib/auth/mask-ip';
import {
  fetchStaffSecurityAuditLog,
  isStaffSecurityAuditApiError,
  SECURITY_AUDIT_ACTION_LABELS_FA,
} from '@/lib/auth/staff-security-audit';
import { formatIsoDateAsJalali } from '@/lib/i18n';
import { getErrorMessageFa } from '@/lib/i18n/error-messages.fa';
import { formatRelativeTimeFa } from '@/lib/i18n/relative-time.fa';

export function SecurityAuditLog() {
  const [items, setItems] = useState<StaffSecurityAuditItemDto[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (cursor?: string) => {
    const isMore = Boolean(cursor);
    if (isMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const result = await fetchStaffSecurityAuditLog({ cursor, limit: 20, category: 'security' });
      setItems((prev) => (isMore ? [...prev, ...result.items] : result.items));
      setNextCursor(result.nextCursor);
    } catch (err) {
      if (isStaffSecurityAuditApiError(err)) {
        setError(getErrorMessageFa(err.code, err.message));
      } else {
        setError('بارگذاری رویدادهای امنیتی ناموفق بود.');
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">فعالیت امنیتی</h2>
        <div className="h-32 animate-pulse rounded-xl bg-neutral-100" />
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">فعالیت امنیتی (Token Activity)</h2>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
          <Button type="button" variant="outline" className="mt-3" onClick={() => void load()}>
            تلاش مجدد
          </Button>
        </div>
      ) : null}

      {items.length === 0 && !error ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          رویداد امنیتی ثبت نشده
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/50 text-right">
              <tr>
                <th className="px-4 py-3 font-medium">رویداد</th>
                <th className="px-4 py-3 font-medium">زمان</th>
                <th className="px-4 py-3 font-medium">IP</th>
                <th className="px-4 py-3 font-medium">جزئیات</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    {SECURITY_AUDIT_ACTION_LABELS_FA[item.action] ?? item.action}
                  </td>
                  <td className="px-4 py-3">
                    <div>{formatRelativeTimeFa(item.createdAt)}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatIsoDateAsJalali(item.createdAt.slice(0, 10))}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs" dir="ltr">
                    {item.ipAddress ? maskIpForDisplay(item.ipAddress) : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {formatAuditMetadata(item.metadata)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {nextCursor ? (
        <Button
          type="button"
          variant="outline"
          disabled={loadingMore}
          onClick={() => void load(nextCursor)}
        >
          {loadingMore ? 'در حال بارگذاری…' : 'بارگذاری بیشتر'}
        </Button>
      ) : null}
    </section>
  );
}

function formatAuditMetadata(metadata: Record<string, unknown> | undefined): string {
  if (!metadata) {
    return '—';
  }

  const parts: string[] = [];
  if (typeof metadata.deviceLabel === 'string') {
    parts.push(metadata.deviceLabel);
  }
  if (typeof metadata.method === 'string') {
    parts.push(`روش: ${metadata.method}`);
  }
  if (typeof metadata.isCurrent === 'boolean' && metadata.isCurrent) {
    parts.push('دستگاه فعلی');
  }

  return parts.length > 0 ? parts.join(' · ') : '—';
}
