'use client';

import type { SettlementBatchSummaryDto } from '@hivork/contracts/payments';
import { isoToJalaliDisplay } from '@hivork/i18n';
import { Button, Label } from '@hivork/ui';
import { useCallback, useEffect, useState } from 'react';

import { DataTableEmpty, DataTableError } from '@/components/data-table';
import { DatePicker } from '@/components/date-picker';
import { useActiveBranch } from '@/hooks/use-active-branch';
import { useApiError } from '@/hooks/use-api-error';
import { usePermission } from '@/hooks/use-permission';
import {
  closeSettlementBatch,
  createSettlementBatch,
  listSettlementBatches,
  runSettlementReconciliation,
} from '@/lib/api/payments';
import { formatToman } from '@/lib/i18n';
import { isoDateToCheckDueDateInput } from '@/lib/payments/check-dates';

type SettlementPanelProps = {
  onReconciliationReport: (reportId: string) => void;
};

export function SettlementPanel({ onReconciliationReport }: SettlementPanelProps) {
  const { resolve } = useApiError();
  const canManage = usePermission('installments.settlement.manage');
  const canReconcile = usePermission('installments.reconciliation.manage');
  const { activeBranchId } = useActiveBranch();

  const [items, setItems] = useState<SettlementBatchSummaryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodFrom, setPeriodFrom] = useState('');
  const [periodTo, setPeriodTo] = useState('');
  const [pending, setPending] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listSettlementBatches({ limit: 20 });
      setItems(result.items);
    } catch (err) {
      setError(resolve(err));
    } finally {
      setLoading(false);
    }
  }, [resolve]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate() {
    if (!activeBranchId || !periodFrom || !periodTo) {
      setError('شعبه فعال و بازه تاریخ الزامی است.');
      return;
    }
    setPending(true);
    setError(null);
    try {
      await createSettlementBatch({
        branchId: activeBranchId,
        periodFrom: isoDateToCheckDueDateInput(periodFrom),
        periodTo: isoDateToCheckDueDateInput(periodTo),
        paymentMethods: ['card', 'online'],
      });
      await load();
    } catch (err) {
      setError(resolve(err));
    } finally {
      setPending(false);
    }
  }

  async function handleClose(batch: SettlementBatchSummaryDto) {
    setPending(true);
    try {
      await closeSettlementBatch(batch.id, { expectedVersion: batch.version });
      await load();
    } catch (err) {
      setError(resolve(err));
    } finally {
      setPending(false);
    }
  }

  async function handleReconcile() {
    if (!selectedId || !csvFile) {
      setError('دسته تسویه و فایل CSV بانک را انتخاب کنید.');
      return;
    }
    setPending(true);
    setError(null);
    try {
      const result = await runSettlementReconciliation(selectedId, csvFile);
      onReconciliationReport(result.report.id);
    } catch (err) {
      setError(resolve(err));
    } finally {
      setPending(false);
    }
  }

  if (!canManage && !canReconcile) {
    return (
      <p className="rounded-xl border border-border bg-muted/30 p-6 text-sm text-muted-foreground">
        دسترسی به تسویه و مغایرت‌گیری برای شما فعال نیست.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {canManage ? (
        <section className="rounded-xl border border-border p-4">
          <h2 className="font-medium">ایجاد دسته تسویه</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <DatePicker label="از تاریخ" value={periodFrom} onChange={(v) => setPeriodFrom(v ?? '')} />
            <DatePicker label="تا تاریخ" value={periodTo} onChange={(v) => setPeriodTo(v ?? '')} />
          </div>
          <Button type="button" className="mt-4" disabled={pending} onClick={() => void handleCreate()}>
            ایجاد دسته
          </Button>
        </section>
      ) : null}

      {canReconcile ? (
        <section className="rounded-xl border border-border p-4">
          <h2 className="font-medium">مغایرت‌گیری با صورت‌حساب بانک</h2>
          <div className="mt-4 flex flex-col gap-3">
            <div>
              <Label htmlFor="settlement-select">دسته تسویه</Label>
              <select
                id="settlement-select"
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={selectedId ?? ''}
                onChange={(event) => setSelectedId(event.target.value || null)}
              >
                <option value="">انتخاب کنید</option>
                {items.map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    {batch.batchNumber} ({batch.status})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="bank-csv">فایل CSV بانک</Label>
              <input
                id="bank-csv"
                type="file"
                accept=".csv,text/csv"
                className="mt-1 block w-full text-sm"
                onChange={(event) => setCsvFile(event.target.files?.[0] ?? null)}
              />
            </div>
            <Button type="button" variant="outline" disabled={pending} onClick={() => void handleReconcile()}>
              اجرای مغایرت‌گیری
            </Button>
          </div>
        </section>
      ) : null}

      {error ? <DataTableError message={error} onRetry={() => void load()} /> : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">در حال بارگذاری...</p>
      ) : items.length === 0 ? (
        <DataTableEmpty title="دسته تسویه‌ای نیست" description="یک دسته تسویه جدید ایجاد کنید." />
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {items.map((batch) => (
            <li key={batch.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
              <div>
                <p className="font-medium">{batch.batchNumber}</p>
                <p className="text-muted-foreground">
                  {isoToJalaliDisplay(batch.periodFrom, 'fa', { persianDigits: true })}
                  {' — '}
                  {isoToJalaliDisplay(batch.periodTo, 'fa', { persianDigits: true })}
                </p>
                <p className="tabular-nums">{formatToman(BigInt(batch.totalAmountRial))}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{batch.status}</span>
                {canManage && batch.status === 'open' ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => void handleClose(batch)}
                  >
                    بستن
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
