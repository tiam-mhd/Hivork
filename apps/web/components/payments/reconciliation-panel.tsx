'use client';

import type { ReconciliationDiscrepancySummaryDto } from '@hivork/contracts/payments';
import { Button, Label, Textarea } from '@hivork/ui';
import { useCallback, useEffect, useState } from 'react';

import { DataTableEmpty, DataTableError } from '@/components/data-table';
import { useApiError } from '@/hooks/use-api-error';
import { usePermission } from '@/hooks/use-permission';
import { getReconciliationReport, resolveReconciliationDiscrepancy } from '@/lib/api/payments';
import { formatToman } from '@/lib/i18n';

type ReconciliationPanelProps = {
  reportId: string | null;
};

export function ReconciliationPanel({ reportId }: ReconciliationPanelProps) {
  const { resolve } = useApiError();
  const canManage = usePermission('installments.reconciliation.manage');
  const [discrepancies, setDiscrepancies] = useState<ReconciliationDiscrepancySummaryDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolveNotes, setResolveNotes] = useState<Record<string, string>>({});
  const [pendingId, setPendingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!reportId) {
      setDiscrepancies([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await getReconciliationReport(reportId);
      setDiscrepancies(result.discrepancies);
    } catch (err) {
      setError(resolve(err));
      setDiscrepancies([]);
    } finally {
      setLoading(false);
    }
  }, [reportId, resolve]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleResolve(item: ReconciliationDiscrepancySummaryDto) {
    const note = resolveNotes[item.id]?.trim();
    if (!note) {
      setError('یادداشت رفع مغایرت الزامی است.');
      return;
    }
    setPendingId(item.id);
    setError(null);
    try {
      await resolveReconciliationDiscrepancy(item.id, {
        resolveNote: note,
        expectedVersion: item.version,
      });
      await load();
    } catch (err) {
      setError(resolve(err));
    } finally {
      setPendingId(null);
    }
  }

  if (!canManage) {
    return (
      <p className="rounded-xl border border-border bg-muted/30 p-6 text-sm text-muted-foreground">
        دسترسی مغایرت‌گیری برای شما فعال نیست.
      </p>
    );
  }

  if (!reportId) {
    return (
      <DataTableEmpty
        title="گزارش مغایرت انتخاب نشده"
        description="از تب تسویه، مغایرت‌گیری را اجرا کنید یا شناسه گزارش را وارد کنید."
      />
    );
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">در حال بارگذاری گزارش...</p>;
  }

  if (error) {
    return <DataTableError message={error} onRetry={() => void load()} />;
  }

  if (discrepancies.length === 0) {
    return (
      <DataTableEmpty
        title="مغایرتی یافت نشد"
        description="همه ردیف‌های بانک با سیستم مطابقت دارند."
      />
    );
  }

  return (
    <ul className="space-y-4">
      {discrepancies.map((item) => (
        <li key={item.id} className="rounded-xl border border-border p-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium">{item.discrepancyType}</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{item.status}</span>
          </div>
          <div className="mt-2 grid gap-1 text-muted-foreground sm:grid-cols-2">
            {item.bankAmountRial ? (
              <span>بانک: {formatToman(BigInt(item.bankAmountRial))}</span>
            ) : null}
            {item.systemAmountRial ? (
              <span>سیستم: {formatToman(BigInt(item.systemAmountRial))}</span>
            ) : null}
          </div>
          {item.status === 'open' ? (
            <div className="mt-3 space-y-2">
              <Label htmlFor={`resolve-${item.id}`}>یادداشت رفع</Label>
              <Textarea
                id={`resolve-${item.id}`}
                rows={2}
                value={resolveNotes[item.id] ?? ''}
                onChange={(event) =>
                  setResolveNotes((prev) => ({ ...prev, [item.id]: event.target.value }))
                }
              />
              <Button
                type="button"
                size="sm"
                disabled={pendingId === item.id}
                onClick={() => void handleResolve(item)}
              >
                {pendingId === item.id ? 'در حال ثبت...' : 'رفع مغایرت'}
              </Button>
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
