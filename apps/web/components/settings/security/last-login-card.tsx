'use client';

import type { StaffLastLoginResponseDto } from '@hivork/contracts';
import { useEffect, useState } from 'react';

import { maskIpForDisplay } from '@/lib/auth/mask-ip';
import { fetchStaffLastLogin, isStaffLastLoginApiError } from '@/lib/auth/staff-last-login';
import { formatIsoDateAsJalali } from '@/lib/i18n';
import { formatRelativeTimeFa } from '@/lib/i18n/relative-time.fa';

export function LastLoginCard() {
  const [data, setData] = useState<StaffLastLoginResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchStaffLastLogin();
        if (!cancelled) {
          setData(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(isStaffLastLoginApiError(err) ? err.message : 'بارگذاری آخرین ورود ناموفق بود.');
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
  }, []);

  if (loading) {
    return <div className="h-28 animate-pulse rounded-xl bg-neutral-100" />;
  }

  if (error) {
    return (
      <section className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="text-lg font-semibold">آخرین ورود</h2>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        <SnapshotBlock title="ورود فعلی" snapshot={data?.current ?? null} />
        <SnapshotBlock title="ورود قبلی" snapshot={data?.previous ?? null} />
      </dl>
    </section>
  );
}

function SnapshotBlock({
  title,
  snapshot,
}: {
  title: string;
  snapshot: StaffLastLoginResponseDto['current'];
}) {
  if (!snapshot) {
    return (
      <div className="rounded-lg bg-muted/50 px-3 py-2">
        <dt className="text-sm font-medium text-muted-foreground">{title}</dt>
        <dd className="mt-1 text-sm">—</dd>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-muted/50 px-3 py-2">
      <dt className="text-sm font-medium text-muted-foreground">{title}</dt>
      <dd className="mt-1 flex flex-col gap-1 text-sm">
        <span>{formatRelativeTimeFa(snapshot.at)}</span>
        <span className="text-xs text-muted-foreground">
          {formatIsoDateAsJalali(snapshot.at.slice(0, 10))}
        </span>
        {snapshot.deviceLabel ? <span>{snapshot.deviceLabel}</span> : null}
        {snapshot.ip ? (
          <span className="font-mono text-xs" dir="ltr">
            {maskIpForDisplay(snapshot.ip)}
          </span>
        ) : null}
      </dd>
    </div>
  );
}
