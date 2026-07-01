'use client';

import type { PrintSnapshotResponseDto } from '@hivork/contracts/core';
import { Button } from '@hivork/ui';
import { useParams, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { PrintLayout } from '@/components/print';
import { ApiClientError, apiFetch } from '@/lib/api/client';

export default function PrintResourcePage() {
  const params = useParams<{ resource: string }>();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? searchParams.get('snapshot');
  const [snapshot, setSnapshot] = useState<PrintSnapshotResponseDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setError('لینک چاپ معتبر نیست.');
      setLoading(false);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const data = await apiFetch<PrintSnapshotResponseDto>(`/print-snapshots/${token}`);
        if (!cancelled) {
          setSnapshot(data);
        }
      } catch (fetchError) {
        if (!cancelled) {
          if (fetchError instanceof ApiClientError && fetchError.code === 'PRINT_TOKEN_EXPIRED') {
            setError('پیش‌نمایش چاپ منقضی شده است. دوباره از لیست اقدام کنید.');
          } else {
            setError(fetchError instanceof Error ? fetchError.message : 'خطا در بارگذاری چاپ');
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!snapshot) {
      return;
    }

    const timer = window.setTimeout(() => {
      window.print();
    }, 400);

    return () => window.clearTimeout(timer);
  }, [snapshot]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  if (loading) {
    return <p className="print-loading">در حال آماده‌سازی پیش‌نمایش چاپ…</p>;
  }

  if (error || !snapshot) {
    return <p className="print-error">{error ?? 'داده‌ای برای چاپ نیست.'}</p>;
  }

  if (params.resource !== snapshot.resourceKey) {
    return <p className="print-error">منبع چاپ با آدرس صفحه هم‌خوانی ندارد.</p>;
  }

  return (
    <>
      <div className="print-actions no-print">
        <Button type="button" onClick={handlePrint}>
          چاپ
        </Button>
      </div>
      <PrintLayout
        title={snapshot.title}
        tenant={snapshot.tenant}
        locale={snapshot.locale}
        orientation={snapshot.orientation}
        generatedAt={snapshot.generatedAt}
        columns={snapshot.columns}
        rows={snapshot.rows}
      />
    </>
  );
}
