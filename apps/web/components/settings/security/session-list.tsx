'use client';

import type { StaffSessionItemDto } from '@hivork/contracts';
import { Button } from '@hivork/ui';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { usePermission } from '@/hooks/use-permission';
import { maskIpForDisplay } from '@/lib/auth/mask-ip';
import {
  fetchStaffSessions,
  isStaffSessionsApiError,
  revokeAllStaffSessions,
  revokeStaffSession,
  STAFF_SESSION_MANAGE_PERMISSION,
} from '@/lib/auth/staff-sessions';
import { useStaffAuth } from '@/lib/auth/use-staff-auth';
import { formatIsoDateAsJalali } from '@/lib/i18n';
import { getErrorMessageFa } from '@/lib/i18n/error-messages.fa';
import { formatRelativeTimeFa } from '@/lib/i18n/relative-time.fa';

type SessionListProps = {
  onToast?: (message: string) => void;
};

export function SessionList({ onToast }: SessionListProps) {
  const router = useRouter();
  const { logout } = useStaffAuth();
  const canManage = usePermission(STAFF_SESSION_MANAGE_PERMISSION);
  const [items, setItems] = useState<StaffSessionItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<StaffSessionItemDto | null>(null);
  const [showRevokeAll, setShowRevokeAll] = useState(false);
  const [revokeAllConfirm, setRevokeAllConfirm] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchStaffSessions({ status: 'active', limit: 50 });
      setItems(result.items);
    } catch (err) {
      if (isStaffSessionsApiError(err)) {
        setError(getErrorMessageFa(err.code, err.message));
      } else {
        setError('بارگذاری نشست‌ها ناموفق بود.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleRevoke = async (session: StaffSessionItemDto) => {
    setActionLoading(true);
    try {
      const result = await revokeStaffSession(session.id);
      onToast?.('نشست با موفقیت بسته شد.');
      setRevokeTarget(null);
      if (result.revokedCurrent) {
        await logout();
        router.replace('/login');
        return;
      }
      await load();
    } catch (err) {
      if (isStaffSessionsApiError(err)) {
        onToast?.(getErrorMessageFa(err.code, err.message));
      } else {
        onToast?.('لغو نشست ناموفق بود.');
      }
      await load();
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokeAll = async () => {
    if (revokeAllConfirm.trim() !== 'خروج همه') {
      return;
    }
    setActionLoading(true);
    try {
      await revokeAllStaffSessions({ includeCurrent: true });
      onToast?.('از همه دستگاه‌ها خارج شدید.');
      setShowRevokeAll(false);
      await logout();
      router.replace('/login');
    } catch (err) {
      if (isStaffSessionsApiError(err)) {
        onToast?.(getErrorMessageFa(err.code, err.message));
      } else {
        onToast?.('خروج از همه دستگاه‌ها ناموفق بود.');
      }
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <SessionListSkeleton />;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm text-red-700">{error}</p>
        <Button type="button" className="mt-3" variant="outline" onClick={() => void load()}>
          تلاش مجدد
        </Button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
        <p className="text-4xl" aria-hidden>
          📱
        </p>
        <p className="mt-3 font-medium">نشست فعالی یافت نشد</p>
        <p className="mt-1 text-sm text-muted-foreground">
          پس از ورود مجدد، دستگاه‌های متصل اینجا نمایش داده می‌شوند.
        </p>
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">دستگاه‌های فعال</h2>
        {canManage ? (
          <Button type="button" variant="destructive" onClick={() => setShowRevokeAll(true)}>
            خروج از همه دستگاه‌ها
          </Button>
        ) : null}
      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/50 text-right">
            <tr>
              <th className="px-4 py-3 font-medium">دستگاه</th>
              <th className="px-4 py-3 font-medium">IP</th>
              <th className="px-4 py-3 font-medium">آخرین فعالیت</th>
              <th className="px-4 py-3 font-medium">ایجاد</th>
              <th className="px-4 py-3 font-medium">وضعیت</th>
              {canManage ? <th className="px-4 py-3 font-medium">عمل</th> : null}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <SessionRow
                key={item.id}
                item={item}
                canManage={canManage}
                onRevoke={() => setRevokeTarget(item)}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 md:hidden">
        {items.map((item) => (
          <SessionCard
            key={item.id}
            item={item}
            canManage={canManage}
            onRevoke={() => setRevokeTarget(item)}
          />
        ))}
      </div>

      {revokeTarget ? (
        <ConfirmRevokeDialog
          item={revokeTarget}
          loading={actionLoading}
          onClose={() => setRevokeTarget(null)}
          onConfirm={() => void handleRevoke(revokeTarget)}
        />
      ) : null}

      {showRevokeAll ? (
        <RevokeAllDialog
          confirmText={revokeAllConfirm}
          loading={actionLoading}
          onConfirmTextChange={setRevokeAllConfirm}
          onClose={() => {
            setShowRevokeAll(false);
            setRevokeAllConfirm('');
          }}
          onConfirm={() => void handleRevokeAll()}
        />
      ) : null}
    </section>
  );
}

function SessionRow({
  item,
  canManage,
  onRevoke,
}: {
  item: StaffSessionItemDto;
  canManage: boolean;
  onRevoke: () => void;
}) {
  return (
    <tr className="border-t border-border">
      <td className="px-4 py-3">{item.deviceLabel ?? 'نامشخص'}</td>
      <td className="px-4 py-3 font-mono text-xs" dir="ltr">
        {item.ipAddress ? maskIpForDisplay(item.ipAddress) : '—'}
      </td>
      <td className="px-4 py-3">{formatRelativeTimeFa(item.lastActiveAt)}</td>
      <td className="px-4 py-3">{formatIsoDateAsJalali(item.createdAt.slice(0, 10))}</td>
      <td className="px-4 py-3">
        {item.isCurrent ? (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
            دستگاه فعلی
          </span>
        ) : (
          <span className="text-muted-foreground">فعال</span>
        )}
      </td>
      {canManage ? (
        <td className="px-4 py-3">
          <Button type="button" variant="outline" size="sm" onClick={onRevoke}>
            لغو
          </Button>
        </td>
      ) : null}
    </tr>
  );
}

function SessionCard({
  item,
  canManage,
  onRevoke,
}: {
  item: StaffSessionItemDto;
  canManage: boolean;
  onRevoke: () => void;
}) {
  return (
    <article className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-medium">{item.deviceLabel ?? 'نامشخص'}</h3>
          <p className="mt-1 font-mono text-xs text-muted-foreground" dir="ltr">
            {item.ipAddress ? maskIpForDisplay(item.ipAddress) : '—'}
          </p>
        </div>
        {item.isCurrent ? (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
            دستگاه فعلی
          </span>
        ) : null}
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        <div>
          <dt>آخرین فعالیت</dt>
          <dd className="text-foreground">{formatRelativeTimeFa(item.lastActiveAt)}</dd>
        </div>
        <div>
          <dt>ایجاد</dt>
          <dd className="text-foreground">{formatIsoDateAsJalali(item.createdAt.slice(0, 10))}</dd>
        </div>
      </dl>
      {canManage ? (
        <Button type="button" variant="outline" size="sm" className="mt-3" onClick={onRevoke}>
          لغو دسترسی
        </Button>
      ) : null}
    </article>
  );
}

function ConfirmRevokeDialog({
  item,
  loading,
  onClose,
  onConfirm,
}: {
  item: StaffSessionItemDto;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <dialog open className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-card p-5 shadow-lg">
        <h3 className="text-lg font-semibold">لغو دسترسی دستگاه</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          آیا از خروج این دستگاه مطمئن هستید؟
          {item.isCurrent ? ' این دستگاه فعلی شماست و به صفحه ورود هدایت می‌شوید.' : null}
        </p>
        <p className="mt-2 text-sm font-medium">{item.deviceLabel ?? 'نامشخص'}</p>
        <div className="mt-4 flex gap-3">
          <Button type="button" variant="destructive" disabled={loading} onClick={onConfirm}>
            {loading ? 'در حال لغو…' : 'لغو دسترسی'}
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            انصراف
          </Button>
        </div>
      </div>
    </dialog>
  );
}

function RevokeAllDialog({
  confirmText,
  loading,
  onConfirmTextChange,
  onClose,
  onConfirm,
}: {
  confirmText: string;
  loading: boolean;
  onConfirmTextChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <dialog open className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-card p-5 shadow-lg">
        <h3 className="text-lg font-semibold text-destructive">خروج از همه دستگاه‌ها</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          همه نشست‌های فعال (شامل این دستگاه) بسته می‌شوند. برای تأیید عبارت{' '}
          <strong>خروج همه</strong> را وارد کنید.
        </p>
        <input
          className="mt-4 w-full rounded-md border border-input px-3 py-2 text-sm"
          value={confirmText}
          onChange={(event) => onConfirmTextChange(event.target.value)}
          placeholder="خروج همه"
          disabled={loading}
        />
        <div className="mt-4 flex gap-3">
          <Button
            type="button"
            variant="destructive"
            disabled={loading || confirmText.trim() !== 'خروج همه'}
            onClick={onConfirm}
          >
            {loading ? 'در حال خروج…' : 'تأیید خروج'}
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            انصراف
          </Button>
        </div>
      </div>
    </dialog>
  );
}

function SessionListSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="h-16 animate-pulse rounded-xl bg-neutral-100" />
      ))}
    </div>
  );
}
